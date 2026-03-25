# AuthFlow Backend - User Management & Audit Logging Investigation

## Executive Summary

The backend follows a layered architecture: **Models → Repositories → Services → Controllers → Routes**. User management is divided into three types: **Platform Users** (organization members), **SDK Users** (application end-users), and **Application Members** (platform users assigned to applications).

---

## 1. USER CREATION AND RETRIEVAL

### 1.1 Platform Users (Organization Members)

#### Database Model

**File**: `backend/src/models/user.model.ts`

```typescript
export interface IUser extends Document {
  email: string; // unique globally, indexed
  password?: string; // bcrypt hashed, select: false
  name: string;
  avatar?: string;
  role: "user" | "admin" | "owner"; // organization role
  isEmailVerified: boolean;
  emailVerificationToken?: string; // select: false
  emailVerificationExpires?: Date;
  passwordResetToken?: string; // select: false
  passwordResetExpires?: Date;
  mfaEnabled: boolean;
  oauth: {
    google?: { id: string; email: string; picture?: string };
    github?: { id: string; username: string; avatar?: string };
  };
  lastLoginAt?: Date;
  lastLoginIp?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `email` (unique)
- `oauth.google.id` (sparse)
- `oauth.github.id` (sparse)

#### Database Repository

**File**: `backend/src/repositories/user.repository.ts`

| Function                                | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| `findUserByEmail(email, withPassword?)` | Find user by email, optionally with password |
| `findUserById(id, withPassword?)`       | Find user by ID                              |
| `findActiveUserById(userId)`            | Find user and check isActive                 |
| `createUser(data)`                      | Create new user document                     |
| `saveUser(user)`                        | Save user instance                           |

#### User Creation Service

**File**: `backend/src/services/auth.service.ts` (Lines 107-237)

**Function**: `registerUser(data)`

```typescript
export const registerUser = async (data: {
  email: string;
  password: string;
  name: string;
  organizationName?: string; // optional
  ipAddress: string;
  userAgent: string;
}) => {
  // 1. Check duplicate email → 400 status
  // 2. Create user in transaction
  // 3. Check for pending invitation
  //    - If exists: add to that organization with invited role
  //    - If not: create new organization with user as owner
  // 4. Create membership (user ↔ organization)
  // 5. Create JWT tokens (access + refresh)
  // 6. Create session record
  // 7. Generate email verification token
  // Returns: { success, accessToken, refreshToken, user, verificationToken, organizationId }
};
```

**Key Features**:

- Uses MongoDB transactions for consistency
- Auto-creates organization if none exists
- Supports pending invitations
- Generates email verification token (24-hour expiry)

#### User Authentication Service

**File**: `backend/src/services/auth.service.ts` (Lines 239-340)

**Function**: `loginUser(data)` & `resolveAuthUser(token)`

`loginUser()` validates credentials and returns tokens
`resolveAuthUser()` is used by `auth.middleware.ts` to:

- Verify JWT signature
- Check token blacklist (Redis)
- Verify user still exists and is active
- Verify user is still member of organization
- Check organization is still active
- **Returns**: `{ success: boolean, user?: AuthUser, status?: 401|403, message?: string }`

#### API Endpoints for User Management

**File**: `backend/src/controllers/admin.controller.ts`

| Endpoint                        | Method    | Handler            | Description                              |
| ------------------------------- | --------- | ------------------ | ---------------------------------------- |
| `/api/admin/users`              | GET       | `listUsers()`      | List org users with filtering            |
| `/api/admin/users/:id`          | GET       | `getUser()`        | Get single user with sessions & API keys |
| `/api/admin/users/:id`          | PUT/PATCH | `updateUser()`     | Update user profile                      |
| `/api/admin/users/:id/role`     | PATCH     | `updateUserRole()` | Change user's org role                   |
| `/api/admin/users/:id/suspend`  | POST      | `suspendUser()`    | Deactivate user & revoke sessions        |
| `/api/admin/users/:id/activate` | POST      | `activateUser()`   | Reactivate user                          |
| `/api/admin/users/:id`          | DELETE    | `deleteUser()`     | Soft-delete (mark inactive)              |

**Authentication**: All require `authenticate` middleware + `requireAdmin` role check

#### List Users - Query Parameters & Response

**GET** `/api/admin/users?page=1&limit=10&search=john&role=admin&mfaEnabled=true&sortBy=createdAt&sortOrder=desc`

**Response**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "john@example.com",
        "name": "John Doe",
        "avatar": null,
        "role": "admin",
        "isEmailVerified": true,
        "mfaEnabled": false,
        "isActive": true,
        "lastLoginAt": "2026-03-25T14:30:00Z",
        "createdAt": "2026-01-15T10:20:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

**Query Params**:

- `page` (default: 1) - pagination
- `limit` (default: 10) - per page
- `search` - searches email OR name (case-insensitive)
- `role` - filter by "member|admin|owner"
- `mfaEnabled` - filter boolean "true|false"
- `isEmailVerified` - filter boolean "true|false"
- `sortBy` (default: createdAt) - field to sort
- `sortOrder` (default: desc) - "asc|desc"

---

### 1.2 Application Users (SDK Users)

#### Database Model

**File**: `backend/src/models/sdkUser.model.ts`

```typescript
export interface ISDKUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  email: string; // unique per org (not globally!)
  password?: string; // bcrypt hashed, select: false
  name: string;
  avatar?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>; // custom user data
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:

