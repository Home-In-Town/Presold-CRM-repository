import prisma, { trackingDb } from './src/config/database.js';

async function debugAllCheckIns() {
  try {
    console.log('🔍 Debugging ALL Recent Check-ins\n');

    // Get last 10 check-ins regardless of date
    const checkIns = await trackingDb.checkInOut.findMany({
      orderBy: {
        checkInTime: 'desc'
      },
      take: 10
    });

    console.log(`📊 Found ${checkIns.length} recent check-ins:\n`);

    for (const checkIn of checkIns) {
      // Get user info from main database
      const user = await prisma.user.findUnique({
        where: { id: checkIn.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      console.log('-----------------------------------');
      console.log('User:', user?.name || 'NOT FOUND', `(${user?.email || 'N/A'})`);
      console.log('Check-in Time:', checkIn.checkInTime);
      console.log('Status:', checkIn.status);
      console.log('Check-in Location:', checkIn.checkInLat ? `${checkIn.checkInLat}, ${checkIn.checkInLng}` : 'NO LOCATION');
      if (checkIn.checkOutTime) {
        console.log('Check-out Time:', checkIn.checkOutTime);
      }
      console.log('');
    }

    console.log('===================================\n');

    // Now check for Prathmesh specifically
    const allUsers = await prisma.user.findMany({
      select: {
          id: true,
          name: true,
          email: true
        }
    });

    const prathmeshUser = allUsers.find(u => u.name?.toLowerCase().includes('prathmesh'));
    
    if (prathmeshUser) {
      console.log('👤 Found Prathmesh:', prathmeshUser);
      
      const prathmeshCheckIns = await trackingDb.checkInOut.findMany({
        where: {
          userId: prathmeshUser.id
        },
        orderBy: {
          checkInTime: 'desc'
        },
        take: 5
      });
      
      console.log(`\n📊 Prathmesh's last ${prathmeshCheckIns.length} check-ins:`);
      prathmeshCheckIns.forEach((ci, idx) => {
        console.log(`  ${idx + 1}. ${ci.checkInTime.toLocaleString()} - Status: ${ci.status}`);
      });
    } else {
      console.log('❌ Prathmesh user not found in main database!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

debugAllCheckIns();
