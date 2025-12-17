# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### ❌ **Issue: Port 5000 already in use**

**Error Message:**
```
ERROR: Port 5000 is already in use!
EADDRINUSE: address already in use :::5000
```

**Solution 1: Use the starter script (Recommended)**
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```
The script automatically kills any process using port 5000.

**Solution 2: Manual kill**

**Windows:**
```bash
# Find the process
netstat -ano | findstr :5000

# Kill it (replace PID with actual number)
taskkill /F /PID <PID>

# Start server
npm run dev
```

**Linux/Mac:**
```bash
# Find and kill
lsof -ti:5000 | xargs kill -9

# Or one-liner
kill -9 $(lsof -t -i:5000)

# Start server
npm run dev
```

**Solution 3: Change port**
Edit `.env`:
```env
PORT=3000  # or any other available port
```

---

### ❌ **Issue: Nodemon crashes/won't start**

**Error Message:**
```
[nodemon] app crashed - waiting for file changes before starting...
```

**Solutions:**

**1. Check for syntax errors**
```bash
node server.js
# Will show any JavaScript errors
```

**2. Clear node_modules and reinstall**
```bash
rm -rf node_modules package-lock.json
npm install
```

**3. Update nodemon**
```bash
npm install -g nodemon
npm install --save-dev nodemon@latest
```

**4. Use node directly**
```bash
node server.js
# If this works, issue is with nodemon
```

---

### ❌ **Issue: MongoDB connection failed**

**Error Messages:**
```
MongoDB connection failed
MongoServerError: bad auth
ENOTFOUND cluster.mongodb.net
```

**Solutions:**

**1. Check MONGO_URI in .env**
```bash
# Verify it's set correctly
cat .env | grep MONGO_URI
```

**2. Verify MongoDB Atlas settings**
- Go to MongoDB Atlas dashboard
- Check "Network Access" → Add your IP (or 0.0.0.0/0 for testing)
- Check "Database Access" → Verify user credentials

**3. Test connection string**
```bash
# Try connecting with mongo shell
mongosh "your-connection-string"
```

**4. Check internet connection**
```bash
ping cluster0.mongodb.net
```

**5. Update connection string format**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

---

### ❌ **Issue: "Invalid token" or "Unauthorized"**

**Error Messages:**
```
"error": "Unauthorized - Invalid token"
"error": "Unauthorized - Token expired"
```

**Solutions:**

**1. Token expired (7 days)**
- Login again to get a new token
- Tokens expire after 7 days for security

**2. Verify JWT_SECRET**
```bash
# Check .env
cat .env | grep JWT_SECRET

# Must be set and same as when token was created
```

**3. Check Authorization header format**
```bash
# Correct format:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Common mistakes:
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Missing "Bearer "
Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Wrong case
```

**4. Verify token in request**
```javascript
// In Postman/Insomnia
// Header: Authorization
// Value: Bearer YOUR_TOKEN_HERE
```

---

### ❌ **Issue: Validation errors**

**Error Message:**
```
"error": "Validation failed"
"errors": [...]
```

**Solutions:**

**1. Check email format**
```json
{
  "email": "user@example.com",  // ✓ Valid
  "email": "userexample.com",   // ✗ Invalid
  "email": "user@example"       // ✗ Invalid
}
```

**2. Password length**
```json
{
  "password": "test123456"  // ✓ Valid (6+ chars)
  "password": "test"        // ✗ Invalid (< 6 chars)
}
```

**3. Valid roles**
```json
{
  "role": "admin"     // ✓ Valid
  "role": "superuser" // ✗ Invalid
}

// Valid roles: admin, ceo, it, law, hr, media, finance, manager
```

**4. Required fields**
```json
{
  "email": "required",
  "password": "required",
  "role": "required",
  "firstName": "required",
  "lastName": "required",
  "phone": "optional",
  "department": "optional"
}
```

---

### ❌ **Issue: Rate limit exceeded**

**Error Message:**
```
"error": "Too many requests from this IP, please try again later."
```

**Solution:**
- Wait 15 minutes
- Rate limits:
  - General API: 100 requests per 15 minutes
  - Auth routes: 10 requests per 15 minutes

**For development, temporarily disable:**
```javascript
// In server.js, comment out:
// app.use(limiter);
// app.use('/api/auth', authLimiter, authRoutes);

// Use instead:
app.use('/api/auth', authRoutes);
```

---

### ❌ **Issue: CORS errors**

**Error Message (in browser):**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solutions:**

**1. Update CORS_ORIGIN in .env**
```env
# For development
CORS_ORIGIN=*

