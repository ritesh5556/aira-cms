console.log('🔥 Loading strapi-server.js');

const serverModule = require('./server');

console.log('🔥 Server module loaded:', typeof serverModule);
console.log('🔥 Server module keys:', Object.keys(serverModule));

module.exports = serverModule;