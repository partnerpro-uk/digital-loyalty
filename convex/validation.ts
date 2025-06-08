import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Email validation endpoint
export const validateEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Check if email is already in use
    const existingAuthUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    const existingAppUser = await ctx.db
      .query("appUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    const isAvailable = !existingAuthUser && !existingAppUser;

    return {
      isAvailable,
      message: isAvailable ? "Email is available" : "Email is already in use",
    };
  },
});

// Business name validation endpoint
export const validateBusinessName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Check if business name is already in use
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    const isAvailable = !existingAccount;

    return {
      isAvailable,
      message: isAvailable ? "Business name is available" : "Business name is already in use",
    };
  },
});

// Password strength validation
export const validatePassword = query({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const password = args.password;
    const checks = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    const isValid = Object.values(checks).every(Boolean);
    const score = Object.values(checks).filter(Boolean).length;

    let strength = "Weak";
    if (score >= 4) strength = "Strong";
    else if (score >= 3) strength = "Medium";

    return {
      isValid,
      strength,
      checks,
      message: isValid ? "Password meets all requirements" : "Password does not meet requirements",
    };
  },
});

// Phone number validation
export const validatePhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    // E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const isValid = phoneRegex.test(args.phone);

    return {
      isValid,
      message: isValid ? "Phone number is valid" : "Phone number must be in E.164 format (+1234567890)",
    };
  },
});
