import { apiFetch } from '../utils/apiClient';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Requests a pre-signed S3 PUT URL from the server,
 * then uploads the file directly from the browser to S3.
 *
 * @returns The public CDN URL of the uploaded image (saved to DB as imageUrl).
 */
export async function uploadImageToS3(
  file: File,
  folder = 'inventory'
): Promise<string> {
  // 1. Get pre-signed upload URL from our backend
  const presign: PresignResponse = await apiFetch('/api/upload/presign', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder
    })
  });

  // 2. PUT the file directly to S3 (no file data goes through our server)
  const s3Response = await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  if (!s3Response.ok) {
    throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
  }

  // 3. Return the public URL (saved in the DB as imageUrl)
  return presign.publicUrl;
}
