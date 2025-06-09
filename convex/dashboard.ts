import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Dashboard Overview Query
export const getDashboardOverview = query({
  args: {
    accountId: v.id("accounts"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"), v.literal("custom")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("appUsers")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .first();
    
    if (!user) throw new Error("User not found");

    // Verify user has access to this account
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");
    
    // Check if user belongs to this account or is super admin
    if (user.role !== "superadmin" && user.accountId !== args.accountId) {
      throw new Error("Unauthorized");
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date, endDate: Date;
    
    switch (args.period) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = now;
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = now;
        break;
      case "custom":
        if (!args.startDate || !args.endDate) {
          throw new Error("Start and end dates required for custom range");
        }
        startDate = new Date(args.startDate);
        endDate = new Date(args.endDate);
        break;
      default: // "all"
        startDate = new Date("2020-01-01");
        endDate = now;
    }

    // Get all customers for this account
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Filter customers within date range (based on join date)
    const filteredCustomers = customers.filter(customer => {
      const joinDate = new Date(customer._creationTime);
      return joinDate >= startDate && joinDate <= endDate;
    });

    // Calculate metrics
    const totalCustomers = customers.length;
    const newCustomers = filteredCustomers.length;
    
    // Calculate repeat customers (mock data - in real app, track actual visits)
    const repeatCustomers = Math.floor(customers.length * 0.7); // Mock 70% repeat rate
    
    // Mock previous period data for comparison (in real app, you'd calculate this)
    const previousPeriodMetrics = {
      totalCustomers: Math.floor(totalCustomers * 0.9),
      repeatCustomers: Math.floor(repeatCustomers * 0.85),
      newCustomers: Math.floor(newCustomers * 0.8)
    };

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => 
      previous === 0 ? 0 : ((current - previous) / previous) * 100;

    const metrics = {
      totalCustomers: {
        current: totalCustomers,
        change: calculateChange(totalCustomers, previousPeriodMetrics.totalCustomers)
      },
      repeatCustomers: {
        current: repeatCustomers,
        change: calculateChange(repeatCustomers, previousPeriodMetrics.repeatCustomers)
      },
      newCustomers: {
        current: newCustomers,
        change: calculateChange(newCustomers, previousPeriodMetrics.newCustomers)
      },
      // Mock ROI data - in real app, calculate from actual revenue data
      roi: {
        amount: 4250,
        percentage: 285
      },
      rlc: 15780, // Revenue from Loyalty Customers
      lpc: 4125,  // Loyalty Program Cost
      avgCostOfSale: 12.50
    };

    return {
      metrics,
      healthScore: {
        status: "good" as const,
        message: "🎉 Loyalty program performing well! Customer retention is strong."
      }
    };
  }
});

// Customer Trends Chart Data
export const getCustomerTrends = query({
  args: {
    accountId: v.id("accounts"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate mock trend data (in real app, aggregate from customer data)
    const now = new Date();
    const dataPoints = args.period === "day" ? 24 : 
                      args.period === "week" ? 7 :
                      args.period === "month" ? 30 : 12;

    const trendData = Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date(now);
      
      if (args.period === "day") {
        date.setHours(i, 0, 0, 0);
      } else if (args.period === "week") {
        date.setDate(date.getDate() - (6 - i));
      } else if (args.period === "month") {
        date.setDate(date.getDate() - (29 - i));
      } else {
        date.setMonth(date.getMonth() - (11 - i));
      }

      return {
        date: date.toISOString(),
        total: Math.floor(Math.random() * 50) + 30,
        repeat: Math.floor(Math.random() * 30) + 15,
        new: Math.floor(Math.random() * 20) + 10
      };
    });

    return trendData;
  }
});

// ROI Analysis Data
export const getROIAnalysis = query({
  args: {
    accountId: v.id("accounts"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate mock ROI trend data
    const now = new Date();
    const dataPoints = args.period === "day" ? 24 : 
                      args.period === "week" ? 7 :
                      args.period === "month" ? 30 : 12;

    const roiTrend = Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date(now);
      
      if (args.period === "day") {
        date.setHours(i, 0, 0, 0);
      } else if (args.period === "week") {
        date.setDate(date.getDate() - (6 - i));
      } else if (args.period === "month") {
        date.setDate(date.getDate() - (29 - i));
      } else {
        date.setMonth(date.getMonth() - (11 - i));
      }

      return {
        date: date.toISOString(),
        roi: Math.floor(Math.random() * 100) + 200,
        revenue: Math.floor(Math.random() * 2000) + 1000,
        cost: Math.floor(Math.random() * 500) + 300
      };
    });

    return roiTrend;
  }
});

