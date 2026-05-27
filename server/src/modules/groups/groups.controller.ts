import { Request, Response } from 'express';
import { z } from 'zod';
import ItemGroup from '../../models/ItemGroup';
import { handleControllerError } from '../../utils/errorHelper';

/** Default groups seeded if DB is empty */
const DEFAULT_GROUPS = [
  { key: 'COUNTER_DECOR',   label: 'Counter Decor',      description: 'Table tops, vases, floral panels and counter decoration items.', color: '#f59e0b', sortOrder: 1,  isDefault: true },
  { key: 'CLOTH_DECOR',     label: 'Cloth Decor',         description: 'Backdrop curtains, table cloths, chair covers and fabric decoration.', color: '#8b5cf6', sortOrder: 2,  isDefault: true },
  { key: 'RENTAL_ITEMS',    label: 'Rental Items',         description: 'Chairs, tables, crockery, glassware and other rental equipment.', color: '#3b82f6', sortOrder: 3,  isDefault: true },
  { key: 'EXPENSE_CHARGES', label: 'Expense & Charges',   description: 'Transport, labour charges, miscellaneous expenses and additional fees.', color: '#ef4444', sortOrder: 4,  isDefault: true },
  { key: 'STAFF',           label: 'Staff',                description: 'Event captains, loaders, security supervisors and on-site staff.', color: '#10b981', sortOrder: 5,  isDefault: true },
  { key: 'OUTSIDE_RENTAL',  label: 'Outside Rental',      description: 'Items rented from external vendors for the event.', color: '#6b7280', sortOrder: 6,  isDefault: true },
];

/**
 * Ensure the 6 default groups exist in the DB (idempotent seed).
 */
async function seedDefaultGroups() {
  const count = await ItemGroup.countDocuments();
  if (count === 0) {
    for (const g of DEFAULT_GROUPS) {
      await ItemGroup.create(g);
    }
  }
}

const GroupCreateSchema = z.object({
  key:         z.string().min(2, 'Key is required').max(40).regex(/^[A-Za-z0-9_]+$/, 'Key can only contain letters, numbers and underscores'),
  label:       z.string().min(2, 'Label is required').max(60),
  description: z.string().max(200).optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  sortOrder:   z.number().int().min(0).optional(),
  isActive:    z.boolean().optional()
});

const GroupUpdateSchema = GroupCreateSchema.partial().omit({ key: true });

/**
 * GET /api/groups
 * Returns all active groups (seeding defaults on first call).
 * Available to all authenticated users.
 */
export async function getGroups(req: Request, res: Response) {
  try {
    await seedDefaultGroups();
    const includeInactive = req.query.includeInactive === 'true';
    const filter = includeInactive ? {} : { isActive: true };
    const groups = await ItemGroup.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    return res.json(groups);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * POST /api/groups
 * Create a new custom group (Admin only).
 */
export async function createGroup(req: Request, res: Response) {
  try {
    const validated = GroupCreateSchema.parse(req.body);
    const key = validated.key.toUpperCase();

    const existing = await ItemGroup.findOne({ key });
    if (existing) {
      return res.status(409).json({ error: `A group with key "${key}" already exists.` });
    }

    const group = await ItemGroup.create({
      ...validated,
      key,
      isDefault: false
    });

    return res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * PUT /api/groups/:id
 * Update a group's label, description, color, sortOrder or isActive (Admin only).
 */
export async function updateGroup(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validated = GroupUpdateSchema.parse(req.body);

    const group = await ItemGroup.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const updated = await ItemGroup.findByIdAndUpdate(id, { $set: validated }, { new: true });
    return res.json({ message: 'Group updated successfully', group: updated });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * DELETE /api/groups/:id
 * Delete a custom group. Default groups cannot be deleted (Admin only).
 */
export async function deleteGroup(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const group = await ItemGroup.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }



    await ItemGroup.findByIdAndDelete(id);
    return res.json({ message: 'Group deleted successfully.' });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
