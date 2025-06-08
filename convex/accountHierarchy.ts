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

// Helper to check if user can manage franchise accounts
async function canManageFranchise(ctx: any, franchiseAccountId: string) {
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

  // SuperAdmins can manage all franchises
  if (appUser.role === "superadmin") {
    return { userId, appUser, isSuperAdmin: true };
  }

  // Franchise admins can only manage their own franchise
  if (appUser.role === "orgadmin" && appUser.accountId === franchiseAccountId) {
    const account = await ctx.db.get(franchiseAccountId);
    if (account?.type === "franchise") {
      return { userId, appUser, isSuperAdmin: false };
    }
  }

  throw new Error("Insufficient permissions to manage franchise accounts");
}

// Get franchise hierarchy (parent account with all sub-accounts)
export const getFranchiseHierarchy = query({
  args: {
    franchiseAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await canManageFranchise(ctx, args.franchiseAccountId);

    const franchiseAccount = await ctx.db.get(args.franchiseAccountId);
    if (!franchiseAccount || franchiseAccount.type !== "franchise") {
      throw new Error("Account is not a franchise");
    }

    // Get all sub-accounts
    const subAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_parent")
      .filter((q: any) => q.eq(q.field("parentId"), args.franchiseAccountId))
      .collect();

    // Get stats for each sub-account
    const subAccountsWithStats = await Promise.all(
      subAccounts.map(async (subAccount) => {
        const userCount = await ctx.db
          .query("appUsers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), subAccount._id))
          .collect();

        const customerCount = await ctx.db
          .query("customers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), subAccount._id))
          .collect();

        return {
          ...subAccount,
          userCount: userCount.length,
          customerCount: customerCount.length,
        };
      })
    );

    // Get franchise stats
    const franchiseUsers = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.franchiseAccountId))
      .collect();

    const franchiseCustomers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.franchiseAccountId))
      .collect();

    return {
      franchise: {
        ...franchiseAccount,
        userCount: franchiseUsers.length,
        customerCount: franchiseCustomers.length,
      },
      subAccounts: subAccountsWithStats,
      totalSubAccounts: subAccountsWithStats.length,
      totalUsers: franchiseUsers.length + subAccountsWithStats.reduce((sum, acc) => sum + acc.userCount, 0),
      totalCustomers: franchiseCustomers.length + subAccountsWithStats.reduce((sum, acc) => sum + acc.customerCount, 0),
    };
  },
});

// Create a sub-account under a franchise
export const createSubAccount = mutation({
  args: {
    franchiseAccountId: v.id("accounts"),
    subAccountData: v.object({
      name: v.string(),
      slug: v.string(),
      primaryContact: v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.string(),
        phone: v.string(),
      }),
      address: v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.string(),
      }),
      planId: v.id("plans"),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await canManageFranchise(ctx, args.franchiseAccountId);

    const franchiseAccount = await ctx.db.get(args.franchiseAccountId);
    if (!franchiseAccount || franchiseAccount.type !== "franchise") {
      throw new Error("Parent account is not a franchise");
    }

    // Check if slug is unique
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_slug")
      .filter((q: any) => q.eq(q.field("slug"), args.subAccountData.slug))
      .unique();

    if (existingAccount) {
      throw new Error("Account slug already exists");
    }

    // Get the plan
    const plan = await ctx.db.get(args.subAccountData.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Create the sub-account
    const subAccountId = await ctx.db.insert("accounts", {
      name: args.subAccountData.name,
      slug: args.subAccountData.slug,
      type: "individual", // Sub-accounts are individual type
      status: "active",
      planId: args.subAccountData.planId,
      planStatus: "trial", // Start with trial
      trialEndsAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days trial
      parentId: args.franchiseAccountId, // Link to franchise
      primaryContact: {
        name: `${args.subAccountData.primaryContact.firstName} ${args.subAccountData.primaryContact.lastName}`,
        email: args.subAccountData.primaryContact.email,
        phone: args.subAccountData.primaryContact.phone,
      },
      location: {
        address: args.subAccountData.address.street,
        city: args.subAccountData.address.city,
        state: args.subAccountData.address.state,
        zip: args.subAccountData.address.zipCode,
        country: args.subAccountData.address.country,
        timezone: "UTC",
      },
      createdBy: userId,
      limits: {
        users: plan.features.maxUsers,
        subAccounts: 0, // Sub-accounts can't have their own sub-accounts
      },
    });

    // Create default account permissions
    await ctx.db.insert("accountPermissions", {
      accountId: subAccountId,
      permissions: plan.defaultPermissions,
      customLimits: {
        maxCustomers: 1000,
        maxMonthlyEmails: 5000,
        maxUsers: plan.features.maxUsers,
        dataRetentionDays: plan.features.dataRetention,
      },
      uiRestrictions: {
        hiddenModules: [],
        disabledFeatures: [],
        customDashboard: false,
      },
    });

    // Create the primary contact as an orgadmin user
    const authUserId = await ctx.db.insert("users", {
      name: `${args.subAccountData.primaryContact.firstName} ${args.subAccountData.primaryContact.lastName}`,
      email: args.subAccountData.primaryContact.email,
      emailVerificationTime: undefined,
      isAnonymous: false,
    });

    const appUserId = await ctx.db.insert("appUsers", {
      email: args.subAccountData.primaryContact.email,
      phone: args.subAccountData.primaryContact.phone,
      firstName: args.subAccountData.primaryContact.firstName,
      lastName: args.subAccountData.primaryContact.lastName,
      role: "orgadmin",
      accountId: subAccountId,
      accountType: "individual",
      status: "invited",
      emailVerified: false,
      lastLogin: undefined,
      loginAttempts: 0,
      authUserId,
    });

    return {
      subAccountId,
      primaryUserId: appUserId,
      message: `Sub-account "${args.subAccountData.name}" created successfully under franchise "${franchiseAccount.name}"`,
    };
  },
});

// Convert individual account to sub-account (join franchise)
export const convertToSubAccount = mutation({
  args: {
    individualAccountId: v.id("accounts"),
    franchiseAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const individualAccount = await ctx.db.get(args.individualAccountId);
    if (!individualAccount || individualAccount.type !== "individual") {
      throw new Error("Account is not an individual account");
    }

    if (individualAccount.parentId) {
      throw new Error("Account is already part of a franchise");
    }

    const franchiseAccount = await ctx.db.get(args.franchiseAccountId);
    if (!franchiseAccount || franchiseAccount.type !== "franchise") {
      throw new Error("Target account is not a franchise");
    }

    // Update the individual account to become a sub-account
    await ctx.db.patch(args.individualAccountId, {
      parentId: args.franchiseAccountId,
    });

    return {
      message: `Account "${individualAccount.name}" successfully joined franchise "${franchiseAccount.name}"`,
    };
  },
});

// Remove account from franchise (convert back to independent)
export const removeFromFranchise = mutation({
  args: {
    subAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const subAccount = await ctx.db.get(args.subAccountId);
    if (!subAccount) {
      throw new Error("Account not found");
    }

    if (!subAccount.parentId) {
      throw new Error("Account is not part of a franchise");
    }

    // Check permissions - either superadmin or franchise admin
    await canManageFranchise(ctx, subAccount.parentId);

    // Remove from franchise
    await ctx.db.patch(args.subAccountId, {
      parentId: undefined,
    });

    return {
      message: `Account "${subAccount.name}" successfully removed from franchise`,
    };
  },
});

// Get all available individual accounts that can join a franchise
export const getAvailableIndividualAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const individualAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_type")
      .filter((q: any) => q.eq(q.field("type"), "individual"))
      .filter((q: any) => q.eq(q.field("parentId"), undefined))
      .collect();

    // Get stats for each account
    const accountsWithStats = await Promise.all(
      individualAccounts.map(async (account) => {
        const userCount = await ctx.db
          .query("appUsers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), account._id))
          .collect();

        const customerCount = await ctx.db
          .query("customers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), account._id))
          .collect();

        return {
          ...account,
          userCount: userCount.length,
          customerCount: customerCount.length,
        };
      })
    );

    return accountsWithStats;
  },
});

// Get all franchise accounts
export const getFranchiseAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const franchiseAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_type")
      .filter((q: any) => q.eq(q.field("type"), "franchise"))
      .collect();

    // Get stats for each franchise
    const franchisesWithStats = await Promise.all(
      franchiseAccounts.map(async (franchise) => {
        const subAccounts = await ctx.db
          .query("accounts")
          .withIndex("by_parent")
          .filter((q: any) => q.eq(q.field("parentId"), franchise._id))
          .collect();

        const franchiseUsers = await ctx.db
          .query("appUsers")
          .withIndex("by_account")
          .filter((q: any) => q.eq(q.field("accountId"), franchise._id))
          .collect();

        // Get total users across all sub-accounts
        let totalSubAccountUsers = 0;
        for (const subAccount of subAccounts) {
          const subUsers = await ctx.db
            .query("appUsers")
            .withIndex("by_account")
            .filter((q: any) => q.eq(q.field("accountId"), subAccount._id))
            .collect();
          totalSubAccountUsers += subUsers.length;
        }

        return {
          ...franchise,
          subAccountCount: subAccounts.length,
          directUserCount: franchiseUsers.length,
          totalUserCount: franchiseUsers.length + totalSubAccountUsers,
        };
      })
    );

    return franchisesWithStats;
  },
});

// Transfer sub-account to different franchise
export const transferSubAccount = mutation({
  args: {
    subAccountId: v.id("accounts"),
    newFranchiseId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const subAccount = await ctx.db.get(args.subAccountId);
    if (!subAccount) {
      throw new Error("Sub-account not found");
    }

    if (!subAccount.parentId) {
      throw new Error("Account is not part of a franchise");
    }

    const newFranchise = await ctx.db.get(args.newFranchiseId);
    if (!newFranchise || newFranchise.type !== "franchise") {
      throw new Error("Target account is not a franchise");
    }

    const oldFranchise = await ctx.db.get(subAccount.parentId);

    // Transfer the sub-account
    await ctx.db.patch(args.subAccountId, {
      parentId: args.newFranchiseId,
    });

    return {
      message: `Account "${subAccount.name}" transferred from "${oldFranchise?.name}" to "${newFranchise.name}"`,
    };
  },
});

// Get account hierarchy path (for breadcrumbs)
export const getAccountHierarchyPath = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const path = [account];

    // If account has a parent, get the parent chain
    if (account.parentId) {
      const parent = await ctx.db.get(account.parentId);
      if (parent) {
        path.unshift(parent);
        
        // Check if parent has a parent (though unlikely in current structure)
        if (parent.parentId) {
          const grandParent = await ctx.db.get(parent.parentId);
          if (grandParent) {
            path.unshift(grandParent);
          }
        }
      }
    }

    return path;
  },
});
