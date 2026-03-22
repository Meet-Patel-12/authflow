import api from "../../../app/apiClient";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string; // only returned once on creation
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: "pending" | "success" | "failed" | "retrying";
  attemptCount: number;
  response?: {
    statusCode: number;
    body: string;
  };
  lastAttemptAt?: string;
  nextRetryAt?: string;
  createdAt: string;
}

export interface CreateWebhookData {
  url: string;
  events: string[];
  secret?: string;
}

export const webhookService = {
  // GET /webhooks
  getWebhooks: async () => {
    const res = await api.get("/webhooks");
    return res.data;
  },

  // POST /webhooks
  createWebhook: async (data: CreateWebhookData) => {
    const res = await api.post("/webhooks", data);
    return res.data;
  },

  // PUT /webhooks/:id
  updateWebhook: async (
    id: string,
    data: Partial<{ url: string; events: string[]; isActive: boolean }>,
  ) => {
    const res = await api.put(`/webhooks/${id}`, data);
    return res.data;
  },

  // DELETE /webhooks/:id
  deleteWebhook: async (id: string) => {
    const res = await api.delete(`/webhooks/${id}`);
    return res.data;
  },

  // GET /webhooks/:id/deliveries
  getDeliveries: async (id: string) => {
    const res = await api.get(`/webhooks/${id}/deliveries`);
    return res.data;
  },
};

export const ALL_EVENTS = [
  { value: "user.created", label: "User Created", group: "Users" },
  { value: "user.updated", label: "User Updated", group: "Users" },
  { value: "user.deleted", label: "User Deleted", group: "Users" },
  { value: "user.login", label: "User Login", group: "Users" },
  { value: "user.logout", label: "User Logout", group: "Users" },
  {
    value: "organization.created",
    label: "Org Created",
    group: "Organization",
  },
  {
    value: "organization.updated",
    label: "Org Updated",
    group: "Organization",
  },
  {
    value: "organization.deleted",
    label: "Org Deleted",
    group: "Organization",
  },
  { value: "member.added", label: "Member Added", group: "Members" },
  { value: "member.removed", label: "Member Removed", group: "Members" },
  { value: "apikey.created", label: "API Key Created", group: "API Keys" },
  { value: "apikey.deleted", label: "API Key Deleted", group: "API Keys" },
];
