import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

// Type definitions
interface PlanFeatures {
  maxUsers: number;
  maxSubAccounts: number;
  dataRetention: number;
  apiCalls: number;
  customDomain: boolean;
  customBranding: boolean;
  priority_support: boolean;
  analytics: boolean;
  integrations: boolean;
  multiLocation: boolean;
}

interface Plan {
  _id: Id<"plans">;
  name: string;
  type: "individual" | "franchise";
  price: number;
  billingPeriod: "monthly" | "annually";
  features: PlanFeatures;
  featureList: string[];
  status: "active" | "inactive" | "discontinued";
  defaultPermissions: any;
}

interface PlanForm {
  name: string;
  type: "individual" | "franchise";
  price: number;
  billingPeriod: "monthly" | "annually";
  features: PlanFeatures;
  featureList: string[];
  status: "active" | "inactive" | "discontinued";
}

export function PlansManager() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const plans = useQuery(api.plans.getAllPlans, {});
  const createPlan = useMutation(api.plans.createPlan);
  const updatePlan = useMutation(api.plans.updatePlan);
  const deletePlan = useMutation(api.plans.deletePlan);
  const createDefaultPlans = useMutation(api.plans.createDefaultPlans);
  const migrateExistingPlans = useMutation(api.plans.migrateExistingPlans);

  const [planForm, setPlanForm] = useState<PlanForm>({
    name: "",
    type: "individual",
    price: 0,
    billingPeriod: "monthly",
    features: {
      maxUsers: 1,
      maxSubAccounts: 0,
      dataRetention: 365,
      apiCalls: 1000,
      customDomain: false,
      customBranding: false,
      priority_support: false,
      analytics: false,
      integrations: false,
      multiLocation: false,
    },
    featureList: [],
    status: "active",
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPlan(planForm);
      toast.success("Plan created successfully");
      setShowCreateForm(false);
      resetPlanForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create plan");
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    try {
      await updatePlan({
        planId: selectedPlan._id,
        updates: planForm,
      });
      toast.success("Plan updated successfully");
      setShowEditForm(false);
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    }
  };

  const handleDeletePlan = async (planId: Id<"plans">, planName: string) => {
    if (!confirm(`Are you sure you want to delete the "${planName}" plan? This action cannot be undone.`)) {
      return;
    }

    try {
      await deletePlan({ planId });
      toast.success("Plan deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete plan");
    }
  };

  const handleCreateDefaultPlans = async () => {
    try {
      await createDefaultPlans();
      toast.success("Default plans created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create default plans");
    }
  };

  const handleMigrateExistingPlans = async () => {
    try {
      const result = await migrateExistingPlans();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to migrate plans");
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      billingPeriod: plan.billingPeriod,
      features: plan.features,
      featureList: plan.featureList,
      status: plan.status,
    });
    setShowEditForm(true);
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: "",
      type: "individual",
      price: 0,
      billingPeriod: "monthly",
      features: {
        maxUsers: 1,
        maxSubAccounts: 0,
        dataRetention: 365,
        apiCalls: 1000,
        customDomain: false,
        customBranding: false,
        priority_support: false,
        analytics: false,
        integrations: false,
        multiLocation: false,
      },
      featureList: [],
      status: "active",
    });
  };

  if (plans === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
      </div>
    );
  }

  if (plans === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-600 mb-4">Failed to load plans</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans Manager</h1>
          <p className="text-gray-600">Create and manage subscription plans</p>
        </div>
      </div>

      {/* Plans Management Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Billing Plans</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleMigrateExistingPlans}
            className="bg-yellow-600 text-white px-4 py-2 border border-yellow-600 hover:bg-yellow-700 transition-colors"
          >
            Fix Existing Plans
          </button>
          <button
            onClick={handleCreateDefaultPlans}
            className="bg-gray-600 text-white px-4 py-2 border border-gray-600 hover:bg-gray-700 transition-colors"
          >
            Create Default Plans
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gray-900 text-white px-4 py-2 border border-gray-900 hover:bg-gray-800 transition-colors"
          >
            Create New Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No plans found. Create your first plan or generate default plans.</p>
          </div>
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              onEdit={() => handleEditPlan(plan)}
              onDelete={() => handleDeletePlan(plan._id, plan.name)}
            />
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateForm && (
        <PlanFormModal
          title="Create New Plan"
          planForm={planForm}
          setPlanForm={setPlanForm}
          onSubmit={handleCreatePlan}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditForm && selectedPlan && (
        <PlanFormModal
          title="Edit Plan"
          planForm={planForm}
          setPlanForm={setPlanForm}
          onSubmit={handleUpdatePlan}
          onClose={() => {
            setShowEditForm(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}

// Keep existing PlanCard and PlanFormModal components
function PlanCard({ plan, onEdit, onDelete }: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`px-2 py-1 text-xs font-medium border ${
              plan.type === "franchise" 
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}>
              {plan.type.toUpperCase()}
            </span>
            <span className={`px-2 py-1 text-xs font-medium border ${
              plan.status === "active"
                ? "bg-green-50 text-green-800 border-green-200"
                : plan.status === "discontinued"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-gray-50 text-gray-800 border-gray-200"
            }`}>
              {plan.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="text-gray-600 hover:text-gray-900"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          £{plan.price}
          <span className="text-sm font-normal text-gray-500">/{plan.billingPeriod}</span>
        </div>
      </div>

      {/* Feature List */}
      {plan.featureList && plan.featureList.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
          <ul className="space-y-1">
            {plan.featureList.slice(0, 3).map((feature: string, index: number) => (
              <li key={index} className="text-sm text-gray-600 flex items-center">
                <span className="w-4 h-4 text-green-500 mr-2">✓</span>
                {feature}
              </li>
            ))}
            {plan.featureList.length > 3 && (
              <li className="text-sm text-gray-500">
                +{plan.featureList.length - 3} more features
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Technical Limits */}
      <div className="border-t border-gray-100 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Technical Limits:</h4>
        <ul className="space-y-1">
          <li className="text-sm text-gray-600">
            <span className="font-medium">Users:</span> {plan.features.maxUsers}
          </li>
          <li className="text-sm text-gray-600">
            <span className="font-medium">Sub-accounts:</span> {plan.features.maxSubAccounts}
          </li>
          <li className="text-sm text-gray-600">
            <span className="font-medium">API Calls:</span> {plan.features.apiCalls}/month
          </li>
          <li className="text-sm text-gray-600">
            <span className="font-medium">Data Retention:</span> {plan.features.dataRetention} days
          </li>
        </ul>
      </div>
    </div>
  );
}

function PlanFormModal({ title, planForm, setPlanForm, onSubmit, onClose }: {
  title: string;
  planForm: PlanForm;
  setPlanForm: (form: PlanForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const handleFeatureListChange = (features: string) => {
    const featureList = features.split('\n').filter(f => f.trim());
    setPlanForm({ ...planForm, featureList });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (£)
                </label>
                <input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={planForm.type}
                  onChange={(e) => setPlanForm({ ...planForm, type: e.target.value as "individual" | "franchise" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="individual">Individual</option>
                  <option value="franchise">Franchise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Period
                </label>
                <select
                  value={planForm.billingPeriod}
                  onChange={(e) => setPlanForm({ ...planForm, billingPeriod: e.target.value as "monthly" | "annually" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature List (one per line)
              </label>
              <textarea
                value={planForm.featureList.join('\n')}
                onChange={(e) => handleFeatureListChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                placeholder="Enter features, one per line"
                required
              />
            </div>

            {/* Technical Features */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Users
                </label>
                <input
                  type="number"
                  value={planForm.features.maxUsers}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, maxUsers: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Sub-accounts
                </label>
                <input
                  type="number"
                  value={planForm.features.maxSubAccounts}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, maxSubAccounts: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Calls (per month)
                </label>
                <input
                  type="number"
                  value={planForm.features.apiCalls}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, apiCalls: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={planForm.features.dataRetention}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, dataRetention: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="1"
                />
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customDomain"
                  checked={planForm.features.customDomain}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, customDomain: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="customDomain" className="ml-2 text-sm text-gray-700">
                  Custom Domain
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customBranding"
                  checked={planForm.features.customBranding}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, customBranding: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="customBranding" className="ml-2 text-sm text-gray-700">
                  Custom Branding
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="prioritySupport"
                  checked={planForm.features.priority_support}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, priority_support: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="prioritySupport" className="ml-2 text-sm text-gray-700">
                  Priority Support
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="analytics"
                  checked={planForm.features.analytics}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, analytics: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="analytics" className="ml-2 text-sm text-gray-700">
                  Analytics
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="integrations"
                  checked={planForm.features.integrations}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, integrations: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="integrations" className="ml-2 text-sm text-gray-700">
                  Integrations
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="multiLocation"
                  checked={planForm.features.multiLocation}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    features: { ...planForm.features, multiLocation: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="multiLocation" className="ml-2 text-sm text-gray-700">
                  Multi-location
                </label>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={planForm.status}
                onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as "active" | "inactive" | "discontinued" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
              >
                {title === "Create New Plan" ? "Create Plan" : "Update Plan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
