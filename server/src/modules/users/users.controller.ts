import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../../models/User';
import { handleControllerError } from '../../utils/errorHelper';
import { hashPassword } from '../../utils/authHelper';

// Schema for updating user
const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  role: z.enum(['ADMIN', 'REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(3, 'Password must be at least 3 characters').optional(),
});

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
      .select('-passwordHash') // Don't send password hashes
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

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for username/email conflicts if they are being updated
    if (validated.username || validated.email) {
      const existingUser = await User.findOne({
        _id: { $ne: id }, // Exclude current user
        $or: [
          ...(validated.username ? [{ username: validated.username }] : []),
          ...(validated.email ? [{ email: validated.email }] : [])
        ]
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Username or email already exists for another user' });
      }
    }

    // Update fields
    if (validated.fullName !== undefined) user.fullName = validated.fullName;
    if (validated.email !== undefined) user.email = validated.email;
    if (validated.username !== undefined) user.username = validated.username;
    if (validated.role !== undefined) user.role = validated.role;
    if (validated.isActive !== undefined) user.isActive = validated.isActive;
    
    // If Admin is updating the password
    if (validated.password) {
      user.passwordHash = await hashPassword(validated.password);
    }

    await user.save();

    // Return user without password hash
    const updatedUser = user.toObject();
    delete (updatedUser as any).passwordHash;

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
