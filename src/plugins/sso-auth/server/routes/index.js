module.exports = [
  {
    method: 'GET',
    path: '/sso-login',
    handler: 'sso.login',
    config: {
      auth: false,
      policies: [],
    },
  },
];