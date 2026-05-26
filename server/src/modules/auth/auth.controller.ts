import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../../models/User';
import { 
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken,
  verifyRefreshToken 
} from '../../utils/authHelper';
import { handleControllerError } from '../../utils/errorHelper';

// Login Validation Schema
const LoginSchema = z.object({
  email: z.string().min(1, 'Representative ID is required'),
  password: z.string().min(1, 'Password is required')
});

// User Registration Validation Schema
const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number must be at least 5 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SALES_REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE', 'CAPTAIN', 'STORE_KEEPER'])
});

const LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes lockout
const MAX_ATTEMPTS = 5;

/**
 * Handle user registration.
 */
export async function register(req: Request, res: Response) {
  try {
    const validated = RegisterSchema.parse(req.body);

    // Only let Admin create new accounts (or let the first user register as Admin if database is empty)
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      // If req.user is missing, try to parse Bearer token inline
      if (!req.user) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            req.user = verifyAccessToken(token);
          } catch (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid access token' });
          }
        }
      }

      // Access guard: verify requesting user is ADMIN
      if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Only administrators can create new users.' });
      }
    }

    const existingUser = await User.findOne({ email: validated.email });

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
      isActive: true
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Handle secure User Login.
 */
export async function login(req: Request, res: Response) {
  try {
    const validated = LoginSchema.parse(req.body);
    const { email, password } = validated;
    const loginId = email.trim().toLowerCase();

    const lookupConditions: any[] = [
      { email: loginId },
      { phone: email.trim() }
    ];

    if (mongoose.Types.ObjectId.isValid(email.trim())) {
      lookupConditions.push({ _id: email.trim() });
    }

    // Search user by email, phone, or database ID shown as Representative ID.
    const user = await User.findOne({ $or: lookupConditions });

    if (!user) {
      // Maintain generic error message to prevent username enumeration exploits
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been disabled. Please contact the administrator.' });
    }

    // Check if account is currently locked
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000 / 60);
      return res.status(403).json({
        error: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingTime} minutes.`
      });
    }

    // Compare input password with hashed password (with legacy fallback support)
    const storedHash = user.password || (user as any).passwordHash;
    if (!storedHash) {
      return res.status(401).json({ error: 'Account database format mismatch. Please restart the backend server.' });
    }

    const isMatch = await comparePassword(password, storedHash);

    if (!isMatch) {
      // Password mismatch: Increment failed attempts counter
      user.failedLoginAttempts += 1;
      
      let lockMessage = 'Invalid email or password.';
      
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.failedLoginAttempts = 0; // reset attempts after locking
        lockMessage = `Too many failed attempts. Your account has been locked for 30 minutes.`;
      } else {
        const attemptsLeft = MAX_ATTEMPTS - user.failedLoginAttempts;
        lockMessage += ` You have ${attemptsLeft} attempts remaining before temporary lockout.`;
      }

      await user.save();
      return res.status(401).json({ error: lockMessage });
    }

    // Login successful: Reset login limits
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Generate tokens
    const payload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token in highly secure httpOnly cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd, // Only send over HTTPS in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching token expiry
    });

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Securely refresh the access token.
 */
export async function refresh(req: Request, res: Response) {
  try {
    // Parse cookie from headers manually to avoid third party package dependencies
    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').reduce((acc: any, c) => {
      const parts = c.trim().split('=');
      if (parts[0]) {
        acc[parts[0]] = parts[1];
      }
      return acc;
    }, {});

    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized: Missing refresh token cookie' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: User is inactive or no longer exists' });
    }

    // Issue a fresh access token
    const newAccessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });

    return res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired refresh token' });
  }
}

/**
 * Handle user logout.
 */
export async function logout(req: Request, res: Response) {
  try {
    // Clear the secure cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict'
    });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}

/**
 * Handle password changes.
 */
export async function changePassword(req: Request, res: Response) {
  try {
    const ChangePasswordSchema = z.object({
      oldPassword: z.string().min(1, 'Old password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters')
    });

    const validated = ChangePasswordSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await comparePassword(validated.oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    user.password = await hashPassword(validated.newPassword);
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return handleControllerError(res, error);
  }
}
