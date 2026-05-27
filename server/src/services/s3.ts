import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.AWS_S3_BUCKET || '';
const CDN_BASE = process.env.AWS_CDN_BASE || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

/**
 * Generates a pre-signed PUT URL so the browser can upload directly to S3.
 * Returns the upload URL and the final public CDN URL.
 */
export async function generatePresignedUploadUrl(
  folder: string,
  fileName: string,
  contentType: string,
  expiresInSeconds = 120
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET is not configured.');

  // Sanitize filename and generate unique key
  const ext = fileName.split('.').pop() || 'jpg';
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const key = `${folder}/${uniqueId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  const publicUrl = `${CDN_BASE}/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Deletes an object from S3 by key.
 */
export async function deleteS3Object(key: string): Promise<void> {
  if (!BUCKET || !key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
