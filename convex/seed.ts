import { mutation } from "./_generated/server";

// Seed initial data for development
export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingPlans = await ctx.db.query("plans").collect();
    if (existingPlans.length > 0) {
      return { message: "Data already seeded" };
    }

    // Create plans
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

    const growthPlan = await ctx.db.insert("plans", {
      name: "Growth",
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

    const franchisePlan = await ctx.db.insert("plans", {
      name: "Franchise",
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
      message: "Seed data created successfully",
      plans: { starterPlan, growthPlan, franchisePlan },
    };
  },
});
