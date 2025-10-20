# SSO Magic Link - Quick Setup Guide

## ✅ What's Been Implemented

The SSO authentication plugin is now fully configured and ready to use. Here's what was built:

### 1. Plugin Structure
```
src/plugins/sso-auth/
├── server/
│   ├── controllers/
│   │   ├── index.js
│   │   └── sso.js          # Main SSO logic
│   ├── routes/
│   │   └── index.js        # Defines /api/sso-login endpoint
│   └── index.js
├── index.js
├── strapi-server.js
├── package.json
├── README.md
└── EXAMPLE_USAGE.md
```

### 2. Key Features
- ✅ JWT token verification using your custom secret
- ✅ Automatic admin user creation
- ✅ Admin session generation
- ✅ HTTP-only cookie authentication
- ✅ Automatic redirect to `/admin`
- ✅ Proper error handling and logging

### 3. API Endpoint
**GET** `/api/sso-login?token=YOUR_JWT_TOKEN`

This endpoint:
1. Verifies your JWT token
2. Creates/fetches admin user by email
3. Generates Strapi admin session
4. Sets authentication cookie
5. Redirects to `/admin` (user is logged in)

## 🚀 Next Steps

### Step 1: Install Dependencies

The plugin uses `jsonwebtoken` which is already in the plugin's package.json. Install it:

```bash
cd src/plugins/sso-auth
npm install
cd ../../..
```

### Step 2: Configure Environment Variables

Add to your `.env` file (create from `.env.example` if needed):

```env
SSO_JWT_SECRET=your-shared-secret-key-here
```

**CRITICAL**: This secret must be the **exact same secret** you use in your application to generate JWT tokens.

### Step 3: Restart Strapi

```bash
npm run develop
```

### Step 4: Generate JWT in Your Application

Your application needs to generate JWT tokens with this structure:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    email: "user@example.com",    // Required
    name: "John Doe",             // Optional
    firstname: "John",            // Optional (alternative to name)
    lastname: "Doe",              // Optional (alternative to name)
    exp: Math.floor(Date.now() / 1000) + (60 * 15) // 15 min expiry
  },
  process.env.SSO_JWT_SECRET
);

const magicLink = `http://localhost:1337/api/sso-login?token=${token}`;
// Send this link via email
```

### Step 5: Test the Flow

#### Quick Test (Manual):

1. Generate a test token:
```bash
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({email: 'test@example.com', name: 'Test User', exp: Math.floor(Date.now()/1000) + 900}, 'YOUR_SECRET_HERE'));"
```

2. Visit the URL:
```
http://localhost:1337/api/sso-login?token=PASTE_TOKEN_HERE
```

3. You should be redirected to `/admin` and automatically logged in!

## 📋 Token Payload Requirements

### Required Fields
- `email`: User's email address (string)
- `exp`: Expiration timestamp (number)

### Optional Fields
- `name`: Full name (string) - will be split into firstname/lastname
- `firstname`: First name (string) - takes precedence over name
- `lastname`: Last name (string) - takes precedence over name

### Example Token Payload
```json
{
  "email": "admin@example.com",
  "name": "John Doe",
  "exp": 1698765432
}
```

## 🔧 Customization

### Change User Role

By default, new users get **Super Admin** role. To change:

Edit `src/plugins/sso-auth/server/controllers/sso.js` line 53:

```javascript
// Current (Super Admin):
const superAdminRole = await strapi.db.query('admin::role').findOne({
  where: { code: 'strapi-super-admin' },
});

// Change to Editor:
const role = await strapi.db.query('admin::role').findOne({
  where: { code: 'strapi-editor' },
});

// Change to Author:
const role = await strapi.db.query('admin::role').findOne({
  where: { code: 'strapi-author' },
});
```

### Change Token Expiry Handling

Token expiry is handled by JWT library automatically. To change expiration in your app, modify the `exp` claim when generating tokens.

### Change Cookie Settings

Edit `src/plugins/sso-auth/server/controllers/sso.js` lines 84-90 to customize cookie behavior (expiry, domain, etc).

## 🐛 Troubleshooting

### Issue: "Invalid or expired token"

**Solution**: 
- Verify `SSO_JWT_SECRET` is identical in both applications
- Check token hasn't expired (exp claim)
- Ensure token is properly URL-encoded

### Issue: Shows login page instead of dashboard

**Solutions**:
- Check browser developer tools → Application → Cookies
- Verify `jwtToken` cookie is set
- In production, ensure you're using HTTPS (required for secure cookies)
- Check cookie domain settings

### Issue: "Super Admin role not found"

**Solution**: 
- Complete the initial Strapi admin setup first
- Run `npm run develop` and create the first admin user through the UI
- Then try SSO login

### Issue: User created but wrong permissions

**Solution**: 
- Check the role assignment in the controller (see Customization section)
- Manually update user role in Strapi admin: Settings → Users

## 📚 Additional Resources

- **Full documentation**: `src/plugins/sso-auth/README.md`
- **Usage examples**: `src/plugins/sso-auth/EXAMPLE_USAGE.md`
- **Strapi docs**: https://docs.strapi.io

## 🔐 Security Checklist

Before deploying to production:

- [ ] Use a strong SSO_JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS
- [ ] Set secure cookie flag in production
- [ ] Use short token expiration (5-15 minutes)
- [ ] Implement rate limiting on magic link generation
- [ ] Add email verification before sending magic links
- [ ] Monitor authentication logs
- [ ] Consider one-time token usage
- [ ] Validate email domains if needed
- [ ] Test token expiry handling

## 💡 Tips

1. **Test locally first** with the manual test method above
2. **Use separate secrets** for dev and production
3. **Log all authentication attempts** for security auditing
4. **Send magic links only to verified emails**
5. **Consider adding 2FA** for additional security

## Need Help?

Check the plugin's README and EXAMPLE_USAGE files for detailed information and code examples.

---

**Status**: ✅ Ready to use! Just add your `SSO_JWT_SECRET` to `.env` and restart Strapi.
