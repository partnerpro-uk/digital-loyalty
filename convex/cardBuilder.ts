import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to get user's account (same as in customers.ts)
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

// Helper to generate pass type identifier
function generatePassTypeIdentifier(accountId: string, type: string): string {
  const timestamp = Date.now();
  return `pass.loyalty.${type}.${accountId.slice(-8)}.${timestamp}`;
}

// Helper to generate serial number
function generateSerialNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random}`.toUpperCase();
}

// ========== CARD TEMPLATE MANAGEMENT ==========

// List all card templates for an account
export const listCardTemplates = query({
  args: {
    type: v.optional(v.union(v.literal("stamp"), v.literal("points"), v.literal("membership"), v.literal("coupon"))),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    let templates = await ctx.db
      .query("cardTemplates")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    // Apply filters
    if (args.type) {
      templates = templates.filter(t => t.type === args.type);
    }
    if (args.status) {
      templates = templates.filter(t => t.status === args.status);
    }

    // Get stats for each template
    const templatesWithStats = await Promise.all(
      templates.map(async (template) => {
        const instanceCount = await ctx.db
          .query("cardInstances")
          .withIndex("by_template")
          .filter((q: any) => q.eq(q.field("templateId"), template._id))
          .collect();

        const activeInstances = instanceCount.filter(i => i.status === "installed").length;

        return {
          ...template,
          stats: {
            totalInstances: instanceCount.length,
            activeInstances,
            lastGenerated: instanceCount.length > 0 
              ? Math.max(...instanceCount.map(i => i._creationTime))
              : null
          }
        };
      })
    );

    return templatesWithStats.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get single card template with all related data
export const getCardTemplate = query({
  args: { templateId: v.id("cardTemplates") },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Get images
    const images = await ctx.db
      .query("cardTemplateImages")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    // Get fields
    const fields = await ctx.db
      .query("cardTemplateFields")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    // Get recent instances
    const recentInstances = await ctx.db
      .query("cardInstances")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .order("desc")
      .take(10);

    return {
      ...template,
      images,
      fields: fields.sort((a, b) => a.order - b.order),
      recentInstances
    };
  },
});

// Create new card template
export const createCardTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("stamp"), v.literal("points"), v.literal("membership"), v.literal("coupon")),
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    // Generate pass type identifier
    const passTypeIdentifier = generatePassTypeIdentifier(accountId, args.type);

    // Default settings based on card type
    const defaultSettings = {
      barcodeType: "QR" as const,
      expiration: {
        type: "unlimited" as const,
      },
      locations: [],
      localization: {
        language: "en",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
        numberFormat: "1,000.00"
      },
      
      // Type-specific defaults
      ...(args.type === "stamp" && {
        stampSettings: {
          stampCount: 10,
          rewardProgram: {
            type: "visit" as const,
            visitsPerStamp: 1
          },
          stampExpiration: {
            type: "unlimited" as const
          },
          happyHours: [],
          scannerRequireAmount: false
        }
      }),
      
      ...(args.type === "points" && {
        pointsSettings: {
          pointsProgram: {
            earnRate: 1,
            roundingRule: "nearest" as const,
            minimumEarn: 1
          },
          pointsExpiration: {
            type: "unlimited" as const
          },
          tiers: []
        }
      }),
      
      ...(args.type === "membership" && {
        membershipSettings: {
          membershipType: {
            tiers: [{
              id: "default",
              name: "Member",
              benefits: [],
              upgradeThreshold: 0
            }]
          },
          membershipDuration: {
            type: "unlimited" as const,
            renewalRequired: false
          },
          memberNumber: {
            format: "MEM-{YYYY}-{00000}",
            startingNumber: 1
          }
        }
      }),
      
      ...(args.type === "coupon" && {
        couponSettings: {
          couponType: "percentage" as const,
          discountValue: 10,
          validityPeriod: {
            daysFromIssue: 30
          },
          stackable: false
        }
      })
    };

    const defaultDesign = {
      colors: {
        primary: "#007AFF",
        background: "#FFFFFF",
        text: "#000000",
        label: "#8E8E93"
      },
      layout: {
        displayType: "grid" as const,
        ...(args.type === "stamp" && { stampCount: 10 })
      },
      branding: {
        organizationName: "Your Business",
        description: `${args.type.charAt(0).toUpperCase() + args.type.slice(1)} loyalty card`
      }
    };

    const templateId = await ctx.db.insert("cardTemplates", {
      accountId,
      name: args.name,
      description: args.description,
      type: args.type,
      status: "draft",
      passTypeIdentifier,
      settings: defaultSettings,
      design: defaultDesign,
      createdBy: appUser._id,
    });

    return {
      templateId,
      message: `${args.type} card template created successfully`,
      passTypeIdentifier
    };
  },
});

// Update card template
export const updateCardTemplate = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      settings: v.optional(v.any()),
      design: v.optional(v.any()),
      certificates: v.optional(v.any()),
    })
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    if (template.status === "active") {
      throw new Error("Cannot modify active template. Create a new version instead.");
    }

    await ctx.db.patch(args.templateId, args.updates);

    return {
      message: "Template updated successfully"
    };
  },
});

// Activate/Deactivate card template
export const updateTemplateStatus = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    const updates: any = { status: args.status };
    
    if (args.status === "active" && template.status !== "active") {
      updates.activatedAt = Date.now();
    }

    await ctx.db.patch(args.templateId, updates);

    return {
      message: `Template ${args.status === "active" ? "activated" : "deactivated"} successfully`
    };
  },
});

// Delete card template
export const deleteCardTemplate = mutation({
  args: { templateId: v.id("cardTemplates") },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Check if template has active instances
    const instances = await ctx.db
      .query("cardInstances")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const activeInstances = instances.filter(i => i.status === "installed");
    if (activeInstances.length > 0) {
      throw new Error(`Cannot delete template with ${activeInstances.length} active card instances`);
    }

    // Delete related data
    const images = await ctx.db
      .query("cardTemplateImages")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const fields = await ctx.db
      .query("cardTemplateFields")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    // Delete in transaction-like manner
    for (const image of images) {
      await ctx.db.delete(image._id);
    }
    for (const field of fields) {
      await ctx.db.delete(field._id);
    }
    for (const instance of instances) {
      await ctx.db.delete(instance._id);
    }

    await ctx.db.delete(args.templateId);

    return {
      message: "Template deleted successfully"
    };
  },
});

// ========== FIELD MANAGEMENT ==========

// Add field to template
export const addTemplateField = mutation({
  args: {
    templateId: v.id("cardTemplates"),
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
    unique: v.boolean(),
    validation: v.optional(v.any()),
    passMapping: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Get current field count for ordering
    const existingFields = await ctx.db
      .query("cardTemplateFields")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const fieldId = await ctx.db.insert("cardTemplateFields", {
      templateId: args.templateId,
      accountId,
      fieldType: args.fieldType,
      fieldName: args.fieldName,
      label: args.label,
      placeholder: args.placeholder,
      required: args.required,
      unique: args.unique,
      validation: args.validation,
      passMapping: args.passMapping || { apple: undefined, google: undefined },
      order: existingFields.length,
      createdBy: appUser._id,
    });

    return {
      fieldId,
      message: "Field added successfully"
    };
  },
});

// Update field order
export const updateFieldOrder = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    fieldOrders: v.array(v.object({
      fieldId: v.id("cardTemplateFields"),
      order: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Update each field's order
    for (const { fieldId, order } of args.fieldOrders) {
      const field = await ctx.db.get(fieldId);
      if (field && field.templateId === args.templateId) {
        await ctx.db.patch(fieldId, { order });
      }
    }

    return {
      message: "Field order updated successfully"
    };
  },
});

// Remove field from template
export const removeTemplateField = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    fieldId: v.id("cardTemplateFields")
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    const field = await ctx.db.get(args.fieldId);
    if (!field || field.templateId !== args.templateId) {
      throw new Error("Field not found");
    }

    await ctx.db.delete(args.fieldId);

    return {
      message: "Field removed successfully"
    };
  },
});

// ========== IMAGE MANAGEMENT ==========

// Upload image for template
export const uploadTemplateImage = mutation({
  args: {
    templateId: v.id("cardTemplates"),
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
    storageId: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    dimensions: v.object({
      width: v.number(),
      height: v.number()
    }),
    variants: v.optional(v.array(v.object({
      scale: v.string(),
      storageId: v.string(),
      size: v.number()
    })))
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Remove existing image of same type and platform
    const existingImages = await ctx.db
      .query("cardTemplateImages")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const conflictingImage = existingImages.find(img => 
      img.imageType === args.imageType && 
      (img.platform === args.platform || img.platform === "both" || args.platform === "both")
    );

    if (conflictingImage) {
      await ctx.db.delete(conflictingImage._id);
    }

    const imageId = await ctx.db.insert("cardTemplateImages", {
      templateId: args.templateId,
      accountId,
      imageType: args.imageType,
      platform: args.platform,
      storageId: args.storageId,
      originalName: args.originalName,
      mimeType: args.mimeType,
      size: args.size,
      dimensions: args.dimensions,
      variants: args.variants || [],
      uploadedBy: appUser._id,
    });

    return {
      imageId,
      message: "Image uploaded successfully"
    };
  },
});

// Remove image from template
export const removeTemplateImage = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    imageId: v.id("cardTemplateImages")
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    const image = await ctx.db.get(args.imageId);
    if (!image || image.templateId !== args.templateId) {
      throw new Error("Image not found");
    }

    await ctx.db.delete(args.imageId);

    return {
      message: "Image removed successfully"
    };
  },
});

// ========== PASS GENERATION ==========

// Generate card instance for customer
export const generateCardInstance = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    customerId: v.id("customers"),
    formData: v.any(),
    distributionMethod: v.union(v.literal("email"), v.literal("sms"), v.literal("link"), v.literal("qr")),
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    if (template.status !== "active") {
      throw new Error("Template must be active to generate cards");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    // Generate unique serial number
    const serialNumber = generateSerialNumber();

    // Generate platform-specific IDs
    const applePassId = `${template.passTypeIdentifier}.${serialNumber}`;
    const googleObjectId = template.googleClassId ? `${template.googleIssuerId}.${serialNumber}` : undefined;

    // Compute dynamic values based on card type
    const computed: any = {};
    
    if (template.type === "points") {
      computed.balance = customer.pointsBalance;
    } else if (template.type === "stamp") {
      computed.balance = customer.stampsBalance;
    } else if (template.type === "membership") {
      const memberNumber = template.settings.membershipSettings?.memberNumber.format
        .replace("{YYYY}", new Date().getFullYear().toString())
        .replace("{00000}", String(template.settings.membershipSettings.memberNumber.startingNumber).padStart(5, '0'));
      computed.memberNumber = memberNumber;
    }

    // Generate install links
    const baseUrl = process.env.BASE_URL || "https://your-app.com";
    const installLinks = {
      apple: `${baseUrl}/api/passes/apple/${serialNumber}`,
      google: `${baseUrl}/api/passes/google/${serialNumber}`,
      universal: `${baseUrl}/install/${serialNumber}`
    };

    const instanceId = await ctx.db.insert("cardInstances", {
      templateId: args.templateId,
      customerId: args.customerId,
      accountId,
      serialNumber,
      applePassId,
      googleObjectId,
      customerData: {
        formData: args.formData,
        computed
      },
      distributionMethod: args.distributionMethod,
      installLinks,
      status: "generated",
      generatedBy: appUser._id,
    });

    // Log generation
    await ctx.db.insert("passGenerationLogs", {
      templateId: args.templateId,
      instanceId,
      accountId,
      operation: "generate",
      platform: "both",
      status: "success",
      details: {
        serialNumber,
        generationTime: Date.now(),
        distributionChannels: [args.distributionMethod]
      },
      triggeredBy: appUser._id,
    });

    return {
      instanceId,
      serialNumber,
      installLinks,
      message: "Card generated successfully"
    };
  },
});

// Get card instances for template
export const getCardInstances = query({
  args: {
    templateId: v.optional(v.id("cardTemplates")),
    customerId: v.optional(v.id("customers")),
    status: v.optional(v.union(v.literal("generated"), v.literal("distributed"), v.literal("installed"), v.literal("expired"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    let query = ctx.db.query("cardInstances").withIndex("by_account").filter((q: any) => q.eq(q.field("accountId"), accountId));

    if (args.templateId) {
      query = ctx.db.query("cardInstances").withIndex("by_template").filter((q: any) => q.eq(q.field("templateId"), args.templateId));
    }

    if (args.customerId) {
      query = ctx.db.query("cardInstances").withIndex("by_customer").filter((q: any) => q.eq(q.field("customerId"), args.customerId));
    }

    let instances = await query.order("desc").take(args.limit || 50);

    if (args.status) {
      instances = instances.filter(i => i.status === args.status);
    }

    // Enrich with customer and template data
    const enrichedInstances = await Promise.all(
      instances.map(async (instance) => {
        const customer = await ctx.db.get(instance.customerId);
        const template = await ctx.db.get(instance.templateId);
        
        return {
          ...instance,
          customer: customer ? {
            id: customer._id,
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email
          } : null,
          template: template ? {
            id: template._id,
            name: template.name,
            type: template.type
          } : null
        };
      })
    );

    return enrichedInstances;
  },
});

// Get card builder statistics
export const getCardBuilderStats = query({
  args: {},
  handler: async (ctx) => {
    const { accountId } = await getUserAccount(ctx);

    const templates = await ctx.db
      .query("cardTemplates")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    const instances = await ctx.db
      .query("cardInstances")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    const logs = await ctx.db
      .query("passGenerationLogs")
      .withIndex("by_account")
      .filter((q: any) => q.eq(q.field("accountId"), accountId))
      .collect();

    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.status === "active").length,
      totalInstances: instances.length,
      installedInstances: instances.filter(i => i.status === "installed").length,
      byType: {
        stamp: templates.filter(t => t.type === "stamp").length,
        points: templates.filter(t => t.type === "points").length,
        membership: templates.filter(t => t.type === "membership").length,
        coupon: templates.filter(t => t.type === "coupon").length,
      },
      recentActivity: logs.slice(-10).reverse()
    };
  },
});

// ========== TEMPLATE VALIDATION ==========

// Validate template before activation
export const validateTemplate = query({
  args: { templateId: v.id("cardTemplates") },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check required images
    const images = await ctx.db
      .query("cardTemplateImages")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const hasLogo = images.some(img => img.imageType === "logo");
    const hasIcon = images.some(img => img.imageType === "icon");

    if (!hasLogo) {
      issues.push("Logo image is required");
    }
    if (!hasIcon) {
      issues.push("Icon image is required");
    }

    // Check type-specific requirements
    if (template.type === "stamp") {
      const hasActiveStamp = images.some(img => img.imageType === "stamp_active");
      const hasInactiveStamp = images.some(img => img.imageType === "stamp_inactive");
      
      if (!hasActiveStamp) {
        warnings.push("Active stamp icon recommended for better visual experience");
      }
      if (!hasInactiveStamp) {
        warnings.push("Inactive stamp icon recommended for better visual experience");
      }

      if (!template.settings.stampSettings) {
        issues.push("Stamp settings must be configured");
      }
    }

    // Check form fields
    const fields = await ctx.db
      .query("cardTemplateFields")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    if (fields.length === 0) {
      warnings.push("No form fields configured - customers won't provide any information");
    }

    const hasEmail = fields.some(f => f.fieldType === "email");
    if (!hasEmail) {
      warnings.push("Email field recommended for card distribution");
    }

    // Check certificates for Apple
    if (!template.certificates) {
      warnings.push("Apple PassKit certificates not configured - Apple Wallet passes cannot be generated");
    }

    // Check Google settings
    if (!template.googleIssuerId || !template.googleClassId) {
      warnings.push("Google Wallet settings not configured - Google Wallet passes cannot be generated");
    }

    return {
      isValid: issues.length === 0,
      canActivate: issues.length === 0,
      issues,
      warnings,
      summary: {
        totalImages: images.length,
        totalFields: fields.length,
        hasAppleConfig: !!template.certificates,
        hasGoogleConfig: !!(template.googleIssuerId && template.googleClassId)
      }
    };
  },
});

// ========== UTILITY FUNCTIONS ==========

// Clone template
export const cloneTemplate = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    const originalTemplate = await ctx.db.get(args.templateId);
    if (!originalTemplate || originalTemplate.accountId !== accountId) {
      throw new Error("Template not found");
    }

    // Create new template
    const passTypeIdentifier = generatePassTypeIdentifier(accountId, originalTemplate.type);
    
    const { _id, _creationTime, activatedAt, createdBy, ...templateData } = originalTemplate;
    
    const newTemplateId = await ctx.db.insert("cardTemplates", {
      ...templateData,
      name: args.newName,
      status: "draft",
      passTypeIdentifier,
      createdBy: appUser._id,
    });

    // Clone images
    const images = await ctx.db
      .query("cardTemplateImages")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    for (const image of images) {
      const { _id, _creationTime, uploadedBy, ...imageData } = image;
      await ctx.db.insert("cardTemplateImages", {
        ...imageData,
        templateId: newTemplateId,
        uploadedBy: appUser._id,
      });
    }

    // Clone fields
    const fields = await ctx.db
      .query("cardTemplateFields")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    for (const field of fields) {
      const { _id, _creationTime, createdBy, ...fieldData } = field;
      await ctx.db.insert("cardTemplateFields", {
        ...fieldData,
        templateId: newTemplateId,
        createdBy: appUser._id,
      });
    }

    return {
      templateId: newTemplateId,
      message: `Template cloned as "${args.newName}"`
    };
  },
});

// Bulk generate cards for multiple customers
export const bulkGenerateCards = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    customerIds: v.array(v.id("customers")),
    distributionMethod: v.union(v.literal("email"), v.literal("sms"), v.literal("link"), v.literal("qr")),
    defaultFormData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { accountId, appUser } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    if (template.status !== "active") {
      throw new Error("Template must be active to generate cards");
    }

    const results = [];
    const errors = [];

    for (const customerId of args.customerIds) {
      try {
        const customer = await ctx.db.get(customerId);
        if (!customer || customer.accountId !== accountId) {
          errors.push({ customerId, error: "Customer not found" });
          continue;
        }

        // Generate unique serial number
        const serialNumber = generateSerialNumber();

        // Generate platform-specific IDs
        const applePassId = `${template.passTypeIdentifier}.${serialNumber}`;
        const googleObjectId = template.googleClassId ? `${template.googleIssuerId}.${serialNumber}` : undefined;

        // Compute dynamic values
        const computed: any = {};
        if (template.type === "points") {
          computed.balance = customer.pointsBalance;
        } else if (template.type === "stamp") {
          computed.balance = customer.stampsBalance;
        }

        // Generate install links
        const baseUrl = process.env.BASE_URL || "https://your-app.com";
        const installLinks = {
          apple: `${baseUrl}/api/passes/apple/${serialNumber}`,
          google: `${baseUrl}/api/passes/google/${serialNumber}`,
          universal: `${baseUrl}/install/${serialNumber}`
        };

        const instanceId = await ctx.db.insert("cardInstances", {
          templateId: args.templateId,
          customerId,
          accountId,
          serialNumber,
          applePassId,
          googleObjectId,
          customerData: {
            formData: args.defaultFormData || {},
            computed
          },
          distributionMethod: args.distributionMethod,
          installLinks,
          status: "generated",
          generatedBy: appUser._id,
        });

        results.push({
          customerId,
          instanceId,
          serialNumber,
          customerName: `${customer.firstName} ${customer.lastName}`
        });

      } catch (error: any) {
        errors.push({ customerId, error: error.message });
      }
    }

    // Log bulk generation
    await ctx.db.insert("passGenerationLogs", {
      templateId: args.templateId,
      accountId,
      operation: "generate",
      platform: "both",
      status: errors.length === 0 ? "success" : "error",
      details: {
        bulkGeneration: true,
        totalCards: args.customerIds.length,
        successfulCards: results.length,
        failedCards: errors.length,
        generationTime: Date.now()
      },
      error: errors.length > 0 ? `${errors.length} cards failed to generate` : undefined,
      triggeredBy: appUser._id,
    });

    return {
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Generated ${results.length} cards successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  },
});

// Get template analytics
export const getTemplateAnalytics = query({
  args: {
    templateId: v.id("cardTemplates"),
    timeframe: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("1y"))),
  },
  handler: async (ctx, args) => {
    const { accountId } = await getUserAccount(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.accountId !== accountId) {
      throw new Error("Template not found");
    }

    const timeframe = args.timeframe || "30d";
    const days = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365
    }[timeframe];

    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get instances in timeframe
    const instances = await ctx.db
      .query("cardInstances")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const recentInstances = instances.filter(i => i._creationTime >= startTime);

    // Get generation logs
    const logs = await ctx.db
      .query("passGenerationLogs")
      .withIndex("by_template")
      .filter((q: any) => q.eq(q.field("templateId"), args.templateId))
      .collect();

    const recentLogs = logs.filter(l => l._creationTime >= startTime);

    // Calculate metrics
    const totalGenerated = recentInstances.length;
    const totalInstalled = recentInstances.filter(i => i.status === "installed").length;
    const installRate = totalGenerated > 0 ? (totalInstalled / totalGenerated) * 100 : 0;

    // Group by distribution method
    const byDistribution = recentInstances.reduce((acc, instance) => {
      acc[instance.distributionMethod] = (acc[instance.distributionMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily breakdown
    const dailyBreakdown = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);
      
      const dayInstances = recentInstances.filter(i => 
        i._creationTime >= dayStart && i._creationTime <= dayEnd
      );

      dailyBreakdown.push({
        date: date.toISOString().split('T')[0],
        generated: dayInstances.length,
        installed: dayInstances.filter(i => i.status === "installed").length
      });
    }

    return {
      timeframe,
      summary: {
        totalGenerated,
        totalInstalled,
        installRate: Math.round(installRate * 100) / 100,
        totalErrors: recentLogs.filter(l => l.status === "error").length
      },
      distribution: byDistribution,
      daily: dailyBreakdown,
      recentActivity: recentLogs.slice(-20).reverse()
    };
  },
});

// Update card instance status (webhook handler)
export const updateInstanceStatus = mutation({
  args: {
    serialNumber: v.string(),
    status: v.union(v.literal("distributed"), v.literal("installed"), v.literal("expired")),
    deviceInfo: v.optional(v.object({
      platform: v.union(v.literal("ios"), v.literal("android")),
      userAgent: v.optional(v.string()),
      pushToken: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    // This would typically be called by webhooks from Apple/Google
    const instance = await ctx.db
      .query("cardInstances")
      .withIndex("by_serial")
      .filter((q: any) => q.eq(q.field("serialNumber"), args.serialNumber))
      .unique();

    if (!instance) {
      throw new Error("Card instance not found");
    }

    const updates: any = { 
      status: args.status,
      lastUpdated: Date.now()
    };

    if (args.status === "installed" && !instance.installedAt) {
      updates.installedAt = Date.now();
    }

    if (args.deviceInfo) {
      updates.deviceInfo = args.deviceInfo;
    }

    await ctx.db.patch(instance._id, updates);

    // Log status change
    await ctx.db.insert("passGenerationLogs", {
      templateId: instance.templateId,
      instanceId: instance._id,
      accountId: instance.accountId,
      operation: "update",
      platform: args.deviceInfo?.platform === "ios" ? "apple" : "google",
      status: "success",
      details: {
        serialNumber: args.serialNumber,
        statusChange: `${instance.status} -> ${args.status}`,
        generationTime: Date.now()
      },
      triggeredBy: instance.generatedBy,
    });

    return {
      message: `Card status updated to ${args.status}`
    };
  },
}); 