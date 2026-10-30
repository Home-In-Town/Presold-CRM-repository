import prisma, { trackingDb } from './src/config/database.js';

async function cleanupStaleCheckIns() {
  try {
    console.log('🧹 Cleaning up Stale Check-ins\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all CHECKED_IN records from before today
    const staleCheckIns = await trackingDb.checkInOut.findMany({
      where: {
        status: 'CHECKED_IN',
        checkInTime: {
          lt: today
        }
      }
    });

    console.log(`📊 Found ${staleCheckIns.length} stale check-ins to clean up\n`);

    let cleaned = 0;
    for (const checkIn of staleCheckIns) {
      const user = await prisma.user.findUnique({
        where: { id: checkIn.userId },
        select: { name: true }
      });

      console.log(`🔧 Auto-checking out: ${user?.name || checkIn.userId}`);
      console.log(`   Checked in: ${checkIn.checkInTime.toLocaleString()}`);

      // Auto checkout at end of check-in day (10 PM)
      const checkoutTime = new Date(checkIn.checkInTime);
      checkoutTime.setHours(22, 0, 0, 0); // 10 PM on check-in day

      await trackingDb.checkInOut.update({
        where: { id: checkIn.id },
        data: {
          status: 'CHECKED_OUT',
          checkOutTime: checkoutTime,
          checkOutLat: checkIn.checkInLat, // Use same location
          checkOutLng: checkIn.checkInLng,
          checkOutAddress: checkIn.checkInAddress || 'Auto checkout'
        }
      });

      cleaned++;
    }

    console.log(`\n✅ Successfully cleaned up ${cleaned} stale check-ins!`);
    console.log('Users can now check in normally.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

cleanupStaleCheckIns();
