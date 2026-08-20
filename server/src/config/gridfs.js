import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

let _client = null;
let _bucket = null;

async function getClient() {
  if (_client) return _client;
  _client = new MongoClient(process.env.DATABASE_URL);
  await _client.connect();
  return _client;
}

async function getBucket() {
  if (_bucket) return _bucket;
  const client = await getClient();
  const dbName = new URL(process.env.DATABASE_URL).pathname.replace('/', '');
  const db = client.db(dbName);
  _bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  return _bucket;
}

/**
 * Upload a buffer to MongoDB GridFS.
 * Returns a file ID string and a constructed URL path.
 *
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {Promise<{ url: string, fileId: string }>}
 */
export const uploadToGridFS = async (buffer, originalName, mimeType) => {
  const bucket = await getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(originalName, {
      contentType: mimeType,
      metadata: { originalName, mimeType }
    });

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);

    uploadStream.on('finish', () => {
      const fileId = uploadStream.id.toString();
      resolve({
        fileId,
        url: `/api/files/${fileId}`  // served via our express route
      });
    });

    uploadStream.on('error', reject);
  });
};

/**
 * Stream a file from GridFS to an Express response.
 */
export const streamFromGridFS = async (fileId, res) => {
  const bucket = await getBucket();
  const id = new ObjectId(fileId);

  // Check the file exists first
  const files = await bucket.find({ _id: id }).toArray();
  if (!files.length) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const file = files[0];
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  const downloadStream = bucket.openDownloadStream(id);
  downloadStream.on('error', () => res.status(500).end());
  downloadStream.pipe(res);
};

/**
 * Delete a file from GridFS by its ID string.
 */
export const deleteFromGridFS = async (fileId) => {
  try {
    const bucket = await getBucket();
    await bucket.delete(new ObjectId(fileId));
  } catch {
    // Ignore — file may not exist
  }
};
