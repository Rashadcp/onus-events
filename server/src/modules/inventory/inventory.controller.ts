import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Item from '../../models/Item';
import StockLog from '../../models/StockLog';
import { handleControllerError } from '../../utils/errorHelper';
import { broadcast } from '../../services/websocket';
import { getItemAvailability } from '../../services/reservationEngine';

// Validate Item Creation
const ItemCreateSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Name is required'),
  department: z.enum([
    'COUNTER_DECOR',
    'CLOTH_DECOR',
    'RENTAL_ITEMS',
    'EXPENSE_CHARGES',
    'STAFF',
    'OUTSIDE_RENTAL'
  ]),
  currentStock: z.number().nonnegative('Stock cannot be negative'),
  minimumStock: z.number().nonnegative('Minimum stock threshold cannot be negative').optional().default(5),
  rentalRate: z.number().nonnegative('Rental rate cannot be negative'),
  saleRate: z.number().nonnegative('Sale rate cannot be negative'),
  warehouse: z.string().optional().default('Main Warehouse'),
  category: z.string().optional().default('Decorations'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOADED', 'DISPATCHED', 'RETURNED', 'DAMAGED']).optional().default('AVAILABLE'),
  subItems: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

/**
 * Create a new Inventory Item (Admin Only).
 */
export async function createItem(req: Request, res: Response) {
  try {
    const validated = ItemCreateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user context' });
    }

    const existingItem = await Item.findOne({ itemCode: validated.itemCode.toUpperCase() });
    if (existingItem) {
      return res.status(409).json({ error: `Item with code ${validated.itemCode} already exists.` });
    }

    const newItem = await Item.create({
      ...validated,
      itemCode: validated.itemCode.toUpperCase()
    });

    // Automatically seed initial StockLog entry
    await StockLog.create({
      itemId: newItem._id,
      itemCode: newItem.itemCode,
      previousStock: 0,
      newStock: newItem.currentStock,
      difference: newItem.currentStock,
      state: newItem.status,
      warehouse: newItem.warehouse,
      reason: 'Initial Seeding',
      modifiedBy: new mongoose.Types.ObjectId(userId)
    });

    broadcast({ type: 'INVENTORY_CREATED', item: newItem });

    return res.status(201).json({
      message: 'Item created successfully',
      item: newItem
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Fetch all Inventory Items.
 */
export async function getItems(req: Request, res: Response) {
  try {
    const { department, search } = req.query;
    const filter: any = { isActive: true };

    if (department) {
      filter.department = department;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await Item.find(filter).sort({ name: 1 });
    return res.status(200).json(items);
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Retrieve a single item by Item Code.
 */
export async function getItemByCode(req: Request, res: Response) {
  try {
    const { itemCode } = req.params;
    const item = await Item.findOne({ itemCode: itemCode.toUpperCase(), isActive: true });
    
    if (!item) {
      return res.status(404).json({ error: `Item ${itemCode} not found` });
    }

    return res.status(200).json(item);
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Update an Inventory Item (Admin Only).
 */
export async function updateItem(req: Request, res: Response) {
  try {
    const { itemCode } = req.params;
    const validated = ItemCreateSchema.partial().parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user context' });
    }

    const item = await Item.findOne({ itemCode: itemCode.toUpperCase(), isActive: true });
    if (!item) {
      return res.status(404).json({ error: `Item ${itemCode} not found` });
    }

    // Capture changes to stock levels or status to log audit trail
    const stockChanged = validated.currentStock !== undefined && validated.currentStock !== item.currentStock;
    const statusChanged = validated.status !== undefined && validated.status !== item.status;

    if (stockChanged || statusChanged) {
      const newStock = validated.currentStock !== undefined ? validated.currentStock : item.currentStock;
      const difference = newStock - item.currentStock;
      const newState = validated.status || item.status;
      const reason = stockChanged 
        ? `Manual Inventory Adjustment (Difference: ${difference > 0 ? '+' : ''}${difference})` 
        : `Status Transition to ${newState}`;

      await StockLog.create({
        itemId: item._id,
        itemCode: item.itemCode,
        previousStock: item.currentStock,
        newStock: newStock,
        difference: difference,
        state: newState,
        warehouse: validated.warehouse || item.warehouse,
        reason,
        modifiedBy: new mongoose.Types.ObjectId(userId)
      });
    }

    const updatedItem = await Item.findOneAndUpdate(
      { itemCode: itemCode.toUpperCase() },
      { $set: validated },
      { new: true }
    );

    broadcast({ type: 'INVENTORY_UPDATED', item: updatedItem });

    return res.status(200).json({
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Delete / Soft-disable an Inventory Item (Admin Only).
 */
export async function deleteItem(req: Request, res: Response) {
  try {
    const { itemCode } = req.params;
    
    const disabledItem = await Item.findOneAndUpdate(
      { itemCode: itemCode.toUpperCase() },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!disabledItem) {
      return res.status(404).json({ error: `Item ${itemCode} not found` });
    }

    broadcast({ type: 'INVENTORY_DELETED', itemCode: itemCode.toUpperCase() });

    return res.status(200).json({
      message: `Item ${itemCode} disabled successfully.`
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Link sub-item codes together under a main item (Admin Only).
 */
export async function groupSubItems(req: Request, res: Response) {
  try {
    const { itemCode } = req.params;
    const { subItemCodes } = req.body; // Expect array of strings e.g., ["CODE1", "CODE2"]

    if (!Array.isArray(subItemCodes)) {
      return res.status(400).json({ error: 'subItemCodes must be an array of item code strings.' });
    }

    // Verify all subItemCodes exist in DB
    const upperSubCodes = subItemCodes.map((code) => code.toUpperCase());
    const validCount = await Item.countDocuments({ itemCode: { $in: upperSubCodes }, isActive: true });

    if (validCount !== upperSubCodes.length) {
      return res.status(400).json({ error: 'One or more sub-item codes are invalid or do not exist.' });
    }

    const updatedItem = await Item.findOneAndUpdate(
      { itemCode: itemCode.toUpperCase(), isActive: true },
      { $set: { subItems: upperSubCodes } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: `Main item ${itemCode} not found` });
    }

    return res.status(200).json({
      message: 'Sub-items grouped successfully',
      item: updatedItem
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Fetch Stock Transaction logs (Admin Only).
 */
export async function getStockLogs(req: Request, res: Response) {
  try {
    const logs = await StockLog.find()
      .populate('modifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json(logs);
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Express API endpoint to check dynamic availability of an item over a date range.
 * GET /api/inventory/:itemId/availability?startDate=...&endDate=...
 */
export async function checkItemAvailability(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date formats provided.' });
    }

    const { currentStock, reservedAndDispatchedQty, availableQty } = await getItemAvailability(
      itemId,
      start,
      end
    );

    return res.status(200).json({
      itemId,
      startDate: start,
      endDate: end,
      currentStock,
      reservedAndDispatchedQty,
      availableQty
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}
