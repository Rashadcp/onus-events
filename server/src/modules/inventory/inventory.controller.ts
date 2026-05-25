import { Request, Response } from 'express';
import { z } from 'zod';
import Item from '../../models/Item';
import { handleControllerError } from '../../utils/errorHelper';

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
  rentalRate: z.number().nonnegative('Rental rate cannot be negative'),
  saleRate: z.number().nonnegative('Sale rate cannot be negative'),
  subItems: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

/**
 * Create a new Inventory Item (Admin Only).
 */
export async function createItem(req: Request, res: Response) {
  try {
    const validated = ItemCreateSchema.parse(req.body);

    const existingItem = await Item.findOne({ itemCode: validated.itemCode.toUpperCase() });
    if (existingItem) {
      return res.status(409).json({ error: `Item with code ${validated.itemCode} already exists.` });
    }

    const newItem = await Item.create({
      ...validated,
      itemCode: validated.itemCode.toUpperCase()
    });

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
        { itemCode: { $regex: search, $options: 'i' } }
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

    const updatedItem = await Item.findOneAndUpdate(
      { itemCode: itemCode.toUpperCase() },
      { $set: validated },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: `Item ${itemCode} not found` });
    }

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
