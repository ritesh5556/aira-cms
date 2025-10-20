// import type { Core } from '@strapi/strapi';
const jwt = require('jsonwebtoken');

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: any) {
    const SSO_SECRET = process.env.SSO_JWT_SECRET || process.env.SSO_SHARED_SECRET;
    
    // Add SSO route using Koa router
    strapi.server.app.use(async (ctx: any, next: any) => {
      if (ctx.method === 'GET' && ctx.path === '/sso-login') {
        console.log('🔵 ========== SSO LOGIN ENDPOINT HIT ==========');
        console.log('🔵 Query params:', ctx.query);
        console.log('🔵 SSO_SECRET configured:', !!SSO_SECRET);
        
        try {
          const { token } = ctx.query;
          if (!token) {
            console.log('❌ No token provided');
            ctx.status = 400;
            ctx.body = { error: 'Missing token' };
            return;
          }

          let payload;
          try {
            payload = jwt.verify(token, SSO_SECRET);
            console.log('✅ Token verified successfully');
            console.log('🔵 Payload:', payload);
          } catch (err: any) {
            console.log('❌ Token verification failed:', err.message);
            ctx.status = 401;
            ctx.body = { error: 'Invalid token: ' + err.message };
            return;
          }

          const email = payload.email;
          const firstname = payload.firstname || payload.name?.split(' ')[0] || email.split('@')[0];
          const lastname = payload.lastname || payload.name?.split(' ').slice(1).join(' ') || '';
          
          if (!email) {
            console.log('❌ No email in token payload');
            ctx.status = 400;
            ctx.body = { error: 'Email not found in token' };
            return;
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
              ctx.status = 500;
              ctx.body = { error: 'Admin role configuration error' };
              return;
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
            ctx.status = 401;
            ctx.body = { error: 'User account is not active' };
            return;
          }
          
          console.log('🔵 Generating admin JWT token');
          
          // Generate admin JWT token using Strapi 5 method
          // First, check what methods are available
          console.log('🔵 Available token service methods:', Object.keys(strapi.service('admin::token')));
          
          // Try the correct method - in Strapi 5 it's just 'createToken'
          const adminJWT = strapi.service('admin::token').createToken(adminUser);
          
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
          return;
          
        } catch (error: any) {
          console.log('❌ SSO login error:', error);
          ctx.status = 500;
          ctx.body = { error: 'Authentication failed' };
          return;
        }
      }
      
      await next();
    });
    
    console.log('✅ SSO route registered at /sso-login');
  },
};
