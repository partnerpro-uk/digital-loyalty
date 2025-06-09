import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to get user's account
async function getUserAccount(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user")
    .filter((q: any) => q.eq(q.field("authUserId"), userId))
    .unique();

  if (!appUser || !appUser.accountId) {
    throw new Error("User not associated with an account");
  }

  return { userId, appUser, accountId: appUser.accountId };
}

// Get customer metrics for dashboard cards
export const getCustomerMetrics = query({
  args: {},
  handler: async (ctx) => {
    const { accountId } = await getUserAccount(ctx);

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    // Calculate metrics
    const totalCustomers = customers.length;
    const cardsInstalled = customers.filter(c => 
      c.loyaltyCards && c.loyaltyCards.some(card => card.installStatus === "installed")
    ).length;
    const cardTransactions = transactions.filter(t => 
      t.type === "purchase" || t.type === "redemption"
    ).length;

    // Calculate month-over-month growth
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const newCustomersThisMonth = customers.filter(c => c._creationTime > oneMonthAgo).length;
    const newCardsThisMonth = customers.filter(c => 
      c.loyaltyCards && c.loyaltyCards.some(card => 
        card.installStatus === "installed" && 
        card.installedAt && 
        card.installedAt > oneMonthAgo
      )
    ).length;
    const transactionsThisMonth = transactions.filter(t => t._creationTime > oneMonthAgo).length;

    // Calculate growth percentages (simplified - would need historical data for accurate calculation)
    const customerGrowth = totalCustomers > 0 ? Math.round((newCustomersThisMonth / totalCustomers) * 100) : 0;
    const cardGrowth = cardsInstalled > 0 ? Math.round((newCardsThisMonth / cardsInstalled) * 100) : 0;
    const transactionGrowth = cardTransactions > 0 ? Math.round((transactionsThisMonth / cardTransactions) * 100) : 0;

    return {
      totalCustomers,
      cardsInstalled,
      cardTransactions,
      customerGrowth,
      cardGrowth,
      transactionGrowth,
    };
  },
});

// List customers with filtering and sorting
export const listCustomers = query({
  args: {
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("newest"),
      v.literal("oldest"),
      v.literal("most_loyal"),
      v.literal("recently_visited"),
      v.literal("card_installed"),
      v.literal("alphabetical_az"),
      v.literal("alphabetical_za")
    )),
    filterStatus: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))),
    filterDevice: v.optional(v.string()),
    filterTags: v.optional(v.array(v.string())),
    filterCardStatus: v.optional(v.union(v.literal("installed"), v.literal("pending"), v.literal("none"))),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Get all customers for the account
    let customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    // Apply text search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      customers = customers.filter(customer => 
        customer.firstName.toLowerCase().includes(searchLower) ||
        customer.lastName.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        (customer.phone && customer.phone.includes(args.search!))
      );
    }

    // Apply filters
    if (args.filterStatus) {
      customers = customers.filter(c => c.status === args.filterStatus);
    }

    if (args.filterTags && args.filterTags.length > 0) {
      customers = customers.filter(c => 
        args.filterTags!.some(tag => c.tags.includes(tag))
      );
    }

    if (args.filterCardStatus) {
      customers = customers.filter(c => {
        const hasInstalledCard = c.loyaltyCards && c.loyaltyCards.some(card => card.installStatus === "installed");
        const hasPendingCard = c.loyaltyCards && c.loyaltyCards.some(card => card.installStatus === "pending");
        
        switch (args.filterCardStatus) {
          case "installed":
            return hasInstalledCard;
          case "pending":
            return hasPendingCard && !hasInstalledCard;
          case "none":
            return !c.loyaltyCards || c.loyaltyCards.length === 0;
          default:
            return true;
        }
      });
    }

    if (args.filterDevice) {
      customers = customers.filter(c =>
        c.loyaltyCards && c.loyaltyCards.some(card => 
          card.device && card.device.type.toLowerCase().includes(args.filterDevice!.toLowerCase())
        )
      );
    }

    // Apply sorting
    switch (args.sortBy) {
      case "oldest":
        customers.sort((a, b) => a._creationTime - b._creationTime);
        break;
      case "newest":
      default:
        customers.sort((a, b) => b._creationTime - a._creationTime);
        break;
      case "most_loyal":
        customers.sort((a, b) => b.totalVisits - a.totalVisits);
        break;
      case "recently_visited":
        customers.sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));
        break;
      case "card_installed":
        customers.sort((a, b) => {
          const aHasCard = a.loyaltyCards && a.loyaltyCards.some(card => card.installStatus === "installed");
          const bHasCard = b.loyaltyCards && b.loyaltyCards.some(card => card.installStatus === "installed");
          return Number(bHasCard) - Number(aHasCard);
        });
        break;
      case "alphabetical_az":
        customers.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case "alphabetical_za":
        customers.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
        break;
    }

    // Apply pagination
    const limit = args.limit || 50;
    const startIndex = args.cursor ? parseInt(args.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedCustomers = customers.slice(startIndex, endIndex);

    // Enhance customers with computed fields
    const enhancedCustomers = paginatedCustomers.map(customer => {
      const installedCards = customer.loyaltyCards ? customer.loyaltyCards.filter(card => card.installStatus === "installed") : [];
      const pendingCards = customer.loyaltyCards ? customer.loyaltyCards.filter(card => card.installStatus === "pending") : [];
      
      let cardStatus = "none";
      let primaryDevice = null;
      
      if (installedCards.length > 0) {
        cardStatus = "installed";
        primaryDevice = installedCards[0].device;
      } else if (pendingCards.length > 0) {
        cardStatus = "pending";
      }

      const daysSinceLastVisit = customer.lastVisited 
        ? Math.floor((Date.now() - customer.lastVisited) / (1000 * 60 * 60 * 24))
        : null;

      const loyaltyScore = customer.totalVisits * 10 + customer.pointsBalance + customer.stampsBalance * 5;

      return {
        ...customer,
        fullName: `${customer.firstName} ${customer.lastName}`,
        cardStatus,
        primaryDevice,
        daysSinceLastVisit,
        loyaltyScore,
        hasInstallLink: pendingCards.length > 0 || installedCards.length > 0,
      };
    });

    return {
      customers: enhancedCustomers,
      hasMore: endIndex < customers.length,
      nextCursor: endIndex < customers.length ? endIndex.toString() : null,
      total: customers.length,
    };
  },
});

