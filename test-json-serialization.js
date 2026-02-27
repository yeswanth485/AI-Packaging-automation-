const { AuthenticationService } = require('./dist/services/AuthenticationService');
const { PrismaClient } = require('@prisma/client');

async function testJsonSerialization() {
  const prisma = new PrismaClient();
  const authService = new AuthenticationService(prisma);
  
  try {
    console.log('Testing JSON serialization...');
    
    const authToken = await authService.login('test@example.com', 'password123');
    
    console.log('Original authToken keys:', Object.keys(authToken));
    console.log('Original user present:', !!authToken.user);
    
    // Test JSON.stringify
    const jsonString = JSON.stringify(authToken);
    console.log('\nJSON string length:', jsonString.length);
    
    // Test JSON.parse
    const parsed = JSON.parse(jsonString);
    console.log('Parsed keys:', Object.keys(parsed));
    console.log('Parsed user present:', !!parsed.user);
    
    if (parsed.user) {
      console.log('Parsed user keys:', Object.keys(parsed.user));
    }
    
    // Test Express-style response
    const responseObject = {
      status: 'success',
      data: authToken
    };
    
    console.log('\nResponse object data keys:', Object.keys(responseObject.data));
    console.log('Response object user present:', !!responseObject.data.user);
    
    const responseJson = JSON.stringify(responseObject);
    const responseParsed = JSON.parse(responseJson);
    
    console.log('Response parsed data keys:', Object.keys(responseParsed.data));
    console.log('Response parsed user present:', !!responseParsed.data.user);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testJsonSerialization();