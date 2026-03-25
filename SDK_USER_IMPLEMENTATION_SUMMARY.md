# SDKUser Implementation Summary

## Overview

SDKUsers are end-users of developers' applications. They are scoped to one organization with email unique per organization (not globally). The implementation spans models, repositories, services, controllers, and routes.

---

## 1. SDKUser Model

**File Path:** [backend/src/models/sdkUser.model.ts](backend/src/models/sdkUser.model.ts)

### Schema Definition

```typescript
interface ISDKUser extends Document {
  organizationId: mongoose.Types.ObjectId; // Required, indexed
  applicationId: mongoose.Types.ObjectId; // Required, indexed
  email: string; // Required, lowercase, trimmed
  password?: string; // Optional, selected:false by default
  name: string; // Required, trimmed
  avatar?: string; // Optional
  isEmailVerified: boolean; // Default: false
  isActive: boolean; // Default: true, indexed
  metadata: Record<string, unknown>; // Default: {}
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date; // Auto-populated
  updatedAt: Date; // Auto-populated
  comparePassword(candidate: string): Promise<boolean>; // Method
}
```

### Schema Relationships

- **organizationId** → References `Organization` model
- **applicationId** → References `Application` model

### Key Constraints

- **Unique Index:** `{ organizationId, email }` — Email is unique per organization, not globally
- **Password Hashing:** Pre-save hook with bcrypt (salt: 12 rounds)
- **TTL:** No auto-expiration index on SDKUser itself

### Available Methods

- `comparePassword(candidate: string): Promise<boolean>` — Validates password against bcrypt hash

---

## 2. SDKUser Repository

**File Path:** [backend/src/repositories/sdk.repository.ts](backend/src/repositories/sdk.repository.ts)

### Core Query Functions

#### SDK User Queries

| Function                           | Parameters                                                           | Returns            | Purpose                                |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| `findSDKUserByEmail()`             | `organizationId, email`                                              | `ISDKUser \| null` | Find user by email (no password)       |
| `findSDKUserByEmailWithPassword()` | `organizationId, email`                                              | `ISDKUser \| null` | Find user with password field selected |
| `findActiveSDKUserById()`          | `userId, organizationId`                                             | `ISDKUser \| null` | Find active user by ID within org      |
| `countSDKUsers()`                  | `organizationId`                                                     | `number`           | Count total SDK users in org           |
| `createSDKUser()`                  | `{ organizationId, applicationId, email, password, name, metadata }` | `ISDKUser`         | Create new SDK user                    |
| `saveSDKUser()`                    | `user: ISDKUser`                                                     | `ISDKUser`         | Save/update SDK user                   |

#### SDK Session Queries

| Function                    | Parameters                                                                     | Returns               | Purpose                          |
| --------------------------- | ------------------------------------------------------------------------------ | --------------------- | -------------------------------- |
| `createSDKSession()`        | `{ sdkUserId, organizationId, refreshToken, ipAddress, userAgent, expiresAt }` | `ISDKSession`         | Create new session               |
| `findActiveSDKSession()`    | `refreshToken, organizationId`                                                 | `ISDKSession \| null` | Find active, non-expired session |
| `deactivateSDKSession()`    | `sessionId`                                                                    | `ISDKSession \| null` | Mark session as inactive         |
| `revokeSDKSessionByToken()` | `refreshToken, organizationId`                                                 | `ISDKSession \| null` | Revoke session by token          |
| `saveSDKSession()`          | `session: ISDKSession`                                                         | `ISDKSession`         | Save/update session              |

#### Application Queries

| Function                            | Parameters       | Returns                | Purpose                              |
| ----------------------------------- | ---------------- | ---------------------- | ------------------------------------ |
| `findActiveApplicationByClientId()` | `clientId`       | `Application \| null`  | Find app with client secret included |
| `findOrgById()`                     | `organizationId` | `Organization \| null` | Find organization                    |

### Limitations & Gaps

- ❌ No `updateSDKUser()` function (use `saveSDKUser()` instead)
- ❌ No bulk operations (batch create, delete)
- ❌ No search/filter functions (pagination, advanced filtering)
- ❌ No delete function for SDKUsers
- ❌ No function to list all SDK users in an organization
- ❌ No function to update specific fields (email, name, metadata)
- ❌ No function to suspend/reactivate users
- ❌ No function to reset passwords

---

## 3. Current SDK Routes

**Files:**

- [backend/src/routes/sdk.routes.ts](backend/src/routes/sdk.routes.ts)
- [backend/src/routes/sdkAnalytics.routes.ts](backend/src/routes/sdkAnalytics.routes.ts)

