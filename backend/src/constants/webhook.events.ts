export const WEBHOOK_EVENTS = [
  "user.created",
  "user.updated",
  "user.deleted",
  "user.login",
  "user.logout",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "member.added",
  "member.removed",
  "apikey.created",
  "apikey.deleted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
