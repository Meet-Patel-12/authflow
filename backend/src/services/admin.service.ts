import {
  getOrgUserIds,
  findMembership,
  findMembershipWithRole,
  updateMembershipRole,
  countOwners,
  getOrgMembershipsWithRoles,
  findUserById,
  countOrgUsers,
  findOrgUsers,
  setUserActive,
  countActiveSessions,
  findUserSessions,
  revokeUserSessions,
  countActiveApiKeys,
  findUserApiKeys,
  revokeUserApiKeys,
  findAuditLogs,
  countAuditLogs,
  pingDatabase,
} from "../repositories/admin.repository";

// ─── Guards ───────────────────────────────────────────────────────────────────

export const assertOrgMember = async (
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  const membership = await findMembership(userId, organizationId);
  return !!membership;
};

export const assertNotLastOwner = async (
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  const membership = await findMembershipWithRole(userId, organizationId);
  if (membership?.role !== "owner") return true;
  const ownerCount = await countOwners(organizationId);
  return ownerCount > 1;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getOrgStats = async (organizationId: string) => {
  const userIds = await getOrgUserIds(organizationId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    mfaEnabled,
    totalSessions,
    totalApiKeys,
  ] = await Promise.all([
    userIds.length,
    countOrgUsers(userIds, { isEmailVerified: true }),
    countOrgUsers(userIds, { createdAt: { $gte: today } }),
    countOrgUsers(userIds, { mfaEnabled: true }),
    countActiveSessions(organizationId),
    countActiveApiKeys(organizationId),
  ]);

  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    mfaEnabled,
    totalSessions,
    totalApiKeys,
    totalOrganizations: 1,
  };
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const listOrgUsers = async (
  organizationId: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    mfaEnabled?: string;
    isEmailVerified?: string;
    sortBy: string;
    sortOrder: string;
  },
) => {
  const {
    page,
    limit,
    search,
    role,
    mfaEnabled,
    isEmailVerified,
    sortBy,
    sortOrder,
  } = params;

  const userIds = await getOrgUserIds(organizationId);

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }
  if (role) query.role = role;
  if (mfaEnabled) query.mfaEnabled = mfaEnabled === "true";
  if (isEmailVerified) query.isEmailVerified = isEmailVerified === "true";

  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };
  const skip = (page - 1) * limit;

  const [users, total, memberships] = await Promise.all([
    findOrgUsers(userIds, query, sort, skip, limit),
    countOrgUsers(userIds, query),
    getOrgMembershipsWithRoles(organizationId, userIds),
  ]);

  const membershipMap = Object.fromEntries(
    memberships.map((m) => [m.userId.toString(), m.role]),
  );

  return {
    items: users.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: membershipMap[user._id.toString()] ?? user.role,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getOrgUser = async (userId: string, organizationId: string) => {
  const [user, membership, apiKeys, sessions] = await Promise.all([
    findUserById(userId),
    findMembershipWithRole(userId, organizationId),
    findUserApiKeys(userId, organizationId),
    findUserSessions(userId, organizationId),
  ]);

  if (!user) return null;

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: membership?.role ?? user.role,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      joinedOrgAt: (membership as any)?.joinedAt,
    },
    apiKeys,
    sessions,
  };
};

export const updateOrgUser = async (
  userId: string,
  organizationId: string,
  changes: { name?: string; role?: string; isEmailVerified?: boolean },
) => {
  const user = await findUserById(userId);
  if (!user) return null;

  if (changes.name) user.name = changes.name;
  if (typeof changes.isEmailVerified === "boolean")
    user.isEmailVerified = changes.isEmailVerified;
  await user.save();

  if (changes.role) {
    await updateMembershipRole(userId, organizationId, changes.role);
  }

  return user;
};

export const updateOrgUserRole = async (
  userId: string,
  organizationId: string,
  role: string,
) => {
  return updateMembershipRole(userId, organizationId, role);
};

export const suspendOrgUser = async (
  userId: string,
  organizationId: string,
) => {
  const user = await setUserActive(userId, false);
  if (!user) return null;
  await revokeUserSessions(userId, organizationId);
  return user;
};

export const activateOrgUser = async (
  userId: string,
  organizationId: string,
) => {
  return setUserActive(userId, true);
};

export const deleteOrgUser = async (userId: string, organizationId: string) => {
  const user = await setUserActive(userId, false);
  if (!user) return null;
  await Promise.all([
    revokeUserSessions(userId, organizationId),
    revokeUserApiKeys(userId, organizationId),
  ]);
  return user;
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const getAuditLogs = async (
  organizationId: string,
  params: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  const { page, limit, userId, action, startDate, endDate } = params;
  const query: Record<string, unknown> = { organizationId };

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) range.$lte = new Date(endDate);
    query.createdAt = range;
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    findAuditLogs(query, skip, limit),
    countAuditLogs(query),
  ]);

  return {
    items: logs.map((log) => ({
      id: log._id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      method: log.method,
      path: log.path,
      statusCode: log.statusCode,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const getHealthStatus = async () => {
  const dbStatus = await pingDatabase();
  return {
    status: "healthy",
    database: dbStatus ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
};
