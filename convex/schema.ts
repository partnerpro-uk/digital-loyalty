import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Billing Plans
  plans: defineTable({
    name: v.string(),
    type: v.union(v.literal("individual"), v.literal("franchise")),
    price: v.number(),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    features: v.object({
      maxUsers: v.number(),
      maxSubAccounts: v.number(),
      dataRetention: v.number(),
      apiCalls: v.number(),
      customDomain: v.boolean(),
    }),
    defaultPermissions: v.object({
      customers: v.object({
        view: v.boolean(),
        create: v.boolean(),
        edit: v.boolean(),
        delete: v.boolean(),
        export: v.boolean(),
        import: v.boolean(),
      }),
      communications: v.object({
        sendEmail: v.boolean(),
        sendSMS: v.boolean(),
        bulkMessage: v.boolean(),
        templates: v.boolean(),
      }),
      reports: v.object({
        basic: v.boolean(),
        advanced: v.boolean(),
        export: v.boolean(),
        customReports: v.boolean(),
      }),
      settings: v.object({
        billingView: v.boolean(),
        billingEdit: v.boolean(),
        userManagement: v.boolean(),
        integrations: v.boolean(),
      }),
      features: v.object({
        apiAccess: v.boolean(),
        webhooks: v.boolean(),
        customBranding: v.boolean(),
        multiLocation: v.boolean(),
      }),
    }),
    status: v.union(v.literal("active"), v.literal("legacy"), v.literal("discontinued")),
  }).index("by_type", ["type"]).index("by_status", ["status"]),

  // Accounts (Franchise and Individual)
  accounts: defineTable({
    type: v.union(v.literal("franchise"), v.literal("individual")),
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("accounts")),
    primaryContact: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
      timezone: v.string(),
    })),
    planId: v.id("plans"),
    planStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled")
    ),
    trialEndsAt: v.optional(v.number()),
    createdBy: v.id("users"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("pending")),
    limits: v.object({
      users: v.number(),
      subAccounts: v.number(),
    }),
  })
    .index("by_type", ["type"])
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_slug", ["slug"])
    .index("by_name", ["name"]),

  // Enhanced Users with roles and account relationships
  appUsers: defineTable({
    email: v.string(),
    phone: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("superadmin"), v.literal("orgadmin"), v.literal("clientuser")),
    accountId: v.optional(v.id("accounts")),
    accountType: v.union(v.literal("platform"), v.literal("franchise"), v.literal("individual")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("suspended")),
    emailVerified: v.boolean(),
    lastLogin: v.optional(v.number()),
    loginAttempts: v.number(),
    lockedUntil: v.optional(v.number()),
    authUserId: v.id("users"), // Link to auth table
  })
    .index("by_email", ["email"])
    .index("by_account", ["accountId"])
    .index("by_role", ["role"])
    .index("by_auth_user", ["authUserId"]),

  // User-specific permissions (overrides account and plan defaults)
  userPermissions: defineTable({
    userId: v.id("appUsers"),
    accountId: v.id("accounts"),
    permissions: v.object({
      customers: v.object({
        view: v.boolean(),
        create: v.boolean(),
        edit: v.boolean(),
        delete: v.boolean(),
        export: v.boolean(),
        import: v.boolean(),
      }),
      communications: v.object({
        sendEmail: v.boolean(),
        sendSMS: v.boolean(),
        bulkMessage: v.boolean(),
        templates: v.boolean(),
      }),
      reports: v.object({
        basic: v.boolean(),
        advanced: v.boolean(),
        export: v.boolean(),
        customReports: v.boolean(),
      }),
      settings: v.object({
        billingView: v.boolean(),
        billingEdit: v.boolean(),
        userManagement: v.boolean(),
        integrations: v.boolean(),
      }),
      features: v.object({
        apiAccess: v.boolean(),
        webhooks: v.boolean(),
        customBranding: v.boolean(),
        multiLocation: v.boolean(),
      }),
    }),
    customLimits: v.optional(v.object({
      maxCustomers: v.number(),
      maxMonthlyEmails: v.number(),
      dataRetentionDays: v.number(),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"]),

  // Account Permissions (overrides plan defaults)
  accountPermissions: defineTable({
    accountId: v.id("accounts"),
    permissions: v.object({
      customers: v.object({
        view: v.boolean(),
        create: v.boolean(),
        edit: v.boolean(),
        delete: v.boolean(),
        export: v.boolean(),
        import: v.boolean(),
      }),
      communications: v.object({
        sendEmail: v.boolean(),
        sendSMS: v.boolean(),
        bulkMessage: v.boolean(),
        templates: v.boolean(),
      }),
      reports: v.object({
        basic: v.boolean(),
        advanced: v.boolean(),
        export: v.boolean(),
        customReports: v.boolean(),
      }),
      settings: v.object({
        billingView: v.boolean(),
        billingEdit: v.boolean(),
        userManagement: v.boolean(),
        integrations: v.boolean(),
      }),
      features: v.object({
        apiAccess: v.boolean(),
        webhooks: v.boolean(),
        customBranding: v.boolean(),
        multiLocation: v.boolean(),
      }),
    }),
    customLimits: v.object({
      maxCustomers: v.number(),
      maxMonthlyEmails: v.number(),
      maxUsers: v.number(),
      dataRetentionDays: v.number(),
    }),
    uiRestrictions: v.object({
      hiddenModules: v.array(v.string()),
      disabledFeatures: v.array(v.string()),
      customDashboard: v.boolean(),
    }),
  }).index("by_account", ["accountId"]),

  // View As User Sessions (enhanced)
  viewAsUserSessions: defineTable({
    superAdminId: v.id("users"),
    viewingAccountId: v.id("accounts"),
    viewingUserId: v.id("appUsers"),
    sessionToken: v.string(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_admin", ["superAdminId"])
    .index("by_token", ["sessionToken"])
    .index("by_account", ["viewingAccountId"])
    .index("by_user", ["viewingUserId"]),

  // Audit Logs
  auditLogs: defineTable({
    userId: v.id("users"),
    accountId: v.optional(v.id("accounts")),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      metadata: v.optional(v.any()),
    }),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    viewAsMode: v.boolean(),
    viewAsUserId: v.optional(v.id("appUsers")),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"])
    .index("by_action", ["action"]),

  // Sample data tables for client accounts
  customers: defineTable({
    accountId: v.id("accounts"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_account", ["accountId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
