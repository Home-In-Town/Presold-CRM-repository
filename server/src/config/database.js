import { PrismaClient } from '@prisma/client';

// Import tracking DB from centralized config
import { trackingDb as importedTrackingDb, TrackingPrismaClient } from './tracking-db.js';

// Main database (User, Team, Lead, etc.)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Re-export tracking database for backwards compatibility
const trackingDb = importedTrackingDb || new TrackingPrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
export { trackingDb };
