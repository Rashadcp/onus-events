import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d';  // Long-lived refresh token

export interface ITokenPayload {
  userId: string;
  role: string;
}

/**
 * Encrypt a plain-text password using bcrypt.
 * @param password Raw password text
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12); // Enforce high salt rounds
  return bcrypt.hash(password, salt);
}

/**
 * Compare a raw password with a stored hash.
 * @param password Raw password text
 * @param hash Stored password hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign an Access Token (JWT).
 * @param payload Payload data containing userId and role
 */
export function generateAccessToken(payload: ITokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Sign a Refresh Token (JWT).
 * @param payload Payload data containing userId and role
 */
export function generateRefreshToken(payload: ITokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify an Access Token (JWT).
 * @param token JWT String
 */
export function verifyAccessToken(token: string): ITokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
  return jwt.verify(token, secret) as ITokenPayload;
}

/**
 * Verify a Refresh Token (JWT).
 * @param token JWT String
 */
export function verifyRefreshToken(token: string): ITokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.verify(token, secret) as ITokenPayload;
}
