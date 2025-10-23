const jwt = require('jsonwebtoken');

module.exports = {
  async login(ctx) {
    console.log('🔵 ========== SSO LOGIN ENDPOINT HIT ==========');
    console.log('🔵 Query params:', ctx.query);
    
    try {
      const { token } = ctx.query;

      if (!token) {
        return ctx.badRequest('Token is required');
      }

      // Verify your custom JWT token
      const jwtSecret = process.env.SSO_SECRET;
      console.log('🔵 SSO_SECRET configured:', !!jwtSecret);

      const decodedToken = jwt.verify(token, jwtSecret);
      console.log('✅ Token verified successfully');
      console.log('🔵 Payload:', decodedToken);

      const email = decodedToken.email;
      console.log('🔵 Looking for admin user with email:', email);

      // Find admin user
      let adminUser = await strapi.db.query('admin::user').findOne({
        where: { email },
        populate: ['roles'],
      });

      if (adminUser) {
        console.log('✅ Admin user found:', adminUser.id);
      } else {
        console.log('❌ Admin user not found');
        return ctx.badRequest('User not found');
      }

      console.log('🔵 Authenticating user with Strapi admin auth');

let adminJwtToken;

try {
  // Try multiple methods based on Strapi version
  if (strapi.admin && strapi.admin.services && strapi.admin.services.auth) {
    // Strapi v4 method
    adminJwtToken = strapi.admin.services.auth.createJwtToken(adminUser);
    console.log('✅ Used v4 auth service');
  } else if (strapi.service) {
    // Strapi v5 method
    const authService = strapi.service('admin::auth');
    adminJwtToken = authService.createJwtToken(adminUser);
    console.log('✅ Used v5 auth service');
  } else {
    throw new Error('No auth service found');
  }
} catch (error) {
  console.log('❌ Strapi auth failed, creating manual JWT:', error.message);
  
  // Manual JWT creation fallback
  const payload = {
    id: adminUser.id,
    email: adminUser.email,
    firstname: adminUser.firstname,
    lastname: adminUser.lastname,
    isActive: adminUser.isActive,
  };
  
  const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  adminJwtToken = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

// Set cookie and redirect
ctx.cookies.set('strapi_jwt', adminJwtToken, {
  httpOnly: true,
  secure: false, // Set to true in production
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  path: '/',
  sameSite: 'lax',
});

ctx.redirect('/admin');

      
    } catch (error) {
      console.log('❌ SSO login error:', error);
      return ctx.internalServerError('Authentication failed');
    }
  },
};
