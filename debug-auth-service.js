const { PrismaClient } = require('@prisma/client');
const { AuthenticationService } = require('./dist/services/AuthenticationService');

async function debugAuthService() {
  const prisma = new PrismaClient();
  const authService = new AuthenticationService(prisma);
  
  try {
    console.log('Testing AuthenticationService.login...');
    
    const result = await authService.login('test@example.com', 'password123');
    
    console.log('Login result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\nResult keys:');
    Object.keys(result).forEach(key => {
      console.log(`- ${key}: ${typeof result[key]}`);
      if (key === 'user' && result[key]) {
        console.log('  User object keys:', Object.keys(result[key]));
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuthService();