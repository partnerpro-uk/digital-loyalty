import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to get current user context (including view-as mode)
async function getCurrentUserContext(ctx: any, sessionToken?: string) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user")
    .filter((q: any) => q.eq(q.field("authUserId"), userId))
    .unique();

  if (!appUser) {
    throw new Error("User profile not found");
  }

  // Check if we're in view-as mode
  if (sessionToken && appUser.role === "superadmin") {
    const session = await ctx.db
      .query("viewAsUserSessions")
      .withIndex("by_token")
      .filter((q: any) => q.eq(q.field("sessionToken"), sessionToken))
      .unique();

    if (session && session.isActive && session.expiresAt > Date.now()) {
      const viewingUser = await ctx.db.get(session.viewingUserId);
      const viewingAccount = await ctx.db.get(session.viewingAccountId);
      
      if (viewingUser && viewingAccount) {
        // Get user-specific permissions
        const userPermissions = await ctx.db
          .query("userPermissions")
          .withIndex("by_user")
          .filter((q: any) => q.eq(q.field("userId"), viewingUser._id))
          .unique();

        // Get account-level permissions as fallback
        const accountPermissions = await ctx.db
          .query("accountPermissions")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), viewingAccount._id))
          .unique();

        // Get plan default permissions
        const viewingPlan = await ctx.db.get(viewingAccount.planId);

        return {
          userId,
          appUser: viewingUser, // Use the viewing user instead of superadmin
          currentAccount: viewingAccount,
          isViewAsMode: true,
          viewAsSessionToken: sessionToken,
          permissions: userPermissions?.permissions || accountPermissions?.permissions || viewingPlan?.defaultPermissions,
          limits: accountPermissions?.customLimits || {
            maxCustomers: 1000,
            maxMonthlyEmails: 5000,
            maxUsers: viewingPlan?.features.maxUsers || 5,
            dataRetentionDays: viewingPlan?.features.dataRetention || 365,
          },
        };
      }
    }
  }

  // Normal mode - get user's own account
  const currentAccount = appUser.accountId ? await ctx.db.get(appUser.accountId) : null;
  
  // Get user permissions
  let permissions = null;
  let limits = null;
  
  if (currentAccount) {
    const userPermissions = await ctx.db
      .query("userPermissions")
      .withIndex("by_user")
      .filter((q: any) => q.eq(q.field("userId"), appUser._id))
      .unique();

    const accountPermissions = await ctx.db
      .query("accountPermissions")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), currentAccount._id))
      .unique();

    const userPlan = await ctx.db.get(currentAccount.planId);

    permissions = userPermissions?.permissions || accountPermissions?.permissions || userPlan?.defaultPermissions;
    limits = accountPermissions?.customLimits || {
      maxCustomers: 1000,
      maxMonthlyEmails: 5000,
      maxUsers: userPlan?.features.maxUsers || 5,
      dataRetentionDays: userPlan?.features.dataRetention || 365,
    };
  }

  return {
    userId,
    appUser,
    currentAccount,
    isViewAsMode: false,
    permissions,
    limits,
  };
}