- `organizationId + email` (unique) - allows same email in different orgs
- `organizationId + applicationId + createdAt`

#### SDK User Management Endpoints

**File**: `backend/src/controllers/sdk.controller.ts`

| Endpoint                 | Method | Handler             | Description                              |
| ------------------------ | ------ | ------------------- | ---------------------------------------- |
| `/api/sdk/auth/register` | POST   | `registerHandler()` | Register new SDK user                    |
| `/api/sdk/auth/login`    | POST   | `loginHandler()`    | Authenticate SDK user                    |
| `/api/sdk/me`            | GET    | `meHandler()`       | Get current user (requires Bearer token) |
| `/api/sdk/auth/refresh`  | POST   | `refreshHandler()`  | Refresh access token                     |
| `/api/sdk/auth/logout`   | POST   | `logoutHandler()`   | Logout SDK user                          |

**Register Endpoint**: POST `/api/sdk/auth/register`

```json
{
  "client_id": "app_123456789",
  "client_secret": "secret_...",
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "User Name",
  "metadata": { "custom": "data" } // optional
}
```

**Response**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "refresh_...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "User Name",
      "isEmailVerified": false,
      "createdAt": "2026-03-25T14:30:00Z"
    }
  }
}
```

**Key Features**:

- Per-organization rate limiting (by client_id)
- Email unique per organization only
- Respects organization user limits (org.limits.maxUsers)
- Requires valid client credentials

#### SDK User Service

**File**: `backend/src/services/sdk.service.ts`

| Function                                           | Purpose                                         |
| -------------------------------------------------- | ----------------------------------------------- |
| `sdkRegister(data)`                                | Create SDK user, validate limits, return tokens |
| `sdkLogin(data)`                                   | Authenticate user by email/password             |
| `sdkGetMe(clientId, clientSecret, bearerToken)`    | Get current user info                           |
| `sdkRefresh(clientId, clientSecret, refreshToken)` | Issue new access token                          |
| `sdkLogout(clientId, clientSecret, refreshToken)`  | Revoke refresh token                            |

---

### 1.3 Application Members (Platform Users → Applications)

#### Database Model

**File**: `backend/src/models/applicationMember.model.ts`

```typescript
export interface IApplicationMember extends Document {
  applicationId: mongoose.Types.ObjectId; // ref: Application
  userId: mongoose.Types.ObjectId; // ref: User (platform user)
  role: "viewer" | "editor" | "admin";
  assignedAt: Date;
}
```

**Indexes**:

- `applicationId + userId` (unique) - one user per app per app

#### API Endpoints

**File**: `backend/src/controllers/applicationMember.controller.ts`

| Endpoint                                   | Method | Handler                      | Description                |
| ------------------------------------------ | ------ | ---------------------------- | -------------------------- |
| `/api/applications/:appId/users`           | GET    | `getAppUsersHandler()`       | List users assigned to app |
| `/api/applications/:appId/users/search`    | GET    | `searchAppUsersHandler()`    | Search users in app        |
| `/api/applications/:appId/available-users` | GET    | `getAvailableUsersHandler()` | Get org members NOT in app |
| `/api/applications/:appId/users`           | POST   | `addUserToAppHandler()`      | Assign user to app         |
| `/api/applications/:appId/users/:userId`   | DELETE | `removeUserFromAppHandler()` | Remove user from app       |
| `/api/applications/:appId/users/:userId`   | PATCH  | `updateAppUserRoleHandler()` | Change user's role in app  |

#### Get App Users - Response

**GET** `/api/applications/app_id/users?page=1`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "role": "editor",
        "assignedAt": "2026-03-20T10:00:00Z",
        "userId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": null,
          "isActive": true
        }
      }
    ],
    "pagination": {
      "current": 1,
      "total": 3,
      "count": 45
    }
  }
}
```

