// Test importing the AuthenticationService directly from the compiled code
const { AuthenticationService } = require('./dist/services/AuthenticationService');
const { PrismaClient } = require('@prisma/client');

async function testDirectImport() {
  const prisma = new PrismaClient();
  const authService = new AuthenticationService(prisma);
  
  try {
    console.log('Testing direct import of AuthenticationService...');
    
    const result = await authService.login('test@example.com', 'password123');
    
    console.log('Direct import result:');
    console.log('Keys:', Object.keys(result));
    console.log('Has user field:', 'user' in result);
    
    if (result.user) {
      console.log('User object:', JSON.stringify(result.user, null, 2));
    }
    
    // Now test the route handler logic
    console.log('\nTesting route handler logic...');
    const responseData = result; // This is what the route handler does
    
    console.log('Response data keys:', Object.keys(responseData));
    console.log('Response has user field:', 'user' in responseData);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectImport();