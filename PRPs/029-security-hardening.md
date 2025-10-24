# PRP-029: Security Hardening

## Status
🔲 Not Started

## Priority
P0 - Critical (Security requirement)

## Objective
Implement comprehensive security measures including input sanitization, XSS/SQL injection prevention, CSRF protection, rate limiting, audit logging, and security headers for production-ready deployment.

## Scope

### Files to Create
- `src/middleware/security/helmet.middleware.ts` - Security headers middleware
- `src/middleware/security/rate-limit.middleware.ts` - Rate limiting middleware
- `src/middleware/security/csrf.middleware.ts` - CSRF protection middleware
- `src/middleware/security/input-validation.middleware.ts` - Input validation
- `src/lib/security/sanitizer.ts` - Input sanitization utilities
- `src/lib/security/validator.ts` - Input validation schemas (Zod)
- `src/lib/security/encryption.ts` - Encryption utilities (AES-256)
- `src/lib/security/audit-logger.ts` - Audit logging service
- `src/services/security/intrusion-detection.service.ts` - Intrusion detection
- `src/app/api/admin/audit-logs/route.ts` - Audit log API
- `tests/middleware/security.test.ts` - Security middleware tests
- `tests/lib/security/sanitizer.test.ts` - Sanitizer tests

### Database Extensions
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  entity      String   // PROJECT, USER, etc.
  entityId    String?
  changes     Json?    // Old values -> New values
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity])
  @@index([timestamp])
}

model SecurityEvent {
  id          String   @id @default(uuid())
  type        String   // FAILED_LOGIN, RATE_LIMIT, SUSPICIOUS_ACTIVITY
  severity    String   // LOW, MEDIUM, HIGH, CRITICAL
  ipAddress   String
  userAgent   String?
  details     Json?
  timestamp   DateTime @default(now())

  @@index([type])
  @@index([severity])
  @@index([timestamp])
}
```

### Dependencies to Install
```bash
npm install helmet
npm install express-rate-limit
npm install csurf
npm install zod
npm install dompurify
npm install validator
npm install bcryptjs
npm install crypto-js
```

## Implementation Steps

1. **Implement Security Headers**
   - Use Helmet.js for security headers
   - Content Security Policy (CSP)
   - X-Frame-Options (prevent clickjacking)
   - X-Content-Type-Options (prevent MIME sniffing)
   - Strict-Transport-Security (HSTS)
   - Referrer-Policy
   - Permissions-Policy

2. **Add Input Validation**
   - Use Zod for schema validation
   - Validate all API inputs
   - Type checking (string, number, email, etc.)
   - Length constraints (min/max)
   - Format validation (email, phone, URL)
   - Whitelist allowed values (enums)
   - Reject invalid inputs with clear errors

3. **Implement Input Sanitization**
   - Sanitize all user inputs before storage
   - Remove script tags and dangerous HTML
   - Use DOMPurify for HTML sanitization
   - Escape special characters in SQL queries (Prisma handles this)
   - Sanitize filenames for uploads
   - Validate and sanitize URLs

4. **Add CSRF Protection**
   - Generate CSRF tokens for forms
   - Validate tokens on state-changing requests
   - Use SameSite cookie attribute
   - Double-submit cookie pattern
   - Exempt API endpoints with proper auth

5. **Implement Rate Limiting**
   - Global rate limit: 1000 requests/hour per IP
   - Auth endpoints: 5 login attempts/15 minutes
   - API endpoints: 100 requests/minute per user
   - Use Redis for distributed rate limiting
   - Return 429 status on rate limit exceeded
   - Implement exponential backoff

6. **Add Audit Logging**
   - Log all data mutations (create, update, delete)
   - Log authentication events (login, logout, failed attempts)
   - Log permission changes
   - Log sensitive data access
   - Store IP address, user agent, timestamp
   - Log changes (old value → new value)

7. **Implement Encryption**
   - Encrypt sensitive data at rest (SSNs, bank info)
   - Use AES-256-GCM for encryption
   - Secure key management (environment variables)
   - Rotate encryption keys periodically
   - Hash passwords with bcrypt (12 rounds)
   - Use HTTPS for all communications (TLS 1.3)

8. **Add Intrusion Detection**
   - Detect brute force attacks (multiple failed logins)
   - Detect SQL injection attempts
   - Detect XSS attempts
   - Detect abnormal API usage patterns
   - Log security events to SecurityEvent table
   - Alert on critical security events
   - Auto-block IPs after threshold

9. **Implement CORS Protection**
   - Configure CORS with allowed origins
   - Restrict to specific domains in production
   - Allow credentials (cookies) only for trusted origins
   - Set appropriate Access-Control headers

10. **Add File Upload Security**
    - Validate file types (whitelist extensions)
    - Limit file size (25MB max)
    - Scan for malware (ClamAV integration)
    - Store uploads outside web root
    - Use unique filenames (prevent overwrite)
    - Serve files with correct Content-Type

## Acceptance Criteria

- [ ] Security headers configured via Helmet.js (CSP, HSTS, etc.)
- [ ] Input validation using Zod schemas on all API endpoints
- [ ] Input sanitization prevents XSS attacks
- [ ] CSRF protection implemented for all state-changing requests
- [ ] Rate limiting prevents brute force and DDoS attacks
- [ ] Audit logs record all data mutations and auth events
- [ ] Sensitive data encrypted at rest with AES-256
- [ ] Passwords hashed with bcrypt (12 rounds minimum)
- [ ] Intrusion detection logs suspicious activities
- [ ] CORS configured to allow only trusted origins
- [ ] File uploads validated and scanned for malware
- [ ] All security tests pass with >80% coverage
- [ ] OWASP Top 10 vulnerabilities mitigated

## Validation Steps

```bash
# 1. Install security dependencies
npm install helmet express-rate-limit csurf zod dompurify validator bcryptjs crypto-js

# 2. Run security middleware tests
npm test -- tests/middleware/security.test.ts

# 3. Run sanitizer tests
npm test -- tests/lib/security/sanitizer.test.ts

# 4. Start dev server
npm run dev

# 5. Test security headers
curl -I http://localhost:3000
# Verify headers include:
#   Content-Security-Policy
#   X-Frame-Options: DENY
#   X-Content-Type-Options: nosniff
#   Strict-Transport-Security

# 6. Test input validation
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "", "contractValue": "invalid"}'
# Should return 400 with validation errors

# 7. Test XSS prevention
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert('XSS')</script>"}'
# Should sanitize script tags before storage

# 8. Test CSRF protection
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
# Should return 403 without CSRF token

# 9. Test rate limiting
# Make 10 rapid login attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
# Should return 429 after 5 attempts

# 10. Test audit logging
# Create a project via API
# Check database for audit log entry:
# SELECT * FROM AuditLog WHERE action = 'CREATE' AND entity = 'PROJECT';
# Should show log entry with user, IP, timestamp

# 11. Test encryption
# Store sensitive data (e.g., bank account)
# Check database raw value
# Should be encrypted, not plaintext

# 12. Test intrusion detection
# Make 20 failed login attempts from same IP
# Check SecurityEvent table for FAILED_LOGIN events
# Verify IP is blocked after threshold

# 13. Test CORS
curl -X GET http://localhost:3000/api/projects \
  -H "Origin: http://malicious-site.com"
# Should return CORS error

# 14. Test file upload security
# Try uploading executable file
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.exe"
# Should reject with error "File type not allowed"

# 15. Run security scan
npm install -g snyk
snyk test
# Check for known vulnerabilities

# 16. Run OWASP ZAP security scan
# Or use online tools like Security Headers, SSL Labs

# 17. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
✓ Input validation with Zod schemas
✓ Input sanitization preventing XSS
✓ CSRF protection on state-changing requests
✓ Rate limiting preventing brute force
✓ Audit logging for all mutations and auth events
✓ Encryption for sensitive data (AES-256)
✓ Password hashing with bcrypt
✓ Intrusion detection logging suspicious activities
✓ CORS restricting to trusted origins
✓ File upload security with validation and scanning
✓ All security tests passing (>80% coverage)
✓ OWASP Top 10 vulnerabilities mitigated
```

## Security Best Practices

### Content Security Policy (CSP)
```typescript
// Helmet configuration
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.monday.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
})
```

### Input Validation Schema Example
```typescript
// Zod schema for project creation
const createProjectSchema = z.object({
  name: z.string().min(3).max(200),
  jobNumber: z.string().regex(/^J-\d{4}-\d{3}$/),
  division: z.nativeEnum(Division),
  contractValue: z.number().min(0).max(100000000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})
```

### Rate Limiting Configuration
```typescript
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})
```

## OWASP Top 10 Mitigation

1. **Broken Access Control**: RBAC with Auth0, middleware checks
2. **Cryptographic Failures**: AES-256 encryption, TLS 1.3
3. **Injection**: Prisma ORM (parameterized queries), input validation
4. **Insecure Design**: Security by design, threat modeling
5. **Security Misconfiguration**: Helmet.js, secure defaults
6. **Vulnerable Components**: Snyk scanning, regular updates
7. **Authentication Failures**: Auth0, bcrypt, rate limiting, MFA
8. **Data Integrity Failures**: CSRF protection, input validation
9. **Logging Failures**: Comprehensive audit logging
10. **SSRF**: URL validation, whitelist external services

## Related PRPs
- Depends on: PRP-003 (Authentication), PRP-001 (Project Initialization)
- Enhances: All PRPs (security applies to entire app)
- Blocks: PRP-030 (Deployment - security required for production)

## Estimated Time
10-12 hours

## Notes
- Security is ongoing, not one-time implementation
- Regularly update dependencies to patch vulnerabilities
- Run security audits quarterly (manual + automated)
- Subscribe to security advisories for dependencies
- Implement defense in depth (multiple layers of security)
- Principle of least privilege (users only have necessary permissions)
- Never trust user input (validate and sanitize everything)
- Use parameterized queries (Prisma handles this)
- Store secrets in environment variables, never in code
- Rotate secrets and API keys regularly
- Use HTTPS everywhere (TLS 1.3 minimum)
- Implement security.txt file (/.well-known/security.txt)
- Have incident response plan for security breaches
- Consider bug bounty program for production
- Train developers on secure coding practices

## Rollback Plan
If validation fails:
1. Check Helmet.js installation and configuration
2. Verify Zod schemas are correct
3. Test sanitization utilities independently
4. Check CSRF token generation and validation
5. Verify rate limiting with Redis
6. Check audit log writes to database
7. Test encryption/decryption utilities
8. Review intrusion detection rules
9. Verify CORS configuration
10. Test file upload validation logic