### SDK Authentication Routes

| Method | Endpoint         | Rate Limit   | Middleware                     | Handler              | Purpose                      |
| ------ | ---------------- | ------------ | ------------------------------ | -------------------- | ---------------------------- |
| POST   | `/auth/register` | 20 req/hour  | `authenticateClient, validate` | `registerHandler`    | Register new SDK user        |
| POST   | `/auth/login`    | 10 req/15min | `authenticateClient, validate` | `loginHandler`       | Authenticate SDK user        |
| GET    | `/auth/me`       | None         | None                           | `meHandler`          | Get current user profile     |
| POST   | `/auth/refresh`  | None         | `authenticateClient, validate` | `refreshHandler`     | Refresh access token         |
| POST   | `/auth/logout`   | None         | `authenticateClient, validate` | `logoutHandler`      | Revoke refresh token         |
| GET    | `/token/verify`  | None         | None                           | `verifyTokenHandler` | Verify access token validity |

### Request Validation

#### Register Route (`POST /auth/register`)

```
- client_id: required (string)
- client_secret: required (string)
- email: required, valid email, normalized
- password: min 8 chars, must contain [a-z], [A-Z], [0-9]
- name: required, trimmed
- metadata: optional (object)
```

#### Login Route (`POST /auth/login`)

```
- client_id: required (string)
- client_secret: required (string)
- email: required, valid email, normalized
- password: required (string)
```

#### Refresh Route (`POST /auth/refresh`)

```
- client_id: required (string)
- client_secret: required (string)
- refreshToken: required (string)
```

#### Logout Route (`POST /auth/logout`)

```
- client_id: required (string)
- client_secret: required (string)
- refreshToken: required (string)
```

### SDK Analytics Routes

| Method | Endpoint                           | Auth             | Purpose                            |
| ------ | ---------------------------------- | ---------------- | ---------------------------------- |
| GET    | `/analytics/applications`          | Required (Admin) | List all applications in org       |
| GET    | `/analytics/`                      | Required (Admin) | Get analytics for all applications |
| GET    | `/analytics/:applicationId`        | Required (Admin) | Get metrics for specific app       |
| GET    | `/analytics/:applicationId/export` | Required (Admin) | Export analytics (csv or json)     |

### Rate Limiting Strategy

