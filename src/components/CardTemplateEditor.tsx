import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CardTemplateEditorProps {
  templateId: string;
  onBack: () => void;
}

type TabType = "settings" | "design" | "fields" | "preview";

export function CardTemplateEditor({ templateId, onBack }: CardTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>("settings");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Queries
  const template = useQuery(api.cardBuilder.getCardTemplate, { 
    templateId: templateId as any 
  });

  // Mutations
  const updateTemplate = useMutation(api.cardBuilder.updateCardTemplate);

  if (!template) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
      </div>
    );
  }

  const handleSave = async (updates: any) => {
    try {
      await updateTemplate({
        templateId: templateId as any,
        updates
      });
      toast.success("Template updated successfully");
      setHasUnsavedChanges(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    }
  };

  const tabs = [
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "design", label: "Design", icon: "🎨" },
    { id: "fields", label: "Fields", icon: "📝" },
    { id: "preview", label: "Preview", icon: "👁️" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Card Builder</span>
            </button>
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <span className="text-sm">Unsaved changes</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm rounded-full ${
              template.status === "active" 
                ? "bg-green-100 text-green-800"
                : template.status === "draft"
                ? "bg-gray-100 text-gray-800"
                : "bg-red-100 text-red-800"
            }`}>
              {template.status.toUpperCase()}
            </span>
            <div className="text-sm text-gray-500">
              {template.type.charAt(0).toUpperCase() + template.type.slice(1)} Card
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          {template.description && (
            <p className="text-gray-600 mt-1">{template.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "settings" && (
          <SettingsTab 
            template={template} 
            onSave={handleSave}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "design" && (
          <DesignTab 
            template={template} 
            onSave={handleSave}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "fields" && (
          <FieldsTab 
            template={template} 
            onSave={handleSave}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "preview" && (
          <PreviewTab template={template} />
        )}
      </div>
    </div>
  );
}

// ========== SETTINGS TAB ==========
function SettingsTab({ template, onSave, onUnsavedChanges }: {
  template: any;
  onSave: (updates: any) => Promise<void>;
  onUnsavedChanges: (hasChanges: boolean) => void;
}) {
  const [settings, setSettings] = useState(template.settings || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(template.settings);
    onUnsavedChanges(hasChanges);
  }, [settings, template.settings, onUnsavedChanges]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ settings });
    setIsSaving(false);
  };

  const updateSettings = (path: string, value: any) => {
    const keys = path.split('.');
    const newSettings = { ...settings };
    let current = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  return (
    <div className="space-y-8">
      {/* Save Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {template.type.charAt(0).toUpperCase() + template.type.slice(1)} Card Settings
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Type-Specific Settings */}
        <div className="lg:col-span-2 space-y-6">
          {template.type === "stamp" && (
            <StampCardSettings 
              settings={settings} 
              onUpdate={updateSettings} 
            />
          )}
          {template.type === "points" && (
            <PointsCardSettings 
              settings={settings} 
              onUpdate={updateSettings} 
            />
          )}
          {template.type === "membership" && (
            <MembershipCardSettings 
              settings={settings} 
              onUpdate={updateSettings} 
            />
          )}
          {template.type === "coupon" && (
            <CouponCardSettings 
              settings={settings} 
              onUpdate={updateSettings} 
            />
          )}

          {/* Common Settings */}
          <CommonCardSettings 
            settings={settings} 
            onUpdate={updateSettings} 
          />
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <SettingsPreview template={template} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== STAMP CARD SETTINGS ==========
function StampCardSettings({ settings, onUpdate }: {
  settings: any;
  onUpdate: (path: string, value: any) => void;
}) {
  const stampSettings = settings.stampSettings || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stamp Collection</h3>
      
      <div className="space-y-4">
        {/* Stamp Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Stamps Required
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={stampSettings.stampCount || 10}
            onChange={(e) => onUpdate('stampSettings.stampCount', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">How many stamps needed for a reward</p>
        </div>

        {/* Reward Program */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reward Program Type
          </label>
          <select
            value={stampSettings.rewardProgram?.type || "visit"}
            onChange={(e) => onUpdate('stampSettings.rewardProgram.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="visit">One stamp per visit</option>
            <option value="purchase">One stamp per purchase</option>
            <option value="amount">Stamps based on amount spent</option>
          </select>
        </div>

        {/* Amount-based settings */}
        {stampSettings.rewardProgram?.type === "amount" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount per Stamp ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={stampSettings.rewardProgram?.amountPerStamp || 10}
              onChange={(e) => onUpdate('stampSettings.rewardProgram.amountPerStamp', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}

        {/* Visits per stamp */}
        {stampSettings.rewardProgram?.type === "visit" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visits per Stamp
            </label>
            <input
              type="number"
              min="1"
              value={stampSettings.rewardProgram?.visitsPerStamp || 1}
              onChange={(e) => onUpdate('stampSettings.rewardProgram.visitsPerStamp', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}

        {/* Stamp Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stamp Expiration
          </label>
          <select
            value={stampSettings.stampExpiration?.type || "unlimited"}
            onChange={(e) => onUpdate('stampSettings.stampExpiration.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="unlimited">Never expire</option>
            <option value="days">Expire after X days</option>
            <option value="monthly">Reset monthly</option>
            <option value="yearly">Reset yearly</option>
          </select>
        </div>

        {stampSettings.stampExpiration?.type === "days" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days until expiration
            </label>
            <input
              type="number"
              min="1"
              value={stampSettings.stampExpiration?.days || 30}
              onChange={(e) => onUpdate('stampSettings.stampExpiration.days', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}

        {/* Scanner Options */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={stampSettings.scannerRequireAmount || false}
              onChange={(e) => onUpdate('stampSettings.scannerRequireAmount', e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">Require purchase amount when scanning</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ========== POINTS CARD SETTINGS ==========
function PointsCardSettings({ settings, onUpdate }: {
  settings: any;
  onUpdate: (path: string, value: any) => void;
}) {
  const pointsSettings = settings.pointsSettings || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Program</h3>
      
      <div className="space-y-4">
        {/* Earn Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points Earn Rate
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={pointsSettings.pointsProgram?.earnRate || 1}
              onChange={(e) => onUpdate('pointsSettings.pointsProgram.earnRate', parseFloat(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
            <span className="text-sm text-gray-500">points per $1 spent</span>
          </div>
        </div>

        {/* Minimum Earn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Points per Transaction
          </label>
          <input
            type="number"
            min="0"
            value={pointsSettings.pointsProgram?.minimumEarn || 1}
            onChange={(e) => onUpdate('pointsSettings.pointsProgram.minimumEarn', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>

        {/* Rounding Rule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points Rounding
          </label>
          <select
            value={pointsSettings.pointsProgram?.roundingRule || "nearest"}
            onChange={(e) => onUpdate('pointsSettings.pointsProgram.roundingRule', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="down">Round down</option>
            <option value="up">Round up</option>
            <option value="nearest">Round to nearest</option>
          </select>
        </div>

        {/* Points Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points Expiration
          </label>
          <select
            value={pointsSettings.pointsExpiration?.type || "unlimited"}
            onChange={(e) => onUpdate('pointsSettings.pointsExpiration.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="unlimited">Never expire</option>
            <option value="days">Expire after X days</option>
            <option value="rolling">Rolling expiration</option>
          </select>
        </div>

        {pointsSettings.pointsExpiration?.type === "days" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days until expiration
            </label>
            <input
              type="number"
              min="1"
              value={pointsSettings.pointsExpiration?.days || 365}
              onChange={(e) => onUpdate('pointsSettings.pointsExpiration.days', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}

        {/* Tier Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tier System
          </label>
          <button className="text-blue-600 hover:text-blue-800 text-sm">
            + Add Tier
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== MEMBERSHIP CARD SETTINGS ==========
function MembershipCardSettings({ settings, onUpdate }: {
  settings: any;
  onUpdate: (path: string, value: any) => void;
}) {
  const membershipSettings = settings.membershipSettings || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Membership Program</h3>
      
      <div className="space-y-4">
        {/* Member Number Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Number Format
          </label>
          <input
            type="text"
            value={membershipSettings.memberNumber?.format || "MEM-{YYYY}-{00000}"}
            onChange={(e) => onUpdate('membershipSettings.memberNumber.format', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use {`{YYYY}`} for year, {`{00000}`} for number with padding
          </p>
        </div>

        {/* Starting Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Starting Member Number
          </label>
          <input
            type="number"
            min="1"
            value={membershipSettings.memberNumber?.startingNumber || 1}
            onChange={(e) => onUpdate('membershipSettings.memberNumber.startingNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>

        {/* Membership Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Membership Duration
          </label>
          <select
            value={membershipSettings.membershipDuration?.type || "unlimited"}
            onChange={(e) => onUpdate('membershipSettings.membershipDuration.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="unlimited">Lifetime membership</option>
            <option value="yearly">Annual renewal</option>
            <option value="monthly">Monthly renewal</option>
            <option value="custom">Custom duration</option>
          </select>
        </div>

        {/* Renewal Required */}
        {membershipSettings.membershipDuration?.type !== "unlimited" && (
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={membershipSettings.membershipDuration?.renewalRequired || false}
                onChange={(e) => onUpdate('membershipSettings.membershipDuration.renewalRequired', e.target.checked)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Require active renewal</span>
            </label>
          </div>
        )}

        {/* Tier System */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Membership Tiers
          </label>
          <div className="space-y-2">
            {(membershipSettings.membershipType?.tiers || []).map((tier: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{tier.name}</div>
                  <div className="text-sm text-gray-500">
                    {tier.benefits?.length || 0} benefits
                  </div>
                </div>
                <button className="text-red-600 hover:text-red-800">Remove</button>
              </div>
            ))}
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              + Add Tier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== COUPON CARD SETTINGS ==========
function CouponCardSettings({ settings, onUpdate }: {
  settings: any;
  onUpdate: (path: string, value: any) => void;
}) {
  const couponSettings = settings.couponSettings || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Coupon Settings</h3>
      
      <div className="space-y-4">
        {/* Coupon Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Type
          </label>
          <select
            value={couponSettings.couponType || "percentage"}
            onChange={(e) => onUpdate('couponSettings.couponType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="percentage">Percentage discount</option>
            <option value="fixed">Fixed amount discount</option>
            <option value="bogo">Buy one get one</option>
            <option value="freeItem">Free item</option>
          </select>
        </div>

        {/* Discount Value */}
        {(couponSettings.couponType === "percentage" || couponSettings.couponType === "fixed") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                step={couponSettings.couponType === "percentage" ? "1" : "0.01"}
                value={couponSettings.discountValue || 10}
                onChange={(e) => onUpdate('couponSettings.discountValue', parseFloat(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
              <span className="text-sm text-gray-500">
                {couponSettings.couponType === "percentage" ? "%" : "$"}
              </span>
            </div>
          </div>
        )}

        {/* Validity Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Validity Period
          </label>
          <select
            value={couponSettings.validityPeriod?.type || "daysFromIssue"}
            onChange={(e) => onUpdate('couponSettings.validityPeriod.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="daysFromIssue">Days from issue</option>
            <option value="specificDate">Until specific date</option>
            <option value="unlimited">No expiration</option>
          </select>
        </div>

        {couponSettings.validityPeriod?.type === "daysFromIssue" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid for (days)
            </label>
            <input
              type="number"
              min="1"
              value={couponSettings.validityPeriod?.daysFromIssue || 30}
              onChange={(e) => onUpdate('couponSettings.validityPeriod.daysFromIssue', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}

        {/* Minimum Purchase */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Purchase Amount ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={couponSettings.minimumPurchase || 0}
            onChange={(e) => onUpdate('couponSettings.minimumPurchase', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">Leave 0 for no minimum</p>
        </div>

        {/* Usage Limits */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={couponSettings.singleUse || false}
              onChange={(e) => onUpdate('couponSettings.singleUse', e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">Single use only</span>
          </label>
        </div>

        {/* Stackable */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={couponSettings.stackable || false}
              onChange={(e) => onUpdate('couponSettings.stackable', e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">Can be combined with other offers</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ========== COMMON SETTINGS ==========
function CommonCardSettings({ settings, onUpdate }: {
  settings: any;
  onUpdate: (path: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Barcode Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Barcode & Scanning</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Type
            </label>
            <select
              value={settings.barcodeType || "QR"}
              onChange={(e) => onUpdate('barcodeType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="QR">QR Code</option>
              <option value="PDF417">PDF417</option>
              <option value="Code128">Code 128</option>
            </select>
          </div>
        </div>
      </div>

      {/* Apple Wallet Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Apple Wallet</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={settings.apple?.organizationName || ""}
              onChange={(e) => onUpdate('apple.organizationName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pass Description
            </label>
            <input
              type="text"
              value={settings.apple?.description || ""}
              onChange={(e) => onUpdate('apple.description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Loyalty card description"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.apple?.allowLocationUpdates || false}
                onChange={(e) => onUpdate('apple.allowLocationUpdates', e.target.checked)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Allow location-based updates</span>
            </label>
          </div>
        </div>
      </div>

      {/* Google Wallet Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Wallet</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issuer Name
            </label>
            <input
              type="text"
              value={settings.google?.issuerName || ""}
              onChange={(e) => onUpdate('google.issuerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Name
            </label>
            <input
              type="text"
              value={settings.google?.programName || ""}
              onChange={(e) => onUpdate('google.programName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Loyalty Program Name"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== SETTINGS PREVIEW ==========
function SettingsPreview({ template, settings }: {
  template: any;
  settings: any;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings Preview</h3>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-full max-w-40 mx-auto">
            <div className="aspect-[157/99] bg-black rounded-lg p-1">
              <div className="w-full h-full bg-white rounded-md overflow-hidden">
                <CardPreviewMini type={template.type} settings={settings} />
              </div>
            </div>
          </div>
        </div>

        {/* Settings Summary */}
        <div className="space-y-2 text-sm">
          {template.type === "stamp" && settings.stampSettings && (
            <div>
              <div className="font-medium">Stamps: {settings.stampSettings.stampCount || 10}</div>
              <div className="text-gray-600">
                {settings.stampSettings.rewardProgram?.type || "visit"} based
              </div>
            </div>
          )}
          
          {template.type === "points" && settings.pointsSettings && (
            <div>
              <div className="font-medium">
                Rate: {settings.pointsSettings.pointsProgram?.earnRate || 1} pts/$1
              </div>
              <div className="text-gray-600">
                Min: {settings.pointsSettings.pointsProgram?.minimumEarn || 1} points
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200">
            <div className="text-gray-600">Barcode: {settings.barcodeType || "QR"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardPreviewMini({ type, settings }: { type: string; settings: any }) {
  // Mini versions of card previews with settings applied
  if (type === "stamp") {
    const stampCount = settings.stampSettings?.stampCount || 10;
    return (
      <div className="p-2 h-full flex flex-col">
        <div className="text-xs font-semibold mb-1">Coffee Shop</div>
        <div className="flex-1 flex flex-col justify-center">
          <div className={`grid gap-0.5 mb-1 ${stampCount <= 10 ? 'grid-cols-5' : 'grid-cols-6'}`}>
            {Array.from({ length: stampCount }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < Math.floor(stampCount * 0.7) ? 'bg-yellow-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-center text-gray-600">
            {Math.floor(stampCount * 0.7)} of {stampCount}
          </div>
        </div>
      </div>
    );
  }
  
  // Default preview for other types
  return (
    <div className="p-2 h-full flex items-center justify-center text-xs text-gray-500">
      {type} preview
    </div>
  );
}

// ========== IMAGE SECTION ==========
function ImageSection({ design, onUpdateDesign, onImageUpload, onRemoveImage, uploadingImage }: {
  design: any;
  onUpdateDesign: (path: string, value: any) => void;
  onImageUpload: (imageType: string, file: File) => void;
  onRemoveImage: (imageType: string) => void;
  uploadingImage: string | null;
}) {
  const images = design.images || {};

  const handleFileSelect = (imageType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(imageType, file);
    }
  };

  const imageTypes = [
    { 
      key: 'logo', 
      label: 'Logo', 
      description: 'Business logo (recommended: 300x300px)',
      accepts: '.png,.jpg,.jpeg,.svg'
    },
    { 
      key: 'icon', 
      label: 'Icon', 
      description: 'Small icon for wallet (recommended: 60x60px)',
      accepts: '.png,.jpg,.jpeg'
    },
    { 
      key: 'strip', 
      label: 'Strip Image', 
      description: 'Background strip (recommended: 640x320px)',
      accepts: '.png,.jpg,.jpeg'
    },
    { 
      key: 'thumbnail', 
      label: 'Thumbnail', 
      description: 'Card thumbnail (recommended: 180x220px)',
      accepts: '.png,.jpg,.jpeg'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Images & Logo</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {imageTypes.map((imageType) => (
          <div key={imageType.key} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {imageType.label}
              </label>
              <p className="text-xs text-gray-500">{imageType.description}</p>
            </div>

            {/* Image Preview */}
            {images[imageType.key] ? (
              <div className="relative">
                <img
                  src={images[imageType.key].url}
                  alt={imageType.label}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => onRemoveImage(imageType.key)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                  title="Remove image"
                >
                  ×
                </button>
                <div className="mt-2 text-xs text-gray-500">
                  {images[imageType.key].filename}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <div className="text-gray-400 mb-2">📷</div>
                <div className="text-sm text-gray-600 mb-2">Click to upload {imageType.label.toLowerCase()}</div>
                <div className="text-xs text-gray-500">PNG, JPG up to 5MB</div>
              </div>
            )}

            {/* Upload Input */}
            <input
              type="file"
              accept={imageType.accepts}
              onChange={(e) => handleFileSelect(imageType.key, e)}
              className="hidden"
              id={`upload-${imageType.key}`}
              disabled={uploadingImage === imageType.key}
            />
            <label
              htmlFor={`upload-${imageType.key}`}
              className={`block w-full text-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                uploadingImage === imageType.key ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadingImage === imageType.key ? 'Uploading...' : 
               images[imageType.key] ? 'Replace Image' : 'Upload Image'}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== COLOR SECTION ==========
function ColorSection({ design, onUpdateDesign }: {
  design: any;
  onUpdateDesign: (path: string, value: any) => void;
}) {
  const colors = design.colors || {};

  const colorPresets = [
    { name: 'Classic Blue', primary: '#007AFF', background: '#FFFFFF', text: '#000000', label: '#8E8E93' },
    { name: 'Forest Green', primary: '#34C759', background: '#FFFFFF', text: '#000000', label: '#8E8E93' },
    { name: 'Sunset Orange', primary: '#FF9500', background: '#FFFFFF', text: '#000000', label: '#8E8E93' },
    { name: 'Royal Purple', primary: '#AF52DE', background: '#FFFFFF', text: '#000000', label: '#8E8E93' },
    { name: 'Cherry Red', primary: '#FF3B30', background: '#FFFFFF', text: '#FFFFFF', label: '#FFFFFF' },
    { name: 'Dark Mode', primary: '#0A84FF', background: '#1C1C1E', text: '#FFFFFF', label: '#8E8E93' },
  ];

  const applyColorPreset = (preset: any) => {
    onUpdateDesign('colors', {
      primary: preset.primary,
      background: preset.background,
      text: preset.text,
      label: preset.label
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h3>
      
      {/* Color Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyColorPreset(preset)}
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex space-x-1">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: preset.primary }}
                ></div>
                <div 
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: preset.background }}
                ></div>
              </div>
              <span className="text-sm text-gray-700">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.primary || '#007AFF'}
                onChange={(e) => onUpdateDesign('colors.primary', e.target.value)}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colors.primary || '#007AFF'}
                onChange={(e) => onUpdateDesign('colors.primary', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="#007AFF"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.background || '#FFFFFF'}
                onChange={(e) => onUpdateDesign('colors.background', e.target.value)}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colors.background || '#FFFFFF'}
                onChange={(e) => onUpdateDesign('colors.background', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.text || '#000000'}
                onChange={(e) => onUpdateDesign('colors.text', e.target.value)}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colors.text || '#000000'}
                onChange={(e) => onUpdateDesign('colors.text', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="#000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.label || '#8E8E93'}
                onChange={(e) => onUpdateDesign('colors.label', e.target.value)}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colors.label || '#8E8E93'}
                onChange={(e) => onUpdateDesign('colors.label', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="#8E8E93"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== BACKGROUND SECTION ==========
function BackgroundSection({ design, onUpdateDesign }: {
  design: any;
  onUpdateDesign: (path: string, value: any) => void;
}) {
  const background = design.background || {};

  const gradientPresets = [
    { name: 'None', type: 'solid', color: '#FFFFFF' },
    { name: 'Ocean Blue', type: 'gradient', from: '#667eea', to: '#764ba2' },
    { name: 'Sunset', type: 'gradient', from: '#f093fb', to: '#f5576c' },
    { name: 'Forest', type: 'gradient', from: '#4facfe', to: '#00f2fe' },
    { name: 'Royal', type: 'gradient', from: '#a8edea', to: '#fed6e3' },
    { name: 'Fire', type: 'gradient', from: '#ff9a9e', to: '#fecfef' },
  ];

  const patternOptions = [
    { name: 'None', value: 'none' },
    { name: 'Dots', value: 'dots' },
    { name: 'Lines', value: 'lines' },
    { name: 'Grid', value: 'grid' },
    { name: 'Waves', value: 'waves' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Background & Patterns</h3>
      
      {/* Background Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Background Style</label>
        <div className="grid grid-cols-3 gap-3">
          {gradientPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                if (preset.type === 'solid') {
                  onUpdateDesign('background', { type: 'solid', color: preset.color });
                } else {
                  onUpdateDesign('background', { 
                    type: 'gradient', 
                    from: preset.from, 
                    to: preset.to,
                    direction: 'to bottom right'
                  });
                }
              }}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div 
                className="w-full h-12 rounded-lg mb-2 border border-gray-200"
                style={{
                  background: preset.type === 'solid' 
                    ? preset.color 
                    : `linear-gradient(to bottom right, ${preset.from}, ${preset.to})`
                }}
              ></div>
              <div className="text-xs text-gray-700">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Gradient */}
      {background.type === 'gradient' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3">Custom Gradient</label>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From Color</label>
              <input
                type="color"
                value={background.from || '#667eea'}
                onChange={(e) => onUpdateDesign('background.from', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To Color</label>
              <input
                type="color"
                value={background.to || '#764ba2'}
                onChange={(e) => onUpdateDesign('background.to', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Direction</label>
            <select
              value={background.direction || 'to bottom right'}
              onChange={(e) => onUpdateDesign('background.direction', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="to bottom">Top to Bottom</option>
              <option value="to right">Left to Right</option>
              <option value="to bottom right">Diagonal ↘</option>
              <option value="to bottom left">Diagonal ↙</option>
            </select>
          </div>
        </div>
      )}

      {/* Pattern Overlay */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Pattern Overlay</label>
        <div className="grid grid-cols-5 gap-3">
          {patternOptions.map((pattern) => (
            <button
              key={pattern.value}
              onClick={() => onUpdateDesign('background.pattern', pattern.value)}
              className={`p-3 border-2 rounded-lg transition-colors ${
                background.pattern === pattern.value
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-full h-8 rounded border border-gray-300 ${getPatternClass(pattern.value)}`}></div>
              <div className="text-xs text-gray-700 mt-2">{pattern.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPatternClass(pattern: string): string {
  switch (pattern) {
    case 'dots':
      return 'bg-dots';
    case 'lines':
      return 'bg-lines';
    case 'grid':
      return 'bg-grid';
    case 'waves':
      return 'bg-waves';
    default:
      return 'bg-gray-50';
  }
}

// ========== LAYOUT SECTION ==========
function LayoutSection({ design, onUpdateDesign, cardType }: {
  design: any;
  onUpdateDesign: (path: string, value: any) => void;
  cardType: string;
}) {
  const layout = design.layout || {};
  const branding = design.branding || {};

  const layoutOptions = [
    { value: 'standard', label: 'Standard', description: 'Classic wallet layout' },
    { value: 'compact', label: 'Compact', description: 'Minimal space usage' },
    { value: 'detailed', label: 'Detailed', description: 'Maximum information' },
  ];

  const fontOptions = [
    { value: 'system', label: 'System Default' },
    { value: 'helvetica', label: 'Helvetica' },
    { value: 'arial', label: 'Arial' },
    { value: 'times', label: 'Times New Roman' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout & Typography</h3>
      
      {/* Business Information */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Business Information</label>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Organization Name</label>
            <input
              type="text"
              value={branding.organizationName || ''}
              onChange={(e) => onUpdateDesign('branding.organizationName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Your Business Name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Card Description</label>
            <input
              type="text"
              value={branding.description || ''}
              onChange={(e) => onUpdateDesign('branding.description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Loyalty card description"
            />
          </div>
        </div>
      </div>

      {/* Layout Style */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Layout Style</label>
        <div className="space-y-3">
          {layoutOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                layout.style === option.value
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={layout.style === option.value}
                onChange={(e) => onUpdateDesign('layout.style', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Typography</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Font Family</label>
            <select
              value={layout.fontFamily || 'system'}
              onChange={(e) => onUpdateDesign('layout.fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              {fontOptions.map((font) => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Text Size</label>
            <select
              value={layout.fontSize || 'medium'}
              onChange={(e) => onUpdateDesign('layout.fontSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card-Specific Layout */}
      {cardType === 'stamp' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Stamp Layout</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Stamp Arrangement</label>
              <select
                value={layout.stampArrangement || 'grid'}
                onChange={(e) => onUpdateDesign('layout.stampArrangement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="grid">Grid Layout</option>
                <option value="circle">Circular Layout</option>
                <option value="linear">Linear Layout</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Stamp Style</label>
              <select
                value={layout.stampStyle || 'filled'}
                onChange={(e) => onUpdateDesign('layout.stampStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="filled">Filled</option>
                <option value="outlined">Outlined</option>
                <option value="emoji">Emoji</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== DESIGN PREVIEW ==========
function DesignPreview({ template, design }: {
  template: any;
  design: any;
}) {
  const colors = design.colors || {};
  const background = design.background || {};
  const images = design.images || {};
  const branding = design.branding || {};

  const getBackgroundStyle = () => {
    if (background.type === 'gradient') {
      return {
        background: `linear-gradient(${background.direction || 'to bottom right'}, ${background.from || '#667eea'}, ${background.to || '#764ba2'})`
      };
    }
    return {
      backgroundColor: background.color || colors.background || '#FFFFFF'
    };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
      
      {/* Phone Mockup */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-48 h-80 bg-black rounded-3xl p-2">
            <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
              <div 
                className="w-full h-full p-4 flex flex-col"
                style={{
                  ...getBackgroundStyle(),
                  color: colors.text || '#000000'
                }}
              >
                {/* Logo */}
                {images.logo && (
                  <div className="flex justify-center mb-3">
                    <img
                      src={images.logo.url}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                )}

                {/* Business Name */}
                <div 
                  className="text-center font-semibold mb-2"
                  style={{ 
                    color: colors.text || '#000000',
                    fontSize: '14px'
                  }}
                >
                  {branding.organizationName || template.name}
                </div>

                {/* Card Type Specific Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <DesignPreviewContent 
                    type={template.type} 
                    colors={colors} 
                    design={design}
                  />
                </div>

                {/* Description */}
                {branding.description && (
                  <div 
                    className="text-center text-xs mt-2"
                    style={{ color: colors.label || '#8E8E93' }}
                  >
                    {branding.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Design Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Primary Color:</span>
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: colors.primary || '#007AFF' }}
            ></div>
            <span className="font-mono text-xs">{colors.primary || '#007AFF'}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Background:</span>
          <span className="text-xs">
            {background.type === 'gradient' ? 'Gradient' : 'Solid Color'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Images:</span>
          <span className="text-xs">
            {Object.keys(images).length} uploaded
          </span>
        </div>
      </div>
    </div>
  );
}

function DesignPreviewContent({ type, colors, design }: { 
  type: string; 
  colors: any;
  design: any;
}) {
  const layout = design.layout || {};

  switch (type) {
    case 'stamp':
      const stampCount = design.settings?.stampSettings?.stampCount || 10;
      const arrangement = layout.stampArrangement || 'grid';
      
      return (
        <div className="flex flex-col items-center">
          <div className={`${arrangement === 'grid' ? 'grid grid-cols-5 gap-1' : 'flex flex-wrap justify-center gap-1'} mb-2`}>
            {Array.from({ length: Math.min(stampCount, 10) }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border flex items-center justify-center`}
                style={{
                  backgroundColor: i < 7 ? (colors.primary || '#007AFF') : 'transparent',
                  borderColor: colors.primary || '#007AFF'
                }}
              >
                {i < 7 && layout.stampStyle === 'emoji' && <span className="text-xs">⭐</span>}
              </div>
            ))}
          </div>
          <div className="text-xs text-center" style={{ color: colors.label || '#8E8E93' }}>
            7 of {stampCount} stamps
          </div>
        </div>
      );

    case 'points':
      return (
        <div className="text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: colors.primary || '#007AFF' }}>
            1,250
          </div>
          <div className="text-xs mb-2" style={{ color: colors.label || '#8E8E93' }}>
            Points Available
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
            <div 
              className="h-1 rounded-full" 
              style={{ 
                backgroundColor: colors.primary || '#007AFF',
                width: '75%'
              }}
            ></div>
          </div>
          <div className="text-xs" style={{ color: colors.label || '#8E8E93' }}>
            Gold Member
          </div>
        </div>
      );

    case 'membership':
      return (
        <div className="text-center">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: colors.primary || '#007AFF' }}
          >
            <span className="text-white text-xs">👑</span>
          </div>
          <div className="text-xs font-semibold mb-1" style={{ color: colors.text || '#000000' }}>
            GOLD MEMBER
          </div>
          <div className="text-xs mb-1" style={{ color: colors.label || '#8E8E93' }}>
            #MEM-2024-00123
          </div>
          <div className="text-xs" style={{ color: colors.label || '#8E8E93' }}>
            Member since 2024
          </div>
        </div>
      );

    case 'coupon':
      return (
        <div className="text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: colors.primary || '#007AFF' }}>
            20%
          </div>
          <div className="text-xs mb-2" style={{ color: colors.label || '#8E8E93' }}>
            OFF
          </div>
          <div 
            className="text-xs px-2 py-1 rounded mb-2 inline-block"
            style={{ 
              backgroundColor: colors.primary + '20' || '#007AFF20',
              color: colors.primary || '#007AFF'
            }}
          >
            Next Purchase
          </div>
          <div className="text-xs" style={{ color: colors.label || '#8E8E93' }}>
            Valid until Dec 31
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center text-xs" style={{ color: colors.label || '#8E8E93' }}>
          {type} preview
        </div>
      );
  }
}

// ========== DESIGN TAB ==========
function DesignTab({ template, onSave, onUnsavedChanges }: {
  template: any;
  onSave: (updates: any) => Promise<void>;
  onUnsavedChanges: (hasChanges: boolean) => void;
}) {
  const [design, setDesign] = useState(template.design || {});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Mutations
  const uploadImage = useMutation(api.cardBuilder.uploadTemplateImage);
  const removeImage = useMutation(api.cardBuilder.removeTemplateImage);

  useEffect(() => {
    const hasChanges = JSON.stringify(design) !== JSON.stringify(template.design);
    onUnsavedChanges(hasChanges);
  }, [design, template.design, onUnsavedChanges]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ design });
    setIsSaving(false);
  };

  const updateDesign = (path: string, value: any) => {
    const keys = path.split('.');
    const newDesign = { ...design };
    let current = newDesign;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setDesign(newDesign);
  };

  const handleImageUpload = async (imageType: string, file: File) => {
    if (!file) return;
    
    setUploadingImage(imageType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Create a mock upload - in real implementation, you'd upload to your storage service
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result as string;
        updateDesign(`images.${imageType}`, {
          url: imageUrl,
          filename: file.name,
          size: file.size
        });
        setUploadingImage(null);
        toast.success(`${imageType} uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setUploadingImage(null);
      toast.error(error.message || "Failed to upload image");
    }
  };

  const handleRemoveImage = async (imageType: string) => {
    try {
      updateDesign(`images.${imageType}`, null);
      toast.success("Image removed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove image");
    }
  };

  return (
    <div className="space-y-8">
      {/* Save Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Visual Design</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Design"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Design Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo & Images */}
          <ImageSection
            design={design}
            onUpdateDesign={updateDesign}
            onImageUpload={handleImageUpload}
            onRemoveImage={handleRemoveImage}
            uploadingImage={uploadingImage}
          />

          {/* Brand Colors */}
          <ColorSection
            design={design}
            onUpdateDesign={updateDesign}
          />

          {/* Background & Patterns */}
          <BackgroundSection
            design={design}
            onUpdateDesign={updateDesign}
          />

          {/* Layout & Typography */}
          <LayoutSection
            design={design}
            onUpdateDesign={updateDesign}
            cardType={template.type}
          />
        </div>

        {/* Design Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <DesignPreview template={template} design={design} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== FIELD LIST ITEM ==========
function FieldListItem({ field, index, onEdit, onRemove, onDragStart, onDragOver, onDrop, isDragging }: {
  field: any;
  index: number;
  onEdit: (field: any) => void;
  onRemove: (fieldId: string, fieldName: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
}) {
  const fieldTypeIcons = {
    text: "📝",
    email: "📧",
    phone: "📞",
    date: "📅",
    number: "#️⃣",
    select: "📋",
    boolean: "☑️"
  };

  const fieldTypeLabels = {
    text: "Text",
    email: "Email",
    phone: "Phone",
    date: "Date",
    number: "Number",
    select: "Select",
    boolean: "Checkbox"
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="text-lg">{fieldTypeIcons[field.fieldType as keyof typeof fieldTypeIcons]}</div>
          <div className="text-xs">⋮⋮</div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-1">
            <span className="font-medium text-gray-900">{field.label}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              {fieldTypeLabels[field.fieldType as keyof typeof fieldTypeLabels]}
            </span>
            {field.required && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                Required
              </span>
            )}
            {field.unique && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                Unique
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Field name: {field.fieldName}
            {field.placeholder && ` • Placeholder: ${field.placeholder}`}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onEdit(field)}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          title="Edit field"
        >
          ✏️
        </button>
        <button
          onClick={() => onRemove(field._id, field.label)}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove field"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ========== FIELD VALIDATION SECTION ==========
function FieldValidationSection({ fields }: { fields: any[] }) {
  const validationRules = fields.filter(f => f.validation || f.required || f.unique);

  if (validationRules.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Rules</h3>
      
      <div className="space-y-3">
        {validationRules.map((field) => (
          <div key={field._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{field.label}</div>
              <div className="text-sm text-gray-600 space-x-2">
                {field.required && <span className="text-red-600">• Required</span>}
                {field.unique && <span className="text-blue-600">• Unique</span>}
                {field.validation?.minLength && (
                  <span className="text-gray-600">• Min: {field.validation.minLength} chars</span>
                )}
                {field.validation?.maxLength && (
                  <span className="text-gray-600">• Max: {field.validation.maxLength} chars</span>
                )}
                {field.validation?.pattern && (
                  <span className="text-gray-600">• Pattern validation</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== PASSKIT MAPPING SECTION ==========
function PassKitMappingSection({ fields, template }: { fields: any[]; template: any }) {
  const appleWalletFields = [
    { key: 'primaryField', label: 'Primary Field', description: 'Main field shown prominently' },
    { key: 'secondaryField', label: 'Secondary Field', description: 'Additional information' },
    { key: 'auxiliaryField', label: 'Auxiliary Field', description: 'Supporting details' },
    { key: 'backField', label: 'Back Field', description: 'Information on card back' },
  ];

  const googleWalletFields = [
    { key: 'title', label: 'Title', description: 'Card title' },
    { key: 'subtitle', label: 'Subtitle', description: 'Card subtitle' },
    { key: 'description', label: 'Description', description: 'Card description' },
    { key: 'details', label: 'Details', description: 'Additional details' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Integration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apple Wallet */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <span>🍎</span>
            <span>Apple Wallet</span>
          </h4>
          <div className="space-y-3">
            {appleWalletFields.map((walletField) => (
              <div key={walletField.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {walletField.label}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  defaultValue=""
                >
                  <option value="">Select field</option>
                  {fields.map((field) => (
                    <option key={field._id} value={field.fieldName}>
                      {field.label} ({field.fieldType})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{walletField.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Google Wallet */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <span>📱</span>
            <span>Google Wallet</span>
          </h4>
          <div className="space-y-3">
            {googleWalletFields.map((walletField) => (
              <div key={walletField.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {walletField.label}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  defaultValue=""
                >
                  <option value="">Select field</option>
                  {fields.map((field) => (
                    <option key={field._id} value={field.fieldName}>
                      {field.label} ({field.fieldType})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{walletField.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">Add custom fields to configure wallet integration</div>
        </div>
      )}
    </div>
  );
}

// ========== FORM PREVIEW ==========
function FormPreview({ fields, cardType }: { fields: any[]; cardType: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Preview</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          How the form will look during card generation:
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card Information
            </h4>
            <p className="text-sm text-gray-600">
              Fill out the form below to generate your loyalty card
            </p>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-sm">No custom fields added</div>
              <div className="text-xs mt-1">Add fields to see form preview</div>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => (
                <FormFieldPreview key={field._id} field={field} />
              ))}
              
              <div className="pt-4 border-t border-gray-300">
                <button
                  disabled
                  className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                >
                  Generate {cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card
                </button>
              </div>
            </div>
          )}
        </div>

        {fields.length > 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>• {fields.filter(f => f.required).length} required fields</div>
            <div>• {fields.filter(f => f.unique).length} unique fields</div>
            <div>• {fields.length} total fields</div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormFieldPreview({ field }: { field: any }) {
  const renderField = () => {
    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.fieldType}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled
          />
        );
      
      case 'select':
        return (
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" disabled>
            <option>Select an option</option>
            {field.validation?.options?.map((option: string, index: number) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-gray-900"
              disabled
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled
          />
        );
    }
  };

  return (
    <div>
      {field.fieldType !== 'boolean' && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderField()}
    </div>
  );
}

// ========== ADD FIELD MODAL ==========
function AddFieldModal({ onClose, onSubmit, existingFields }: {
  onClose: () => void;
  onSubmit: (fieldData: any) => void;
  existingFields: any[];
}) {
  const [fieldType, setFieldType] = useState<string>('text');
  const [fieldName, setFieldName] = useState('');
  const [label, setLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [validation, setValidation] = useState<any>({});

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: '📝', description: 'Single line text input' },
    { value: 'email', label: 'Email', icon: '📧', description: 'Email address validation' },
    { value: 'phone', label: 'Phone', icon: '📞', description: 'Phone number input' },
    { value: 'date', label: 'Date', icon: '📅', description: 'Date picker' },
    { value: 'number', label: 'Number', icon: '#️⃣', description: 'Numeric input' },
    { value: 'select', label: 'Select', icon: '📋', description: 'Dropdown menu' },
    { value: 'boolean', label: 'Checkbox', icon: '☑️', description: 'True/false checkbox' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fieldName || !label) {
      toast.error("Field name and label are required");
      return;
    }

    // Check for duplicate field names
    if (existingFields.some(f => f.fieldName === fieldName)) {
      toast.error("Field name already exists");
      return;
    }

    const fieldData = {
      fieldType,
      fieldName,
      label,
      placeholder: placeholder || undefined,
      required,
      unique,
      validation: Object.keys(validation).length > 0 ? validation : undefined,
      passMapping: { apple: undefined, google: undefined }
    };

    onSubmit(fieldData);
  };

  const generateFieldName = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  useEffect(() => {
    if (label && !fieldName) {
      setFieldName(generateFieldName(label));
    }
  }, [label, fieldName]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Custom Field</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Field Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Field Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {fieldTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    fieldType === type.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={type.value}
                    checked={fieldType === type.value}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium text-gray-900 text-center">{type.label}</div>
                  <div className="text-xs text-gray-500 text-center mt-1">{type.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Basic Field Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Label *</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="Customer Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Field Name *</label>
              <input
                type="text"
                required
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="customer_name"
              />
              <p className="text-xs text-gray-500 mt-1">Used for data storage (no spaces)</p>
            </div>
          </div>

          {/* Placeholder */}
          {fieldType !== 'boolean' && fieldType !== 'date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Placeholder Text</label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="Enter your name"
              />
            </div>
          )}

          {/* Validation Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Validation</label>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
              
              {(fieldType === 'text' || fieldType === 'email') && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(e) => setUnique(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">Unique value (no duplicates)</span>
                </label>
              )}
            </div>
          </div>

          {/* Type-specific validation */}
          {fieldType === 'text' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Length</label>
                <input
                  type="number"
                  min="0"
                  value={validation.minLength || ''}
                  onChange={(e) => setValidation({...validation, minLength: parseInt(e.target.value) || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Length</label>
                <input
                  type="number"
                  min="1"
                  value={validation.maxLength || ''}
                  onChange={(e) => setValidation({...validation, maxLength: parseInt(e.target.value) || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          )}

          {fieldType === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options (one per line)</label>
              <textarea
                value={validation.options?.join('\n') || ''}
                onChange={(e) => setValidation({...validation, options: e.target.value.split('\n').filter(opt => opt.trim())})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                rows={4}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== EDIT FIELD MODAL ==========
function EditFieldModal({ field, onClose, onSubmit }: {
  field: any;
  onClose: () => void;
  onSubmit: (updates: any) => void;
}) {
  // Similar to AddFieldModal but pre-filled with existing field data
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit Field</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center text-gray-500">
            Field editing functionality will be implemented in the next iteration
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== FIELDS TAB ==========
function FieldsTab({ template, onSave, onUnsavedChanges }: {
  template: any;
  onSave: (updates: any) => Promise<void>;
  onUnsavedChanges: (hasChanges: boolean) => void;
}) {
  const [fields, setFields] = useState(template.fields || []);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [draggedField, setDraggedField] = useState<number | null>(null);

  // Mutations
  const addField = useMutation(api.cardBuilder.addTemplateField);
  const updateFieldOrder = useMutation(api.cardBuilder.updateFieldOrder);
  const removeField = useMutation(api.cardBuilder.removeTemplateField);

  useEffect(() => {
    setFields(template.fields || []);
  }, [template.fields]);

  const handleAddField = async (fieldData: any) => {
    try {
      await addField({
        templateId: template._id,
        ...fieldData
      });
      setShowAddFieldModal(false);
      // Refetch template data would happen automatically via Convex reactivity
      toast.success("Field added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add field");
    }
  };

  const handleRemoveField = async (fieldId: string, fieldName: string) => {
    if (!confirm(`Remove field "${fieldName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await removeField({
        templateId: template._id,
        fieldId: fieldId as any
      });
      toast.success("Field removed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove field");
    }
  };

  const handleReorderFields = async (newOrder: any[]) => {
    try {
      const fieldOrders = newOrder.map((field, index) => ({
        fieldId: field._id,
        order: index
      }));

      await updateFieldOrder({
        templateId: template._id,
        fieldOrders
      });
      
      setFields(newOrder);
      toast.success("Field order updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update field order");
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedField(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedField === null) return;
    
    const newFields = [...fields];
    const draggedItem = newFields[draggedField];
    
    newFields.splice(draggedField, 1);
    newFields.splice(dropIndex, 0, draggedItem);
    
    handleReorderFields(newFields);
    setDraggedField(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom Fields</h2>
          <p className="text-gray-600">Configure form fields for card generation</p>
        </div>
        <button
          onClick={() => setShowAddFieldModal(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add Field</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fields Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Field List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Form Fields ({fields.length})
            </h3>
            
            {fields.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📝</div>
                <div className="text-gray-600 mb-2">No custom fields added yet</div>
                <div className="text-gray-500 text-sm">
                  Add form fields to collect customer information during card generation
                </div>
                <button
                  onClick={() => setShowAddFieldModal(true)}
                  className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add Your First Field
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field: any, index: number) => (
                  <FieldListItem
                    key={field._id}
                    field={field}
                    index={index}
                    onEdit={(field) => setEditingField(field)}
                    onRemove={(fieldId, fieldName) => handleRemoveField(fieldId, fieldName)}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    isDragging={draggedField === index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Field Validation Rules */}
          {fields.length > 0 && (
            <FieldValidationSection fields={fields} />
          )}

          {/* PassKit Mapping */}
          {fields.length > 0 && (
            <PassKitMappingSection fields={fields} template={template} />
          )}
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <FormPreview fields={fields} cardType={template.type} />
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <AddFieldModal
          onClose={() => setShowAddFieldModal(false)}
          onSubmit={handleAddField}
          existingFields={fields}
        />
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <EditFieldModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSubmit={async (updates) => {
            // In a real implementation, you'd call an update field API
            setEditingField(null);
            toast.success("Field updated successfully");
          }}
        />
      )}
    </div>
  );
}

function PreviewTab({ template }: any) {
  return (
    <div className="text-center py-12">
      <div className="text-gray-500">Live preview coming in Phase 5</div>
    </div>
  );
} 