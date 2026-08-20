import { Readable } from 'stream';
import cloudinary from './cloudinary.js';

/**
 * Upload a buffer to Cloudinary.
 * Returns the secure_url and public_id.
 *
 * @param {Buffer} buffer - file buffer from multer memoryStorage
 * @param {object} options - cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: 'presold-crm',
      resource_type: 'auto',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    // Pipe the buffer into the upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};
