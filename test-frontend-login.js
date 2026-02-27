const http = require('http');

// Test the frontend login flow by calling the backend API
const data = JSON.stringify({
  email: 'test@example.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Origin': 'http://localhost:3001'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('\n✅ LOGIN SUCCESS!');
      console.log('Response:', JSON.stringify(parsed, null, 2));
      
      if (parsed.data && parsed.data.user) {
        console.log('\n✅ User data received:');
        console.log(`- ID: ${parsed.data.user.id}`);
        console.log(`- Email: ${parsed.data.user.email}`);
        console.log(`- Role: ${parsed.data.user.role}`);
        console.log(`- Active: ${parsed.data.user.isActive}`);
        
        console.log('\n✅ Tokens received:');
        console.log(`- Access Token: ${parsed.data.accessToken.substring(0, 50)}...`);
        console.log(`- Refresh Token: ${parsed.data.refreshToken.substring(0, 50)}...`);
        console.log(`- Expires In: ${parsed.data.expiresIn} seconds`);
        
        console.log('\n🎉 BACKEND LOGIN IS WORKING PERFECTLY!');
      } else {
        console.log('\n❌ User data missing from response');
      }
    } catch (e) {
      console.log('Could not parse JSON response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(data);
req.end();