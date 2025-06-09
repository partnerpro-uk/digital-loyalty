import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { CardTemplateEditor } from "./CardTemplateEditor";

interface CardTemplate {
  _id: string;
  name: string;
  type: "stamp" | "points" | "membership" | "coupon";
  status: "draft" | "active" | "inactive";
  stats: {
    totalInstances: number;
    activeInstances: number;
    lastGenerated: number | null;
  };
  _creationTime: number;
}

export function CardBuilder() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Queries
  const templates = useQuery(api.cardBuilder.listCardTemplates, {});
  const stats = useQuery(api.cardBuilder.getCardBuilderStats, {});

  // Mutations
  const createTemplate = useMutation(api.cardBuilder.createCardTemplate);
  const updateStatus = useMutation(api.cardBuilder.updateTemplateStatus);
  const deleteTemplate = useMutation(api.cardBuilder.deleteCardTemplate);

  const handleCreateTemplate = async (type: "stamp" | "points" | "membership" | "coupon", name: string) => {
    try {
      const result = await createTemplate({
        name,
        type,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} loyalty card template`
      });
      toast.success(result.message);
      setShowCreateModal(false);
      setSelectedType(null);
      // Redirect to edit the newly created template
      if (result.templateId) {
        setEditingTemplate(result.templateId);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create template");
    }
  };

  const handleActivateTemplate = async (templateId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const result = await updateStatus({
        templateId: templateId as any,
        status: newStatus as any
      });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteTemplate({ templateId: templateId as any });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplate(templateId);
  };

  // Group templates by type
  const templatesByType = templates?.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<string, CardTemplate[]>) || {};

  // Show template editor if editing
  if (editingTemplate) {
    return (
      <CardTemplateEditor
        templateId={editingTemplate}
        onBack={() => setEditingTemplate(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Builder</h1>
          <p className="text-gray-600">Create and manage digital loyalty cards for Apple Wallet and Google Wallet</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>New Card</span>
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Templates"
            value={stats.totalTemplates}
            icon="📋"
            color="blue"
          />
          <StatsCard
            title="Active Templates"
            value={stats.activeTemplates}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="Cards Generated"
            value={stats.totalInstances}
            icon="🎫"
            color="purple"
          />
          <StatsCard
            title="Cards Installed"
            value={stats.installedInstances}
            icon="📱"
            color="orange"
          />
        </div>
      )}

      {/* Card Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardTypeSection
          type="stamp"
          title="Stamp Card"
          description="Collect stamps for rewards"
          icon="⭐"
          templates={templatesByType.stamp || []}
          onCreateNew={() => {
            setSelectedType("stamp");
            setShowCreateModal(true);
          }}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
        />
        
        <CardTypeSection
          type="points"
          title="Points Card"
          description="Earn points with every purchase"
          icon="💎"
          templates={templatesByType.points || []}
          onCreateNew={() => {
            setSelectedType("points");
            setShowCreateModal(true);
          }}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
        />
        
        <CardTypeSection
          type="membership"
          title="Membership Card"
          description="Exclusive member benefits"
          icon="👑"
          templates={templatesByType.membership || []}
          onCreateNew={() => {
            setSelectedType("membership");
            setShowCreateModal(true);
          }}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
        />
        
        <CardTypeSection
          type="coupon"
          title="Coupon Card"
          description="Digital discount coupons"
          icon="🎟️"
          templates={templatesByType.coupon || []}
          onCreateNew={() => {
            setSelectedType("coupon");
            setShowCreateModal(true);
          }}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
        />
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          selectedType={selectedType}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedType(null);
          }}
          onSubmit={handleCreateTemplate}
        />
      )}
    </div>
  );
}

function StatsCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700"
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <div className={`px-2 py-1 rounded-full text-sm font-medium ${colorClasses[color]}`}>
          {value.toLocaleString()}
        </div>
      </div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

function CardTypeSection({ 
  type, 
  title, 
  description, 
  icon, 
  templates, 
  onCreateNew, 
  onActivateTemplate, 
  onDeleteTemplate,
  onEditTemplate
}: {
  type: string;
  title: string;
  description: string;
  icon: string;
  templates: CardTemplate[];
  onCreateNew: () => void;
  onActivateTemplate: (templateId: string, currentStatus: string) => void;
  onDeleteTemplate: (templateId: string, templateName: string) => void;
  onEditTemplate: (templateId: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Phone Mockup Preview */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="w-32 h-56 bg-black rounded-2xl p-1">
            <div className="w-full h-full bg-white rounded-xl overflow-hidden">
              <CardPreview type={type as any} />
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-3 mb-4">
        {templates.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No templates created yet</p>
          </div>
        ) : (
          templates.slice(0, 3).map((template) => (
            <TemplateListItem
              key={template._id}
              template={template}
              onActivate={() => onActivateTemplate(template._id, template.status)}
              onDelete={() => onDeleteTemplate(template._id, template.name)}
              onEdit={() => onEditTemplate(template._id)}
            />
          ))
        )}
        
        {templates.length > 3 && (
          <div className="text-center">
            <button className="text-xs text-blue-600 hover:text-blue-800">
              +{templates.length - 3} more
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onCreateNew}
          className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
        >
          Create New
        </button>
        {templates.length > 0 && (
          <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            View All ({templates.length})
          </button>
        )}
      </div>
    </div>
  );
}

function CardPreview({ type }: { type: "stamp" | "points" | "membership" | "coupon" }) {
  const previews = {
    stamp: (
      <div className="p-3 h-full flex flex-col">
        <div className="text-xs font-semibold mb-2">Coffee Shop</div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full ${
                  i < 7 ? 'bg-yellow-400' : 'bg-gray-200'
                } flex items-center justify-center`}
              >
                {i < 7 && <span className="text-xs">⭐</span>}
              </div>
            ))}
          </div>
          <div className="text-xs text-center text-gray-600">7 of 10 stamps</div>
        </div>
        <div className="text-xs text-center bg-gray-100 py-1 rounded">
          Buy 3 more, get free coffee!
        </div>
      </div>
    ),
    points: (
      <div className="p-3 h-full flex flex-col">
        <div className="text-xs font-semibold mb-2">Rewards Club</div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">1,250</div>
          <div className="text-xs text-gray-600 mb-2">Points Available</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
          <div className="text-xs text-center text-gray-600">Gold Member</div>
        </div>
      </div>
    ),
    membership: (
      <div className="p-3 h-full flex flex-col">
        <div className="text-xs font-semibold mb-2">VIP Club</div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-2">
            <span className="text-xs">👑</span>
          </div>
          <div className="text-xs font-semibold mb-1">GOLD MEMBER</div>
          <div className="text-xs text-gray-600 mb-2">#MEM-2024-00123</div>
          <div className="text-xs text-center text-gray-600">Member since 2024</div>
        </div>
      </div>
    ),
    coupon: (
      <div className="p-3 h-full flex flex-col">
        <div className="text-xs font-semibold mb-2">Special Offer</div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-xl font-bold text-green-600 mb-1">20%</div>
          <div className="text-xs text-gray-600 mb-2">OFF</div>
          <div className="text-xs text-center bg-green-100 text-green-800 px-2 py-1 rounded mb-2">
            Next Purchase
          </div>
          <div className="text-xs text-center text-gray-600">Valid until Dec 31</div>
        </div>
      </div>
    ),
  };

  return previews[type];
}