// Retention Rate Data
export const getRetentionRate = query({
  args: {
    accountId: v.id("accounts"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate mock retention data
    const now = new Date();
    const dataPoints = args.period === "day" ? 24 : 
                      args.period === "week" ? 7 :
                      args.period === "month" ? 30 : 12;

    const retentionData = Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date(now);
      
      if (args.period === "day") {
        date.setHours(i, 0, 0, 0);
      } else if (args.period === "week") {
        date.setDate(date.getDate() - (6 - i));
      } else if (args.period === "month") {
        date.setDate(date.getDate() - (29 - i));
      } else {
        date.setMonth(date.getMonth() - (11 - i));
      }

      return {
        date: date.toISOString(),
        rate: Math.floor(Math.random() * 20) + 70 // 70-90% retention rate
      };
    });

    return retentionData;
  }
});

// Peak Times Data
export const getPeakTimes = query({
  args: {
    accountId: v.id("accounts"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate peak times data
    if (args.period === "day") {
      // Hourly data for day view
      return Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        visits: Math.floor(Math.random() * 40) + 5
      }));
    } else {
      // Daily data for other periods
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        visits: Math.floor(Math.random() * 80) + 20
      }));
    }
  }
});

// Top Customers Data
export const getTopCustomers = query({
  args: {
    accountId: v.id("accounts"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 10;

    // Get customers for this account
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Sort by visit count and total spent (mock calculation)
    const topCustomers = customers
      .map(customer => ({
        id: customer._id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        visits: Math.floor(Math.random() * 30) + 5, // Mock visit count
        spent: Math.floor(Math.random() * 1000) + 100, // Mock spending
        lastVisit: new Date(customer._creationTime).toISOString().split('T')[0]
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, limit);

    return topCustomers;
  }
});

// Referral Leaders Data
export const getReferralLeaders = query({
  args: {
    accountId: v.id("accounts"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 5;

    // Get customers for this account
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Mock referral data (in real app, track actual referrals)
    const referralLeaders = customers
      .map(customer => {
        const referrals = Math.floor(Math.random() * 15);
        return {
          id: customer._id,
          name: `${customer.firstName} ${customer.lastName}`,
          referrals,
          value: referrals * 40 // $40 per referral value
        };
      })
      .filter(customer => customer.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, limit);

    return referralLeaders;
  }
});

// Demographics Data
export const getDemographics = query({
  args: {
    accountId: v.id("accounts")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get customers for this account
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Mock demographics data (in real app, track actual demographics)
    return {
      gender: [
        { name: 'Female', value: 58, color: '#8884d8' },
        { name: 'Male', value: 42, color: '#82ca9d' }
      ],
      age: [
        { range: '18-24', count: Math.floor(customers.length * 0.15) },
        { range: '25-34', count: Math.floor(customers.length * 0.25) },
        { range: '35-44', count: Math.floor(customers.length * 0.30) },
        { range: '45-54', count: Math.floor(customers.length * 0.20) },
        { range: '55+', count: Math.floor(customers.length * 0.10) }
      ],
      device: [
        { name: 'iOS', value: 65, color: '#8884d8' },
        { name: 'Android', value: 35, color: '#82ca9d' }
      ]
    };
  }
});

// Engagement Metrics
export const getEngagementMetrics = query({
  args: {
    accountId: v.id("accounts")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get customers for this account
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Calculate engagement metrics (mock data)
    const avgVisitsPerCustomer = Math.random() * 5 + 3; // 3-8 visits average
    
    // Mock calculations for other metrics
    const medianDaysSinceVisit = 12;
    const atRiskCount = Math.floor(customers.length * 0.08); // 8% at risk

    return {
      avgVisitsPerCustomer: Number(avgVisitsPerCustomer.toFixed(1)),
      medianDaysSinceVisit,
      atRiskCount
    };
  }
}); 