#### Search App Users

**GET** `/api/applications/app_id/users/search?q=jane&page=1`

Searches user name OR email (case-insensitive) within an application's members

#### Get Available Users (Not Yet in App)

**GET** `/api/applications/app_id/available-users?page=1`

Returns org members who are NOT yet assigned to this application

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "email": "unassigned@example.com",
        "name": "Unassigned User",
        "avatar": null,
        "role": "member",
        "isEmailVerified": true,
        "mfaEnabled": false,
        "isActive": true,
        "lastLoginAt": "2026-03-25T14:30:00Z",
        "createdAt": "2026-01-15T10:20:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 2,
      "count": 32
    }
  }
}
```

---

## 2. AUDIT LOG HANDLING

### 2.1 Database Model

**File**: `backend/src/models/audit.model.ts`

```typescript
export interface IAuditLog extends Document {
  organizationId: mongoose.Types.ObjectId; // required, indexed
  applicationId?: mongoose.Types.ObjectId; // optional
  userId?: mongoose.Types.ObjectId; // optional, populates name + email
  action: string; // e.g., "user_created", "login"
  resource: string; // e.g., "user", "application"
  resourceId?: string; // ID of affected resource
  method: string; // HTTP method: POST, PUT, PATCH, DELETE
  path: string; // request path: /api/admin/users
  statusCode: number; // HTTP response status
  ipAddress: string; // client IP
  userAgent: string; // browser/client info
  metadata?: Record<string, unknown>; // query, params, error messages, changes
  createdAt: Date; // auto-indexed
  requestId: string; // trace request across services
}
```

**Indexes** (for fast querying):

```
organizationId + createdAt (desc)
organizationId + applicationId + createdAt (desc)
organizationId + userId + createdAt (desc)
organizationId + action + createdAt (desc)
createdAt with TTL 90 days (auto-delete)
```

### 2.2 Audit Log Creation

#### Repository

**File**: `backend/src/repositories/audit.repository.ts`

| Function                 | Implementation                             |
| ------------------------ | ------------------------------------------ |
| `createAuditLog(data)`   | Creates log entry, silently fails on error |
| `createAuditEntry(data)` | Alternative creator using Model.create()   |

```typescript
export interface AuditLogData {
  userId?: string;
  organizationId: string; // required
  action: string; // required
  resource: string; // required
  resourceId?: string;
  method: string; // required: POST, PUT, etc
  path: string; // required: /api/admin/users
  statusCode: number; // required: 200, 201, 400, etc
  ipAddress: string; // required
  userAgent: string; // required
  metadata?: Record<string, unknown>;
  requestId: string; // required: for tracing
}
```

#### Service (Automatic Logging)

**File**: `backend/src/services/audit.service.ts`

**Function**: `processAuditLog(req, statusCode, responseData)`

This is called by response middleware to automatically log requests:

```typescript
export const processAuditLog = async (
  req: Request,
  statusCode: number,
  responseData: any,
): Promise<void> => {
  // 1. Check shouldAuditRequest() - skip health checks, etc
  // 2. Get organizationId from user token OR response body
  // 3. Skip if no organizationId (unauthenticated requests)
  // 4. Determine action from request (POST=create, PUT/PATCH=update, DELETE=delete)
  // 5. Determine resource from path
  // 6. Determine resourceId from response
  // 7. Include query params and errors (statusCode >= 400) in metadata
  // 8. Call createAuditLog()
};
```

**Supported Actions** (auto-determined from HTTP method):

- `user_created` (POST /admin/users)
- `user_updated` (PUT/PATCH /admin/users/:id)
- `user_deleted` (DELETE /admin/users/:id)
- `user_suspended` (POST /admin/users/:id/suspend)
- `user_activated` (POST /admin/users/:id/activate)
- `application_created` (POST /applications)
- `application_updated` (PATCH /applications/:id)
- `sdk_user_register` (POST /sdk/auth/register)
- `sdk_user_login` (POST /sdk/auth/login)
- etc.

### 2.3 Audit Logs Retrieval

#### API Endpoint

**File**: `backend/src/controllers/admin.controller.ts` (Lines 400+)

**Endpoint**: `GET /api/admin/audit-logs`

**Query Parameters**:

- `page` (default: 1)
- `limit` (default: 100)
- `userId` (optional) - filter by user who performed action
- `action` (optional) - filter by action type (e.g., "user_created")
- `startDate` (optional) - ISO date string for range start
- `endDate` (optional) - ISO date string for range end

**Handler**:

```typescript
export const getAuditLogEntries = async (req: Request, res: Response) => {
  const {
    page = "1",
    limit = "100",
    userId,
    action,
    startDate,
    endDate,
  } = req.query;

  const data = await getAuditLogs(req.user!.organizationId, {
    page: Number(page),
    limit: Number(limit),
    userId: userId as string,
    action: action as string,
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.status(200).json({ success: true, data });
};
```

#### Service Implementation

**File**: `backend/src/services/admin.service.ts`

**Function**: `getAuditLogs(organizationId, params)`

```typescript
export const getAuditLogs = async (
  organizationId: string,
  params: {
    page: number;
    limit: number;
    userId?: string; // filter by userId
    action?: string; // filter by action
    startDate?: string; // ISO date
    endDate?: string; // ISO date
  },
) => {
  // Build query with all filters
  // Execute with pagination
  // Populate userId (name, email)
  // Return formatted logs with pagination
};
```

#### Example Query

**GET** `/api/admin/audit-logs?page=1&limit=20&action=user_created&startDate=2026-03-01&endDate=2026-03-25`

**Response**:

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "userId": {
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "action": "user_created",
        "resource": "user",
        "resourceId": "507f1f77bcf86cd799439012",
        "method": "POST",
        "path": "/api/admin/users",
        "statusCode": 201,
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "metadata": {
          "query": {},
          "params": {},
          "email": "newuser@example.com",
          "name": "New User"
        },
        "createdAt": "2026-03-25T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

## 3. IDENTIFIED ISSUES & GAPS

### Critical Issues

#### 1. **Inconsistent Audit Entry in Application Members** ⚠️

**File**: `backend/src/controllers/applicationMember.controller.ts` (Line ~185, 230, 270)

The audit calls use `changes` field instead of `metadata`:

```typescript
// INCORRECT - uses 'changes'
await createAuditEntry({
  organizationId,
  userId,
  action: "app_user_added",
  resource: "application",
  resourceId: appId,
  changes: { userId, role }, // ❌ Should be 'metadata'
  ipAddress,
  userAgent,
});
```

All other audit calls use `metadata`:

```typescript
// CORRECT
await createAuditEntry({
  userId: adminId,
  organizationId,
  action: "user_update",
  resource: "user",
  resourceId: user._id.toString(),
  method: req.method,
  path: req.path,
  statusCode: 200,
  ipAddress,
  userAgent,
  metadata: { changes: req.body }, // ✓ Uses 'metadata'
});
```

**Impact**: Application member changes won't include metadata in audit logs

---

#### 2. **No Admin API for SDK User Management** ⚠️

SDK Users (application end-users) can only be created/logged in via `/api/sdk` endpoints.

**Missing Features**:

- No endpoint to list SDK users in admin panel
- No ability to deactivate/suspend SDK users
- No bulk operations for SDK user management
- No search/filter for SDK users

**Current Workaround**: Only available via direct SDKUser model queries

---

#### 3. **Potential N+1 Query Problem in Audit Logs** ⚠️

**File**: `backend/src/repositories/admin.repository.ts` (Line 146)

```typescript
export const findAuditLogs = async (
  query: Record<string, unknown>,
  skip: number,
  limit: number,
) => {
  return AuditLog.find(query)
    .populate("userId", "name email") // ✓ Populates
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};
```

**Issue**: No check for empty userId values. If many logs have no userId (unauthenticated actions), MongoDB still attempts to populate, which is wasteful.

**Suggestion**: Add conditional population or filter logs with userId before populating.

---

### Medium Issues

#### 4. **Empty Pagination Data in getAvailableUsers**

**File**: `backend/src/controllers/applicationMember.controller.ts` (Line 385)

When no available users exist, returns empty pagination:

```json
{
  "users": [],
  "pagination": {
    "current": 1,
    "total": 0,
    "count": 0
  }
}
```

**Issue**: Frontend might not clearly show "All organization members are already in this app"

---

#### 5. **No Request ID in Manual Audit Logs**

Most manual `createAuditEntry` calls in controllers don't include `requestId`:

**File**: `backend/src/controllers/admin.controller.ts` (Line 119)

```typescript
await createAuditEntry({
  userId: adminId,
  organizationId,
  action: "user_update",
  resource: "user",
  resourceId: user._id.toString(),
  method: req.method,
  path: req.path,
  statusCode: 200,
  ipAddress: getIpAddress(req),
  userAgent: getUserAgent(req),
  metadata: { changes: req.body },
  // ❌ Missing: requestId: getRequestId(req)
});
```

**Impact**: Audit logs can't be traced back to originating requests in logs

---

#### 6. **Audit Log Retention Not Enforced at Query Time**

**File**: `backend/src/models/audit.model.ts`

TTL index auto-deletes logs after 90 days, but:

- Frontend can query for dates older than 90 days without warning
- No indication in API whether data is available for requested date range

---

### Design Observations

#### 7. **Soft Delete for Users, Hard Delete for App Members**

- Users: `isActive = false` (data preserved for audit trail)
- ApplicationMembers: Hard deleted from collection

This inconsistency could cause:

- Orphaned ApplicationMember records if user is deleted
- Audit log references to deleted users become harder to trace

---

#### 8. **Role Terminology Inconsistency**

- **Platform Users**: `role: "user" | "admin" | "owner"` (membership role)
- **Application Members**: `role: "viewer" | "editor" | "admin"` (app-specific)
- **SDK Users**: No roles; only exist as end-users

This is correct by design but can be confusing.

---

## 4. DATABASE QUERY PATTERNS

### Finding Users

```typescript
// By email
User.findOne({ email: "user@example.com" });

// By ID
User.findById(userId);

// Active users in organization
const orgUserIds = await getOrgUserIds(organizationId);
User.find({ _id: { $in: orgUserIds }, isActive: true });

// With filtering
User.find({
  _id: { $in: orgUserIds },
  email: { $regex: search, $options: "i" }, // case-insensitive search
  role: "admin",
  isEmailVerified: true,
  mfaEnabled: false,
})
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```

### Finding Audit Logs

```typescript
AuditLog.find({
  organizationId: org_id,
  userId: user_id,
  action: "user_created",
  createdAt: { $gte: start, $lte: end },
})
  .populate("userId", "name email")
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```

---

## 5. AUTHENTICATION & AUTHORIZATION

### Middleware Chain

All protected endpoints follow this chain:

1. **JSON Parsing** - Express middleware
2. **Request ID** - `requestId.middleware.ts` (adds unique ID)
3. **Rate Limiting** - `rateLimit.middleware.ts` (optional per route)
4. **Authentication** - `auth.middleware.ts`
   - Extracts Bearer token
   - Calls `resolveAuthUser(token)`
   - Attaches `req.user` with `{ userId, email, role, organizationId }`
5. **RBAC** - `rbac.middleware.ts` (optional)
   - Checks `req.user.role` against allowed roles
   - Returns 403 if unauthorized
6. **Validation** - `validation.middleware.ts`
   - Body/query validation via express-validator

### Token Structure

Access tokens include:

```typescript
{
  userId: string;
  email: string;
  role: "user" | "admin" | "owner" | "sdk_user";
  organizationId: string;
  iat: number; // issued at
  exp: number; // expires (24h default)
}
```

---

## 6. SUMMARY TABLE: FILES & FUNCTIONS

| Concern           | Model                        | Repository                      | Service                                                                    | Controller                                  | Route                              |
| ----------------- | ---------------------------- | ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------- |
| **User Creation** | user.model.ts                | user.repository.ts              | auth.service.ts: `registerUser()`                                          | auth.controller.ts: `register()`            | POST /api/auth/register            |
| **User List**     | user.model.ts (+ membership) | admin.repository.ts             | admin.service.ts: `listOrgUsers()`                                         | admin.controller.ts: `listUsers()`          | GET /api/admin/users               |
| **User Fetch**    | user.model.ts                | admin.repository.ts             | admin.service.ts: `getOrgUser()`                                           | admin.controller.ts: `getUser()`            | GET /api/admin/users/:id           |
| **SDK User**      | sdkUser.model.ts             | sdk.repository.ts               | sdk.service.ts: `sdkRegister()`, `sdkLogin()`                              | sdk.controller.ts                           | POST /api/sdk/auth/register        |
| **App Members**   | applicationMember.model.ts   | applicationMember.repository.ts | (logic in controller)                                                      | applicationMember.controller.ts             | GET /api/applications/:appId/users |
| **Audit Logs**    | audit.model.ts               | audit.repository.ts             | audit.service.ts: `processAuditLog()` + admin.service.ts: `getAuditLogs()` | admin.controller.ts: `getAuditLogEntries()` | GET /api/admin/audit-logs          |

---

## 7. FRONTEND INTEGRATION POINTS

### User Management UI Should Call:

1. **List organization users with filters**

   ```
   GET /api/admin/users?page=1&limit=10&search=&role=&sortBy=createdAt&sortOrder=desc
   ```

2. **Get user details**

   ```
   GET /api/admin/users/{userId}
   ```

   Returns: user info, API keys, active sessions

3. **Update user profile**

   ```
   PATCH /api/admin/users/{userId}
   Body: { name?, role?, isEmailVerified? }
   ```

4. **Manage user status**

   ```
   POST /api/admin/users/{userId}/suspend
   POST /api/admin/users/{userId}/activate
   DELETE /api/admin/users/{userId}
   ```

5. **View audit logs**

   ```
   GET /api/admin/audit-logs?page=1&limit=100&userId=&action=&startDate=&endDate=
   ```

6. **Application member management**
   ```
   GET /api/applications/{appId}/users
   POST /api/applications/{appId}/users
   DELETE /api/applications/{appId}/users/{userId}
   PATCH /api/applications/{appId}/users/{userId}
   GET /api/applications/{appId}/available-users
   ```

---

## 8. KEY TAKEAWAYS

✅ **Strengths**:

- Clean layered architecture separates concerns
- Comprehensive audit logging infrastructure
- MongoDB transactions prevent data consistency issues
- Rate limiting protects SDK endpoints from abuse
- Proper index usage for query performance

⚠️ **Areas for Improvement**:

- SDK user management has no admin interface
- Audit entries inconsistent (changes vs metadata)
- Missing requestId in manual audit logs
- Potential N+1 queries in audit log retrieval
- No indication of audit log archival/retention

🔍 **Testing Recommendations**:

- Verify all audit log metadata is captured consistently
- Test application member operations with large user sets
- Validate that SDK rate limiting works across multiple client_ids
- Check audit log performance with large date ranges
