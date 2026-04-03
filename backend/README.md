# AuthFlow Backend

The official Node.js/Express backend for AuthFlow — a modern, enterprise-grade authentication and authorization platform. Provides OAuth2/OIDC flows, JWT token management, multi-factor authentication, webhooks, and complete API key/application management.

## Features

- **OAuth2/OIDC Server** — Full OAuth2 Authorization Code + PKCE flow with OIDC support
- **Authentication** — Email/password login, registration, email verification, password reset, magic links
- **Multi-Factor Authentication (MFA)** — TOTP setup and verification
- **OAuth Providers** — Google, GitHub, and custom OAuth provider support
- **JWT Tokens** — Access tokens, refresh tokens, ID tokens with auto-refresh
- **API Key Management** — Generate and manage API credentials for applications
- **Applications** — Create and manage OAuth2 applications
- **Users** — User management, profiles, settings, 2FA
- **Organizations** — Team management with member roles
- **Webhooks** — Event webhooks with retry logic and delivery history
- **Audit Logs** — Complete audit trail of all system events
- **Rate Limiting** — Redis-based rate limiting
- **Sessions** — Express session management with Redis storage
- **Email** — Email notifications, verification, password reset via SMTP
- **Admin Panel** — Admin-only endpoints for system management
- **SDK Analytics** — Track SDK usage and performance metrics

## Technology Stack

- **Node.js 18+** — Runtime
- **Express 5** — Web framework
- **TypeScript 5.3+** — Type safety (via tsx)
- **MongoDB 4.4+** — Primary database
- **Redis 6+** — Caching, sessions, rate limiting (optional but recommended)
- **Passport.js** — OAuth integration (Google, GitHub)
- **JWT (jsonwebtoken)** — Token generation and verification
- **bcryptjs** — Password hashing
- **Nodemailer** — Email service
- **BullMQ** — Job queue for webhooks
- **AWS S3** — File storage (optional)
- **Mongoose** — MongoDB ODM
- **Helmet** — Security headers
- **CORS** — Cross-origin resource sharing
- **Validator.js** — Input validation
- **Speakeasy** — TOTP MFA
- **QRCode** — MFA QR code generation

## Prerequisites

- **Node.js 18+** with npm
- **MongoDB 4.4+** (local or cloud)
- **Redis 6+** (optional but recommended for production)
- **SMTP Server** (optional, for email features)

## Installation

### 1. Clone the repository

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

### 4. Verify MongoDB connection

Ensure MongoDB is running:

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas — update MONGODB_URI in .env
```

### 5. (Optional) Start Redis

For production features (rate limiting, sessions):

```bash
redis-server
```

## Development

### Start the development server

```bash
npm run dev
```

The server will start on `http://localhost:5000` with hot-reload enabled.

Server startup output:

```
🚀 Starting AuthFlow Server...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MongoDB connected
✅ Redis connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Server running on http://localhost:5000
📝 Docs: http://localhost:5000/docs
🏥 Health: http://localhost:5000/health
```

### Build for production

```bash
npm run build
```

### Start production server

```bash
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

### Required

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/authflow

# JWT secrets (change in production!)
JWT_ACCESS_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-secret-key-min-32-chars

# Session secret (change in production!)
SESSION_SECRET=your-secret-key-min-32-chars

# Frontend and app URLs
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5000
```

### Optional

```env
# Node environment
NODE_ENV=development
PORT=5000

# Redis (for rate limiting, sessions, caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@authflow.com

# AWS S3 (optional, for file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

## API Endpoints

The API is organized into logical modules. Full documentation at `GET /docs`.

### Authentication

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/logout` — Logout user
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/verify-email` — Verify email address
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password with token
- `POST /api/auth/send-verification-email` — Resend verification email
- `POST /api/auth/magic-link` — Request magic link login
- `POST /api/auth/google` — Google OAuth callback
- `POST /api/auth/github` — GitHub OAuth callback

### OAuth2 / OIDC

- `GET /authorize` — OAuth2 authorization endpoint
- `POST /oauth/token` — Token exchange (authorization code, refresh token)
- `POST /oauth/refresh` — Refresh access token
- `POST /oauth/logout` — Revoke session and tokens
- `GET /.well-known/openid-configuration` — OIDC discovery endpoint
- `GET /.well-known/jwks.json` — OIDC public keys

### Multi-Factor Authentication (MFA)

- `POST /api/mfa/setup` — Start TOTP setup (returns QR code)
- `POST /api/mfa/verify` — Verify TOTP token and enable MFA
- `POST /api/mfa/disable` — Disable MFA
- `POST /api/mfa/validate` — Validate TOTP code during login

### API Keys

- `GET /api/api-keys` — List user's API keys
- `POST /api/api-keys` — Create new API key
- `DELETE /api/api-keys/:id` — Revoke API key
- `GET /api/api-keys/:id` — Get API key details

### Applications (OAuth2 Apps)

- `GET /api/applications` — List user's applications
- `POST /api/applications` — Create new application
- `GET /api/applications/:id` — Get application details
- `PUT /api/applications/:id` — Update application
- `DELETE /api/applications/:id` — Delete application
- `GET /api/applications/:id/members` — List application members
- `POST /api/applications/:id/members` — Invite member to application
- `DELETE /api/applications/:id/members/:userId` — Remove member

### Organizations

- `GET /api/organizations` — List user's organizations
- `POST /api/organizations` — Create new organization
- `GET /api/organizations/:id` — Get organization details
- `PUT /api/organizations/:id` — Update organization
- `DELETE /api/organizations/:id` — Delete organization
- `GET /api/organizations/:id/members` — List organization members
- `POST /api/organizations/:id/members/invite` — Invite member to organization
- `DELETE /api/organizations/:id/members/:userId` — Remove member
- `GET /api/organizations/invite/:token` — Lookup invitation (public)

### Webhooks

- `GET /api/webhooks` — List organization's webhooks
- `POST /api/webhooks` — Create new webhook
- `GET /api/webhooks/:id` — Get webhook details
- `PUT /api/webhooks/:id` — Update webhook
- `DELETE /api/webhooks/:id` — Delete webhook
- `GET /api/webhooks/:id/deliveries` — View webhook delivery history
- `POST /api/webhooks/:id/deliveries/:deliveryId/retry` — Retry failed delivery

### Audit Logs

- `GET /api/audit-logs` — List audit events
- `GET /api/audit-logs/:id` — Get audit event details

### Settings

- `GET /api/sdk/auth/me` — Get current user info
- `PUT /api/sdk/auth/me` — Update user profile
- `POST /api/sdk/auth/me/password` — Change password
- `DELETE /api/sdk/auth/me` — Delete account
- `GET /api/sdk/auth/sessions` — List user sessions
- `DELETE /api/sdk/auth/sessions/:id` — Logout from device

### Health & Documentation

- `GET /health` — Health check
- `GET /docs` — API documentation

## Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration modules
│   │   ├── database.ts      # MongoDB connection
│   │   ├── redis.ts         # Redis setup
│   │   ├── email.ts         # SMTP/email configuration
│   │   ├── passport.ts      # OAuth provider setup
│   │   └── s3.ts            # AWS S3 configuration
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── oauth.controller.ts
│   │   ├── oauth2.controller.ts     # OAuth2 endpoints
│   │   ├── mfa.controller.ts
│   │   ├── apiKey.controller.ts
│   │   ├── application.controller.ts
│   │   ├── organization.controller.ts
│   │   ├── webhook.controller.ts
│   │   └── ...
│   ├── routes/              # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── oauth2.routes.ts
│   │   ├── mfa.routes.ts
│   │   ├── application.routes.ts
│   │   └── ...
│   ├── models/              # MongoDB schemas
│   │   ├── user.model.ts
│   │   ├── application.model.ts
│   │   ├── apiKey.model.ts
│   │   ├── organization.model.ts
│   │   ├── webhook.model.ts
│   │   └── ...
│   ├── repositories/        # Data access layer
│   │   ├── user.repository.ts
│   │   ├── application.repository.ts
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   ├── mfa.service.ts
│   │   ├── webhook.service.ts
│   │   └── ...
│   ├── middlewares/         # Express middleware
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── error.middleware.ts      # Error handling
│   │   ├── rbac.middleware.ts       # Role-based access control
│   │   ├── rateLimit.middleware.ts  # Rate limiting
│   │   ├── audit.middleware.ts      # Audit logging
│   │   └── ...
│   ├── queue/               # Job queue (BullMQ)
│   │   └── webhook.queue.ts # Webhook delivery queue
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── constants/           # App constants
│   ├── app.ts               # Express app setup
│   ├── app.routes.ts        # Route registration
│   ├── app.docs.ts          # API documentation
│   └── server.ts            # Server entry point
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Authentication Flow

### Email/Password Login

1. User sends email + password to `POST /api/auth/login`
2. Backend verifies password with bcryptjs
3. JWT tokens generated (access + refresh)
4. Tokens returned to client
5. Client stores tokens in localStorage/cookies
6. Subsequent requests include `Authorization: Bearer <access_token>`

### OAuth2 Authorization Code + PKCE

1. Client generates PKCE code verifier + challenge
2. Client redirects to `GET /authorize?client_id=...&code_challenge=...`
3. User logs in / consents
4. Backend redirects back with authorization code
5. Client exchanges code for tokens: `POST /oauth/token`
6. Backend verifies code, client_id, and code_verifier
7. Tokens returned to client

### Token Refresh

1. Access token expires
2. Client calls `POST /oauth/refresh` with refresh token
3. Backend validates refresh token
4. New access token issued
5. Optionally new refresh token issued

### Logout

1. Client calls `POST /oauth/logout` with refresh token
2. Backend revokes refreshToken in database
3. Access tokens in Redis blacklist (if configured)
4. Client clears local tokens

## Database Models

### User

```typescript
{
  _id: ObjectId,
  email: string,
  password: string (bcrypt hash),
  name: string,
  email_verified: boolean,
  mfa_enabled: boolean,
  mfa_secret: string (encrypted),
  created_at: Date,
  updated_at: Date
}
```

### Application (OAuth2 App)

```typescript
{
  _id: ObjectId,
  client_id: string,
  client_secret: string (bcrypt hash),
  name: string,
  redirect_uris: string[],
  allowed_origins: string[],
  allowed_logout_urls: string[],
  owner: ObjectId (User),
  created_at: Date,
  updated_at: Date
}
```

### API Key

```typescript
{
  _id: ObjectId,
  key: string (bcrypt hash),
  display_key: string (last 8 chars),
  user_id: ObjectId,
  revoked: boolean,
  revoked_at: Date,
  created_at: Date
}
```

### Organization

```typescript
{
  _id: ObjectId,
  name: string,
  owner: ObjectId (User),
  members: [
    {
      user_id: ObjectId,
      role: "owner" | "admin" | "member"
    }
  ],
  created_at: Date,
  updated_at: Date
}
```

### Webhook

```typescript
{
  _id: ObjectId,
  organization_id: ObjectId,
  event_type: string,
  url: string,
  secret: string,
  active: boolean,
  created_at: Date,
  updated_at: Date
}
```

## Webhooks

Webhooks are triggered on various events:

- `user.created` — User registered
- `user.updated` — User profile updated
- `user.deleted` — User account deleted
- `auth.login_success` — User logged in
- `auth.mfa_enabled` — MFA enabled
- `api_key.created` — API key generated
- `api_key.revoked` — API key revoked
- `organization.created` — Organization created
- `application.created` — Application created

Webhooks are delivered via BullMQ job queue with retry logic (max 5 retries, exponential backoff).

## Security

### Password Security

- Passwords hashed with bcryptjs (salt rounds: 12)
- Minimum length: 8 characters
- No password policies enforced (left to client)

### JWT Tokens

- Access tokens: 1 hour expiry (configurable)
- Refresh tokens: 7 days expiry (configurable)
- Signed with HS256 (HMAC SHA-256)
- Can switch to RS256 with public/private key pair

### HTTPS/TLS

- In production, all requests should be over HTTPS
- Helmet.js CSP headers configured
- HSTS enabled in production

### Rate Limiting

- Redis-based (default: 100 requests per 15 minutes per IP)
- Can whitelist IPs: `RATE_LIMIT_WHITELIST=192.168.1.1,10.0.0.1`
- Applied to sensitive endpoints

### CORS

- Frontend URL always allowed
- Application-specific origins from database
- Localhost :3000-:9000 allowed in development

## Email

Email is sent via SMTP for:

- Email verification
- Password reset
- Notifications
- Invite confirmations

Configure SMTP in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@authflow.com
```