- **Per-client_id based** (not IP-based)
- Falls back silently if Redis is unavailable
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Window`

---

## 4. SDKUser Controller

**Files:**

- [backend/src/controllers/sdk.controller.ts](backend/src/controllers/sdk.controller.ts)
- [backend/src/controllers/sdkAnalytics.controller.ts](backend/src/controllers/sdkAnalytics.controller.ts)

### SDK Controller Handlers

#### `registerHandler(req, res)`

- Validates organization is active
- Checks user limit on org plan
- Checks email doesn't already exist
- Creates SDKUser and SDKSession
- Returns: `{ success, data: { accessToken, refreshToken, user } }`
- Creates audit entry: `sdk_user_register`

#### `loginHandler(req, res)`

- Validates email/password credentials
- Checks if account is active
- Creates new SDKSession
- Updates `lastLoginAt` and `lastLoginIp`
- Returns: `{ success, data: { accessToken, refreshToken, user } }`
- Creates audit entry: `sdk_user_login`

#### `meHandler(req, res)`

- Requires `client_id` + `client_secret` (query params)
- Requires Bearer token (Authorization header)
- Validates token signature and organization match
- Returns: `{ success, data: { user } }`

#### `refreshHandler(req, res)`

- Validates refresh token is valid and not expired
- Validates session exists and is active
- Checks user is still active
- Updates session `lastActivity`
- Returns: `{ success, data: { accessToken } }`

#### `logoutHandler(req, res)`

- Requires refresh token and client credentials
- Revokes session (sets `isActive: false`)
- Blacklists access token (if provided) for 15 minutes
- Returns: `{ success: true }` (always 200, never reveals if session existed)

#### `verifyTokenHandler(req, res)`

- Requires `client_id` + `client_secret` (query params)
- Requires Bearer token (Authorization header)
- Returns token validity without throwing errors
- Returns: `{ success, data: { valid, reason?, user? } }`

### SDK Analytics Controllers

#### `getApplicationsList(req, res)`

- Returns all applications for authenticated user's organization
- Selects: `_id, name, type, createdAt`

#### `getApplicationAnalytics(req, res)`

- Returns combined metrics for specific application
- Calls service to aggregate user metrics, login metrics, device stats, country stats, trends

#### `getAllApplicationsAnalytics(req, res)`

- Returns aggregated analytics across all applications in organization

#### `exportApplicationAnalytics(req, res)`

- Exports analytics data in CSV or JSON format
- Query param: `format` (csv|json, default: csv)
- Sets Content-Disposition header for download

---

## 5. SDKUser Services

**File:** [backend/src/services/sdk.service.ts](backend/src/services/sdk.service.ts)

### Core Service Functions

| Function                                                | Return Type                 | Purpose                             |
| ------------------------------------------------------- | --------------------------- | ----------------------------------- |
| `sdkRegister(data)`                                     | `SDKRegisterResult`         | Register new user (with validation) |
| `sdkLogin(data)`                                        | `SDKLoginResult`            | Authenticate user                   |
| `sdkGetMe(clientId, clientSecret, bearerToken)`         | `SDKMeResult`               | Fetch authenticated user info       |
| `sdkRefresh(organizationId, refreshToken)`              | `SDKRefreshResult`          | Issue new access token              |
| `sdkLogout(refreshToken, organizationId, accessToken?)` | `Promise<void>`             | Revoke session and blacklist token  |
| `sdkVerifyToken(clientId, clientSecret, bearerToken)`   | `{ valid, reason?, user? }` | Validate token without throwing     |

### Validation Flow (Register)

1. Check organization exists and is active
2. Check user count vs org plan limit
3. Check email doesn't already exist (per-org uniqueness)
4. Create SDKUser with bcrypt hashed password
5. Generate access + refresh tokens
6. Create session with future `expiresAt`

### Validation Flow (Login)

1. Find user by email with password field selected
2. Check user exists
3. Check user is active
4. Compare password with bcrypt
5. Generate tokens and create session
6. Update `lastLoginAt` and `lastLoginIp`

---

## 6. SDKAnalytics Repository

**File:** [backend/src/repositories/sdkAnalytics.repository.ts](backend/src/repositories/sdkAnalytics.repository.ts)

### Analytics Query Methods

| Method                     | Parameters                       | Returns               | Data Source                            |
| -------------------------- | -------------------------------- | --------------------- | -------------------------------------- |
| `getApplicationsList()`    | `organizationId`                 | `Application[]`       | Application model                      |
| `getUserMetrics()`         | `organizationId, applicationId?` | `SDKUserMetrics`      | SDKUser model (aggregation)            |
| `getLoginMetrics()`        | `organizationId, applicationId?` | `LoginMetrics`        | AuditLog model                         |
| `getDeviceStats()`         | `organizationId, applicationId?` | `DeviceStats[]`       | AuditLog.userAgent (parsed)            |
| `getCountryStats()`        | `organizationId, applicationId?` | `CountryStats[]`      | AuditLog.metadata.country or "Unknown" |
| `getRegistrationTrend()`   | `organizationId, applicationId?` | `{ date, count }[]`   | SDKUser.createdAt (30-day)             |
| `getLoginTrend()`          | `organizationId, applicationId?` | `{ date, count }[]`   | AuditLog action='login' (30-day)       |
| `getApplicationUserData()` | `organizationId, applicationId`  | `ApplicationUserData` | All above combined                     |

### Metrics Calculated

#### SDKUserMetrics

- `totalUsers` — all users in org/app
- `activeUsers` — users where `isActive: true`
- `emailVerifiedUsers` — users where `isEmailVerified: true`
- `emailVerificationRate` — percentage verified
- `newUsersToday`, `newUsersThisWeek`, `newUsersThisMonth` — count by date

#### LoginMetrics

- `totalLogins` — all login audit entries
- `loginsToday`, `loginsThisWeek`, `loginsThisMonth` — count by date range
- `uniqueUsersLoggedIn` — distinct user IDs from today's logins

#### DeviceStats

- Parsed from user agent: Chrome, Firefox, Safari, Edge, Mobile Browser, Other
- Count and percentage of all logins

#### CountryStats

- From `AuditLog.metadata.country` or defaults to "Unknown"
- Top 20 limited
- Count and percentage

---

## 7. Gaps & Limitations

### Repository Layer

- ❌ **No update functions** — Cannot update email, name, avatar, metadata directly
- ❌ **No delete function** — Cannot hard-delete SDK users
- ❌ **No list function** — Cannot paginate/retrieve all users in org
- ❌ **No search/filter** — Cannot filter by metadata or other criteria
- ❌ **No bulk operations** — Cannot create/update multiple users atomically
- ❌ **No soft-delete** — Only `isActive` flag, no deletion tracking

### Controller/Route Layer

- ❌ **No GET user endpoint** — Cannot retrieve single user by ID
- ❌ **No LIST users endpoint** — No admin endpoint to list all SDK users
- ❌ **No UPDATE user endpoint** — Cannot update profile, email, name, etc.
- ❌ **No DELETE user endpoint** — Cannot delete/suspend users
- ❌ **No email verification endpoint** — `isEmailVerified` is set but never marked true
- ❌ **No password reset endpoint** — Users cannot reset forgotten passwords
- ❌ **No MFA/2FA** — No multi-factor authentication support
- ❌ **No email change validation** — Cannot change email with verification

### Analytics Layer

- ⚠️ **Country data is incomplete** — Depends on metadata field, defaults to "Unknown"
- ⚠️ **No geolocation service** — Must be populated by client or middleware
- ⚠️ **Limited device parsing** — Simple user agent parsing, not comprehensive

### Session Management

- ⚠️ **No session revocation by user** — Only logout (which revokes single session)
- ⚠️ **No concurrent session limits** — One user can have unlimited active sessions
- ⚠️ **No activity tracking** — `lastActivity` updated but not used for timeout

### Security Considerations

- ⚠️ **No account lockout** — No protection against brute-force password attacks
- ⚠️ **No password complexity requirements in service** — Validation only in route
- ⚠️ **No audit trail for sensitive changes** — Email/password changes not logged separately

---

## 8. Database Indexes

### SDKUser Indexes

```
- organizationId (sparse)
- applicationId (sparse)
- isActive (sparse)
- { organizationId, email } (unique)
- timestamps (created/updated)
```

### SDKSession Indexes

```
- sdkUserId (sparse)
- organizationId (sparse)
- refreshToken (sparse)
- isActive (sparse)
- { sdkUserId, organizationId, isActive } (compound)
- { expiresAt } (TTL expireAfterSeconds: 0)
```

---

## 9. API Response Format

### Success Responses

```typescript
{
  success: true,
  message?: string,
  data?: {
    accessToken?: string,
    refreshToken?: string,
    user?: {
      id, email, name, avatar?, isEmailVerified, createdAt, ...
    }
  }
}
```

### Error Responses

```typescript
{
  success: false,
  error: string,        // e.g., 'invalid_credentials', 'user_exists'
  message: string,
  retryAfter?: number   // Rate limit only
}
```

### HTTP Status Codes

- **201:** Register success
- **200:** Login, me, refresh, logout, verify, analytics
- **400:** Invalid request parameters
- **401:** Invalid credentials, invalid/expired token, missing client credentials
- **403:** Org inactive, user limit reached, org mismatch, account suspended
- **404:** User not found, app not found
- **409:** Duplicate email in org
- **429:** Rate limit exceeded
- **500:** Server error

---

## 10. Token Flow

### Access Token (JWT)

- **Payload:** `{ userId, email, role: "sdk_user", organizationId }`
- **TTL:** Default (check config)
- **Usage:** Authorization Bearer token
- **Blacklisting:** 15 minutes on logout if provided

### Refresh Token (JWT)

- **Payload:** Same as access token
- **TTL:** Configurable per application (`app.tokenExpiry.refreshTokenTTL`)
- **Usage:** Only in `/auth/refresh` endpoint
- **Session tracking:** Stored in SDKSession with expiration

### Validation

- Both tokens are validated against secret
- Organization ID must match application's organization
- Access token role must be `sdk_user`

---

## Summary Table: What's Implemented vs Missing

| Feature            | Status | Notes                                |
| ------------------ | ------ | ------------------------------------ |
| User Registration  | ✅     | Full validation, password hashing    |
| User Login         | ✅     | Email/password, session creation     |
| Get User Profile   | ✅     | Via `/auth/me` with Bearer token     |
| Token Refresh      | ✅     | Issues new access token              |
| Logout             | ✅     | Revokes session, blacklists token    |
| Token Verification | ✅     | Stateless verification               |
| List All Users     | ❌     | No admin endpoint                    |
| Get User by ID     | ❌     | No endpoint or repo function         |
| Update User        | ❌     | No endpoint, only manual save()      |
| Delete User        | ❌     | No endpoint, no soft-delete tracking |
| Email Verification | ❌     | Field exists, never marked true      |
| Password Reset     | ❌     | No endpoint                          |
| MFA/2FA            | ❌     | Not implemented                      |
| Analytics          | ✅     | Comprehensive metrics and trends     |
| Rate Limiting      | ✅     | Per-client_id based                  |
| Audit Logging      | ✅     | Register, login tracked              |
