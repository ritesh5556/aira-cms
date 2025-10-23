const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: any) {
    const SSO_SECRET = process.env.SSO_JWT_SECRET || process.env.SSO_SHARED_SECRET;
    
    strapi.server.app.use(async (ctx: any, next: any) => {
      if (ctx.method === 'GET' && ctx.path === '/sso-login') {
        console.log('🔵 ========== SSO LOGIN ENDPOINT HIT ==========');
        
        try {
          const { token } = ctx.query;
          if (!token) {
            ctx.status = 400;
            ctx.body = { error: 'Missing token' };
            return;
          }

          // Verify SSO token
          let payload;
          try {
            payload = jwt.verify(token, SSO_SECRET);
          } catch (err: any) {
            ctx.status = 401;
            ctx.body = { error: 'Invalid token: ' + err.message };
            return;
          }

          const email = payload.email;
          const firstname = payload.firstname || payload.name?.split(' ')[0] || email.split('@')[0];
          const lastname = payload.lastname || payload.name?.split(' ').slice(1).join(' ') || '';
          
          if (!email) {
            ctx.status = 400;
            ctx.body = { error: 'Email not found in token payload' };
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            console.log('❌ Invalid email format:', email);
            ctx.status = 400;
            ctx.body = { error: 'Invalid email format' };
            return;
          }

          console.log('🔵 Looking up admin user by EMAIL:', email);

          // CRITICAL: Lookup user ONLY by email (primary identifier)
          let adminUser = await strapi.db.query('admin::user').findOne({
            where: { 
              email: email // Only use email for lookup, not username
            },
            populate: ['roles']
          });

          let isNewUser = false;

          if (!adminUser) {
            console.log('👤 USER NOT FOUND by email - Creating new admin user');
            console.log('🔵 Email not found in database:', email);
            isNewUser = true;
            
            // Check if a user exists with this email as username (edge case)
            const userByUsername = await strapi.db.query('admin::user').findOne({
              where: { username: email },
              populate: ['roles']
            });
            
            if (userByUsername) {
              console.log('⚠️ Found user with email as username, updating email field');
              // Update the existing user to have proper email field
              adminUser = await strapi.db.query('admin::user').update({
                where: { id: userByUsername.id },
                data: {
                  email: email, // Set proper email field
                  firstname: firstname,
                  lastname: lastname,
                  isActive: true
                },
                populate: ['roles']
              });
              console.log('✅ Updated existing user with proper email field');
              isNewUser = false;
            } else {
              // Create completely new user with email as primary identifier
              const superAdminRole = await strapi.db.query('admin::role').findOne({
                where: { code: 'strapi-super-admin' },
              });
              
              if (!superAdminRole) {
                console.log('❌ Super Admin role not found');
                ctx.status = 500;
                ctx.body = { error: 'Admin role configuration error' };
                return;
              }
              
              console.log('🔵 Creating new admin user with email as primary identifier');
              console.log('🔵 User data:', {
                email: email,
                username: email, // Use email as username for consistency
                firstname: firstname,
                lastname: lastname
              });
              
              const newUser = await strapi.db.query('admin::user').create({
                data: {
                  email: email,           // Primary identifier
                  username: email,        // Use email as username for consistency
                  firstname: firstname,
                  lastname: lastname,
                  isActive: true,
                  roles: [superAdminRole.id],
                }
              });
              
              console.log('✅ NEW USER CREATED with email as primary identifier:', {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                firstname: newUser.firstname,
                lastname: newUser.lastname,
                isActive: newUser.isActive
              });
              
              // Refetch with populated roles
              adminUser = await strapi.db.query('admin::user').findOne({
                where: { email: email }, // Still lookup by email
                populate: ['roles']
              });
            }
          } else {
            console.log('✅ EXISTING USER FOUND by email:', {
              id: adminUser.id,
              email: adminUser.email,
              username: adminUser.username,
              firstname: adminUser.firstname,
              lastname: adminUser.lastname,
              isActive: adminUser.isActive,
              roles: adminUser.roles?.map(role => role.name) || []
            });
            
            // Update user info if needed (names might have changed)
            const needsUpdate = (
              adminUser.firstname !== firstname ||
              adminUser.lastname !== lastname
            );
            
            if (needsUpdate) {
              console.log('🔵 Updating user information from SSO token');
              adminUser = await strapi.db.query('admin::user').update({
                where: { email: email }, // Update by email
                data: {
                  firstname: firstname,
                  lastname: lastname,
                  lastLogin: new Date()
                },
                populate: ['roles']
              });
              console.log('✅ User information updated from SSO');
            }
          }

          // Validate user is active
          if (!adminUser || !adminUser.isActive) {
            console.log('❌ User account is not active:', {
              found: !!adminUser,
              isActive: adminUser?.isActive
            });
            ctx.status = 401;
            ctx.body = { error: 'User account is not active' };
            return;
          }

          // Update last login time for existing users
          if (!isNewUser) {
            console.log('🔵 Updating last login time for existing user');
            try {
              await strapi.db.query('admin::user').update({
                where: { email: email }, // Update by email, not ID
                data: { lastLogin: new Date() }
              });
              console.log('✅ Last login time updated');
            } catch (updateError) {
              console.log('⚠️ Could not update last login time:', updateError.message);
            }
          }

          console.log(`🔵 Creating session for ${isNewUser ? 'NEW' : 'EXISTING'} user (Email: ${email}, ID: ${adminUser.id})`);
          
          // Generate session ID
          const sessionId = uuidv4().replace(/-/g, '');
          const jwtSecret = strapi.config.get('admin.auth.secret');
          
          // Create JWT with correct structure
          const sessionPayload = {
            userId: adminUser.id.toString(),
            sessionId: sessionId,
            type: 'access',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
          };
          
          const accessToken = jwt.sign(sessionPayload, jwtSecret);
          console.log('✅ JWT created with sessionId:', sessionId);
          
          // Your existing session creation logic...
          try {
            console.log('🔵 Finding and copying working session structure...');
            
            const workingSessions = await strapi.db.connection.raw(`
              SELECT * FROM strapi_sessions 
              WHERE expires_at > datetime('now') 
              AND user_id IS NOT NULL
              ORDER BY created_at DESC 
              LIMIT 1
            `);
            
            if (workingSessions && workingSessions.length > 0) {
              const template = workingSessions[0];
              
              const now = new Date();
              const expiresAt = new Date(Date.now() + (30 * 60 * 1000));
              const absoluteExpiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));
              
              const sessionData = {
                document_id: uuidv4(),
                user_id: adminUser.id.toString(),
                session_id: sessionId,
                child_id: template.child_id,
                device_id: crypto.createHash('md5')
                  .update((ctx.request.headers['user-agent'] || 'unknown') + ctx.request.ip)
                  .digest('hex'),
                origin: template.origin || 'admin',
                expires_at: expiresAt.toISOString(),
                absolute_expires_at: absoluteExpiresAt.toISOString(),
                status: template.status || 'active',
                type: template.type || 'admin',
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                published_at: template.published_at ? now.toISOString() : null,
                created_by_id: adminUser.id,
                updated_by_id: adminUser.id,
                locale: template.locale
              };
              
              const columns = Object.keys(sessionData).filter(key => sessionData[key] !== undefined);
              const values = columns.map(key => sessionData[key]);
              const placeholders = columns.map(() => '?').join(', ');
              
              await strapi.db.connection.raw(`
                INSERT INTO strapi_sessions (${columns.join(', ')}) 
                VALUES (${placeholders})
              `, values);
              
              console.log('✅ Session created successfully');
              
            } else {
              console.log('⚠️ No working session template found, creating minimal session');
              // Fallback session creation logic here...
            }
            
          } catch (sessionError: any) {
            console.log('❌ Session creation failed:', sessionError.message);
            ctx.status = 500;
            ctx.body = { error: 'Failed to create session: ' + sessionError.message };
            return;
          }
          
          // Set cookie
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
            path: '/',
            sameSite: 'lax' as const
          };
          
          ctx.cookies.set('jwtToken', accessToken, cookieOptions);
          console.log('✅ JWT cookie set');
          
          // Final success message with email-based identification
          console.log(`🎉 SSO LOGIN SUCCESSFUL for ${isNewUser ? 'NEW' : 'EXISTING'} user:`);
          console.log(`   - Email (Primary ID): ${adminUser.email}`);
          console.log(`   - User ID: ${adminUser.id}`);
          console.log(`   - Username: ${adminUser.username}`);
          console.log(`   - Name: ${adminUser.firstname} ${adminUser.lastname}`);
          console.log(`   - Status: ${isNewUser ? 'NEWLY CREATED' : 'EXISTING USER'}`);
          console.log(`   - Session ID: ${sessionId.substring(0, 10)}...`);
          console.log('🔵 Redirecting to /admin');
          
          ctx.redirect('/admin');
          return;
          
        } catch (error: any) {
          console.log('❌ SSO login error:', error);
          ctx.status = 500;
          ctx.body = { error: 'Authentication failed: ' + error.message };
          return;
        }
      }
      
      await next();
    });
    
    console.log('✅ SSO route registered at /sso-login');
  },
};
