import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔍 Checking for admin account...');
    
    const email = 'contact.homeintown@gmail.com';
    const password = 'Presold@2026';
    
    // Check if admin exists
    let admin = await prisma.user.findUnique({
      where: { email }
    });
    
    if (admin) {
      console.log('✅ Admin account exists');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Active:', admin.isActive);
      
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isActive: true,
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Admin password updated and account activated');
    } else {
      console.log('❌ Admin account not found, creating...');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          pendingApproval: false
        }
      });
      
      // Create leaderboard entry
      await prisma.leaderboard.upsert({
        where: { userId: admin.id },
        update: {},
        create: { userId: admin.id, xp: 0, streak: 0 }
      });
      
      console.log('✅ Admin account created successfully!');
    }
    
    // Test login
    console.log('\n🔐 Testing login...');
    const testUser = await prisma.user.findUnique({ where: { email } });
    const passwordMatch = await bcrypt.compare(password, testUser.password);
    
    if (passwordMatch) {
      console.log('✅ Password verification successful!');
      console.log('\n📋 Admin Credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
    } else {
      console.log('❌ Password verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
