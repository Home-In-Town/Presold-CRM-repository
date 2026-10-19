import { PrismaClient } from '@prisma/client';
import { PrismaClient as TrackingPrismaClient } from '../../node_modules/.prisma/tracking-client/index.js';

// Main database (User, Team, Lead, etc.)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Tracking database (Meeting, Project, LocationHistory, CheckInOut)
// Uses TRACKING_DATABASE_URL from .env
const trackingDb = new TrackingPrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
export { trackingDb };