Gmail App Passwords: https://support.google.com/accounts/answer/185833

## OAuth Providers

### Google OAuth

1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/)
2. Set authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
3. Add to `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### GitHub OAuth

1. Create OAuth app at [GitHub Settings](https://github.com/settings/developers)
2. Set authorization callback URL: `http://localhost:5000/api/auth/github/callback`
3. Add to `.env`:

```env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas (or managed MongoDB)
- [ ] Use Redis Cloud (or self-hosted Redis)
- [ ] Set strong JWT and SESSION secrets (min 32 chars, use `openssl rand -base64 32`)
- [ ] Configure HTTPS / reverse proxy (Nginx, Caddy, etc.)
- [ ] Set FRONTEND_URL to production domain
- [ ] Configure email service (SMTP)
- [ ] Configure OAuth provider credentials (production)
- [ ] Enable CORS for production Frontend URL only
- [ ] Set up monitoring and logging
- [ ] Configure backups for MongoDB
- [ ] Set up CI/CD pipeline

### Using pm2

```bash
npm install -g pm2

# Start server
pm2 start npm --name "authflow" -- start

# Monitor
pm2 monit

# Logs
pm2 logs authflow

# Keep running on reboot
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t authflow-backend .
docker run -p 5000:5000 --env-file .env authflow-backend
```

### Kubernetes

See `k8s/` directory for example deployments (if available).

## Monitoring & Logging

### Health Check

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### Request IDs

All requests include unique `X-Request-ID` headers for tracing.

### Error Handling

All errors return JSON with proper HTTP status codes:

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "error_code",
  "details": {}
}
```