function TemplateListItem({ 
  template, 
  onActivate, 
  onDelete,
  onEdit
}: {
  template: CardTemplate;
  onActivate: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800"
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{template.name}</div>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[template.status]}`}>
            {template.status}
          </span>
          <span className="text-xs text-gray-500">
            {template.stats.activeInstances} active
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 text-gray-400 hover:text-blue-600"
          title="Edit Settings"
        >
          ⚙️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
          title={template.status === "active" ? "Deactivate" : "Activate"}
        >
          {template.status === "active" ? "⏸️" : "▶️"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function CreateTemplateModal({ 
  selectedType, 
  onClose, 
  onSubmit 
}: {
  selectedType: string | null;
  onClose: () => void;
  onSubmit: (type: "stamp" | "points" | "membership" | "coupon", name: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"stamp" | "points" | "membership" | "coupon">(
    selectedType as any || "stamp"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(type, name.trim());
    }
  };

  const cardTypes = [
    { value: "stamp", label: "Stamp Card", icon: "⭐", description: "Collect stamps for rewards" },
    { value: "points", label: "Points Card", icon: "💎", description: "Earn points with purchases" },
    { value: "membership", label: "Membership Card", icon: "👑", description: "Exclusive member benefits" },
    { value: "coupon", label: "Coupon Card", icon: "🎟️", description: "Digital discount coupons" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Card Template</h2>
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
          {/* Card Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Card Type</label>
            <div className="grid grid-cols-2 gap-3">
              {cardTypes.map((cardType) => (
                <label
                  key={cardType.value}
                  className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    type === cardType.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={cardType.value}
                    checked={type === cardType.value}
                    onChange={(e) => setType(e.target.value as any)}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-2">{cardType.icon}</div>
                  <div className="text-sm font-medium text-gray-900 text-center">{cardType.label}</div>
                  <div className="text-xs text-gray-500 text-center mt-1">{cardType.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Coffee Shop Loyalty Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              autoFocus
            />
          </div>

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
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 