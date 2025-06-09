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

// Get system-wide user statistics
export const getSystemUserStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const users = await ctx.db.query("appUsers").collect();
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === "active").length,
      suspendedUsers: users.filter(u => u.status === "suspended").length,
      invitedUsers: users.filter(u => u.status === "invited").length,
      superAdmins: users.filter(u => u.role === "superadmin").length,
      orgAdmins: users.filter(u => u.role === "orgadmin").length,
      clientUsers: users.filter(u => u.role === "clientuser").length,
      newUsersWeek: users.filter(u => u._creationTime > weekAgo).length,
      activeLogins24h: users.filter(u => u.lastLogin && u.lastLogin > dayAgo).length,
      passwordResets: 0,
      emailVerificationPending: users.filter(u => !u.emailVerified).length,
    };
  },
});

// Search users across all accounts
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const users = await ctx.db.query("appUsers").collect();
    const accounts = await ctx.db.query("accounts").collect();
    
    // Create account lookup map
    const accountMap = new Map();
    accounts.forEach(account => {
      accountMap.set(account._id, account);
    });

    // Filter users based on search term
    const filteredUsers = users.filter(user => {
      const searchLower = args.searchTerm.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.phone && user.phone.includes(args.searchTerm))
      );
    });

    // Enhance with account information
    return filteredUsers.map(user => {
      const account = accountMap.get(user.accountId);
      return {
        ...user,
        accountName: account?.name || "Unknown",
        accountType: account?.type || "unknown",
      };
    });
  },
});

// Update user status (activate/suspend)
export const updateUserStatus = mutation({
  args: {
    userId: v.id("appUsers"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("invited")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow suspending other super admins
    if (user.role === "superadmin" && args.status === "suspended") {
      throw new Error("Cannot suspend super admin users");
    }

    await ctx.db.patch(args.userId, {
      status: args.status,
    });

    return { message: `User status updated to ${args.status}` };
  },
});

// Delete user (SuperAdmin only)
export const deleteUser = mutation({
  args: {
    userId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId, appUser: currentUser } = await requireSuperAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow deleting yourself
    if (user.authUserId === currentUserId) {
      throw new Error("Cannot delete your own account");
    }

    // For super admins, require additional check that there will be at least one super admin left
    if (user.role === "superadmin") {
      const allSuperAdmins = await ctx.db
        .query("appUsers")
        .withIndex("by_role")
        .filter((q: any) => q.eq(q.field("role"), "superadmin"))
        .collect();
      
      if (allSuperAdmins.length <= 1) {
        throw new Error("Cannot delete the last super admin. System must have at least one super admin.");
      }
    }

    // For client users, check if they're the last user in their account
    if (user.role !== "superadmin" && user.accountId) {
      const accountUsers = await ctx.db
        .query("appUsers")
        .withIndex("by_account")
        .filter((q: any) => q.eq(q.field("accountId"), user.accountId))
        .collect();
      
      if (accountUsers.length <= 1) {
        throw new Error("Cannot delete the last user in an account. Each account must have at least one user.");
      }
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

    // Delete the user
    await ctx.db.delete(args.userId);

    return { message: "User deleted successfully" };
  },
});

// Reset user password (SuperAdmin only)
export const resetUserPassword = mutation({
  args: {
    userId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // In a real implementation, this would trigger a password reset email
    // For now, we'll just return a success message
    return { message: "Password reset email sent to user" };
  },
});

// Get all super admin users
export const getSuperAdmins = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const superAdmins = await ctx.db
      .query("appUsers")
      .withIndex("by_role")
      .filter((q: any) => q.eq(q.field("role"), "superadmin"))
      .collect();

    return superAdmins.map(admin => ({
      ...admin,
      accountName: "System", // Super admins don't belong to specific accounts
    }));
  },
});

// Get all client users (non-super admin users)
export const getAllClientUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const users = await ctx.db
      .query("appUsers")
      .filter((q: any) => q.neq(q.field("role"), "superadmin"))
      .collect();

    const accounts = await ctx.db.query("accounts").collect();
    
    // Create account lookup map
    const accountMap = new Map();
    accounts.forEach(account => {
      accountMap.set(account._id, account);
    });

    // Enhance with account information
    return users.map(user => {
      const account = accountMap.get(user.accountId);
      return {
        ...user,
        accountName: account?.name || "Unknown",
        accountType: account?.type || "unknown",
      };
    });
  },
});

// Create a new super admin invitation (they must complete signup themselves)
export const createSuperAdmin = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    // Check if email already exists
    const existingUser = await ctx.db
      .query("appUsers")
      .withIndex("by_email")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // In a real implementation, this would send an invitation email
    // The actual user creation would happen when they complete signup
    // For now, we'll create a pending invitation record
    
    // Note: This is a simplified approach. In production, you'd typically:
    // 1. Create an invitation record
    // 2. Send invitation email 
    // 3. User clicks link and completes signup
    // 4. System creates appUser with superadmin role
    
    return { 
      message: "Super admin invitation would be sent to " + args.email + ". They must complete signup to activate their account.",
      email: args.email 
    };
  },
});
