import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Billing Plans
  plans: defineTable({
    name: v.string(),
    type: v.union(v.literal("individual"), v.literal("franchise")),
    price: v.number(),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annually")),
    features: v.object({
      maxUsers: v.number(),
      maxSubAccounts: v.number(),
      dataRetention: v.number(),
      apiCalls: v.number(),
      customDomain: v.boolean(),
      customBranding: v.boolean(),
      priority_support: v.boolean(),
      analytics: v.boolean(),
      integrations: v.boolean(),
      multiLocation: v.boolean(),
    }),
    featureList: v.array(v.string()),
    defaultPermissions: v.object({
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
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("discontinued")),
  }).index("by_type", ["type"]).index("by_status", ["status"]),

  // Accounts (Franchise and Individual)
  accounts: defineTable({
    type: v.union(v.literal("franchise"), v.literal("individual")),
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("accounts")),
    primaryContact: v.object({
      name: v.string(),
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
    planId: v.id("plans"),
    planStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled")
    ),
    trialEndsAt: v.optional(v.number()),
    createdBy: v.id("users"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("pending")),
    limits: v.object({
      users: v.number(),
      subAccounts: v.number(),
    }),
  })
    .index("by_type", ["type"])
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_slug", ["slug"])
    .index("by_name", ["name"])
    .index("by_plan", ["planId"]),

  // Enhanced Users with roles and account relationships
  appUsers: defineTable({
    email: v.string(),
    phone: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("superadmin"), v.literal("orgadmin"), v.literal("clientuser")),
    accountId: v.optional(v.id("accounts")),
    accountType: v.union(v.literal("platform"), v.literal("franchise"), v.literal("individual")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("suspended")),
    emailVerified: v.boolean(),
    lastLogin: v.optional(v.number()),
    loginAttempts: v.number(),
    lockedUntil: v.optional(v.number()),
    authUserId: v.id("users"), // Link to auth table
    testMessage: v.optional(v.string()), // Added test message field
  })
    .index("by_email", ["email"])
    .index("by_account", ["accountId"])
    .index("by_role", ["role"])
    .index("by_auth_user", ["authUserId"]),

  // User-specific permissions (overrides account and plan defaults)
  userPermissions: defineTable({
    userId: v.id("appUsers"),
    accountId: v.id("accounts"),
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
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"]),

  // Account Permissions (overrides plan defaults)
  accountPermissions: defineTable({
    accountId: v.id("accounts"),
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
    customLimits: v.object({
      maxCustomers: v.number(),
      maxMonthlyEmails: v.number(),
      maxUsers: v.number(),
      dataRetentionDays: v.number(),
    }),
    uiRestrictions: v.object({
      hiddenModules: v.array(v.string()),
      disabledFeatures: v.array(v.string()),
      customDashboard: v.boolean(),
    }),
  }).index("by_account", ["accountId"]),

  // View As User Sessions (enhanced)
  viewAsUserSessions: defineTable({
    superAdminId: v.id("users"),
    viewingAccountId: v.id("accounts"),
    viewingUserId: v.id("appUsers"),
    sessionToken: v.string(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_admin", ["superAdminId"])
    .index("by_token", ["sessionToken"])
    .index("by_account", ["viewingAccountId"])
    .index("by_user", ["viewingUserId"]),

  // Audit Logs
  auditLogs: defineTable({
    userId: v.id("users"),
    accountId: v.optional(v.id("accounts")),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      metadata: v.optional(v.any()),
    }),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    viewAsMode: v.boolean(),
    viewAsUserId: v.optional(v.id("appUsers")),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"])
    .index("by_action", ["action"]),

  // Customer CRM system
  customers: defineTable({
    accountId: v.id("accounts"),
    
    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    birthday: v.optional(v.number()),
    
    // Attribution
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    referredBy: v.optional(v.id("customers")),
    
    // Loyalty Cards
    loyaltyCards: v.array(v.object({
      cardType: v.union(v.literal("stamp"), v.literal("points"), v.literal("membership")),
      serialNumber: v.string(),
      installStatus: v.union(v.literal("installed"), v.literal("pending"), v.literal("expired")),
      installedAt: v.optional(v.number()),
      device: v.optional(v.object({
        type: v.string(),
        model: v.string(),
        os: v.string(),
      })),
    })),
    
    // Metrics
    totalVisits: v.number(),
    lifetimeSpend: v.number(),
    lastVisited: v.optional(v.number()),
    pointsBalance: v.number(),
    stampsBalance: v.number(),
    rewardsEarned: v.number(),
    rewardsAvailable: v.number(),
    referralCount: v.number(),
    
    // Meta
    tags: v.array(v.string()),
    customFields: v.optional(v.any()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked")),
    notes: v.optional(v.string()),
  })
    .index("by_account", ["accountId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_last_visited", ["lastVisited"])
    .index("by_total_visits", ["totalVisits"])
    .index("by_referred_by", ["referredBy"]),

  // Customer Transaction Log
  customerTransactions: defineTable({
    customerId: v.id("customers"),
    accountId: v.id("accounts"),
    
    type: v.union(
      v.literal("purchase"), 
      v.literal("redemption"), 
      v.literal("referral"), 
      v.literal("bonus"), 
      v.literal("adjustment")
    ),
    amount: v.optional(v.number()),
    pointsChange: v.number(),
    stampsChange: v.number(),
    rewardId: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_customer", ["customerId"])
    .index("by_account", ["accountId"])
    .index("by_type", ["type"]),

  // Card Builder System
  cardTemplates: defineTable({
    accountId: v.id("accounts"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("stamp"), v.literal("points"), v.literal("membership"), v.literal("coupon")),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("inactive")),
    
    // PassKit/Google Wallet identifiers
    passTypeIdentifier: v.string(), // com.company.loyalty.stamp
    teamIdentifier: v.optional(v.string()), // Apple Team ID
    googleIssuerId: v.optional(v.string()),
    googleClassId: v.optional(v.string()),
    
    // Settings Configuration
    settings: v.object({
      // Common settings
      barcodeType: v.union(v.literal("PDF417"), v.literal("QR"), v.literal("Code128"), v.literal("Aztec")),
      expiration: v.object({
        type: v.union(v.literal("unlimited"), v.literal("fixed"), v.literal("rolling")),
        value: v.optional(v.number()), // days/months
        unit: v.optional(v.union(v.literal("days"), v.literal("months"), v.literal("years")))
      }),
      locations: v.array(v.object({
        name: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        relevantText: v.optional(v.string())
      })),
      localization: v.object({
        language: v.string(),
        dateFormat: v.string(),
        currency: v.string(),
        numberFormat: v.string()
      }),
      
      // Type-specific settings
      stampSettings: v.optional(v.object({
        stampCount: v.number(),
        rewardProgram: v.object({
          type: v.union(v.literal("spend"), v.literal("visit"), v.literal("manual")),
          amountPerStamp: v.optional(v.number()),
          currency: v.optional(v.string()),
          visitsPerStamp: v.optional(v.number())
        }),
        stampExpiration: v.object({
          type: v.union(v.literal("unlimited"), v.literal("fixed")),
          days: v.optional(v.number())
        }),
        happyHours: v.array(v.object({
          name: v.string(),
          days: v.array(v.string()),
          startTime: v.string(),
          endTime: v.string(),
          multiplier: v.number()
        })),
        scannerRequireAmount: v.boolean()
      })),
      
      pointsSettings: v.optional(v.object({
        pointsProgram: v.object({
          earnRate: v.number(),
          roundingRule: v.union(v.literal("up"), v.literal("down"), v.literal("nearest")),
          minimumEarn: v.number(),
          maximumEarn: v.optional(v.number())
        }),
        pointsExpiration: v.object({
          type: v.union(v.literal("unlimited"), v.literal("rolling"), v.literal("fixed")),
          months: v.optional(v.number())
        }),
        tiers: v.array(v.object({
          name: v.string(),
          requiredPoints: v.number(),
          multiplier: v.number(),
          color: v.string()
        }))
      })),
      
      membershipSettings: v.optional(v.object({
        membershipType: v.object({
          tiers: v.array(v.object({
            id: v.string(),
            name: v.string(),
            benefits: v.array(v.string()),
            upgradeThreshold: v.number()
          }))
        }),
        membershipDuration: v.object({
          type: v.union(v.literal("unlimited"), v.literal("annual"), v.literal("custom")),
          renewalRequired: v.boolean()
        }),
        memberNumber: v.object({
          format: v.string(),
          startingNumber: v.number()
        })
      })),
      
      couponSettings: v.optional(v.object({
        couponType: v.union(v.literal("percentage"), v.literal("fixed"), v.literal("bogo"), v.literal("freeItem")),
        discountValue: v.number(),
        minimumPurchase: v.optional(v.number()),
        validityPeriod: v.object({
          startDate: v.optional(v.number()),
          endDate: v.optional(v.number()),
          daysFromIssue: v.optional(v.number())
        }),
        redemptionLimit: v.optional(v.number()),
        stackable: v.boolean()
      }))
    }),
    
    // Design Configuration
    design: v.object({
      colors: v.object({
        primary: v.string(),
        background: v.string(),
        text: v.string(),
        label: v.string()
      }),
      layout: v.object({
        displayType: v.union(v.literal("grid"), v.literal("row"), v.literal("custom")),
        stampCount: v.optional(v.number()) // for stamp cards
      }),
      branding: v.object({
        organizationName: v.string(),
        description: v.string()
      })
    }),
    
    // Certificate info for Apple passes
    certificates: v.optional(v.object({
      passTypeId: v.string(),
      teamId: v.string(),
      certId: v.string(),
      keyId: v.string()
    })),
    
    activatedAt: v.optional(v.number()),
    createdBy: v.id("appUsers"),
  })
    .index("by_account", ["accountId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_pass_type", ["passTypeIdentifier"]),

  // Card Template Images
  cardTemplateImages: defineTable({
    templateId: v.id("cardTemplates"),
    accountId: v.id("accounts"),
    imageType: v.union(
      v.literal("logo"), 
      v.literal("icon"), 
      v.literal("background"), 
      v.literal("strip"),
      v.literal("stamp_active"),
      v.literal("stamp_inactive"),
      v.literal("hero")
    ),
    platform: v.union(v.literal("apple"), v.literal("google"), v.literal("both")),
    
    // Image storage
    storageId: v.string(), // Convex file storage ID
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    
    // Image specifications
    dimensions: v.object({
      width: v.number(),
      height: v.number()
    }),
    variants: v.array(v.object({
      scale: v.string(), // "1x", "2x", "3x"
      storageId: v.string(),
      size: v.number()
    })),
    
    uploadedBy: v.id("appUsers"),
  })
    .index("by_template", ["templateId"])
    .index("by_account", ["accountId"])
    .index("by_type", ["imageType"]),

  // Card Template Form Fields
  cardTemplateFields: defineTable({
    templateId: v.id("cardTemplates"),
    accountId: v.id("accounts"),
    
    fieldType: v.union(
      v.literal("text"), 
      v.literal("email"), 
      v.literal("phone"), 
      v.literal("date"), 
      v.literal("number"), 
      v.literal("select"),
      v.literal("boolean")
    ),
    fieldName: v.string(),
    label: v.string(),
    placeholder: v.optional(v.string()),
    required: v.boolean(),
    unique: v.boolean(), // For fields like email, phone, member number
    
    // Field validation
    validation: v.optional(v.object({
      minLength: v.optional(v.number()),
      maxLength: v.optional(v.number()),
      pattern: v.optional(v.string()),
      options: v.optional(v.array(v.string())) // For select fields
    })),
    
    // Pass mapping
    passMapping: v.object({
      apple: v.optional(v.object({
        section: v.union(v.literal("primary"), v.literal("secondary"), v.literal("auxiliary"), v.literal("back"), v.literal("header")),
        position: v.number()
      })),
      google: v.optional(v.object({
        module: v.union(v.literal("text"), v.literal("info"), v.literal("links")),
        position: v.number()
      }))
    }),
    
    order: v.number(),
    createdBy: v.id("appUsers"),
  })
    .index("by_template", ["templateId"])
    .index("by_account", ["accountId"])
    .index("by_order", ["templateId", "order"]),

  // Generated Card Instances
  cardInstances: defineTable({
    templateId: v.id("cardTemplates"),
    customerId: v.id("customers"),
    accountId: v.id("accounts"),
    
    serialNumber: v.string(),
    
    // Platform-specific IDs
    applePassId: v.optional(v.string()),
    googleObjectId: v.optional(v.string()),
    
    // Instance data
    customerData: v.object({
      formData: v.any(), // Form field values
      computed: v.object({
        balance: v.optional(v.number()),
        tier: v.optional(v.string()),
        memberNumber: v.optional(v.string()),
        expirationDate: v.optional(v.number())
      })
    }),
    
    // Distribution
    distributionMethod: v.union(v.literal("email"), v.literal("sms"), v.literal("link"), v.literal("qr")),
    installLinks: v.object({
      apple: v.string(),
      google: v.string(),
      universal: v.string()
    }),
    
    // Status tracking
    status: v.union(v.literal("generated"), v.literal("distributed"), v.literal("installed"), v.literal("expired")),
    installedAt: v.optional(v.number()),
    lastUpdated: v.optional(v.number()),
    
    // Device info (when installed)
    deviceInfo: v.optional(v.object({
      platform: v.union(v.literal("ios"), v.literal("android")),
      userAgent: v.optional(v.string()),
      pushToken: v.optional(v.string())
    })),
    
    generatedBy: v.id("appUsers"),
  })
    .index("by_template", ["templateId"])
    .index("by_customer", ["customerId"])
    .index("by_account", ["accountId"])
    .index("by_serial", ["serialNumber"])
    .index("by_status", ["status"]),

  // Pass Generation Logs
  passGenerationLogs: defineTable({
    templateId: v.id("cardTemplates"),
    instanceId: v.optional(v.id("cardInstances")),
    accountId: v.id("accounts"),
    
    operation: v.union(
      v.literal("generate"), 
      v.literal("update"), 
      v.literal("distribute"), 
      v.literal("push_update")
    ),
    platform: v.union(v.literal("apple"), v.literal("google"), v.literal("both")),
    
    status: v.union(v.literal("success"), v.literal("error"), v.literal("pending")),
    error: v.optional(v.string()),
    
    // Generation details
    details: v.object({
      serialNumber: v.optional(v.string()),
      passSize: v.optional(v.number()),
      generationTime: v.optional(v.number()),
      distributionChannels: v.optional(v.array(v.string())),
      // Allow additional properties for bulk operations and status changes
      bulkGeneration: v.optional(v.boolean()),
      totalCards: v.optional(v.number()),
      successfulCards: v.optional(v.number()),
      failedCards: v.optional(v.number()),
      statusChange: v.optional(v.string()),
    }),
    
    triggeredBy: v.id("appUsers"),
  })
    .index("by_template", ["templateId"])
    .index("by_instance", ["instanceId"])
    .index("by_account", ["accountId"])
    .index("by_status", ["status"])
    .index("by_operation", ["operation"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
