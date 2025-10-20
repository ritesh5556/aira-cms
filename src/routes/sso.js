const jwt = require('jsonwebtoken');

const SSO_SECRET = process.env.SSO_JWT_SECRET || process.env.SSO_SHARED_SECRET;

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/sso-login',
      handler: async (ctx) => {
        console.log('🔵 ========== SSO LOGIN ENDPOINT HIT ==========');
        console.log('🔵 Query params:', ctx.query);
        console.log('🔵 SSO_SECRET configured:', !!SSO_SECRET);
        
        try {
          const { token } = ctx.query;
          if (!token) {
            console.log('❌ No token provided');
            return ctx.badRequest('Missing token');
          }

          let payload;
          try {
            payload = jwt.verify(token, SSO_SECRET);
            console.log('✅ Token verified successfully');
            console.log('🔵 Payload:', payload);
          } catch (err) {
            console.log('❌ Token verification failed:', err.message);
            return ctx.unauthorized('Invalid token: ' + err.message);
          }

          const email = payload.email;
          const firstname = payload.firstname || payload.name?.split(' ')[0] || email.split('@')[0];
          const lastname = payload.lastname || payload.name?.split(' ').slice(1).join(' ') || '';
          
          if (!email) {
            console.log('❌ No email in token payload');
            return ctx.badRequest('Email not found in token');
          }
          
          console.log('🔵 Looking for admin user with email:', email);

          // Check or create admin user
          let adminUser = await strapi.db.query('admin::user').findOne({
            where: { email }
          });

          if (!adminUser) {
            console.log('🔵 Admin user not found, creating new user');
            
            // Get Super Admin role
            const superAdminRole = await strapi.db.query('admin::role').findOne({
              where: { code: 'strapi-super-admin' },
            });
            
            if (!superAdminRole) {
              console.log('❌ Super Admin role not found');
              return ctx.internalServerError('Admin role configuration error');
            }
            
            console.log('🔵 Creating admin user with role ID:', superAdminRole.id);
            
            // Create an admin user
            adminUser = await strapi.db.query('admin::user').create({
              data: {
                firstname,
                lastname,
                username: email,
                email: email,
                isActive: true,
                roles: [superAdminRole.id],
              }
            });
            
            console.log('✅ Admin user created:', adminUser.id);
          } else {
            console.log('✅ Admin user found:', adminUser.id);
          }

          // Check if user is active
          if (!adminUser.isActive) {
            console.log('❌ User account is not active');
            return ctx.unauthorized('User account is not active');
          }
          
          console.log('🔵 Generating admin JWT token');
          
          // Generate admin JWT token
          const adminJWT = strapi.admin.services.token.createJwtToken(adminUser);
          
          console.log('✅ Admin JWT generated');
          console.log('🔵 Setting cookie: jwtToken');

          // Set the token as a cookie (CRITICAL: must be named 'jwtToken')
          ctx.cookies.set('jwtToken', adminJWT, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax'
          });
          
          console.log('✅ Cookie set, redirecting to /admin');
          console.log('🔵 ========== SSO LOGIN COMPLETE ==========');

          // Redirect to Strapi dashboard
          ctx.redirect('/admin');
          
        } catch (error) {
          console.log('❌ SSO login error:', error);
          return ctx.internalServerError('Authentication failed');
        }
      },
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
