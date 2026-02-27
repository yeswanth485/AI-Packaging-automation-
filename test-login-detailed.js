const http = require('http');

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
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('Full Response:');
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.data) {
        console.log('\nData fields:');
        Object.keys(parsed.data).forEach(key => {
          console.log(`- ${key}: ${typeof parsed.data[key]}`);
        });
        
        if (parsed.data.user) {
          console.log('\nUser object:');
          console.log(JSON.stringify(parsed.data.user, null, 2));
        } else {
          console.log('\n❌ User field is missing!');
        }
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