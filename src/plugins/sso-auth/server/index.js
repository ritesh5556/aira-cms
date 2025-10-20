const controllers = require('./controllers');
const routes = require('./routes');

console.log('🔥 SSO Plugin server/index.js loaded');
console.log('🔥 Controllers:', Object.keys(controllers));
console.log('🔥 Routes:', routes);

module.exports = {
  controllers,
  routes: [
    {
      method: 'GET',
      path: '/sso-login',
      handler: 'sso.login',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};