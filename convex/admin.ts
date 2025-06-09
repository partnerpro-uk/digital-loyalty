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

// Get system statistics
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const accounts = await ctx.db.query("accounts").collect();
    const users = await ctx.db.query("appUsers").collect();
    const customers = await ctx.db.query("customers").collect();

    const individualAccounts = accounts.filter(a => a.type === "individual" && !a.parentId).length;
    const franchiseAccounts = accounts.filter(a => a.type === "franchise").length;
    const subAccounts = accounts.filter(a => a.parentId).length;

    return {
      totalAccounts: accounts.length,
      totalUsers: users.length,
      totalCustomers: customers.length,
      franchiseAccounts,
      individualAccounts,
      subAccounts,
      independentAccounts: individualAccounts,
      activeSessions: 0,
    };
  },
});

// List all accounts with enhanced data
export const listAccounts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const accounts = await ctx.db.query("accounts").collect();
    
    // Enhance accounts with plan information and trial status
    const enhancedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const plan = await ctx.db.get(account.planId);
        
        // Calculate trial status
        let trialStatus = null;
        if (account.planStatus === "trial" && account.trialEndsAt) {
          const now = Date.now();
          const daysRemaining = Math.max(0, Math.ceil((account.trialEndsAt - now) / (24 * 60 * 60 * 1000)));
          const isExpired = now > account.trialEndsAt;
          
          trialStatus = {
            daysRemaining,
            isExpired,
            expiresAt: account.trialEndsAt,
          };
        }

        // Get customer count
        const customers = await ctx.db
          .query("customers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), account._id))
          .collect();

        // Get user count for this account
        const users = await ctx.db
          .query("appUsers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), account._id))
          .collect();

        return {
          ...account,
          plan,
          trialStatus,
          customerCount: customers.length,
          userCount: users.length,
        };
      })
    );
    
    if (args.limit) {
      return enhancedAccounts.slice(0, args.limit);
    }

    return enhancedAccounts;
  },
});

// Get users for a specific account (super admin only)
export const getAccountUsers = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const users = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    // Get user permissions for each user
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const userPermissions = await ctx.db
          .query("userPermissions")
          .withIndex("by_user")
          .filter((q: any) => q.eq(q.field("userId"), user._id))
          .unique();

        return {
          ...user,
          permissions: userPermissions?.permissions || null,
        };
      })
    );

    return usersWithPermissions;
  },
});

// Check if account has users (for displaying View As button)
export const checkAccountHasUsers = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const users = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    return users.length > 0;
  },
});

// Get available plans
export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("plans").collect();
  },
});

// Create new account with trial
export const createAccount = mutation({
  args: {
    type: v.union(v.literal("franchise"), v.literal("individual")),
    name: v.string(),
    planId: v.id("plans"),
    adminUser: v.object({
      firstName: v.string(),
      lastName: v.string(),
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
    parentId: v.optional(v.id("accounts")),
    trialDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Validate parent account if specified
    if (args.parentId) {
      const parentAccount = await ctx.db.get(args.parentId);
      if (!parentAccount || parentAccount.type !== "franchise") {
        throw new Error("Invalid parent account");
      }
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
      parentId: args.parentId,
      primaryContact: {
        name: `${args.adminUser.firstName} ${args.adminUser.lastName}`,
        email: args.adminUser.email,
        phone: args.adminUser.phone,
      },
      location: args.location,
      planId: args.planId,
      planStatus: "trial",
      trialEndsAt,
      createdBy: userId,
      status: "active",
      limits: {
        users: plan.features.maxUsers,
        subAccounts: args.type === "franchise" ? 50 : 0, // Only franchises can have sub-accounts
      },
    });

    // Every account MUST have at least one user - create the admin user
    // Create placeholder auth user (in real app, this would be created during signup)
    const authUserId = await ctx.db.insert("users", {
      name: `${args.adminUser.firstName} ${args.adminUser.lastName}`,
      email: args.adminUser.email,
      emailVerificationTime: undefined, // User needs to verify email
      isAnonymous: false,
    });

    // Create the admin user for this account
    const adminUserId = await ctx.db.insert("appUsers", {
      email: args.adminUser.email,
      phone: args.adminUser.phone,
      firstName: args.adminUser.firstName,
      lastName: args.adminUser.lastName,
      role: "orgadmin",
      accountId: accountId,
      accountType: args.type,
      status: "invited", // User starts as invited
      emailVerified: false,
      lastLogin: undefined,
      loginAttempts: 0,
      authUserId,
    });

    return {
      accountId,
      adminUserId,
      message: `Account "${args.name}" created with ${trialDays}-day trial and admin user`,
      trialEndsAt,
    };
  },
});

// Start "View As User" session
export const startViewAsUserSession = mutation({
  args: { 
    accountId: v.id("accounts"),
    userId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    const { userId: superAdminId } = await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Verify user belongs to the account
    if (targetUser.accountId !== args.accountId) {
      throw new Error("User does not belong to this account");
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (4 * 60 * 60 * 1000); // 4 hours

    // Create new session
    await ctx.db.insert("viewAsUserSessions", {
      superAdminId,
      viewingAccountId: args.accountId,
      viewingUserId: args.userId,
      sessionToken,
      expiresAt,
      isActive: true,
    });

    return { 
      sessionToken, 
      expiresAt, 
      accountName: account.name,
      userName: `${targetUser.firstName} ${targetUser.lastName}`,
      userRole: targetUser.role,
    };
  },
});

// End "View As User" session
export const endViewAsUserSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);

    const session = await ctx.db
      .query("viewAsUserSessions")
      .withIndex("by_token")
      .filter((q: any) => q.eq(q.field("sessionToken"), args.sessionToken))
      .unique();

    if (!session || session.superAdminId !== userId) {
      throw new Error("Invalid session");
    }

    await ctx.db.patch(session._id, { isActive: false });
    return { message: "View As User session ended" };
  },
});