// Get single customer profile
export const getCustomerProfile = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Get recent transactions
    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .order("desc")
      .take(20);

    // Get referrals made by this customer
    const referrals = await ctx.db
      .query("customers")
      .withIndex("by_referred_by")
      .filter((q: any) => q.eq(q.field("referredBy"), args.customerId))
      .collect();

    // Calculate additional metrics
    const daysSinceJoined = Math.floor((Date.now() - customer._creationTime) / (1000 * 60 * 60 * 24));
    const averageTransactionValue = customer.totalVisits > 0 ? customer.lifetimeSpend / customer.totalVisits : 0;

    return {
      ...customer,
      transactions,
      referrals,
      daysSinceJoined,
      averageTransactionValue,
      fullName: `${customer.firstName} ${customer.lastName}`,
    };
  },
});

// Create new customer
export const createCustomer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    birthday: v.optional(v.number()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    referredBy: v.optional(v.id("customers")),
    tags: v.optional(v.array(v.string())),
    generateCard: v.optional(v.boolean()),
    cardType: v.optional(v.union(v.literal("stamp"), v.literal("points"), v.literal("membership"))),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Check if email already exists
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_email")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .unique();

    if (existingCustomer) {
      throw new Error("Customer with this email already exists");
    }

    // Generate card if requested
    const loyaltyCards = [];
    if (args.generateCard && args.cardType) {
      const serialNumber = generateSerialNumber();
      loyaltyCards.push({
        cardType: args.cardType,
        serialNumber,
        installStatus: "pending" as const,
        installedAt: undefined,
        device: undefined,
      });
    }

    const customerId = await ctx.db.insert("customers", {
      accountId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      birthday: args.birthday,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      referredBy: args.referredBy,
      loyaltyCards,
      totalVisits: 0,
      lifetimeSpend: 0,
      lastVisited: undefined,
      pointsBalance: 0,
      stampsBalance: 0,
      rewardsEarned: 0,
      rewardsAvailable: 0,
      referralCount: 0,
      tags: args.tags || [],
      customFields: {},
      status: "active",
      notes: "",
    });

    // Create welcome transaction if referred
    if (args.referredBy) {
      await ctx.db.insert("customerTransactions", {
        customerId,
        accountId,
        type: "referral",
        amount: 0,
        pointsChange: 5, // Welcome bonus
        stampsChange: 0,
        notes: "Welcome bonus for being referred",
        metadata: { referredBy: args.referredBy },
      });

      // Update referring customer
      const referrer = await ctx.db.get(args.referredBy);
      if (referrer) {
        await ctx.db.patch(args.referredBy, {
          referralCount: referrer.referralCount + 1,
          pointsBalance: referrer.pointsBalance + 10, // Referral bonus
        });

        // Create referral bonus transaction
        await ctx.db.insert("customerTransactions", {
          customerId: args.referredBy,
          accountId,
          type: "referral",
          amount: 0,
          pointsChange: 10,
          stampsChange: 0,
          notes: `Referral bonus for ${args.firstName} ${args.lastName}`,
          metadata: { referredCustomer: customerId },
        });
      }
    }

    return { customerId, message: "Customer created successfully" };
  },
});

// Update customer
export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    birthday: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    const updates: any = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.birthday !== undefined) updates.birthday = args.birthday;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.status !== undefined) updates.status = args.status;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.customerId, updates);
    return { message: "Customer updated successfully" };
  },
});

// Delete customer
export const deleteCustomer = mutation({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Delete all transactions
    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .collect();

    for (const transaction of transactions) {
      await ctx.db.delete(transaction._id);
    }

    // Delete customer
    await ctx.db.delete(args.customerId);
    return { message: "Customer deleted successfully" };
  },
});

// Add transaction (purchase, redemption, adjustment, etc.)
export const addTransaction = mutation({
  args: {
    customerId: v.id("customers"),
    type: v.union(
      v.literal("purchase"), 
      v.literal("redemption"), 
      v.literal("bonus"), 
      v.literal("adjustment")
    ),
    amount: v.optional(v.number()),
    pointsChange: v.number(),
    stampsChange: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Create transaction
    await ctx.db.insert("customerTransactions", {
      customerId: args.customerId,
      accountId,
      type: args.type,
      amount: args.amount,
      pointsChange: args.pointsChange,
      stampsChange: args.stampsChange,
      notes: args.notes,
    });

    // Update customer balances
    const updates: any = {
      pointsBalance: customer.pointsBalance + args.pointsChange,
      stampsBalance: customer.stampsBalance + args.stampsChange,
    };

    if (args.type === "purchase") {
      updates.totalVisits = customer.totalVisits + 1;
      updates.lastVisited = Date.now();
      if (args.amount) {
        updates.lifetimeSpend = customer.lifetimeSpend + args.amount;
      }
    }

    await ctx.db.patch(args.customerId, updates);
    return { message: "Transaction added successfully" };
  },
});

// Generate card for customer
export const generateCard = mutation({
  args: {
    customerId: v.id("customers"),
    cardType: v.union(v.literal("stamp"), v.literal("points"), v.literal("membership")),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    const serialNumber = generateSerialNumber();
    const newCard = {
      cardType: args.cardType,
      serialNumber,
      installStatus: "pending" as const,
      installedAt: undefined,
      device: undefined,
    };

    await ctx.db.patch(args.customerId, {
      loyaltyCards: [...customer.loyaltyCards, newCard],
    });

    return { 
      serialNumber,
      installLink: `${process.env.CONVEX_SITE_URL}/install/${serialNumber}`,
      message: "Card generated successfully" 
    };
  },
});

// Get all unique tags across customers
export const getCustomerTags = query({
  args: {},
  handler: async (ctx) => {
    const { accountId } = await getUserAccount(ctx);

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    const tagSet = new Set<string>();
    customers.forEach(customer => {
      customer.tags.forEach(tag => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  },
});

// Migration function to create sample customers (for testing)
export const createSampleCustomers = mutation({
  args: {},
  handler: async (ctx) => {
    const { accountId } = await getUserAccount(ctx);

    // Check if sample customers already exist
    const existingCustomers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    if (existingCustomers.length > 0) {
      return { message: "Sample customers already exist" };
    }

    const sampleCustomers = [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1 234-567-8900",
        birthday: new Date("1985-03-20").getTime(),
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "spring_2024",
        loyaltyCards: [{
          cardType: "stamp" as const,
          serialNumber: "ABC-1234-5678",
          installStatus: "installed" as const,
          installedAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
          device: {
            type: "iPhone",
            model: "iPhone 14",
            os: "iOS 17.2"
          }
        }],
        totalVisits: 12,
        lifetimeSpend: 247.50,
        lastVisited: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
        pointsBalance: 125,
        stampsBalance: 8,
        rewardsEarned: 3,
        rewardsAvailable: 1,
        referralCount: 2,
        tags: ["VIP", "Coffee Lover"],
        status: "active" as const,
        notes: "Regular customer, prefers oat milk"
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "+1 234-567-8901",
        birthday: new Date("1990-07-15").getTime(),
        utmSource: "facebook",
        utmMedium: "social",
        loyaltyCards: [{
          cardType: "points" as const,
          serialNumber: "XYZ-9876-5432",
          installStatus: "pending" as const,
          installedAt: undefined,
          device: undefined
        }],
        totalVisits: 5,
        lifetimeSpend: 89.25,
        lastVisited: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        pointsBalance: 45,
        stampsBalance: 0,
        rewardsEarned: 1,
        rewardsAvailable: 0,
        referralCount: 0,
        tags: ["New Customer"],
        status: "active" as const,
        notes: ""
      },
      {
        firstName: "Mike",
        lastName: "Johnson",
        email: "mike.johnson@example.com",
        phone: "+1 234-567-8902",
        loyaltyCards: [{
          cardType: "membership" as const,
          serialNumber: "MEM-1111-2222",
          installStatus: "installed" as const,
          installedAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
          device: {
            type: "Android",
            model: "Samsung Galaxy S23",
            os: "Android 14"
          }
        }],
        totalVisits: 25,
        lifetimeSpend: 567.80,
        lastVisited: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        pointsBalance: 280,
        stampsBalance: 15,
        rewardsEarned: 8,
        rewardsAvailable: 3,
        referralCount: 5,
        tags: ["VIP", "Frequent Visitor", "Referrer"],
        status: "active" as const,
        notes: "Excellent customer, brings friends"
      },
      {
        firstName: "Sarah",
        lastName: "Wilson",
        email: "sarah.wilson@example.com",
        phone: "+1 234-567-8903",
        birthday: new Date("1988-12-03").getTime(),
        utmSource: "newsletter",
        utmMedium: "email",
        loyaltyCards: [],
        totalVisits: 2,
        lifetimeSpend: 23.50,
        lastVisited: Date.now() - (14 * 24 * 60 * 60 * 1000), // 14 days ago
        pointsBalance: 10,
        stampsBalance: 2,
        rewardsEarned: 0,
        rewardsAvailable: 0,
        referralCount: 0,
        tags: ["New Customer"],
        status: "inactive" as const,
        notes: "Hasn't visited recently"
      },
      {
        firstName: "David",
        lastName: "Brown",
        email: "david.brown@example.com",
        phone: "+1 234-567-8904",
        birthday: new Date("1982-09-12").getTime(),
        utmSource: "referral",
        utmMedium: "word_of_mouth",
        loyaltyCards: [{
          cardType: "stamp" as const,
          serialNumber: "REF-5555-6666",
          installStatus: "installed" as const,
          installedAt: Date.now() - (60 * 24 * 60 * 60 * 1000), // 60 days ago
          device: {
            type: "iPhone",
            model: "iPhone 13",
            os: "iOS 16.5"
          }
        }],
        totalVisits: 18,
        lifetimeSpend: 398.75,
        lastVisited: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
        pointsBalance: 95,
        stampsBalance: 12,
        rewardsEarned: 5,
        rewardsAvailable: 2,
        referralCount: 1,
        tags: ["Regular", "Morning Customer"],
        status: "active" as const,
        notes: "Always orders the same thing - large coffee, no sugar"
      }
    ];

    // Create customers
    for (const customerData of sampleCustomers) {
      await ctx.db.insert("customers", {
        accountId,
        ...customerData,
        customFields: {},
      });
    }

    // Create some sample transactions
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    for (const customer of customers) {
      // Create a few transactions for each customer
      const transactionCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < transactionCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const transactionTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
        
        await ctx.db.insert("customerTransactions", {
          customerId: customer._id,
          accountId,
          type: Math.random() > 0.8 ? "redemption" : "purchase",
          amount: Math.random() > 0.8 ? undefined : Math.floor(Math.random() * 50) + 10,
          pointsChange: Math.random() > 0.8 ? -10 : Math.floor(Math.random() * 10) + 1,
          stampsChange: Math.random() > 0.8 ? -5 : Math.floor(Math.random() * 3) + 1,
          notes: Math.random() > 0.5 ? "Regular purchase" : "Reward redemption",
          metadata: {},
        });
      }
    }

    return { message: `Created ${sampleCustomers.length} sample customers with transactions` };
  },
});

// Migration function to update existing customers from old schema
export const migrateCustomersSchema = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all customers that still use the old schema (have a 'name' field)
    const allCustomers = await ctx.db.query("customers").collect();
    
    let migratedCount = 0;
    
    for (const customer of allCustomers) {
      // Check if this customer uses the old schema
      if ((customer as any).name && !customer.firstName && !customer.lastName) {
        const oldName = (customer as any).name;
        const nameParts = oldName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Update the customer with new schema
        await ctx.db.patch(customer._id, {
          firstName,
          lastName,
          // Add missing fields if they don't exist
          birthday: customer.birthday || undefined,
          utmSource: customer.utmSource || undefined,
          utmMedium: customer.utmMedium || undefined,
          utmCampaign: customer.utmCampaign || undefined,
          referredBy: customer.referredBy || undefined,
          loyaltyCards: customer.loyaltyCards || [],
          totalVisits: customer.totalVisits || 0,
          lifetimeSpend: customer.lifetimeSpend || 0,
          lastVisited: customer.lastVisited || undefined,
          pointsBalance: customer.pointsBalance || 0,
          stampsBalance: customer.stampsBalance || 0,
          rewardsEarned: customer.rewardsEarned || 0,
          rewardsAvailable: customer.rewardsAvailable || 0,
          referralCount: customer.referralCount || 0,
          customFields: customer.customFields || {},
          notes: customer.notes || "",
        });
        
        migratedCount++;
      }
    }
    
    return { 
      message: `Migrated ${migratedCount} customers to new schema`,
      migratedCount 
    };
  },
});