# For production (specific domain)
CORS_ORIGIN=https://yourdomain.com
```

**2. Restart server after changing .env**
```bash
# Ctrl+C to stop
npm run dev
```

**3. Check if frontend and backend ports match**
```
Frontend: http://localhost:3000
Backend:  http://localhost:5000  # Make sure using correct port
```

---

### ❌ **Issue: Dependencies not found**

**Error Message:**
```
Cannot find module 'express'
Cannot find module 'mongoose'
```

**Solutions:**

**1. Install dependencies**
```bash
npm install
```

**2. Clear cache and reinstall**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**3. Check Node version**
```bash
node --version  # Should be 18.0.0 or higher
```

---

### ❌ **Issue: Server won't stop**

**Problem:** Server keeps running even after Ctrl+C

**Solutions:**

**Windows:**
```bash
# Find node processes
tasklist | findstr node

# Kill all node processes
taskkill /F /IM node.exe
```

**Linux/Mac:**
```bash
# Kill all node processes
pkill -9 node

# Or specific port
kill -9 $(lsof -t -i:5000)
```

---

### ❌ **Issue: Environment variables not loading**

**Error:** Server uses default values instead of .env values

**Solutions:**

**1. Check .env file location**
```bash
# Must be in backend/ folder
backend/
  └── .env  # ← Here
  └── server.js
```

**2. Verify dotenv is called first**
```javascript
// server.js - First line must be:
require('dotenv').config();
```

**3. Check .env format**
```env
# Correct:
PORT=5000
JWT_SECRET=mysecret

# Incorrect:
PORT = 5000  # No spaces
PORT: 5000   # No colons
```

**4. Restart server after .env changes**

---

### ❌ **Issue: Duplicate email error**

**Error Message:**
```
"error": "email already exists"
E11000 duplicate key error
```

**Solution:**
```json
// User already registered with that email
// Use different email or delete existing user

// To delete from MongoDB:
// Use MongoDB Compass or Atlas web interface
```

---

### ❌ **Issue: Cannot access department routes**

**Error:** 403 Forbidden when accessing /api/dept/admin

**Solutions:**

**1. Verify you're authenticated**
```bash
# Must include Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/dept/admin/dashboard
```

**2. Check user role**
```bash
# Admin routes require admin role
# HR routes require hr role, etc.

# Get your profile to see your role:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth/me
```

**3. Login with correct role**
```bash
# Register user with correct role
{
  "role": "admin"  # For /api/dept/admin
  "role": "hr"     # For /api/dept/hr
}
```

---

## Performance Issues

### Server is slow

**Solutions:**

**1. Check database indexes**
```javascript
// Indexes already configured in User model:
// - email (unique)
// - role
// - isActive
```

**2. Monitor MongoDB queries**
```bash
# Enable query logging in server.js
mongoose.set('debug', true);
```

**3. Check system resources**
```bash
# Windows
taskmgr

# Linux/Mac
top
htop
```

---

## Debugging Tips

### Enable verbose logging

**1. MongoDB connection**
```javascript
// In config/db.js
mongoose.set('debug', true);
```

**2. More detailed errors**
```env
# In .env
NODE_ENV=development  # Shows stack traces
```

**3. Request logging**
```javascript
// Already enabled via morgan in development
```

### Test individual components

**1. Test MongoDB connection**
```bash
node -e "require('./config/db')();"
```

**2. Test user creation**
```bash
node -e "require('./models/User'); console.log('User model OK');"
```

**3. Test routes**
```bash
curl http://localhost:5000/health
```

---

## Getting Help

### Before asking for help:

1. ✅ Check this troubleshooting guide
2. ✅ Read error messages carefully
3. ✅ Check server logs/console
4. ✅ Verify .env configuration
5. ✅ Try restarting the server
6. ✅ Check MongoDB Atlas status

### Information to provide:

- Error message (full stack trace)
- Steps to reproduce
- Your environment (OS, Node version)
- .env configuration (hide sensitive data)
- Server logs

---

## Quick Fixes Checklist

- [ ] Restart server (Ctrl+C → npm run dev)
- [ ] Kill port 5000 process
- [ ] Check .env file exists and is configured
- [ ] Verify MongoDB connection string
- [ ] npm install (reinstall dependencies)
- [ ] Clear node_modules and reinstall
- [ ] Check Node.js version (>= 18.0.0)
- [ ] Verify JWT_SECRET is set
- [ ] Test with curl/Postman
- [ ] Check firewall/antivirus

---

## Still Having Issues?

1. **Review Documentation:**
   - [README.md](README.md) - Quick start
   - [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
   - [SECURITY.md](SECURITY.md) - Security features

2. **Check Configuration:**
   ```bash
   # Verify environment
   node --version
   npm --version
   cat .env
   ```

3. **Test Basic Functionality:**
   ```bash
   # Health check
   curl http://localhost:5000/health

   # Should return: {"success":true,...}
   ```

---

**Remember:** Most issues are configuration-related. Double-check your `.env` file and MongoDB connection!
