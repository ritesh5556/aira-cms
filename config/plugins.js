module.exports = ({ env }) => ({
  'sso-auth': {
    enabled: true,
    resolve: './src/plugins/sso-auth',
    config: {
      ssoSecret: env('SSO_SHARED_SECRET')
    }
  }
});