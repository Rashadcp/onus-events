import { Request, Response } from 'express';
import { z } from 'zod';
import { generatePresignedUploadUrl } from '../../services/s3';
import { handleControllerError } from '../../utils/errorHelper';

const PresignRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.string().regex(/^image\//, 'Only image content types are allowed'),
  folder: z.string().default('inventory')
});

/**
 * POST /api/upload/presign
 * Returns a short-lived pre-signed S3 PUT URL.
 * The browser uploads directly to S3 using this URL (no file data passes through our server).
 * After upload, the browser saves the returned `publicUrl` as the item's imageUrl.
 */
export async function getPresignedUrl(req: Request, res: Response) {
  try {
    const validated = PresignRequestSchema.parse(req.body);

    const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl(
      validated.folder,
      validated.fileName,
      validated.contentType
    );

    return res.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
