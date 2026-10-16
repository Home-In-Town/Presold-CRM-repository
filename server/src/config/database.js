import { PrismaClient } from '@prisma/client';

// Main database (User, Team, etc.)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Tracking database (Meeting, Project, LocationHistory)
const trackingDb = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.TRACKING_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

export default prisma;
export { trackingDb };
