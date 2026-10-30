// Tracking Database Client
// Centralized import for the tracking Prisma client

let TrackingPrismaClient;
let trackingDb;

try {
  // Try to import from the generated location
  const module = await import('../../node_modules/.prisma/tracking-client/index.js');
  TrackingPrismaClient = module.PrismaClient;
  trackingDb = new TrackingPrismaClient();
  console.log('✅ Tracking database client loaded');
} catch (error) {
  console.error('❌ Failed to load tracking database client:', error.message);
  // Fallback: create a mock client that throws helpful errors
  class MockClient {
    constructor() {
      throw new Error('Tracking database client not available. Run: npx prisma generate --schema=./prisma/schema-tracking.prisma');
    }
  }
  TrackingPrismaClient = MockClient;
  trackingDb = null;
}

export { TrackingPrismaClient, trackingDb };
export default trackingDb;
