import cron from 'node-cron';
import { trackingDb } from '../config/database.js';

/**
 * Monthly cleanup job - Runs on the 1st of every month at 00:01 AM
 * Deletes location history older than 2 months
 */
export function scheduleMonthlyCleanup() {
  // Run at 00:01 AM on the 1st day of every month
  cron.schedule('1 0 1 * *', async () => {
    console.log('🗑️  Starting monthly location cleanup job...');
    
    try {
      // Calculate date 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      twoMonthsAgo.setHours(0, 0, 0, 0);

      console.log(`Deleting location history older than: ${twoMonthsAgo.toISOString()}`);

      // Delete old location history
      const deletedLocations = await trackingDb.locationHistory.deleteMany({
        where: {
          timestamp: {
            lt: twoMonthsAgo
          }
        }
      });

      console.log(`✅ Deleted ${deletedLocations.count} old location records`);

      // Delete old check-in/check-out records
      const deletedCheckIns = await trackingDb.checkInOut.deleteMany({
        where: {
          checkInTime: {
            lt: twoMonthsAgo
          }
        }
      });

      console.log(`✅ Deleted ${deletedCheckIns.count} old check-in records`);

      console.log('✅ Monthly cleanup completed successfully');
    } catch (error) {
      console.error('❌ Monthly cleanup failed:', error);
    }
  });

  console.log('📅 Monthly cleanup job scheduled (runs on 1st of every month at 00:01 AM)');
}

/**
 * Manual cleanup function - Can be called via API endpoint
 * @param {number} monthsToKeep - Number of months of data to keep (default: 2)
 */
export async function runManualCleanup(monthsToKeep = 2) {
  console.log(`🗑️  Running manual cleanup (keeping last ${monthsToKeep} months)...`);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    cutoffDate.setHours(0, 0, 0, 0);

    console.log(`Deleting records older than: ${cutoffDate.toISOString()}`);

    const [deletedLocations, deletedCheckIns] = await Promise.all([
      trackingDb.locationHistory.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      }),
      trackingDb.checkInOut.deleteMany({
        where: {
          checkInTime: {
            lt: cutoffDate
          }
        }
      })
    ]);

    const result = {
      success: true,
      deletedLocations: deletedLocations.count,
      deletedCheckIns: deletedCheckIns.count,
      cutoffDate: cutoffDate.toISOString()
    };

    console.log(`✅ Manual cleanup completed:`, result);
    return result;
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    throw error;
  }
}
