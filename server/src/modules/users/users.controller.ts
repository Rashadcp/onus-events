import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../../models/User';
import { handleControllerError } from '../../utils/errorHelper';
import { hashPassword } from '../../utils/authHelper';

// Schema for creating user
const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number must be at least 5 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SALES_REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE', 'CAPTAIN', 'STORE_KEEPER']),
  monthlyBilling: z.number().nonnegative().optional(),
  incentiveRate: z.number().nonnegative().optional(),
});

// Schema for updating user
const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(5, 'Phone number must be at least 5 characters').optional(),
  role: z.enum(['ADMIN', 'SALES_REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE', 'CAPTAIN', 'STORE_KEEPER']).optional(),
  monthlyBilling: z.number().nonnegative().optional(),
  incentiveRate: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

/**
 * Create a user from the admin user directory
 */
export async function createUser(req: Request, res: Response) {
  try {
    const validated = CreateUserSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await hashPassword(validated.password);
    const newUser = await User.create({
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      password: passwordHash,
      role: validated.role,
      monthlyBilling: validated.monthlyBilling || 0,
      incentiveRate: validated.incentiveRate !== undefined ? validated.incentiveRate : 5,
      isActive: true,
    });

    const createdUser = newUser.toObject();
    delete (createdUser as any).password;

    return res.status(201).json({
      message: 'User created successfully',
      user: createdUser,
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Get all users, optionally filtered by role
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const { role } = req.query;
    
    const query: any = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password') // Don't send password hashes
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Update a user's details
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validated = UpdateUserSchema.parse(req.body);

    // Mock bypass for frontend pre-seeded mock users
    if (id && id.startsWith('usr-')) {
      return res.status(200).json({
        message: 'User updated successfully (Mock Bypass)',
        user: {
          id,
          name: validated.name || 'Mock User',
          email: validated.email || 'mock@onus.com',
          role: validated.role || 'SITE_INCHARGE',
          isActive: validated.isActive !== undefined ? validated.isActive : true
        }
      });
    }

    // Invalid mongoose ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for email conflicts if it is being updated
    if (validated.email) {
      const existingUser = await User.findOne({
        _id: { $ne: id }, // Exclude current user
        email: validated.email
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists for another user' });
      }
    }

    // Update fields
    if (validated.name !== undefined) user.name = validated.name;
    if (validated.email !== undefined) user.email = validated.email;
    if (validated.phone !== undefined) user.phone = validated.phone;
    if (validated.role !== undefined) user.role = validated.role;
    if (validated.monthlyBilling !== undefined) user.monthlyBilling = validated.monthlyBilling;
    if (validated.incentiveRate !== undefined) user.incentiveRate = validated.incentiveRate;
    if (validated.isActive !== undefined) user.isActive = validated.isActive;
    
    // If Admin is updating the password
    if (validated.password) {
      user.password = await hashPassword(validated.password);
    }

    await user.save();

    // Return user without password hash
    const updatedUser = user.toObject();
    delete (updatedUser as any).password;

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Delete (or disable) a user
 * For safety, we just soft-disable them, but we provide a true delete endpoint as well if needed.
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query; // If ?hardDelete=true, actually remove from DB

    // Mock bypass for frontend pre-seeded mock users
    if (id && id.startsWith('usr-')) {
      return res.status(200).json({ message: 'User account disabled (Mock Bypass)' });
    }

    // Invalid mongoose ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-deletion/disabling
    if (req.user && req.user.userId === id) {
      return res.status(400).json({ error: 'You cannot disable or delete your own account' });
    }

    if (hardDelete === 'true') {
      await User.findByIdAndDelete(id);
      return res.status(200).json({ message: 'User permanently deleted' });
    } else {
      user.isActive = false;
      await user.save();
      return res.status(200).json({ message: 'User account disabled' });
    }
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}
