import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  requestId: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: String,
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ipAddress: { type: String, required: true },
    userAgent: String,
    metadata: Schema.Types.Mixed,
    requestId: {
      type: String,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, applicationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

// Auto-delete logs older than 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