// Helper function to generate serial numbers
function generateSerialNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    const segment = Array.from({ length: 4 }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
    result += (i > 0 ? '-' : '') + segment;
  }
  return result;
}

// Helper function to setup user account association (for development/testing)
export const setupUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has an appUser record
    const existingAppUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user")
      .filter((q: any) => q.eq(q.field("authUserId"), userId))
      .unique();

    if (existingAppUser) {
      return { message: "User already has account association", appUser: existingAppUser };
    }

    // Get the authenticated user info
    const authUser = await ctx.db.get(userId);
    if (!authUser) {
      throw new Error("Auth user not found");
    }

    // Find or create a default account
    let account = await ctx.db.query("accounts").first();
    
    if (!account) {
      // Create a default account for development
      const plan = await ctx.db.query("plans").first();
      if (!plan) {
        throw new Error("No plans found. Please seed the database first.");
      }

      const accountId = await ctx.db.insert("accounts", {
        type: "individual",
        name: "Default Account",
        slug: "default-account",
        primaryContact: {
          name: authUser.name || "Default User",
          email: authUser.email || "user@example.com",
          phone: "000-000-0000",
        },
        planId: plan._id,
        planStatus: "trial",
        trialEndsAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: userId,
        status: "active",
        limits: {
          users: 10,
          subAccounts: 0,
        },
      });
      account = await ctx.db.get(accountId);
    }

    // Create appUser record
    const appUserId = await ctx.db.insert("appUsers", {
      email: authUser.email || "user@example.com", 
      phone: "000-000-0000",
      firstName: authUser.name?.split(" ")[0] || "Default",
      lastName: authUser.name?.split(" ")[1] || "User",
      role: "orgadmin",
      accountId: account!._id,
      accountType: "individual",
      status: "active",
      emailVerified: !!authUser.emailVerificationTime,
      lastLogin: Date.now(),
      loginAttempts: 0,
      authUserId: userId,
    });

    const appUser = await ctx.db.get(appUserId);
    
    return { 
      message: "User account association created successfully", 
      appUser,
      account: account!
    };
  },
});

// Debug function to check current user state (can be run from CLI)
export const debugUserState = query({
  args: {},
  handler: async (ctx) => {
    // This will help us see what's happening
    try {
      const userId = await getAuthUserId(ctx);
      console.log("Auth User ID:", userId);
      
      if (!userId) {
        return { error: "No authenticated user", authUserId: null };
      }

      const authUser = await ctx.db.get(userId);
      console.log("Auth User:", authUser);

      const appUser = await ctx.db
        .query("appUsers")
        .withIndex("by_auth_user")
        .filter((q: any) => q.eq(q.field("authUserId"), userId))
        .unique();
      
      console.log("App User:", appUser);

      const accounts = await ctx.db.query("accounts").collect();
      console.log("Available Accounts:", accounts.length);

      return {
        authUserId: userId,
        authUser,
        appUser,
        availableAccounts: accounts.length,
        needsSetup: !appUser || !appUser.accountId
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});

// Simple setup that creates minimal required data
export const simpleSetup = mutation({
  args: {},
  handler: async (ctx) => {
    // Get or create a basic plan
    let plan = await ctx.db.query("plans").first();
    if (!plan) {
      const planId = await ctx.db.insert("plans", {
        name: "Basic Plan",
        type: "individual",
        price: 0,
        billingPeriod: "monthly",
        features: {
          maxUsers: 10,
          maxSubAccounts: 0,
          dataRetention: 365,
          apiCalls: 5000,
          customDomain: false,
          customBranding: false,
          priority_support: false,
          analytics: true,
          integrations: false,
          multiLocation: false,
        },
        featureList: ["Basic features"],
        defaultPermissions: {
          customers: { view: true, create: true, edit: true, delete: true, export: false, import: false },
          communications: { sendEmail: false, sendSMS: false, bulkMessage: false, templates: false },
          reports: { basic: true, advanced: false, export: false, customReports: false },
          settings: { billingView: false, billingEdit: false, userManagement: false, integrations: false },
          features: { apiAccess: false, webhooks: false, customBranding: false, multiLocation: false },
        },
        status: "active",
      });
      plan = await ctx.db.get(planId);
    }

    // Create a basic account
    let account = await ctx.db.query("accounts").first();
    if (!account) {
      const dummyUserId = await ctx.db.insert("users", {
        name: "System User",
        email: "system@example.com",
        emailVerificationTime: Date.now(),
        isAnonymous: false,
      });

      const accountId = await ctx.db.insert("accounts", {
        type: "individual",
        name: "Default Business Account",
        slug: "default-business",
        primaryContact: {
          name: "Business Owner",
          email: "owner@business.com",
          phone: "555-0123",
        },
        planId: plan!._id,
        planStatus: "trial",
        trialEndsAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        createdBy: dummyUserId,
        status: "active",
        limits: { users: 10, subAccounts: 0 },
      });
      account = await ctx.db.get(accountId);
    }

    // Find any existing auth users that need app user records
    const authUsers = await ctx.db.query("users").collect();
    const results = [];

    for (const authUser of authUsers) {
      const existingAppUser = await ctx.db
        .query("appUsers")
        .withIndex("by_auth_user")
        .filter((q: any) => q.eq(q.field("authUserId"), authUser._id))
        .unique();

      if (!existingAppUser && authUser.email !== "system@example.com") {
        const appUserId = await ctx.db.insert("appUsers", {
          email: authUser.email || "user@example.com",
          phone: "555-0123",
          firstName: authUser.name?.split(" ")[0] || "User",
          lastName: authUser.name?.split(" ")[1] || "Name",
          role: "orgadmin",
          accountId: account!._id,
          accountType: "individual",
          status: "active",
          emailVerified: !!authUser.emailVerificationTime,
          lastLogin: Date.now(),
          loginAttempts: 0,
          authUserId: authUser._id,
        });
        results.push({ authUserId: authUser._id, appUserId });
      }
    }

    return {
      message: `Setup completed! Created ${results.length} user associations`,
      results,
      account: account!._id,
      plan: plan!._id,
    };
  },
});

// Setup a specific user by email (useful for command line setup)
export const setupUserByEmail = mutation({
  args: { 
    email: v.string() 
  },
  handler: async (ctx, args) => {
    // Find the auth user by email
    const authUser = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .unique();

    if (!authUser) {
      throw new Error(`No user found with email: ${args.email}`);
    }

    // Check if they already have an appUser record
    const existingAppUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user")
      .filter((q: any) => q.eq(q.field("authUserId"), authUser._id))
      .unique();

    if (existingAppUser) {
      return { 
        message: "User already has account association", 
        appUser: existingAppUser,
        alreadySetup: true 
      };
    }

    // Get the account (should exist from simpleSetup)
    const account = await ctx.db.query("accounts").first();
    if (!account) {
      throw new Error("No account found. Run simpleSetup first.");
    }

    // Create appUser record
    const appUserId = await ctx.db.insert("appUsers", {
      email: authUser.email || args.email,
      phone: "555-0123",
      firstName: authUser.name?.split(" ")[0] || "User",
      lastName: authUser.name?.split(" ")[1] || "Name",
      role: "orgadmin",
      accountId: account._id,
      accountType: "individual",
      status: "active",
      emailVerified: !!authUser.emailVerificationTime,
      lastLogin: Date.now(),
      loginAttempts: 0,
      authUserId: authUser._id,
    });

    const appUser = await ctx.db.get(appUserId);

    return {
      message: "User account association created successfully",
      appUser,
      account,
      alreadySetup: false
    };
  },
});

// List all users for debugging (no auth required)
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const authUsers = await ctx.db.query("users").collect();
    const appUsers = await ctx.db.query("appUsers").collect();
    const accounts = await ctx.db.query("accounts").collect();
    
    return {
      authUsers: authUsers.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        emailVerified: !!u.emailVerificationTime,
        isAnonymous: u.isAnonymous
      })),
      appUsers: appUsers.map(u => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        accountId: u.accountId,
        authUserId: u.authUserId
      })),
      accounts: accounts.map(a => ({
        _id: a._id,
        name: a.name,
        type: a.type,
        status: a.status
      }))
    };
  },
});

