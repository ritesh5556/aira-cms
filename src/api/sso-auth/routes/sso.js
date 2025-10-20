'use strict';

console.log('🔥 SSO Auth routes loaded');

module.exports = {
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
