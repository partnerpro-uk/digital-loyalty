import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create or update user profile after authentication
export const createUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", userId))
      .unique();

    if (existingProfile) {
      return existingProfile._id;
    }

    // Check if this is the first user (make them superadmin)
    const userCount = await ctx.db.query("appUsers").collect();
    const isFirstUser = userCount.length === 0;

    const profileId = await ctx.db.insert("appUsers", {
      authUserId: userId,
      email: user.email || "",
      firstName: user.name?.split(" ")[0] || "",
      lastName: user.name?.split(" ").slice(1).join(" ") || "",
      phone: user.phone || "",
      role: isFirstUser ? "superadmin" : "clientuser",
      accountType: isFirstUser ? "platform" : "individual",
      status: "active",
      emailVerified: true,
      lastLogin: Date.now(),
      loginAttempts: 0,
      testMessage: `Profile created at ${new Date().toLocaleString()}`,
    });

    return profileId;
  },
});

// Get user profile with role information
export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", userId))
      .unique();

    return profile;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      firstName: args.firstName ?? profile.firstName,
      lastName: args.lastName ?? profile.lastName,
      phone: args.phone ?? profile.phone,
    });

    return { message: "Profile updated successfully" };
  },
});