// Fix superadmin account association (they need an accountId)
export const fixSuperadminAccount = mutation({
  args: {},
  handler: async (ctx) => {
    // Find the superadmin user
    const superadmin = await ctx.db
      .query("appUsers")
      .filter((q: any) => q.eq(q.field("role"), "superadmin"))
      .unique();

    if (!superadmin) {
      throw new Error("No superadmin user found");
    }

    if (superadmin.accountId) {
      return { 
        message: "Superadmin already has account association", 
        appUser: superadmin 
      };
    }

    // Get the first available account
    const account = await ctx.db.query("accounts").first();
    if (!account) {
      throw new Error("No account found to associate with");
    }

    // Update the superadmin to have an accountId
    await ctx.db.patch(superadmin._id, {
      accountId: account._id,
    });

    const updatedUser = await ctx.db.get(superadmin._id);

    return {
      message: "Superadmin account association fixed",
      appUser: updatedUser,
      accountId: account._id
    };
  },
});

// Get customer activity timeline
export const getCustomerActivity = query({
  args: { 
    customerId: v.id("customers"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify customer belongs to account
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Get transactions for activity timeline
    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .order("desc")
      .take(args.limit || 20);

    // Format activity items
    const activities = transactions.map(transaction => {
      let icon = "📍";
      let title = "";
      let description = "";

      switch (transaction.type) {
        case "purchase":
          icon = "📍";
          title = "Visit";
          description = `Earned ${transaction.stampsChange || 0} stamps | Transaction: £${transaction.amount?.toFixed(2) || "0.00"}`;
          break;
        case "redemption":
          icon = "🎁";
          title = "Reward Redeemed";
          description = `${transaction.notes || "Reward redeemed"} | ${Math.abs(transaction.stampsChange || 0)} stamps used`;
          break;
        case "referral":
          icon = "👥";
          title = "Referral Success";
          description = transaction.notes || "Someone joined via referral link";
          break;
        case "bonus":
          icon = "⭐";
          title = "Bonus Points";
          description = `${transaction.pointsChange || 0} bonus points awarded`;
          break;
        case "adjustment":
          icon = "⚙️";
          title = "Manual Adjustment";
          description = transaction.notes || "Manual points/stamps adjustment";
          break;
        default:
          icon = "📝";
          title = "Activity";
          description = transaction.notes || "Customer activity";
      }

      return {
        id: transaction._id,
        icon,
        title,
        description,
        timestamp: transaction._creationTime,
        timeAgo: formatTimeAgo(transaction._creationTime),
        type: transaction.type,
        amount: transaction.amount,
        pointsChange: transaction.pointsChange,
        stampsChange: transaction.stampsChange
      };
    });

    return activities;
  },
});

// Get customer transaction history
export const getCustomerTransactions = query({
  args: {
    customerId: v.id("customers"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify customer belongs to account
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Get transactions with pagination
    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .order("desc")
      .take(args.limit || 50);

    // Format transactions for display
    const formattedTransactions = transactions.map(transaction => ({
      _id: transaction._id,
      date: transaction._creationTime,
      dateFormatted: new Date(transaction._creationTime).toLocaleDateString(),
      timeFormatted: new Date(transaction._creationTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: transaction.type,
      typeDisplay: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      amount: transaction.amount,
      amountFormatted: transaction.amount ? `£${transaction.amount.toFixed(2)}` : "-",
      pointsChange: transaction.pointsChange || 0,
      stampsChange: transaction.stampsChange || 0,
      pointsStampsDisplay: formatPointsStampsChange(transaction.pointsChange, transaction.stampsChange),
      notes: transaction.notes || "",
      rewardId: transaction.rewardId
    }));

    return {
      transactions: formattedTransactions,
      hasMore: transactions.length === (args.limit || 50)
    };
  },
});

// Enhanced customer profile with additional data
export const getCustomerProfileEnhanced = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Get base customer data
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Get transaction summary
    const transactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .collect();

    // Calculate additional metrics
    const rewardsEarned = transactions.filter(t => t.type === "bonus" || t.type === "purchase").length;
    const rewardsRedeemed = transactions.filter(t => t.type === "redemption").length;
    const rewardsAvailable = rewardsEarned - rewardsRedeemed;
    const referralCount = transactions.filter(t => t.type === "referral").length;

    // Get recent activity count
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentActivity = transactions.filter(t => t._creationTime > thirtyDaysAgo).length;

    // Enhanced customer object
    const enhancedCustomer = {
      ...customer,
      fullName: `${customer.firstName} ${customer.lastName}`,
      daysSinceLastVisit: customer.lastVisited 
        ? Math.floor((Date.now() - customer.lastVisited) / (24 * 60 * 60 * 1000))
        : null,
      rewardsEarned,
      rewardsAvailable: Math.max(0, rewardsAvailable),
      referralCount,
      recentActivityCount: recentActivity,
      membershipDuration: formatMembershipDuration(customer._creationTime),
      // Card status summary
      hasInstalledCard: customer.loyaltyCards.some(card => card.installStatus === "installed"),
      hasPendingCard: customer.loyaltyCards.some(card => card.installStatus === "pending"),
      totalCards: customer.loyaltyCards.length
    };

    return enhancedCustomer;
  },
});

