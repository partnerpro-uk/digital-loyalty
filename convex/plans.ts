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

// List all plans
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("plans").collect();
  },
});

// Create demo plans
export const createDemoPlans = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    // Check if plans already exist
    const existingPlans = await ctx.db.query("plans").collect();
    if (existingPlans.length > 0) {
      return { message: "Demo plans already exist", count: existingPlans.length };
    }

    // Create Starter Plan
    const starterPlan = await ctx.db.insert("plans", {
      name: "Starter",
      type: "individual",
      price: 29,
      billingPeriod: "monthly",
      features: {
        maxUsers: 3,
        maxSubAccounts: 0,
        dataRetention: 365,
        apiCalls: 1000,
        customDomain: false,
      },
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

    // Create Professional Plan
    const professionalPlan = await ctx.db.insert("plans", {
      name: "Professional",
      type: "individual",
      price: 79,
      billingPeriod: "monthly",
      features: {
        maxUsers: 10,
        maxSubAccounts: 0,
        dataRetention: 730,
        apiCalls: 5000,
        customDomain: true,
      },
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

    // Create Enterprise Plan
    const enterprisePlan = await ctx.db.insert("plans", {
      name: "Enterprise",
      type: "franchise",
      price: 199,
      billingPeriod: "monthly",
      features: {
        maxUsers: 50,
        maxSubAccounts: 25,
        dataRetention: 1095,
        apiCalls: 25000,
        customDomain: true,
      },
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
      message: "Demo plans created successfully",
      plans: {
        starter: starterPlan,
        professional: professionalPlan,
        enterprise: enterprisePlan,
      },
    };
  },
});

// Create demo accounts with trial functionality and demo users
export const createDemoAccount = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("franchise"), v.literal("individual")),
    planId: v.id("plans"),
    adminEmail: v.string(),
    adminName: v.string(),
    trialDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Calculate trial end date (default 14 days)
    const trialDays = args.trialDays || 14;
    const trialEndsAt = Date.now() + (trialDays * 24 * 60 * 60 * 1000);

    // Generate unique slug
    const baseSlug = args.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existingAccount = await ctx.db
        .query("accounts")
        .withIndex("by_slug")
        .filter((q: any) => q.eq(q.field("slug"), slug))
        .unique();
      
      if (!existingAccount) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create account
    const accountId = await ctx.db.insert("accounts", {
      type: args.type,
      name: args.name,
      slug,
      primaryContact: {
        name: args.adminName,
        email: args.adminEmail,
        phone: "+1-555-0123",
      },
      location: {
        address: "123 Demo Street",
        city: "Demo City",
        state: "CA",
        zip: "90210",
        country: "US",
        timezone: "America/Los_Angeles",
      },
      planId: args.planId,
      planStatus: "trial",
      trialEndsAt,
      createdBy: (await getAuthUserId(ctx))!,
      status: "active",
      limits: {
        users: plan.features.maxUsers,
        subAccounts: plan.features.maxSubAccounts,
      },
    });

    // Create demo users for the account
    const demoUsers = [
      {
        firstName: "Admin",
        lastName: "User",
        email: args.adminEmail,
        phone: "+1-555-0100",
        role: "orgadmin" as const,
        status: "active" as const,
      },
      {
        firstName: "John",
        lastName: "Manager",
        email: `john.manager@${slug}.demo`,
        phone: "+1-555-0101",
        role: "clientuser" as const,
        status: "active" as const,
      },
      {
        firstName: "Sarah",
        lastName: "Staff",
        email: `sarah.staff@${slug}.demo`,
        phone: "+1-555-0102",
        role: "clientuser" as const,
        status: "active" as const,
      },
    ];

    // Create demo auth users and app users
    for (const demoUser of demoUsers) {
      // Create a placeholder auth user (in real app, this would be created during signup)
      const authUserId = await ctx.db.insert("users", {
        name: `${demoUser.firstName} ${demoUser.lastName}`,
        email: demoUser.email,
        emailVerificationTime: Date.now(),
        isAnonymous: false,
      });

      // Create app user
      const appUserId = await ctx.db.insert("appUsers", {
        email: demoUser.email,
        phone: demoUser.phone,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        role: demoUser.role,
        accountId,
        accountType: args.type,
        status: demoUser.status,
        emailVerified: true,
        lastLogin: Date.now(),
        loginAttempts: 0,
        authUserId,
      });

      // Create custom permissions for some users to demonstrate permission differences
      if (demoUser.role === "clientuser" && demoUser.firstName === "Sarah") {
        // Sarah has limited permissions
        await ctx.db.insert("userPermissions", {
          userId: appUserId,
          accountId,
          permissions: {
            customers: {
              view: true,
              create: false,
              edit: false,
              delete: false,
              export: false,
              import: false,
            },
            communications: {
              sendEmail: false,
              sendSMS: false,
              bulkMessage: false,
              templates: false,
            },
            reports: {
              basic: true,
              advanced: false,
              export: false,
              customReports: false,
            },
            settings: {
              billingView: false,
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
        });
      }
    }

    // Add some demo customers for the account
    const demoCustomers = [
      {
        name: "John Smith",
        email: "john.smith@example.com",
        phone: "+1-555-0201",
        tags: ["vip", "enterprise"],
        notes: "Long-term customer, prefers email communication",
      },
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        phone: "+1-555-0202",
        tags: ["new", "potential"],
        notes: "Recently signed up, interested in premium features",
      },
      {
        name: "Mike Davis",
        email: "mike.davis@example.com",
        tags: ["regular"],
        notes: "Standard customer, monthly billing",
      },
    ];

    for (const customer of demoCustomers) {
      await ctx.db.insert("customers", {
        accountId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: "active",
        tags: customer.tags,
        notes: customer.notes,
      });
    }

    return {
      accountId,
      message: `Demo account "${args.name}" created with ${trialDays}-day trial and ${demoUsers.length} demo users`,
      trialEndsAt,
      userCount: demoUsers.length,
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
