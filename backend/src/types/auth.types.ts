export type UserRole = "owner" | "admin" | "member" | "user" | "sdk_user";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  isSDKUser?: boolean; // true when JWT was issued via SDK endpoint
}