// Helper function for formatting time ago
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  if (weeks < 4) return `${weeks} weeks ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

// Helper function for formatting points/stamps change
function formatPointsStampsChange(pointsChange?: number, stampsChange?: number): string {
  const parts = [];
  
  if (pointsChange && pointsChange !== 0) {
    const sign = pointsChange > 0 ? "+" : "";
    parts.push(`${sign}${pointsChange} pts`);
  }
  
  if (stampsChange && stampsChange !== 0) {
    const sign = stampsChange > 0 ? "+" : "";
    parts.push(`${sign}${stampsChange} stamps`);
  }
  
  return parts.length > 0 ? parts.join(", ") : "-";
}

// Helper function for membership duration
function formatMembershipDuration(creationTime: number): string {
  const now = Date.now();
  const diff = now - creationTime;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
  return `${days} day${days > 1 ? 's' : ''}`;
}

// Bulk operations
export const bulkUpdateCustomers = mutation({
  args: {
    customerIds: v.array(v.id("customers")),
    operation: v.union(
      v.literal("add_tag"),
      v.literal("remove_tag"),
      v.literal("update_status"),
      v.literal("delete")
    ),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify all customers belong to this account
    const customers = await Promise.all(
      args.customerIds.map(id => ctx.db.get(id))
    );

    // Check all customers exist and belong to account
    for (const customer of customers) {
      if (!customer || customer.accountId !== accountId) {
        throw new Error("One or more customers not found or unauthorized");
      }
    }

    let updatedCount = 0;

    switch (args.operation) {
      case "add_tag":
        for (const customerId of args.customerIds) {
          const customer = await ctx.db.get(customerId);
          if (customer && !customer.tags.includes(args.data.tag)) {
            await ctx.db.patch(customerId, {
              tags: [...customer.tags, args.data.tag]
            });
            updatedCount++;
          }
        }
        break;

      case "remove_tag":
        for (const customerId of args.customerIds) {
          const customer = await ctx.db.get(customerId);
          if (customer && customer.tags.includes(args.data.tag)) {
            await ctx.db.patch(customerId, {
              tags: customer.tags.filter(tag => tag !== args.data.tag)
            });
            updatedCount++;
          }
        }
        break;

      case "update_status":
        for (const customerId of args.customerIds) {
          await ctx.db.patch(customerId, {
            status: args.data.status
          });
          updatedCount++;
        }
        break;

      case "delete":
        for (const customerId of args.customerIds) {
          await ctx.db.delete(customerId);
          updatedCount++;
        }
        break;
    }

    return {
      message: `Successfully ${args.operation.replace('_', ' ')}${args.operation === 'delete' ? 'd' : 'ed'} ${updatedCount} customer${updatedCount !== 1 ? 's' : ''}`,
      updatedCount
    };
  },
});

// Export customers data
export const exportCustomers = query({
  args: {
    customerIds: v.optional(v.array(v.id("customers"))),
    format: v.optional(v.union(v.literal("csv"), v.literal("json"))),
    includeTransactions: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    let customers;
    
    if (args.customerIds && args.customerIds.length > 0) {
      // Export specific customers
      customers = await Promise.all(
        args.customerIds.map(id => ctx.db.get(id))
      );
      customers = customers.filter(c => c && c.accountId === accountId);
    } else {
      // Export all customers
      customers = await ctx.db
        .query("customers")
        .withIndex("by_account")
        .filter((q: any) => q.eq(q.field("accountId"), accountId))
        .collect();
    }

    // Format customer data for export
    const exportData = customers
      .filter((customer): customer is NonNullable<typeof customer> => customer !== null)
      .map(customer => ({
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        birthday: customer.birthday ? new Date(customer.birthday).toISOString().split('T')[0] : "",
        memberSince: new Date(customer._creationTime).toISOString().split('T')[0],
        status: customer.status,
        pointsBalance: customer.pointsBalance,
        stampsBalance: customer.stampsBalance,
        totalVisits: customer.totalVisits,
        lifetimeSpend: customer.lifetimeSpend,
        lastVisited: customer.lastVisited ? new Date(customer.lastVisited).toISOString().split('T')[0] : "",
        utmSource: customer.utmSource || "",
        utmMedium: customer.utmMedium || "",
        utmCampaign: customer.utmCampaign || "",
        tags: customer.tags.join(", "),
        loyaltyCardsCount: customer.loyaltyCards.length,
        hasInstalledCard: customer.loyaltyCards.some(card => card.installStatus === "installed") ? "Yes" : "No"
      }));

    return {
      data: exportData,
      count: exportData.length,
      exportedAt: Date.now(),
      format: args.format || "csv"
    };
  },
});

// Send bulk message (placeholder for future SMS/Email integration)
export const scheduleBulkMessage = mutation({
  args: {
    customerIds: v.array(v.id("customers")),
    messageType: v.union(v.literal("email"), v.literal("sms")),
    subject: v.optional(v.string()),
    message: v.string(),
    scheduledFor: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify all customers belong to this account
    const customers = await Promise.all(
      args.customerIds.map(id => ctx.db.get(id))
    );

    // Check all customers exist and belong to account
    for (const customer of customers) {
      if (!customer || customer.accountId !== accountId) {
        throw new Error("One or more customers not found or unauthorized");
      }
    }

    // For now, just return success (would integrate with email/SMS service)
    return {
      message: `Bulk ${args.messageType} message scheduled for ${args.customerIds.length} customer${args.customerIds.length !== 1 ? 's' : ''}`,
      messageId: `msg_${Date.now()}`,
      customerCount: args.customerIds.length,
      scheduledFor: args.scheduledFor || Date.now()
    };
  },
});

// Generate sample transaction data for testing
export const generateSampleTransactions = mutation({
  args: {
    customerId: v.id("customers"),
    count: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify customer belongs to account
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    const count = args.count || 10;
    const transactions = [];

    // Generate sample transactions over the last 90 days
    const now = Date.now();
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < count; i++) {
      const randomTimestamp = ninetyDaysAgo + Math.random() * (now - ninetyDaysAgo);
      const transactionTypes = ["purchase", "redemption", "referral", "bonus"];
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)] as any;

      let transaction: any = {
        customerId: args.customerId,
        accountId: accountId,
        type: type,
        _creationTime: randomTimestamp
      };

      switch (type) {
        case "purchase":
          transaction.amount = Math.round((Math.random() * 50 + 5) * 100) / 100; // £5-£55
          transaction.stampsChange = Math.floor(transaction.amount / 10); // 1 stamp per £10
          transaction.pointsChange = Math.floor(transaction.amount * 10); // 10 points per £1
          break;
        case "redemption":
          transaction.stampsChange = -Math.floor(Math.random() * 10 + 5); // -5 to -15 stamps
          transaction.pointsChange = -Math.floor(Math.random() * 100 + 50); // -50 to -150 points
          transaction.notes = "Free coffee redeemed";
          break;
        case "referral":
          transaction.pointsChange = 50; // Bonus points for referral
          transaction.notes = "Referral bonus - friend joined";
          break;
        case "bonus":
          transaction.pointsChange = Math.floor(Math.random() * 100 + 25); // 25-125 bonus points
          transaction.notes = "Birthday bonus points";
          break;
      }

      const transactionId = await ctx.db.insert("customerTransactions", transaction);
      transactions.push(transactionId);
    }

    // Update customer metrics based on transactions
    const allTransactions = await ctx.db
      .query("customerTransactions")
      .withIndex("by_customer")
      .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
      .collect();

    const totalPoints = allTransactions.reduce((sum, t) => sum + (t.pointsChange || 0), 0);
    const totalStamps = allTransactions.reduce((sum, t) => sum + (t.stampsChange || 0), 0);
    const totalSpend = allTransactions
      .filter(t => t.type === "purchase")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const visitCount = allTransactions.filter(t => t.type === "purchase").length;
    const lastPurchase = allTransactions
      .filter(t => t.type === "purchase")
      .sort((a, b) => b._creationTime - a._creationTime)[0];

    // Update customer record
    await ctx.db.patch(args.customerId, {
      pointsBalance: Math.max(0, totalPoints),
      stampsBalance: Math.max(0, totalStamps),
      lifetimeSpend: totalSpend,
      totalVisits: visitCount,
      lastVisited: lastPurchase?._creationTime || customer.lastVisited
    });

    return {
      message: `Generated ${count} sample transactions for customer`,
      transactionIds: transactions,
      updatedCustomer: {
        pointsBalance: Math.max(0, totalPoints),
        stampsBalance: Math.max(0, totalStamps),
        lifetimeSpend: totalSpend,
        totalVisits: visitCount
      }
    };
  },
});

// Manual point/stamp adjustment
export const adjustCustomerBalance = mutation({
  args: {
    customerId: v.id("customers"),
    adjustmentType: v.union(v.literal("points"), v.literal("stamps")),
    amount: v.number(),
    reason: v.string(),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    // Verify customer belongs to account
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Validate adjustment amount
    if (args.amount === 0) {
      throw new Error("Adjustment amount cannot be zero");
    }

    // Calculate new balances and validate they don't go negative
    let newPointsBalance = customer.pointsBalance;
    let newStampsBalance = customer.stampsBalance;

    if (args.adjustmentType === "points") {
      newPointsBalance = customer.pointsBalance + args.amount;
      if (newPointsBalance < 0) {
        throw new Error("Adjustment would result in negative points balance");
      }
    } else {
      newStampsBalance = customer.stampsBalance + args.amount;
      if (newStampsBalance < 0) {
        throw new Error("Adjustment would result in negative stamps balance");
      }
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("customerTransactions", {
      customerId: args.customerId,
      accountId: accountId,
      type: "adjustment",
      pointsChange: args.adjustmentType === "points" ? args.amount : 0,
      stampsChange: args.adjustmentType === "stamps" ? args.amount : 0,
      notes: `${args.reason}${args.notes ? ` - ${args.notes}` : ""}`,
      amount: undefined // No monetary amount for adjustments
    });

    // Update customer balance
    const updateData: any = {};
    if (args.adjustmentType === "points") {
      updateData.pointsBalance = newPointsBalance;
    } else {
      updateData.stampsBalance = newStampsBalance;
    }

    await ctx.db.patch(args.customerId, updateData);

    const updatedCustomer = await ctx.db.get(args.customerId);

    return {
      message: `Successfully adjusted ${args.adjustmentType} by ${args.amount > 0 ? '+' : ''}${args.amount}`,
      transactionId,
      customer: updatedCustomer,
      adjustment: {
        type: args.adjustmentType,
        amount: args.amount,
        reason: args.reason,
        newBalance: args.adjustmentType === "points" ? newPointsBalance : newStampsBalance
      }
    };
  },
}); 