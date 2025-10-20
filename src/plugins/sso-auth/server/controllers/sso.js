const jwt = require('jsonwebtoken');

console.log('🎮 SSO Controller loaded');

module.exports = {
  /**
   * SSO Login endpoint for Strapi Admin
   * Verifies your custom JWT and creates/logs in admin users
   */
  async login(ctx) {
    console.log('🔵 SSO Login endpoint hit!');
    console.log('🔵 Query params:', ctx.query);
    try {
      const { token } = ctx.query;

      if (!token) {
        return ctx.badRequest('Token is required');
      }

      // Verify your custom JWT token
      // Use your own JWT secret from environment variables
      const jwtSecret = process.env.SSO_JWT_SECRET || process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        strapi.log.error('SSO_JWT_SECRET or JWT_SECRET is not configured in environment variables');
        return ctx.internalServerError('SSO configuration error');
      }

      let decodedToken;
      try {
        decodedToken = jwt.verify(token, jwtSecret);
      } catch (error) {
        strapi.log.error('JWT verification failed:', error.message);
        return ctx.unauthorized('Invalid or expired token');
      }

      // Extract user data from your token
      // Adjust these fields based on your token structure
      const email = decodedToken.email;
      const firstname = decodedToken.firstname || decodedToken.name?.split(' ')[0] || email.split('@')[0];
      const lastname = decodedToken.lastname || decodedToken.name?.split(' ').slice(1).join(' ') || '';

      if (!email) {
        return ctx.badRequest('Email not found in token');
      }

      // Find or create ADMIN user (not users-permissions user)
      let adminUser = await strapi.db.query('admin::user').findOne({
        where: { email },
      });

      if (!adminUser) {
        // Create new admin user
        strapi.log.info(`Creating new admin user: ${email}`);
        
        // Get Super Admin role
        const superAdminRole = await strapi.db.query('admin::role').findOne({
          where: { code: 'strapi-super-admin' },
        });

        if (!superAdminRole) {
          strapi.log.error('Super Admin role not found');
          return ctx.internalServerError('Admin role configuration error');
        }

        adminUser = await strapi.db.query('admin::user').create({
          data: {
            firstname,
            lastname,
            email,
            username: email,
            isActive: true,
            roles: [superAdminRole.id],
          },
        });
      }

      // Check if user is active
      if (!adminUser.isActive) {
        return ctx.unauthorized('User account is not active');
      }

      // Generate admin JWT token using Strapi's admin token service
      const adminJwtToken = strapi.admin.services.token.createJwtToken(adminUser);

      // Set the token as a cookie (this is how Strapi admin authentication works)
      const cookieName = 'jwtToken';
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'lax',
      };

      ctx.cookies.set(cookieName, adminJwtToken, cookieOptions);

      // Redirect to admin panel - user will be automatically logged in
      ctx.redirect('/admin');
      
    } catch (error) {
      strapi.log.error('SSO login error:', error);
      return ctx.internalServerError('Authentication failed');
    }
  },
};
