import { Request } from "express";

export const getIpAddress = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

export const getUserAgent = (req: Request): string => {
  return req.headers["user-agent"] || "unknown";
};

export const shouldAuditRequest = (
  req: Request,
  statusCode: number,
): boolean => {
  return (
    req.method !== "GET" || req.path.includes("/admin") || statusCode >= 400
  );
};

export const determineAction = (req: Request): string => {
  const path = req.path.toLowerCase();
  const method = req.method;

  // Auth
  if (path.includes("/login")) return "login";
  if (path.includes("/register")) return "register";
  if (path.includes("/logout")) return "logout";
  if (path.includes("/verify-email")) return "email_verify";
  if (path.includes("/password-reset")) return "password_reset";
  if (path.includes("/mfa/enable")) return "mfa_enable";
  if (path.includes("/mfa/disable")) return "mfa_disable";

  // API keys
  if (path.includes("/api-keys") && method === "POST") return "api_key_create";
  if (path.includes("/api-keys") && method === "DELETE")
    return "api_key_delete";

  // Users
  if (path.includes("/users") && method === "POST") return "user_create";
  if (path.includes("/users") && method === "PUT") return "user_update";
  if (path.includes("/users") && method === "DELETE") return "user_delete";

  // Organizations
  if (path.includes("/switch")) return "org_switch";
  if (
    path.includes("/organizations") &&
    path.includes("/members") &&
    method === "POST"
  )
    return "member_add";
  if (
    path.includes("/organizations") &&
    path.includes("/members") &&
    method === "DELETE"
  )
    return "member_remove";
  if (path.includes("/organizations") && method === "POST") return "org_create";
  if (path.includes("/organizations") && method === "PUT") return "org_update";
  if (path.includes("/organizations") && method === "DELETE")
    return "org_delete";

  // Settings & Webhooks
  if (path.includes("/settings") && method === "PUT") return "settings_update";
  if (path.includes("/webhooks") && method === "POST") return "webhook_create";
  if (path.includes("/webhooks") && method === "DELETE")
    return "webhook_delete";

  return `${method.toLowerCase()}_${determineResource(req)}`;
};

export const determineResource = (req: Request): string => {
  const path = req.path.toLowerCase();

  if (
    path.includes("/auth") ||
    path.includes("/login") ||
    path.includes("/register")
  )
    return "auth";
  if (path.includes("/users")) return "user";
  if (path.includes("/organizations")) return "organization";
  if (path.includes("/api-keys")) return "api_key";
  if (path.includes("/webhooks")) return "webhook";
  if (path.includes("/sessions")) return "session";
  if (path.includes("/settings")) return "settings";
  if (path.includes("/mfa")) return "mfa";
  if (path.includes("/admin")) return "admin";

  return "unknown";
};

export const determineResourceId = (
  req: Request,
  responseData: any,
): string | undefined => {
  const value =
    req.params.id ||
    req.params.userId ||
    req.params.organizationId ||
    req.params.apiKeyId ||
    responseData?.data?.user?.id ||
    responseData?.data?.organization?.id ||
    responseData?.data?.id;

  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};
