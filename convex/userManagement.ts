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

// Helper to check if user can manage users for an account
async function canManageUsers(ctx: any, accountId: string) {
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

  // SuperAdmins can manage all users
  if (appUser.role === "superadmin") {
    return { userId, appUser, isSuperAdmin: true };
  }

  // OrgAdmins can only manage users in their own account
  if (appUser.role === "orgadmin" && appUser.accountId === accountId) {
    return { userId, appUser, isSuperAdmin: false };
  }

  throw new Error("Insufficient permissions to manage users");
}

// Get all users for an account (enhanced version)
export const getAccountUsers = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await canManageUsers(ctx, args.accountId);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const users = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    // Get user permissions and auth info for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const userPermissions = await ctx.db
          .query("userPermissions")
          .withIndex("by_user")
          .filter((q: any) => q.eq(q.field("userId"), user._id))
          .unique();

        const authUser = await ctx.db.get(user.authUserId);

        return {
          ...user,
          permissions: userPermissions?.permissions || null,
          customLimits: userPermissions?.customLimits || null,
          authUser: authUser ? {
            name: authUser.name,
            emailVerificationTime: authUser.emailVerificationTime,
            isAnonymous: authUser.isAnonymous,
          } : null,
        };
      })
    );

    return {
      account,
      users: usersWithDetails,
    };
  },
});

// Create a new user for an account
export const createUser = mutation({
  args: {
    accountId: v.id("accounts"),
    userData: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      role: v.union(v.literal("orgadmin"), v.literal("clientuser")),
    }),
    permissions: v.optional(v.object({
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
    })),
    customLimits: v.optional(v.object({
      maxCustomers: v.number(),
      maxMonthlyEmails: v.number(),
      dataRetentionDays: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await canManageUsers(ctx, args.accountId);

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Check if email already exists
    const existingUser = await ctx.db
      .query("appUsers")
      .withIndex("by_email")
      .filter((q: any) => q.eq(q.field("email"), args.userData.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check account user limits
    const currentUsers = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    if (currentUsers.length >= account.limits.users) {
      throw new Error(`Account has reached the maximum number of users (${account.limits.users})`);
    }

    // Create placeholder auth user (in real app, this would be created during signup)
    const authUserId = await ctx.db.insert("users", {
      name: `${args.userData.firstName} ${args.userData.lastName}`,
      email: args.userData.email,
      emailVerificationTime: undefined, // User needs to verify email
      isAnonymous: false,
    });

    // Create app user
    const appUserId = await ctx.db.insert("appUsers", {
      email: args.userData.email,
      phone: args.userData.phone,
      firstName: args.userData.firstName,
      lastName: args.userData.lastName,
      role: args.userData.role,
      accountId: args.accountId,
      accountType: account.type,
      status: "invited", // User starts as invited
      emailVerified: false,
      lastLogin: undefined,
      loginAttempts: 0,
      authUserId,
    });

    // Create custom permissions if provided
    if (args.permissions) {
      await ctx.db.insert("userPermissions", {
        userId: appUserId,
        accountId: args.accountId,
        permissions: args.permissions,
        customLimits: args.customLimits,
      });
    }

    return {
      userId: appUserId,
      message: `User ${args.userData.firstName} ${args.userData.lastName} created successfully`,
    };
  },
});

// Update user information
export const updateUser = mutation({
  args: {
    userId: v.id("appUsers"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phone: v.optional(v.string()),
      role: v.optional(v.union(v.literal("orgadmin"), v.literal("clientuser"))),
      status: v.optional(v.union(v.literal("active"), v.literal("invited"), v.literal("suspended"))),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.accountId) {
      throw new Error("User not found");
    }

    await canManageUsers(ctx, user.accountId);

    await ctx.db.patch(args.userId, args.updates);

    return { message: "User updated successfully" };
  },
});

// Update user permissions
export const updateUserPermissions = mutation({
  args: {
    userId: v.id("appUsers"),
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.accountId) {
      throw new Error("User not found");
    }

    await canManageUsers(ctx, user.accountId);

    // Check if user permissions already exist
    const existingPermissions = await ctx.db
      .query("userPermissions")
      .withIndex("by_user")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existingPermissions) {
      await ctx.db.patch(existingPermissions._id, {
        permissions: args.permissions,
        customLimits: args.customLimits,
      });
    } else {
      await ctx.db.insert("userPermissions", {
        userId: args.userId,
        accountId: user.accountId,
        permissions: args.permissions,
        customLimits: args.customLimits,
      });
    }

    return { message: "User permissions updated successfully" };
  },
});

// Delete user
export const deleteUser = mutation({
  args: {
    userId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.accountId) {
      throw new Error("User not found");
    }

    await canManageUsers(ctx, user.accountId);

    // Don't allow deleting the last orgadmin
    const orgAdmins = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), user.accountId))
      .filter((q: any) => q.eq(q.field("role"), "orgadmin"))
      .collect();

    if (user.role === "orgadmin" && orgAdmins.length <= 1) {
      throw new Error("Cannot delete the last organization administrator");
    }

    // Delete user permissions if they exist
    const userPermissions = await ctx.db
      .query("userPermissions")
      .withIndex("by_user")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (userPermissions) {
      await ctx.db.delete(userPermissions._id);
    }

    // Delete the app user
    await ctx.db.delete(args.userId);

    // Note: In a real app, you might want to also handle the auth user deletion
    // or mark it as inactive rather than deleting it completely

    return { message: "User deleted successfully" };
  },
});



// Get user statistics for an account
export const getUserStats = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await canManageUsers(ctx, args.accountId);

    const users = await ctx.db
      .query("appUsers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    const stats = {
      total: users.length,
      active: users.filter(u => u.status === "active").length,
      invited: users.filter(u => u.status === "invited").length,
      suspended: users.filter(u => u.status === "suspended").length,
      orgAdmins: users.filter(u => u.role === "orgadmin").length,
      clientUsers: users.filter(u => u.role === "clientuser").length,
      emailVerified: users.filter(u => u.emailVerified).length,
      recentLogins: users.filter(u => u.lastLogin && u.lastLogin > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
    };

    return stats;
  },
});
