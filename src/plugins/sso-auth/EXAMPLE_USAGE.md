# SSO Magic Link - Example Usage

## Example 1: Node.js/Express Application

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET;

// Email configuration
const transporter = nodemailer.createTransport({
  // Your email service config
});

app.post('/send-magic-link', async (req, res) => {
  const { email } = req.body;
  
  // Validate email
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    {
      email,
      name: email.split('@')[0], // or fetch from your database
      exp: Math.floor(Date.now() / 1000) + (60 * 15), // 15 minutes
    },
    SSO_JWT_SECRET
  );
  
  // Create magic link
  const magicLink = `${STRAPI_URL}/api/sso-login?token=${token}`;
  
  // Send email
  await transporter.sendMail({
    from: 'noreply@yourapp.com',
    to: email,
    subject: 'Your Admin Login Link',
    html: `
      <h2>Click below to log into the admin panel</h2>
      <p><a href="${magicLink}">Log in to Admin Dashboard</a></p>
      <p>This link expires in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
  
  res.json({ 
    success: true, 
    message: 'Magic link sent to your email' 
  });
});
```

## Example 2: Next.js API Route

```typescript
// app/api/send-magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET!;

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  
  if (!email) {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }
  
  // Generate JWT
  const token = jwt.sign(
    {
      email,
      name: name || email.split('@')[0],
      exp: Math.floor(Date.now() / 1000) + (60 * 15),
    },
    SSO_JWT_SECRET
  );
  
  const magicLink = `${STRAPI_URL}/api/sso-login?token=${token}`;
  
  // Send email using Resend
  await resend.emails.send({
    from: 'Admin <noreply@yourapp.com>',
    to: email,
    subject: 'Your Admin Login Link',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Admin Access Link</h2>
        <p>Click the button below to access the admin dashboard:</p>
        <a href="${magicLink}" 
           style="display: inline-block; background-color: #4F46E5; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                  margin: 20px 0;">
          Access Admin Dashboard
        </a>
        <p style="color: #666; font-size: 14px;">
          This link expires in 15 minutes.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'Magic link sent successfully'
  });
}
```

## Example 3: Frontend Form Component (React)

```tsx
// components/AdminLoginForm.tsx
import { useState } from 'react';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Check your email for the login link!');
        setEmail('');
      } else {
        setMessage('❌ ' + (data.error || 'Something went wrong'));
      }
    } catch (error) {
      setMessage('❌ Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="admin@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md 
                     hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      {message && (
        <p className="mt-4 text-sm text-center">{message}</p>
      )}
    </div>
  );
}
```

## Example 4: Testing with cURL

```bash
# 1. Generate a test token (replace YOUR_SECRET with your SSO_JWT_SECRET)
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({email: 'test@example.com', name: 'Test User', exp: Math.floor(Date.now()/1000) + 900}, 'YOUR_SECRET'));" )

# 2. Test the SSO endpoint
curl -v "http://localhost:1337/api/sso-login?token=${TOKEN}"

# You should see a 302 redirect to /admin
```

## Example 5: Python/Flask Application

```python
import jwt
import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_mail import Mail, Message

app = Flask(__name__)
mail = Mail(app)

STRAPI_URL = os.getenv('STRAPI_URL', 'http://localhost:1337')
SSO_JWT_SECRET = os.getenv('SSO_JWT_SECRET')

@app.route('/send-magic-link', methods=['POST'])
def send_magic_link():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    # Generate JWT token
    payload = {
        'email': email,
        'name': email.split('@')[0],
        'exp': datetime.utcnow() + timedelta(minutes=15)
    }
    
    token = jwt.encode(payload, SSO_JWT_SECRET, algorithm='HS256')
    magic_link = f"{STRAPI_URL}/api/sso-login?token={token}"
    
    # Send email
    msg = Message(
        subject='Your Admin Login Link',
        recipients=[email],
        html=f'''
            <h2>Click below to log into the admin panel</h2>
            <p><a href="{magic_link}">Log in to Admin Dashboard</a></p>
            <p>This link expires in 15 minutes.</p>
        '''
    )
    mail.send(msg)
    
    return jsonify({
        'success': True,
        'message': 'Magic link sent successfully'
    })
```

## Environment Variables Setup

Make sure both your application and Strapi have the same secret:

### Your Application `.env`
```env
SSO_JWT_SECRET=your-super-secret-key-here-min-32-chars
STRAPI_URL=http://localhost:1337
```

### Strapi `.env`
```env
SSO_JWT_SECRET=your-super-secret-key-here-min-32-chars
```

## Security Best Practices

1. **Use strong secrets**: Minimum 32 characters, randomly generated
2. **Short expiration**: 5-15 minutes maximum
3. **HTTPS only**: In production, use secure connections
4. **Rate limiting**: Limit magic link requests per email/IP
5. **Email verification**: Only send to verified email addresses
6. **Audit logs**: Log all login attempts

## Testing Checklist

- [ ] Token generation works with correct secret
- [ ] Email sending works
- [ ] Magic link redirects to `/admin`
- [ ] User is automatically logged in
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] New users are created correctly
- [ ] Existing users can log in
- [ ] Cookie is set with correct settings
- [ ] Works in production with HTTPS
