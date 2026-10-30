import prisma, { trackingDb } from './src/config/database.js';

async function debugCheckIns() {
  try {
    console.log('🔍 Debugging Check-ins for Today\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Date Range:', {
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString()
    });
    console.log('');

    // Get all check-ins for today
    const checkIns = await trackingDb.checkInOut.findMany({
      where: {
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`📊 Found ${checkIns.length} check-ins in tracking database:\n`);

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
      console.log('Check-in ID:', checkIn.id);
      console.log('User ID:', checkIn.userId);
      console.log('User Name:', user?.name || 'NOT FOUND');
      console.log('User Email:', user?.email || 'NOT FOUND');
      console.log('Status:', checkIn.status);
      console.log('Check-in Time:', checkIn.checkInTime);
      console.log('Check-in Location:', {
        lat: checkIn.checkInLat,
        lng: checkIn.checkInLng,
        address: checkIn.checkInAddress
      });
      
      if (checkIn.checkOutTime) {
        console.log('Check-out Time:', checkIn.checkOutTime);
        console.log('Check-out Location:', {
          lat: checkIn.checkOutLat,
          lng: checkIn.checkOutLng,
          address: checkIn.checkOutAddress
        });
      }

      // Get location history
      const locationHistory = await trackingDb.locationHistory.findMany({
        where: {
          userId: checkIn.userId,
          timestamp: {
            gte: checkIn.checkInTime,
            ...(checkIn.checkOutTime && { lte: checkIn.checkOutTime })
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      console.log('Location Pings:', locationHistory.length);
      console.log('');
    }

    console.log('===================================');
    console.log('✅ Debug complete!');
    console.log('');
    
    // Check if Madhuri and Prathmesh are in the results
    const madhuri = checkIns.find(async (c) => {
      const u = await prisma.user.findUnique({ where: { id: c.userId } });
      return u?.name?.toLowerCase().includes('madhuri');
    });
    
    const prathmesh = checkIns.find(async (c) => {
      const u = await prisma.user.findUnique({ where: { id: c.userId } });
      return u?.name?.toLowerCase().includes('prathmesh');
    });

    console.log('🔎 Specific Users Check:');
    console.log('Madhuri found in check-ins:', madhuri ? 'YES' : 'NO');
    console.log('Prathmesh found in check-ins:', prathmesh ? 'YES' : 'NO');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

debugCheckIns();
