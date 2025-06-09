import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to check if user is SuperAdmin
async function requireSuperAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user")
    .filter((q: any) => q.eq(q.field("authUserId"), userId))
    .unique();

  if (!appUser || appUser.role !== "superadmin") {
    throw new Error("Unauthorized: SuperAdmin access required");
  }

  return { userId, appUser };
}

// Get all plans
export const getAllPlans = query({
  args: {},
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        return [];
      }

      const appUser = await ctx.db
        .query("appUsers")
        .withIndex("by_auth_user")
        .filter((q: any) => q.eq(q.field("authUserId"), userId))
        .unique();

      if (!appUser || appUser.role !== "superadmin") {
        return [];
      }
      
      const plans = await ctx.db.query("plans").collect();
      return plans;
    } catch (error) {
      console.error("Error in getAllPlans:", error);
      return [];
    }
  },
});

// List plans (for regular users)
export const listPlans = query({
  args: {},
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("plans")
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();
    return plans;
  },
});

// Create new plan
export const createPlan = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("individual"), v.literal("franchise")),
    price: v.number(),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annually")),
    features: v.object({
      maxUsers: v.number(),
      maxSubAccounts: v.number(),
      dataRetention: v.number(),
      apiCalls: v.number(),
      customDomain: v.boolean(),
      customBranding: v.boolean(),
      priority_support: v.boolean(),
      analytics: v.boolean(),
      integrations: v.boolean(),
      multiLocation: v.boolean(),
    }),
    featureList: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("discontinued")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    // Create default permissions based on plan type and features
    const defaultPermissions = {
      customers: {
        view: true,
        create: true,
        edit: true,
        delete: args.features.analytics,
        export: args.features.analytics,
        import: args.features.integrations,
      },
      communications: {
        sendEmail: true,
        sendSMS: args.features.priority_support,
        bulkMessage: args.features.analytics,
        templates: true,
      },
      reports: {
        basic: true,
        advanced: args.features.analytics,
        export: args.features.analytics,
        customReports: args.features.analytics,
      },
      settings: {
        billingView: true,
        billingEdit: args.features.priority_support,
        userManagement: args.features.maxUsers > 1,
        integrations: args.features.integrations,
      },
      features: {
        apiAccess: args.features.integrations,
        webhooks: args.features.integrations,
        customBranding: args.features.customBranding,
        multiLocation: args.features.multiLocation,
      },
    };

    const planId = await ctx.db.insert("plans", {
      name: args.name,
      type: args.type,
      price: args.price,
      billingPeriod: args.billingPeriod,
      features: args.features,
      featureList: args.featureList,
      defaultPermissions,
      status: args.status,
    });

    return planId;
  },
});

// Update plan
export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    updates: v.object({
      name: v.optional(v.string()),
      type: v.optional(v.union(v.literal("individual"), v.literal("franchise"))),
      price: v.optional(v.number()),
      billingPeriod: v.optional(v.union(v.literal("monthly"), v.literal("annually"))),
      features: v.optional(v.object({
        maxUsers: v.number(),
        maxSubAccounts: v.number(),
        dataRetention: v.number(),
        apiCalls: v.number(),
        customDomain: v.boolean(),
        customBranding: v.boolean(),
        priority_support: v.boolean(),
        analytics: v.boolean(),
        integrations: v.boolean(),
        multiLocation: v.boolean(),
      })),
      featureList: v.optional(v.array(v.string())),
      status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("discontinued"))),
    }),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Update default permissions if features changed
    let defaultPermissions = plan.defaultPermissions;
    if (args.updates.features) {
      defaultPermissions = {
        customers: {
          view: true,
          create: true,
          edit: true,
          delete: args.updates.features.analytics,
          export: args.updates.features.analytics,
          import: args.updates.features.integrations,
        },
        communications: {
          sendEmail: true,
          sendSMS: args.updates.features.priority_support,
          bulkMessage: args.updates.features.analytics,
          templates: true,
        },
        reports: {
          basic: true,
          advanced: args.updates.features.analytics,
          export: args.updates.features.analytics,
          customReports: args.updates.features.analytics,
        },
        settings: {
          billingView: true,
          billingEdit: args.updates.features.priority_support,
          userManagement: args.updates.features.maxUsers > 1,
          integrations: args.updates.features.integrations,
        },
        features: {
          apiAccess: args.updates.features.integrations,
          webhooks: args.updates.features.integrations,
          customBranding: args.updates.features.customBranding,
          multiLocation: args.updates.features.multiLocation,
        },
      };
    }

    await ctx.db.patch(args.planId, {
      ...args.updates,
      defaultPermissions,
    });

    return { message: "Plan updated successfully" };
  },
});

