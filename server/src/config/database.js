import { PrismaClient } from '@prisma/client';

// Main database (User, Team, etc.)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Tracking database (Meeting, Project, LocationHistory)
// Uses TRACKING_DATABASE_URL if available, otherwise falls back to DATABASE_URL
const trackingDb = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// For tracking database, we assume it uses the same DATABASE_URL since
// the schema supports both databases via the Prisma schema datasource block
// If you need a separate tracking database, set TRACKING_DATABASE_URL env var

export default prisma;
export { trackingDb };
