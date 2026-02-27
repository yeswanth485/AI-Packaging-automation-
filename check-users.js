const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`);
    });
    
    if (users.length === 0) {
      console.log('\nNo users found. Creating test user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: hashedPassword,
          role: 'CUSTOMER',
          subscriptionTier: 'FREE',
          isActive: true
        }
      });
      
      console.log('Test user created:', newUser.email);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();