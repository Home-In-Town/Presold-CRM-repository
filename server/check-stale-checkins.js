import prisma, { trackingDb } from './src/config/database.js';

async function checkStaleCheckIns() {
  try {
    console.log('🔍 Checking for Stale Active Check-ins\n');

    // Find all users with CHECKED_IN status
    const activeCheckIns = await trackingDb.checkInOut.findMany({
      where: {
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`📊 Found ${activeCheckIns.length} active (CHECKED_IN) records:\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const checkIn of activeCheckIns) {
      const user = await prisma.user.findUnique({
        where: { id: checkIn.userId },
        select: { name: true, email: true }
      });

      const isToday = checkIn.checkInTime >= today;
      const daysAgo = Math.floor((new Date() - checkIn.checkInTime) / (1000 * 60 * 60 * 24));

      console.log('-----------------------------------');
      console.log('User:', user?.name || 'NOT FOUND');
      console.log('Check-in Time:', checkIn.checkInTime.toLocaleString());
      console.log('Days Ago:', daysAgo);
      console.log('Status:', checkIn.status);
      console.log('Is Today:', isToday ? 'YES ✅' : `NO ❌ (${daysAgo} days old)`);
      
      if (!isToday) {
        console.log('⚠️  STALE CHECK-IN - User cannot check in again until this is resolved!');
      }
      console.log('');
    }

    console.log('===================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

checkStaleCheckIns();