// Delete plan
export const deletePlan = mutation({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Check if any accounts are using this plan
    const accountsUsingPlan = await ctx.db
      .query("accounts")
      .withIndex("by_plan")
      .filter((q: any) => q.eq(q.field("planId"), args.planId))
      .collect();

    if (accountsUsingPlan.length > 0) {
      throw new Error(`Cannot delete plan. ${accountsUsingPlan.length} accounts are currently using this plan.`);
    }

    await ctx.db.delete(args.planId);
    return { message: "Plan deleted successfully" };
  },
});

// Create default plans (Basic, Growth, Business)
export const createDefaultPlans = mutation({
  args: {},
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    // Check if plans already exist
    const existingPlans = await ctx.db.query("plans").collect();
    if (existingPlans.length > 0) {
      return { message: "Plans already exist", count: existingPlans.length };
    }

    // Basic Plan
    const basicPlan = await ctx.db.insert("plans", {
      name: "Basic",
      type: "individual",
      price: 19,
      billingPeriod: "monthly",
      features: {
        maxUsers: 3,
        maxSubAccounts: 0,
        dataRetention: 365,
        apiCalls: 1000,
        customDomain: false,
        customBranding: false,
        priority_support: false,
        analytics: false,
        integrations: false,
        multiLocation: false,
      },
      featureList: [
        "Up to 3 users",
        "1,000 customers",
        "Basic email support",
        "Standard templates",
        "Basic reporting",
        "1 year data retention"
      ],
      defaultPermissions: {
        customers: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          export: false,
          import: false,
        },
        communications: {
          sendEmail: true,
          sendSMS: false,
          bulkMessage: false,
          templates: true,
        },
        reports: {
          basic: true,
          advanced: false,
          export: false,
          customReports: false,
        },
        settings: {
          billingView: true,
          billingEdit: false,
          userManagement: false,
          integrations: false,
        },
        features: {
          apiAccess: false,
          webhooks: false,
          customBranding: false,
          multiLocation: false,
        },
      },
      status: "active",
    });

    // Growth Plan
    const growthPlan = await ctx.db.insert("plans", {
      name: "Growth",
      type: "individual",
      price: 49,
      billingPeriod: "monthly",
      features: {
        maxUsers: 10,
        maxSubAccounts: 0,
        dataRetention: 730,
        apiCalls: 10000,
        customDomain: true,
        customBranding: true,
        priority_support: true,
        analytics: true,
        integrations: true,
        multiLocation: false,
      },
      featureList: [
        "Up to 10 users",
        "10,000 customers",
        "Priority email & chat support",
        "Advanced analytics",
        "Custom branding",
        "API access & integrations",
        "Bulk messaging",
        "Data export",
        "2 years data retention"
      ],
      defaultPermissions: {
        customers: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true,
        },
        communications: {
          sendEmail: true,
          sendSMS: true,
          bulkMessage: true,
          templates: true,
        },
        reports: {
          basic: true,
          advanced: true,
          export: true,
          customReports: false,
        },
        settings: {
          billingView: true,
          billingEdit: true,
          userManagement: true,
          integrations: true,
        },
        features: {
          apiAccess: true,
          webhooks: true,
          customBranding: true,
          multiLocation: false,
        },
      },
      status: "active",
    });

    // Business Plan
    const businessPlan = await ctx.db.insert("plans", {
      name: "Business",
      type: "franchise",
      price: 99,
      billingPeriod: "monthly",
      features: {
        maxUsers: 50,
        maxSubAccounts: 25,
        dataRetention: 1095,
        apiCalls: 50000,
        customDomain: true,
        customBranding: true,
        priority_support: true,
        analytics: true,
        integrations: true,
        multiLocation: true,
      },
      featureList: [
        "Up to 50 users",
        "Unlimited customers",
        "Phone & dedicated support",
        "Advanced analytics & reporting",
        "Full custom branding",
        "Advanced API & webhooks",
        "Multi-location management",
        "Custom reporting",
        "3 years data retention",
        "Sub-account management",
        "White-label options"
      ],
      defaultPermissions: {
        customers: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true,
        },
        communications: {
          sendEmail: true,
          sendSMS: true,
          bulkMessage: true,
          templates: true,
        },
        reports: {
          basic: true,
          advanced: true,
          export: true,
          customReports: true,
        },
        settings: {
          billingView: true,
          billingEdit: true,
          userManagement: true,
          integrations: true,
        },
        features: {
          apiAccess: true,
          webhooks: true,
          customBranding: true,
          multiLocation: true,
        },
      },
      status: "active",
    });

    return {
      message: "Default plans created successfully with £ pricing",
      plans: {
        basic: basicPlan,
        growth: growthPlan,
        business: businessPlan,
      },
    };
  },
});

// Get trial status for an account
export const getTrialStatus = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    if (account.planStatus !== "trial" || !account.trialEndsAt) {
      return {
        isOnTrial: false,
        daysRemaining: 0,
        trialEndsAt: null,
      };
    }

    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((account.trialEndsAt - now) / (24 * 60 * 60 * 1000)));
    const isExpired = now > account.trialEndsAt;

    return {
      isOnTrial: !isExpired,
      daysRemaining,
      trialEndsAt: account.trialEndsAt,
      isExpired,
    };
  },
});

