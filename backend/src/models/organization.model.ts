import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  settings: {
    allowSignup: boolean;
    requireEmailVerification: boolean;
    requireMFA: boolean;
    allowedDomains: string[];
  };
  billing: {
    plan: "free" | "pro" | "enterprise";
    status: "active" | "cancelled" | "past_due";
    subscriptionId?: string;
  };
  limits: {
    maxUsers: number;
    maxApiKeys: number;
    maxApiCalls: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    settings: {
      allowSignup: { type: Boolean, default: true },
      requireEmailVerification: { type: Boolean, default: true },
      requireMFA: { type: Boolean, default: false },
      allowedDomains: [String],
    },

    billing: {
      plan: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "cancelled", "past_due"],
        default: "active",
      },
      subscriptionId: String,
    },

    limits: {
      maxUsers: { type: Number, default: 100 },
      maxApiKeys: { type: Number, default: 2 },
      maxApiCalls: { type: Number, default: 10000 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Auto-generate unique slug from name on first save
organizationSchema.pre("save", async function () {
  if (this.isModified("name") && !this.slug) {
    const Org = mongoose.models.Organization;
    const base = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    let slug = base;
    let counter = 1;
    while (await Org.findOne({ slug })) {
      slug = `${base}-${counter++}`;
    }
    this.slug = slug;
  }
});

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  organizationSchema,
);
