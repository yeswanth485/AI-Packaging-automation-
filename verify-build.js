// Ultra-simple verification script
const fs = require('fs');
const path = require('path');

console.log('=================================');
console.log('BUILD VERIFICATION SCRIPT');
console.log('=================================');

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
console.log('Checking dist directory:', distPath);
console.log('Exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:', files);
  
  // Check for index-minimal.js
  const minimalPath = path.join(distPath, 'index-minimal.js');
  console.log('\nChecking index-minimal.js:', minimalPath);
  console.log('Exists:', fs.existsSync(minimalPath));
  
  if (fs.existsSync(minimalPath)) {
    const stats = fs.statSync(minimalPath);
    console.log('File size:', stats.size, 'bytes');
    console.log('✅ BUILD OUTPUT EXISTS');
  } else {
    console.log('❌ index-minimal.js NOT FOUND');
  }
} else {
  console.log('❌ dist DIRECTORY NOT FOUND');
}

console.log('=================================');
