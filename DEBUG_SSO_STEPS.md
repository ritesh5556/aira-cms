# 🔍 SSO vs Manual Login Debugging Guide

## Problem
SSO authentication works (cookie is set, redirects succeed) but admin page is blank.
Manual login works perfectly.

## Root Cause
The JWT token payload structure from SSO doesn't match what Strapi expects from manual login.

---

## Step 1: Capture Manual Login JWT

### A. Log in manually
1. Open browser in **Incognito mode**
2. Press **F12** to open DevTools
3. Go to `http://localhost:1337/admin`
4. Log in with your admin credentials

### B. Get the JWT token
1. In DevTools → **Application** tab
2. Left sidebar → **Cookies** → `http://localhost:1337`
3. Find cookie named `jwtToken`
4. **Copy the entire Value** (starts with `eyJ...`)

### C. Decode the JWT
**Option 1: Online**
- Go to https://jwt.io
- Paste token in "Encoded" box
- Copy the "Payload" JSON

**Option 2: Command Line**
```bash
node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('YOUR_JWT_TOKEN_HERE'), null, 2))"
```

### D. Example of what you'll see
```json
{
  "id": 1,
  "firstname": "Ritesh",
  "lastname": "Sonawane",
  "username": "ritesh.sonawane@gmail.com",
  "email": "ritesh.sonawane@gmail.com",
  "roles": [1],
  "iat": 1761017000,
  "exp": 1763609000
}
```

**Save this exact structure!**

---

## Step 2: Compare with SSO JWT

The SSO JWT we're currently generating has:
```json
{
  "id": 2,
  "iat": ...,
  "exp": ...
}
```

This is **too minimal**. We need to match the manual login structure exactly.

---

## Step 3: Fix the SSO JWT Payload

Once you share the manual login JWT structure, I'll update `src/index.ts` to match it exactly.

Common required fields:
- `id` ✅
- `firstname`
- `lastname`  
- `username`
- `email`
- `roles` (array of role IDs, e.g., `[1]`)
- `iat` (issued at - auto-added by jwt.sign)
- `exp` (expiration - auto-added by jwt.sign)

---

## Step 4: Rebuild & Test

After fixing the payload:
```bash
npm run build
npm run develop
```

Test SSO:
```bash
node test-sso.js
```

---

## Quick Test Commands

### Decode SSO JWT from logs
When you run SSO login, copy the "Full JWT token" from terminal and decode:
```bash
node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('SSO_JWT_TOKEN'), null, 2))"
```

### Compare side by side
```bash
# Manual login JWT
node -e "console.log('MANUAL:', JSON.stringify(require('jsonwebtoken').decode('MANUAL_JWT'), null, 2))"

# SSO login JWT  
node -e "console.log('SSO:', JSON.stringify(require('jsonwebtoken').decode('SSO_JWT'), null, 2))"
```

They should be **identical in structure** (values will differ, structure must match).

---

## Next Steps

**Please share:**
1. The decoded JWT from manual login (step 1)
2. I'll update the code to match exactly
3. We rebuild and test

This will fix the blank page issue! 🎯