// Get account dashboard data
export const getDashboardData = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { currentAccount, appUser, isViewAsMode, permissions, limits } = await getCurrentUserContext(ctx, args.sessionToken);

    // If user is superadmin and not in view-as mode, return demo data
    if (appUser.role === "superadmin" && !isViewAsMode) {
      return {
        account: {
          name: "SuperAdmin Account",
          type: "platform",
          status: "active",
          planStatus: "active",
          trialDaysRemaining: 0,
        },
        plan: {
          name: "Platform Admin",
          price: 0,
          billingPeriod: "unlimited",
        },
        stats: {
          totalCustomers: 0,
          activeCustomers: 0,
          inactiveCustomers: 0,
        },
        permissions: {
          customers: {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
          communications: {
            sendEmail: true,
            sendSMS: true,
            bulkMessage: true,
            templates: true,
          },
          settings: {
            userManagement: true,
            billingView: true,
            billingEdit: true,
            integrations: true,
          },
        },
        limits: {
          maxCustomers: 999999,
          maxMonthlyEmails: 999999,
          maxUsers: 999999,
          dataRetentionDays: 999999,
        },
        isViewAsMode: false,
        currentAccount: null,
        userInfo: {
          name: `${appUser.firstName} ${appUser.lastName}`,
          email: appUser.email,
          role: appUser.role,
        },
      };
    }

    if (!currentAccount) {
      throw new Error("No account context");
    }

    // Get customers count
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), currentAccount._id))
      .collect();

    const activeCustomers = customers.filter(c => c.status === "active").length;

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (currentAccount.planStatus === "trial" && currentAccount.trialEndsAt) {
      const now = Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil((currentAccount.trialEndsAt - now) / (24 * 60 * 60 * 1000)));
    }

    // Get plan info
    const accountPlan = await ctx.db.get(currentAccount.planId);

    return {
      account: {
        name: currentAccount.name,
        type: currentAccount.type,
        status: currentAccount.status,
        planStatus: currentAccount.planStatus,
        trialDaysRemaining,
      },
      plan: accountPlan ? {
        name: (accountPlan as any).name,
        price: (accountPlan as any).price,
        billingPeriod: (accountPlan as any).billingPeriod,
      } : {
        name: "Unknown",
        price: 0,
        billingPeriod: "monthly" as const,
      },
      stats: {
        totalCustomers: customers.length,
        activeCustomers,
        inactiveCustomers: customers.length - activeCustomers,
      },
      permissions: permissions || {
        customers: { view: false, create: false, edit: false, delete: false },
        communications: { sendEmail: false, sendSMS: false, bulkMessage: false, templates: false },
        settings: { userManagement: false, billingView: false, billingEdit: false, integrations: false },
      },
      limits: limits || {
        maxCustomers: 0,
        maxMonthlyEmails: 0,
        maxUsers: 0,
        dataRetentionDays: 0,
      },
      isViewAsMode,
      currentAccount,
      userInfo: {
        name: `${appUser.firstName} ${appUser.lastName}`,
        email: appUser.email,
        role: appUser.role,
      },
    };
  },
});

// Get customers for current account
export const getCustomers = query({
  args: {
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { currentAccount, appUser, permissions } = await getCurrentUserContext(ctx, args.sessionToken);

    // Check permissions
    if (!permissions?.customers?.view) {
      throw new Error("Insufficient permissions to view customers");
    }

    // If user is superadmin and not in view-as mode, return empty array
    if (appUser.role === "superadmin" && !args.sessionToken) {
      return [];
    }

    if (!currentAccount) {
      throw new Error("No account context");
    }

    let customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), currentAccount._id))
      .collect();

    if (args.limit) {
      customers = customers.slice(0, args.limit);
    }

    return customers;
  },
});

// Add customer
export const addCustomer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { currentAccount, appUser, permissions } = await getCurrentUserContext(ctx, args.sessionToken);

    // Check permissions
    if (!permissions?.customers?.create) {
      throw new Error("Insufficient permissions to create customers");
    }

    // SuperAdmins can't add customers directly unless in view-as mode
    if (appUser.role === "superadmin" && !args.sessionToken) {
      throw new Error("SuperAdmins cannot add customers directly");
    }

    if (!currentAccount) {
      throw new Error("No account context");
    }

    // Parse name into firstName and lastName
    const nameParts = args.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const customerId = await ctx.db.insert("customers", {
      accountId: currentAccount._id,
      firstName,
      lastName,
      email: args.email,
      phone: args.phone,
      birthday: undefined,
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
      referredBy: undefined,
      loyaltyCards: [],
      totalVisits: 0,
      lifetimeSpend: 0,
      lastVisited: undefined,
      pointsBalance: 0,
      stampsBalance: 0,
      rewardsEarned: 0,
      rewardsAvailable: 0,
      referralCount: 0,
      tags: args.tags,
      customFields: {},
      status: "active",
      notes: args.notes || "",
    });

    return { customerId, message: "Customer added successfully" };
  },
});