## Performance Optimization

1. **Database Indexing** — Ensure indexes on `email`, `client_id`, `user_id`
2. **Redis Caching** — Session and refresh token caching
3. **Rate Limiting** — Prevent abuse with Redis-backed limits
4. **Connection Pooling** — MongoDB connection pooling (configured in mongoose)
5. **Compression** — Enable gzip compression (Nginx/reverse proxy)
6. **Load Balancing** — Multiple instances behind load balancer

## Troubleshooting

### "MongoDB connection failed"

- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- For MongoDB Atlas: use connection string with credentials

### "Redis connection failed"

- Redis is optional; server runs without it (with reduced features)
- To test Redis: `redis-cli ping`
- Set Redis password in .env if needed

### "CORS errors from frontend"

- Add frontend URL to CORS_ORIGINS in .env
- Or use FRONTEND_URL if it's the only frontend

### "Email not sending"

- Verify SMTP credentials in .env
- Check firewall allows SMTP port (usually 587 or 465)
- Enable "less secure apps" for Gmail or use App Passwords

### "JWT verification failed"

- Ensure JWT_ACCESS_SECRET is the same across all instances
- Check token hasn't expired (check exp claim)
- Verify token format: `Authorization: Bearer <token>`

## Testing

Run tests:

```bash
npm test
```

Integration tests cover:

- Auth flows
- Token generation/refresh
- API key management
- Webhooks

## Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/feature-name`
4. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- ESLint configuration enforced
- Follow existing code patterns
- Add JSDoc comments for public functions
- Add unit tests for new features

## License

Proprietary — AuthFlow 2024

## Support

For questions, bugs, or feature requests, contact the AuthFlow team or open an issue on the repository.

## API Documentation

Complete API documentation is available at `GET /docs` when the server is running.

Example:

```bash
curl http://localhost:5000/docs | jq .
```

Returns detailed OpenAPI-style documentation for all endpoints.