// Get current view as session info
export const getViewAsSessionInfo = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("viewAsUserSessions")
      .withIndex("by_token")
      .filter((q: any) => q.eq(q.field("sessionToken"), args.sessionToken))
      .unique();

    if (!session || !session.isActive || session.expiresAt < Date.now()) {
      return null;
    }

    const account = await ctx.db.get(session.viewingAccountId);
    const user = await ctx.db.get(session.viewingUserId);

    if (!account || !user) {
      return null;
    }

    return {
      account,
      user,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    };
  },
});

// Update account details
export const updateAccount = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.string(),
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }
    if (plan.type !== account.type) {
      throw new Error("Plan type does not match account type");
    }

    await ctx.db.patch(args.accountId, {
      name: args.name,
      planId: args.planId,
    });

    return { success: true };
  },
});

// Update account status
export const updateAccountStatus = mutation({
  args: {
    accountId: v.id("accounts"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.accountId, {
      status: args.status,
    });

    return { success: true };
  },
});

// Assign plan to account
export const assignPlanToAccount = mutation({
  args: {
    accountId: v.id("accounts"),
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Validate plan type matches account type
    if (plan.type !== account.type) {
      throw new Error(`Cannot assign ${plan.type} plan to ${account.type} account`);
    }

    await ctx.db.patch(args.accountId, {
      planId: args.planId,
    });

    return {
      message: `Plan "${plan.name}" assigned to account "${account.name}" successfully`,
    };
  },
});

// Update trial settings
export const updateTrialSettings = mutation({
  args: {
    accountId: v.id("accounts"),
    action: v.union(
      v.literal("extend"),
      v.literal("end"),
      v.literal("restart"),
      v.literal("set_custom_end")
    ),
    trialEndsAt: v.optional(v.number()),
    extensionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    let newTrialEndsAt: number | undefined;
    let newPlanStatus: "trial" | "active" | "past_due" | "cancelled" = account.planStatus;

    switch (args.action) {
      case "extend":
        if (!args.extensionDays) {
          throw new Error("Extension days required for extend action");
        }
        const currentEnd = account.trialEndsAt || Date.now();
        newTrialEndsAt = currentEnd + (args.extensionDays * 24 * 60 * 60 * 1000);
        newPlanStatus = "trial";
        break;

      case "end":
        newTrialEndsAt = Date.now();
        newPlanStatus = "active";
        break;

      case "restart":
        const defaultTrialDays = 14;
        newTrialEndsAt = Date.now() + (defaultTrialDays * 24 * 60 * 60 * 1000);
        newPlanStatus = "trial";
        break;

      case "set_custom_end":
        if (!args.trialEndsAt) {
          throw new Error("Trial end date required for set_custom_end action");
        }
        newTrialEndsAt = args.trialEndsAt;
        newPlanStatus = args.trialEndsAt > Date.now() ? "trial" : "active";
        break;
    }

    await ctx.db.patch(args.accountId, {
      trialEndsAt: newTrialEndsAt,
      planStatus: newPlanStatus,
    });

    return {
      message: `Trial settings updated successfully`,
      newTrialEndsAt,
      newPlanStatus,
    };
  },
});

// Update account billing status
export const updateBillingStatus = mutation({
  args: {
    accountId: v.id("accounts"),
    planStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.accountId, {
      planStatus: args.planStatus,
    });

    return {
      message: `Billing status updated to ${args.planStatus}`,
    };
  },
});

// Get account with plan for manage modal
export const getAccountWithPlan = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const plan = await ctx.db.get(account.planId);
    
    return {
      ...account,
      plan,
    };
  },
});

// Get all accounts for plan manager (simplified version)
export const getAccountsForPlanManager = query({
  args: {},
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const accounts = await ctx.db.query("accounts").collect();
    
    // Enhanced with plan information
    const enhancedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const plan = await ctx.db.get(account.planId);
        
        return {
          _id: account._id,
          name: account.name,
          type: account.type,
          status: account.status,
          planStatus: account.planStatus,
          planId: account.planId,
          plan: plan ? {
            _id: plan._id,
            name: plan.name,
            type: plan.type,
            price: plan.price,
            billingPeriod: plan.billingPeriod,
          } : null,
        };
      })
    );
    
    return enhancedAccounts;
  },
});

// Get platform statistics
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const accounts = await ctx.db.query("accounts").collect();
    const plans = await ctx.db.query("plans").collect();
    const users = await ctx.db.query("appUsers").collect();

    const now = Date.now();
    const trialAccounts = accounts.filter(a => a.planStatus === "trial");
    const expiredTrials = trialAccounts.filter(a => a.trialEndsAt && a.trialEndsAt < now);
    const activeTrials = trialAccounts.filter(a => a.trialEndsAt && a.trialEndsAt >= now);

    return {
      totalAccounts: accounts.length,
      franchiseAccounts: accounts.filter(a => a.type === "franchise").length,
      individualAccounts: accounts.filter(a => a.type === "individual").length,
      activeAccounts: accounts.filter(a => a.status === "active").length,
      trialAccounts: trialAccounts.length,
      expiredTrials: expiredTrials.length,
      activeTrials: activeTrials.length,
      paidAccounts: accounts.filter(a => a.planStatus === "active").length,
      totalUsers: users.length,
      totalPlans: plans.length,
    };
  },
});
