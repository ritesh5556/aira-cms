console.log('🚀 SSO Plugin main index.js loaded');

module.exports = {
  register({ strapi }) {
    console.log('✅ SSO Plugin registered');
  },
  
  bootstrap({ strapi }) {
    console.log('✅ SSO Plugin bootstrapped');
  },
};