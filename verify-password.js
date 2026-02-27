const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function verifyPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    console.log('Fetching test user...');
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true
      }
    });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('User found:', user.email);
    console.log('User active:', user.isActive);
    console.log('Password hash length:', user.passwordHash.length);
    console.log('Password hash starts with:', user.passwordHash.substring(0, 10));
    
    // Test password verification
    const testPassword = 'password123';
    console.log('\nTesting password verification...');
    
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('\nPassword is invalid. Creating new hash...');
      const newHash = await bcrypt.hash(testPassword, 12);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash }
      });
      
      console.log('Password hash updated for test user');
      
      // Verify new hash
      const newUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
        select: { passwordHash: true }
      });
      
      const newIsValid = await bcrypt.compare(testPassword, newUser.passwordHash);
      console.log('New password valid:', newIsValid);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPassword();