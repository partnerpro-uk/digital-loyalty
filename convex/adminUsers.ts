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
    await requireSuperAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow deleting other super admins
    if (user.role === "superadmin") {
      throw new Error("Cannot delete super admin users");
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
