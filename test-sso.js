// Test SSO Token Generator
const jwt = require('jsonwebtoken');

// Read your SSO_JWT_SECRET from .env
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'your-shared-secret-key-here';

// Generate a test token
const token = jwt.sign(
  {
    email: "riteshsonawane34622@gmail.com",
    name: "Ritesh Sonawane",
    exp: Math.floor(Date.now() / 1000) + (60 * 15) // 15 minutes
  },
  SSO_JWT_SECRET
);

console.log('\n=== SSO Test Token ===\n');
console.log('Token:', token);
console.log('\n=== Test URL ===\n');
console.log(`http://localhost:1337/sso-login?token=${token}`);
console.log('\n=== Token Payload ===\n');
console.log(jwt.decode(token));
console.log('\n');
