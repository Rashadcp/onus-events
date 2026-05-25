import { Response } from 'express';
import { z } from 'zod';

/**
 * Centrally handles and formats controller errors.
 * Returns 400 for Zod validation schemas, and 500 for other server errors.
 */
export function handleControllerError(res: Response, error: any) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  return res.status(500).json({ error: error.message || 'Internal Server Error' });
}