// Convert trial to paid subscription
export const convertTrialToPaid = mutation({
  args: { 
    accountId: v.id("accounts"),
    newPlanId: v.optional(v.id("plans")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const updateData: any = {
      planStatus: "active",
      trialEndsAt: undefined,
    };

    if (args.newPlanId) {
      updateData.planId = args.newPlanId;
    }

    await ctx.db.patch(args.accountId, updateData);

    return { message: "Trial converted to paid subscription" };
  },
});

// Extend trial period
export const extendTrial = mutation({
  args: { 
    accountId: v.id("accounts"),
    additionalDays: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    if (account.planStatus !== "trial") {
      throw new Error("Account is not on trial");
    }

    const currentTrialEnd = account.trialEndsAt || Date.now();
    const newTrialEnd = currentTrialEnd + (args.additionalDays * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.accountId, {
      trialEndsAt: newTrialEnd,
    });

    return { 
      message: `Trial extended by ${args.additionalDays} days`,
      newTrialEnd,
    };
  },
});

// Migration: Fix missing featureList field in existing plans
export const fixMissingFeatureList = mutation({
  args: {},
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const plans = await ctx.db.query("plans").collect();
    let updatedCount = 0;

    for (const plan of plans) {
      // Check if plan is missing featureList
      if (!(plan as any).featureList) {
        let featureList: string[] = [];

        // Generate appropriate feature list based on plan name and features
        if (plan.name.toLowerCase().includes("starter") || plan.name.toLowerCase().includes("basic")) {
          featureList = [
            `Up to ${plan.features.maxUsers} users`,
            "Basic customer management",
            "Standard email templates",
            "Basic reporting",
            `${Math.floor(plan.features.dataRetention / 365)} year data retention`
          ];
        } else if (plan.name.toLowerCase().includes("growth")) {
          featureList = [
            `Up to ${plan.features.maxUsers} users`,
            "Advanced customer management",
            "Priority email & chat support",
            "Advanced analytics",
            "Custom branding",
            "API access & integrations",
            "Bulk messaging",
            "Data export",
            `${Math.floor(plan.features.dataRetention / 365)} years data retention`
          ];
        } else if (plan.name.toLowerCase().includes("business") || plan.name.toLowerCase().includes("franchise")) {
          featureList = [
            `Up to ${plan.features.maxUsers} users`,
            "Unlimited customers",
            "Phone & dedicated support",
            "Advanced analytics & reporting",
            "Full custom branding",
            "Advanced API & webhooks",
            "Multi-location management",
            "Custom reporting",
            `${Math.floor(plan.features.dataRetention / 365)} years data retention`,
            "Sub-account management",
            "White-label options"
          ];
        } else {
          // Generic feature list
          featureList = [
            `Up to ${plan.features.maxUsers} users`,
            "Customer management",
            "Email support",
            "Basic templates",
            "Standard reporting"
          ];
        }

        // Update the plan with the featureList
        await ctx.db.patch(plan._id, {
          featureList
        });
        updatedCount++;
      }
    }

    return { 
      message: `Migration completed. Updated ${updatedCount} plans with missing featureList field.`,
      totalPlans: plans.length,
      updatedPlans: updatedCount
    };
  },
});

// Migration function to fix existing plans missing featureList
export const migrateExistingPlans = mutation({
  args: {},
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const plans = await ctx.db.query("plans").collect();
    let updatedCount = 0;

    for (const plan of plans) {
      // Check if plan is missing featureList field
      if (!plan.featureList) {
        // Create a default featureList based on plan features
        const defaultFeatureList = [];
        
        if (plan.features.customDomain) defaultFeatureList.push("Custom Domain");
        if (plan.features.customBranding) defaultFeatureList.push("Custom Branding");
        if (plan.features.priority_support) defaultFeatureList.push("Priority Support");
        if (plan.features.analytics) defaultFeatureList.push("Advanced Analytics");
        if (plan.features.integrations) defaultFeatureList.push("Third-party Integrations");
        if (plan.features.multiLocation) defaultFeatureList.push("Multi-location Support");
        
        // Add basic features based on plan type
        if (plan.type === "individual") {
          defaultFeatureList.unshift("Email Support", "Basic Dashboard", "Customer Management");
        } else {
          defaultFeatureList.unshift("Email Support", "Advanced Dashboard", "Customer Management", "Sub-account Management");
        }

        await ctx.db.patch(plan._id, {
          featureList: defaultFeatureList,
        });

        updatedCount++;
      }
    }

    return {
      message: `Migration completed. Updated ${updatedCount} plans with missing featureList field.`,
      updatedCount,
    };
  },
});
