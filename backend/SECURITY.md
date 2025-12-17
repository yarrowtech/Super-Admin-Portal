# Security Features & Best Practices

## Security Implementation

### ✅ 1. **Helmet.js - Security Headers**
Helmet helps secure Express apps by setting various HTTP headers.

**Protects against:**
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME type sniffing
- DNS prefetch control

```javascript
app.use(helmet());
```

### ✅ 2. **Rate Limiting**
Prevents brute force attacks and API abuse.

**Configuration:**
- General API: 100 requests per 15 minutes per IP
- Auth routes: 10 requests per 15 minutes per IP

```javascript
// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});
```

### ✅ 3. **NoSQL Injection Protection**
Sanitizes user input to prevent MongoDB injection attacks.

```javascript
app.use(mongoSanitize());
```

**Prevents:**
- Query selector injection
- Operator injection
- Malicious object insertions

### ✅ 4. **Input Validation**
Using `express-validator` for comprehensive input validation.

**Validates:**
- Email format
- Password strength (minimum 6 characters)
- Required fields
- Data types and formats
- Phone number patterns
- Role enum values

```javascript
// Example validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'ceo', 'it', 'law', 'hr', 'media', 'finance', 'manager'])
];
```

### ✅ 5. **JWT Authentication**
Secure token-based authentication with automatic expiration.

**Features:**
- HS256 algorithm
- 7-day expiration
- Secure secret key from environment
- Token verification on protected routes

```javascript
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### ✅ 6. **Password Security**
Industry-standard password hashing using bcryptjs.

**Features:**
- 10 salt rounds
- One-way hashing (cannot be reversed)
- Passwords never stored in plain text
- Excluded from database queries by default

```javascript
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);
```

### ✅ 7. **Role-Based Access Control (RBAC)**
Multi-level authorization system.

**Features:**
- 8 distinct roles with hierarchical permissions
- Route-level role restrictions
- Permission-based access control
- Middleware chaining for security

```javascript
// Example usage
router.get('/admin-only',
  requireAuth,           // Verify JWT
  allowRoles('admin'),   // Check role
  controller             // Execute
);
```

### ✅ 8. **Error Handling**
Comprehensive error handling without exposing sensitive information.

**Features:**
- Custom error classes
- Async error wrapper
- Global error handler
- Environment-specific error details
- Proper HTTP status codes

```javascript
// Production: Generic error messages
// Development: Stack traces included
```

### ✅ 9. **Database Connection Security**
Secure MongoDB connection with proper error handling.

**Features:**
- Connection timeout configuration
- Automatic reconnection
- Graceful shutdown handling
- Error event listeners
- Connection pooling

### ✅ 10. **CORS Configuration**
Controlled Cross-Origin Resource Sharing.

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Security Checklist

### ✅ Implemented
- [x] HTTPS ready (use reverse proxy in production)
- [x] Helmet security headers
- [x] Rate limiting
- [x] Input validation
- [x] NoSQL injection protection
- [x] XSS protection
- [x] JWT authentication
- [x] Password hashing
- [x] Role-based access control
- [x] Error handling
- [x] Request size limits
- [x] Environment variable protection
- [x] Graceful shutdown
- [x] Uncaught exception handling
- [x] Unhandled rejection handling

### 📋 Production Recommendations
- [ ] Use HTTPS (configure reverse proxy like nginx)
- [ ] Set strong JWT_SECRET (64+ random characters)
- [ ] Configure CORS_ORIGIN to specific domains
- [ ] Enable MongoDB authentication
- [ ] Set up MongoDB SSL/TLS
- [ ] Implement audit logging
- [ ] Add request logging to file
- [ ] Set up monitoring (PM2, DataDog, etc.)
- [ ] Regular security updates
- [ ] Database backups
- [ ] Implement 2FA for admin accounts
- [ ] Add API documentation with authentication examples
- [ ] Set up CI/CD with security scanning
- [ ] Regular penetration testing
- [ ] Implement session management

## Environment Variables Security

**Required variables:**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_super_secret_key_minimum_32_characters_long
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

**Best practices:**
- Never commit `.env` file to version control
- Use strong, random JWT_SECRET
- Rotate secrets regularly
- Use different secrets for dev/staging/prod
- Store production secrets in secure vault

## Common Attack Vectors & Protections

### 1. SQL/NoSQL Injection
**Protection:**
- express-mongo-sanitize removes $ and . from user input
- Mongoose schema validation
- Input validation middleware

### 2. Cross-Site Scripting (XSS)
**Protection:**
- Helmet sets Content-Security-Policy
- Input sanitization
- Output encoding (JSON responses)

### 3. Brute Force Attacks
**Protection:**
- Rate limiting (10 login attempts per 15 min)
- Account lockout after failed attempts (future)
- CAPTCHA integration recommended

### 4. Man-in-the-Middle (MITM)
**Protection:**
- HTTPS in production
- Secure cookie flags
- HSTS headers via Helmet

### 5. Session Hijacking
**Protection:**
- JWT tokens with expiration
- Secure token storage (HttpOnly cookies recommended)
- Token refresh mechanism (future)

### 6. Denial of Service (DoS)
**Protection:**
- Rate limiting
- Request size limits (10mb)
- MongoDB connection pooling
- Graceful error handling

## Security Testing

### Manual Testing
```bash
# Test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Test invalid input
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"123"}'

# Test unauthorized access
curl -X GET http://localhost:5000/api/dept/admin/dashboard
# Should return 401 Unauthorized
```

### Automated Security Scanning
```bash
# Install security audit tools
npm audit
npm audit fix

# Check for vulnerabilities
npx snyk test

# OWASP dependency check
npm install -g retire
retire --js
```

## Security Incident Response

### If a breach occurs:
1. **Immediately:**
   - Rotate all JWT secrets
   - Invalidate all active tokens
   - Review access logs
   - Identify affected users

2. **Investigation:**
   - Check database for unauthorized changes
   - Review server logs
   - Identify attack vector
   - Document timeline

3. **Recovery:**
   - Patch vulnerability
   - Force password resets
   - Notify affected users
   - Update security policies

4. **Prevention:**
   - Implement additional security measures
   - Update security documentation
   - Train team on incident
   - Regular security audits

## Security Headers

The following headers are automatically set by Helmet:

```
Content-Security-Policy
Cross-Origin-Embedder-Policy
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
Origin-Agent-Cluster
Referrer-Policy
Strict-Transport-Security
X-Content-Type-Options
X-DNS-Prefetch-Control
X-Download-Options
X-Frame-Options
X-Permitted-Cross-Domain-Policies
X-XSS-Protection
```

## Monitoring & Logging

### Recommended monitoring:
- Failed login attempts
- Rate limit violations
- Unusual API usage patterns
- Database connection errors
- Server errors and exceptions
- Response times
- Token generation frequency

### Log retention:
- Development: Console logging
- Production: File-based logging with rotation
- Recommended: ELK Stack, Splunk, or CloudWatch

## Regular Security Maintenance

### Weekly:
- Review access logs
- Check for failed login attempts
- Monitor rate limit violations

### Monthly:
- Update dependencies (`npm audit`)
- Review user permissions
- Check for unused accounts
- Backup database

### Quarterly:
- Rotate JWT secrets
- Security audit
- Penetration testing
- Review and update security policies

## Compliance

This backend implements security best practices for:
- OWASP Top 10 protection
- GDPR data protection principles
- SOC 2 security controls
- ISO 27001 information security standards

## Support & Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

**Remember:** Security is an ongoing process, not a one-time implementation. Stay updated with security patches and best practices.
