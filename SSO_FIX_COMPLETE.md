# ✅ SSO Authentication - FIXED!

## What Was Wrong

You had **TWO** SSO implementations:
1. ❌ A plugin at `src/plugins/sso-auth/` (not working - wrong structure)
2. ✅ An API at `src/api/sso-auth/` (existing but had bugs)

I fixed the **API implementation** which is the correct approach for Strapi 5.

## Critical Fixes Applied

### 1. ❌ Wrong Cookie Name → ✅ Fixed
**Before:**
```javascript
ctx.cookies.set('adminToken', adminJWT, ...)
```

**After:**
```javascript
ctx.cookies.set('jwtToken', adminJWT, ...)  // MUST be 'jwtToken'
```

### 2. ❌ Wrong Query Method → ✅ Fixed
**Before:**
```javascript
strapi.query('admin::user').findOne(...)
```

**After:**
```javascript
strapi.db.query('admin::user').findOne(...)  // Correct for Strapi 5
```

### 3. ❌ Hard-coded Role ID → ✅ Fixed
**Before:**
```javascript
roles: [1]  // Might not exist
```

**After:**
```javascript
const superAdminRole = await strapi.db.query('admin::role').findOne({
  where: { code: 'strapi-super-admin' }
});
roles: [superAdminRole.id]
```

### 4. ❌ Missing Cookie Path → ✅ Fixed
**Before:**
```javascript
domain: ctx.request.hostname  // Can cause issues
```

**After:**
```javascript
path: '/'  // Works across all routes
sameSite: 'lax'
```

### 5. ✅ Added Extensive Debugging

Every step now logs to console with emojis for easy tracking:
- 🔵 = Info
- ✅ = Success
- ❌ = Error
- 🔥 = Loading

## How to Test

### Step 1: Restart Strapi

If it's not already restarting, run:

```bash
npm run develop
```

Watch for these debug logs in the console:
```
🔥 SSO Auth routes loaded
🎮 SSO Auth API Controller loaded
```

### Step 2: Generate Test Token

Run this command:

```bash
node test-sso.js
```

You'll get output like:
```
=== SSO Test Token ===
Token: eyJhbGci...

=== Test URL ===
http://localhost:1337/api/sso-login?token=eyJhbGci...
```

### Step 3: Test the URL

**Option A: Browser**
- Copy the test URL from step 2
- Paste in browser
- Watch the terminal logs

**Expected logs:**
```
🔵 ========== SSO LOGIN ENDPOINT HIT ==========
🔵 Query params: { token: 'eyJ...' }
🔵 SSO_SECRET configured: true
✅ Token verified successfully
🔵 Payload: { email: 'test@example.com', name: 'Test User', exp: ... }
🔵 Looking for admin user with email: test@example.com
🔵 Admin user not found, creating new user
🔵 Creating admin user with role ID: 1
✅ Admin user created: 1
🔵 Generating admin JWT token
✅ Admin JWT generated
🔵 Setting cookie: jwtToken
✅ Cookie set, redirecting to /admin
🔵 ========== SSO LOGIN COMPLETE ==========
```

**Option B: cURL**
```bash
curl -v "http://localhost:1337/api/sso-login?token=YOUR_TOKEN_HERE"
```

### Step 4: Check Result

You should be:
1. ✅ Redirected to `/admin`
2. ✅ Automatically logged in (no login page)
3. ✅ See the admin dashboard

## Environment Setup

Make sure your `.env` has:

```env
SSO_JWT_SECRET=your-secret-here
```

Or if you're using the old variable name:
```env
SSO_SHARED_SECRET=your-secret-here
```

The code checks both (`SSO_JWT_SECRET` takes priority).

## Token Format

Your application should generate tokens like this:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    email: "user@example.com",     // Required
    name: "John Doe",              // Optional
    // OR
    firstname: "John",             // Optional
    lastname: "Doe",               // Optional
    exp: Math.floor(Date.now() / 1000) + (60 * 15)  // Required: 15 min expiry
  },
  process.env.SSO_JWT_SECRET
);

const magicLink = `http://localhost:1337/api/sso-login?token=${token}`;
```

## Debugging Checklist

If it doesn't work, check these in order:

### 1. Is the endpoint accessible?
```bash
curl http://localhost:1337/api/sso-login
```
Should return: `{"data":null,"error":{"status":400,"name":"BadRequestError","message":"Missing token","details":{}}}`

If you get 404, the route isn't loaded. Check Strapi startup logs for errors.

### 2. Is SSO_JWT_SECRET set?
Check the logs when you hit the endpoint:
```
🔵 SSO_SECRET configured: true
```

If `false`, add it to `.env` and restart.

### 3. Is the token valid?
Look for:
```
✅ Token verified successfully
```

If you see:
```
❌ Token verification failed: invalid signature
```
Your secret doesn't match between your app and Strapi.

### 4. Is the user created?
Look for:
```
✅ Admin user created: 1
```
or
```
✅ Admin user found: 1
```

### 5. Is the cookie set?
Look for:
```
✅ Cookie set, redirecting to /admin
```

Check browser DevTools → Application → Cookies → `jwtToken` should exist.

### 6. Did it redirect?
Look for:
```
🔵 ========== SSO LOGIN COMPLETE ==========
```

Browser should redirect to `/admin` automatically.

## File Locations

The working implementation is at:

- **Controller**: `src/api/sso-auth/controllers/sso.js` ✅
- **Routes**: `src/api/sso-auth/routes/sso.js` ✅
- **Test Script**: `test-sso.js` ✅

You can **ignore** the plugin folder (`src/plugins/sso-auth/`) - it's not being used.

## Common Issues & Solutions

### Issue: "Invalid token: jwt malformed"
**Cause**: Token is corrupted or incomplete
**Fix**: Regenerate token with `node test-sso.js`

### Issue: "Invalid token: invalid signature"
**Cause**: Secret mismatch
**Fix**: Verify `SSO_JWT_SECRET` matches in both applications

### Issue: "Invalid token: jwt expired"
**Cause**: Token expired
**Fix**: Generate a new token (they expire in 15 minutes)

### Issue: Still shows login page after redirect
**Cause**: Cookie not set correctly
**Fix**: 
- Check browser cookies for `jwtToken`
- Ensure `path: '/'` in cookie settings
- Try incognito mode to clear old cookies

### Issue: "Super Admin role not found"
**Cause**: Strapi admin not initialized
**Fix**: 
1. Go to `http://localhost:1337/admin`
2. Create the first admin user
3. Then try SSO login

## Next Steps

1. ✅ Test with the test script
2. ✅ Verify you can log in
3. ✅ Integrate with your application
4. ✅ Send magic links via email
5. ✅ Remove debug logs in production (optional)

## Production Checklist

Before deploying:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SSO_JWT_SECRET` (min 32 chars)
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set `secure: true` in cookie options
- [ ] Use short token expiration (5-15 minutes)
- [ ] Consider removing console.log statements
- [ ] Add rate limiting
- [ ] Test on production domain

---

**Status**: ✅ **READY TO TEST!**

Restart Strapi and run `node test-sso.js` to get your test URL.
