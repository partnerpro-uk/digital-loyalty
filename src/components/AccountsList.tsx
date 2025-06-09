import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { UserSelectModal } from "./UserSelectModal";
import { Id } from "../../convex/_generated/dataModel";

// Utility function to calculate trial period information
function calculateTrialInfo(account: any) {
  if (!account._creationTime) return null;
  
  const createdDate = new Date(account._creationTime);
  const now = new Date();
  const diffTime = now.getTime() - createdDate.getTime();
  const daysSinceCreation = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Default trial period is 14 days, but check if account has specific trial end date
  const trialPeriod = account.trialEndsAt 
    ? Math.floor((account.trialEndsAt - account._creationTime) / (1000 * 60 * 60 * 24))
    : 14;
  
  const daysRemaining = trialPeriod - daysSinceCreation;
  const isExpired = daysRemaining <= 0;
  
  return {
    createdDate,
    daysSinceCreation,
    trialPeriod,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired,
    isTrialActive: account.planStatus === "trial"
  };
}

interface AccountsListProps {
  onViewAsUser: (accountId: string, userId: string) => void;
}

export function AccountsList({ onViewAsUser }: AccountsListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showSubAccountModal, setShowSubAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "franchise" | "individual">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "trial" | "suspended">("all");
  const [viewMode, setViewMode] = useState<"all" | "hierarchy">("all");

  const accounts = useQuery(api.admin.listAccounts, {});
  const assignPlanToAccount = useMutation(api.admin.assignPlanToAccount);

  if (!accounts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Filter accounts based on search and filters
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.primaryContact.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || account.type === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && account.status === "active") ||
                         (filterStatus === "trial" && account.planStatus === "trial") ||
                         (filterStatus === "suspended" && account.status === "suspended");
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const organizeByHierarchy = (accounts: any[]) => {
    const franchises = accounts.filter(account => account.type === "franchise");
    const independents = accounts.filter(account => account.type === "individual" && !account.parentId);
    
    return {
      franchises: franchises.map(franchise => ({
        ...franchise,
        subAccounts: accounts.filter(account => account.parentId === franchise._id)
      })),
      independents
    };
  };

  const hierarchyData = organizeByHierarchy(filteredAccounts);

  const handleAssignPlan = async (accountId: Id<"accounts">, planId: Id<"plans">) => {
    try {
      const result = await assignPlanToAccount({ accountId, planId });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to assign plan");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Accounts</h1>
          <p className="text-gray-600">Manage client accounts, users, and billing plans</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gray-900 text-white px-4 py-2 border border-gray-900 hover:bg-gray-800 transition-colors"
        >
          Create Account
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="franchise">Franchise</option>
            <option value="individual">Individual</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Accounts</option>
            <option value="hierarchy">Hierarchy View</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{filteredAccounts.length}</div>
          <div className="text-sm text-gray-600">Total Accounts</div>
        </div>
        <div className="bg-white p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {filteredAccounts.filter(a => a.type === "franchise").length}
          </div>
          <div className="text-sm text-gray-600">Franchises</div>
        </div>
        <div className="bg-white p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {filteredAccounts.filter(a => a.type === "individual").length}
          </div>
          <div className="text-sm text-gray-600">Individual</div>
        </div>
        <div className="bg-white p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {filteredAccounts.filter(a => a.planStatus === "trial").length}
          </div>
          <div className="text-sm text-gray-600">On Trial</div>
        </div>
      </div>

      {/* Accounts List/Grid */}
      {viewMode === "hierarchy" ? (
        <HierarchyView 
          accounts={filteredAccounts}
          onViewAsUser={onViewAsUser}
          onManage={(account) => {
            setSelectedAccount(account);
            setShowManageModal(true);
          }}
          onCreateSubAccount={(account) => {
            setSelectedAccount(account);
            setShowSubAccountModal(true);
          }}
          onAssignPlan={handleAssignPlan}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onViewAsUser={onViewAsUser}
              onManage={(account) => {
                setSelectedAccount(account);
                setShowManageModal(true);
              }}
              onCreateSubAccount={
                account.type === "franchise" 
                  ? (account) => {
                      setSelectedAccount(account);
                      setShowSubAccountModal(true);
                    }
                  : undefined
              }
              onAssignPlan={handleAssignPlan}
            />
          ))}
        </div>
      )}

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No accounts found matching your criteria.</div>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterType("all");
              setFilterStatus("all");
            }}
            className="text-gray-900 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <CreateAccountModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            toast.success("Account created successfully");
          }}
        />
      )}

      {/* Create Sub-Account Modal */}
      {showSubAccountModal && selectedAccount && (
        <CreateAccountModal 
          parentAccount={selectedAccount}
          onClose={() => {
            setShowSubAccountModal(false);
            setSelectedAccount(null);
          }}
          onSuccess={() => {
            setShowSubAccountModal(false);
            setSelectedAccount(null);
            toast.success("Sub-account created successfully");
          }}
        />
      )}

      {/* Manage Account Modal */}
      {showManageModal && selectedAccount && (
        <ManageAccountModal
          account={selectedAccount}
          onClose={() => {
            setShowManageModal(false);
            setSelectedAccount(null);
          }}
          onSuccess={() => {
            setShowManageModal(false);
            setSelectedAccount(null);
            toast.success("Account updated successfully");
          }}
        />
      )}
    </div>
  );
}

function HierarchyView({ accounts, onViewAsUser, onManage, onCreateSubAccount, onAssignPlan }: {
  accounts: any[];
  onViewAsUser: (accountId: string, userId: string) => void;
  onManage: (account: any) => void;
  onCreateSubAccount: (account: any) => void;
  onAssignPlan: (accountId: Id<"accounts">, planId: Id<"plans">) => void;
}) {
  const franchises = accounts.filter(account => account.type === "franchise");
  const independents = accounts.filter(account => account.type === "individual" && !account.parentId);

  return (
    <div className="space-y-8">
      {/* Franchise Accounts with Sub-accounts */}
      {franchises.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Franchise Networks</h2>
          {franchises.map((franchise) => {
            const subAccounts = accounts.filter(account => account.parentId === franchise._id);
            return (
              <div key={franchise._id} className="bg-white border border-gray-200 p-6 mb-6">
                <AccountCard
                  account={franchise}
                  onViewAsUser={onViewAsUser}
                  onManage={onManage}
                  onCreateSubAccount={onCreateSubAccount}
                  onAssignPlan={onAssignPlan}
                  isHierarchyView={true}
                />
                
                {subAccounts.length > 0 && (
                  <div className="mt-6 pl-6 border-l-2 border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Sub-accounts ({subAccounts.length})</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {subAccounts.map((subAccount) => (
                        <AccountCard
                          key={subAccount._id}
                          account={subAccount}
                          onViewAsUser={onViewAsUser}
                          onManage={onManage}
                          onAssignPlan={onAssignPlan}
                          isHierarchyView={true}
                          isSubAccount={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Independent Individual Accounts */}
      {independents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Independent Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {independents.map((account) => (
              <AccountCard
                key={account._id}
                account={account}
                onViewAsUser={onViewAsUser}
                onManage={onManage}
                onAssignPlan={onAssignPlan}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onViewAsUser, onManage, onCreateSubAccount, onAssignPlan, isHierarchyView = false, isSubAccount = false }: { 
  account: any; 
  onViewAsUser: (accountId: string, userId: string) => void;
  onManage: (account: any) => void;
  onCreateSubAccount?: (account: any) => void;
  onAssignPlan: (accountId: Id<"accounts">, planId: Id<"plans">) => void;
  isHierarchyView?: boolean;
  isSubAccount?: boolean;
}) {
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const accountUsers = useQuery(api.admin.getAccountUsers, { accountId: account._id });
  const hasUsers = useQuery(api.admin.checkAccountHasUsers, { accountId: account._id });
  const trialInfo = calculateTrialInfo(account);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "trial": return "bg-orange-100 text-orange-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "franchise" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const cardClasses = isHierarchyView 
    ? "hover:shadow-md transition-shadow" 
    : "bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow";

  return (
    <div className={cardClasses}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            {isSubAccount && (
              <span className="text-xs text-gray-500">↳ Sub-account</span>
            )}
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(account.type)}`}>
              {account.type.toUpperCase()}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(account.planStatus)}`}>
              {account.planStatus.toUpperCase()}
            </span>
          </div>
          
          {/* Current Plan Info */}
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600 mb-1">Current Plan:</div>
            {account.plan ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{account.plan.name}</span>
                <span className="text-xs text-gray-600">£{account.plan.price}/{account.plan.billingPeriod}</span>
              </div>
            ) : (
              <span className="text-sm text-red-600">No plan assigned</span>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Contact:</span> {account.primaryContact.email}
            </div>
            <div className="flex items-center space-x-4">
              <span><span className="font-medium">Users:</span> {account.userCount}</span>
              <span><span className="font-medium">Customers:</span> {account.customerCount}</span>
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">Created:</span> {trialInfo?.createdDate.toLocaleDateString()} 
              {trialInfo && ` (${trialInfo.daysSinceCreation} days ago)`}
            </div>
            {trialInfo?.isTrialActive && (
              <div className={`text-xs ${trialInfo.isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                {trialInfo.isExpired 
                  ? `Trial expired (${Math.abs(trialInfo.daysRemaining)} days overdue)` 
                  : `Trial: ${trialInfo.daysRemaining} days remaining (${trialInfo.trialPeriod} day trial)`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          {hasUsers && (
            <button
              onClick={() => setShowUserSelectModal(true)}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              View As
            </button>
          )}
          <button
            onClick={() => onManage(account)}
            className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            Manage
          </button>
        </div>
        
        {onCreateSubAccount && (
          <button
            onClick={() => onCreateSubAccount(account)}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            Add Sub-account
          </button>
        )}
      </div>

      {/* User Select Modal */}
      {showUserSelectModal && accountUsers && (
        <UserSelectModal
          account={account}
          users={accountUsers}
          onSelectUser={(userId: string) => {
            onViewAsUser(account._id, userId);
            setShowUserSelectModal(false);
          }}
          onClose={() => setShowUserSelectModal(false)}
        />
      )}
    </div>
  );
}

function CreateAccountModal({ onClose, onSuccess, parentAccount }: { 
  onClose: () => void; 
  onSuccess: () => void;
  parentAccount?: any;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: parentAccount ? "individual" : "individual" as "individual" | "franchise",
    name: "",
    planId: "",
    adminUser: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
    location: {
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      timezone: "America/New_York",
    },
    trialDays: 14,
  });

  const [validation, setValidation] = useState({
    email: { isValid: true, message: "" },
    businessName: { isValid: true, message: "" },
    phone: { isValid: true, message: "" },
  });

  const plans = useQuery(api.plans.listPlans);
  const createAccount = useMutation(api.admin.createAccount);

  // Real-time validation queries
  const emailValidation = useQuery(
    api.validation.validateEmail,
    formData.adminUser.email ? { email: formData.adminUser.email } : "skip"
  );

  const businessNameValidation = useQuery(
    api.validation.validateBusinessName,
    formData.name ? { name: formData.name } : "skip"
  );

  const phoneValidation = useQuery(
    api.validation.validatePhone,
    formData.adminUser.phone ? { phone: formData.adminUser.phone } : "skip"
  );

  // Update validation state when queries complete
  React.useEffect(() => {
    if (emailValidation) {
      setValidation(prev => ({
        ...prev,
        email: {
          isValid: emailValidation.isAvailable,
          message: emailValidation.message
        }
      }));
    }
  }, [emailValidation]);

  React.useEffect(() => {
    if (businessNameValidation) {
      setValidation(prev => ({
        ...prev,
        businessName: {
          isValid: businessNameValidation.isAvailable,
          message: businessNameValidation.message
        }
      }));
    }
  }, [businessNameValidation]);

  React.useEffect(() => {
    if (phoneValidation) {
      setValidation(prev => ({
        ...prev,
        phone: phoneValidation
      }));
    }
  }, [phoneValidation]);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isFormValid = validation.email.isValid && 
                       validation.businessName.isValid && 
                       validation.phone.isValid;

    if (!isFormValid) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    try {
      await createAccount({
        ...formData,
        planId: formData.planId as any,
        parentId: parentAccount?._id,
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    }
  };

  const filteredPlans = plans?.filter(plan => plan.type === formData.type) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {parentAccount ? `Create Sub-Account for ${parentAccount.name}` : "Create New Account"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {parentAccount ? "Set up a new sub-account under this franchise" : "Set up a new franchise or individual account"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step > stepNum ? 'bg-gray-900' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {step === 1 && "Account Type & Basic Info"}
            {step === 2 && "Admin User Details"}
            {step === 3 && "Location & Plan"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Step 1: Account Type & Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Account Type - Only show if not creating sub-account */}
                {!parentAccount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                        formData.type === "individual" ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          value="individual"
                          checked={formData.type === "individual"}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">🏪</div>
                          <div className="font-medium text-gray-900">Individual</div>
                          <div className="text-sm text-gray-600">Single location account</div>
                        </div>
                      </label>
                      <label className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                        formData.type === "franchise" ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          value="franchise"
                          checked={formData.type === "franchise"}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">🏢</div>
                          <div className="font-medium text-gray-900">Franchise</div>
                          <div className="text-sm text-gray-600">Multi-location parent account</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Parent Account Info - Show if creating sub-account */}
                {parentAccount && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Parent Account</h3>
                    <p className="text-blue-800">{parentAccount.name}</p>
                    <p className="text-sm text-blue-600">This will be created as a sub-account</p>
                  </div>
                )}

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      !validation.businessName.isValid ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter business name"
                  />
                  {!validation.businessName.isValid && (
                    <p className="text-sm text-red-600 mt-1">{validation.businessName.message}</p>
                  )}
                  {validation.businessName.isValid && formData.name && (
                    <p className="text-sm text-green-600 mt-1">✓ Business name is available</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Admin User Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminUser.firstName}
                      onChange={(e) => handleInputChange('adminUser.firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminUser.lastName}
                      onChange={(e) => handleInputChange('adminUser.lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.adminUser.email}
                    onChange={(e) => handleInputChange('adminUser.email', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      !validation.email.isValid ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="admin@company.com"
                  />
                  {!validation.email.isValid && (
                    <p className="text-sm text-red-600 mt-1">{validation.email.message}</p>
                  )}
                  {validation.email.isValid && formData.adminUser.email && (
                    <p className="text-sm text-green-600 mt-1">✓ Email is available</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.adminUser.phone}
                    onChange={(e) => handleInputChange('adminUser.phone', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      !validation.phone.isValid ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+1234567890"
                  />
                  {!validation.phone.isValid && (
                    <p className="text-sm text-red-600 mt-1">{validation.phone.message}</p>
                  )}
                  {validation.phone.isValid && formData.adminUser.phone && (
                    <p className="text-sm text-green-600 mt-1">✓ Phone number format is valid</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Location & Plan */}
            {step === 3 && (
              <div className="space-y-6">
                {formData.type === "individual" && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Location Information</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location.address}
                        onChange={(e) => handleInputChange('location.address', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.location.city}
                          onChange={(e) => handleInputChange('location.city', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.location.state}
                          onChange={(e) => handleInputChange('location.state', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Billing Plan
                  </label>
                  <div className="grid gap-3">
                    {filteredPlans.map((plan) => (
                      <label
                        key={plan._id}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                          formData.planId === plan._id ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          value={plan._id}
                          checked={formData.planId === plan._id}
                          onChange={(e) => handleInputChange('planId', e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{plan.name}</div>
                            <div className="text-sm text-gray-600">
                              {plan.features.maxUsers} users • {plan.features.dataRetention} days retention
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">${plan.price}</div>
                            <div className="text-sm text-gray-600">/{plan.billingPeriod}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Trial Period
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={formData.trialDays}
                      onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    />
                    <span className="text-sm text-gray-600">days trial period</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex space-x-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && (!formData.name || !validation.businessName.isValid)) ||
                    (step === 2 && (!formData.adminUser.firstName || !formData.adminUser.lastName || 
                                   !formData.adminUser.email || !formData.adminUser.phone ||
                                   !validation.email.isValid || !validation.phone.isValid))
                  }
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!formData.planId || !validation.email.isValid || !validation.businessName.isValid || !validation.phone.isValid}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {parentAccount ? "Create Sub-Account" : "Create Account"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageAccountModal({ account, onClose, onSuccess }: { 
  account: any; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [activeTab, setActiveTab] = useState<"details" | "users" | "billing" | "settings">("details");
  const [formData, setFormData] = useState({
    name: account.name,
    status: account.status,
    planId: account.planId,
  });
  const [trialData, setTrialData] = useState({
    trialEndsAt: account.trialEndsAt || null,
    planStatus: account.planStatus,
    customTrialDays: 14,
  });
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const trialInfo = calculateTrialInfo(account);

  const plans = useQuery(api.plans.listPlans);
  const accountUsers = useQuery(api.admin.getAccountUsers, { accountId: account._id });
  const updateAccount = useMutation(api.admin.updateAccount);
  const updateAccountStatus = useMutation(api.admin.updateAccountStatus);
  const assignPlanToAccount = useMutation(api.admin.assignPlanToAccount);
  const createUser = useMutation(api.userManagement.createUser);
  const updateUser = useMutation(api.userManagement.updateUser);
  const deleteUser = useMutation(api.userManagement.deleteUser);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update account name if changed
      if (formData.name !== account.name) {
        await updateAccount({
          accountId: account._id,
          name: formData.name,
          planId: account.planId, // Keep existing plan
        });
      }

      // Update plan if changed
      if (formData.planId !== account.planId) {
        await assignPlanToAccount({
          accountId: account._id,
          planId: formData.planId as any,
        });
      }

      toast.success("Account updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update account");
    }
  };

  const handleStatusChange = async (newStatus: "active" | "suspended") => {
    try {
      await updateAccountStatus({
        accountId: account._id,
        status: newStatus,
      });
      setFormData(prev => ({ ...prev, status: newStatus }));
      toast.success(`Account ${newStatus === "active" ? "activated" : "suspended"} successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update account status");
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await createUser({
        accountId: account._id,
        userData,
      });
      toast.success("User created successfully");
      setShowCreateUserModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await updateUser({
        userId: userId as any,
        updates,
      });
      toast.success("User updated successfully");
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Prevent deleting the last user
    if (accountUsers && accountUsers.length <= 1) {
      toast.error("Cannot delete the last user in the account. An account must have at least one user.");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser({ userId: userId as any });
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const filteredPlans = plans?.filter(plan => plan.type === account.type && plan.status === "active") || [];

  const tabs = [
    { id: "details", label: "Account Details", icon: "📋" },
    { id: "users", label: `Users (${accountUsers?.length || 0})`, icon: "👥" },
    { id: "billing", label: "Billing & Trial", icon: "💳" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Account</h2>
            <p className="text-sm text-gray-600 mt-1">{account.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
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
        <div className="p-6">
          {activeTab === "details" && (
            <form onSubmit={handleUpdateAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Account Type
                  </label>
                  <input
                    type="text"
                    value={account.type}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Billing Plan
                </label>
                {filteredPlans.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredPlans.map((plan) => (
                      <label
                        key={plan._id}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                          formData.planId === plan._id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          value={plan._id}
                          checked={formData.planId === plan._id}
                          onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
                          className="sr-only"
                        />
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{plan.name}</div>
                            <div className="text-sm text-gray-600">
                              {plan.features.maxUsers} users • {plan.features.dataRetention} days retention
                            </div>
                            {plan.featureList && plan.featureList.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {plan.featureList.slice(0, 3).join(", ")}
                                {plan.featureList.length > 3 && ` +${plan.featureList.length - 3} more`}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">£{plan.price}</div>
                            <div className="text-sm text-gray-600">/{plan.billingPeriod}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <div className="text-gray-500">
                      No {account.type} plans available. Please create plans in the Plans Manager first.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  disabled={filteredPlans.length === 0}
                >
                  Update Account
                </button>
              </div>
            </form>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Account Users</h3>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Add User</span>
                </button>
              </div>

              {accountUsers && accountUsers.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accountUsers.map((user: any) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.permissions ? "Custom Permissions" : "Default Permissions"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === "orgadmin" 
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status === "active" 
                                  ? "bg-green-100 text-green-800"
                                  : user.status === "invited"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {user.status}
                              </span>
                              {user.emailVerified ? (
                                <span className="text-xs text-green-600">✓ Email Verified</span>
                              ) : (
                                <span className="text-xs text-red-600">✗ Email Not Verified</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`)}
                                className="text-red-600 hover:text-red-900"
                                disabled={accountUsers.length <= 1}
                                title={accountUsers.length <= 1 ? "Cannot delete the last user" : ""}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No users found for this account</div>
                </div>
              )}
            </div>
          )}

          {activeTab === "billing" && (
            <BillingTrialTab 
              account={account}
              trialInfo={trialInfo}
              trialData={trialData}
              setTrialData={setTrialData}
              onSuccess={onSuccess}
            />
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleStatusChange("active")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.status === "active"
                        ? "bg-green-100 text-green-800 border-2 border-green-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Activate Account
                  </button>
                  <button
                    onClick={() => handleStatusChange("suspended")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.status === "suspended"
                        ? "bg-red-100 text-red-800 border-2 border-red-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Suspend Account
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Current status: <span className="font-medium">{formData.status}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSubmit={(updates: any) => handleUpdateUser(selectedUser._id, updates)}
        />
      )}
    </div>
  );
}

function BillingTrialTab({ account, trialInfo, trialData, setTrialData, onSuccess }: {
  account: any;
  trialInfo: any;
  trialData: any;
  setTrialData: (data: any) => void;
  onSuccess: () => void;
}) {
  const [customEndDate, setCustomEndDate] = useState("");
  const [extensionDays, setExtensionDays] = useState(7);
  
  const updateTrialSettings = useMutation(api.admin.updateTrialSettings);
  const updateBillingStatus = useMutation(api.admin.updateBillingStatus);

  const handleTrialAction = async (action: "extend" | "end" | "restart" | "set_custom_end") => {
    try {
      const args: any = {
        accountId: account._id,
        action,
      };

      if (action === "extend") {
        args.extensionDays = extensionDays;
      } else if (action === "set_custom_end") {
        if (!customEndDate) {
          toast.error("Please select an end date");
          return;
        }
        args.trialEndsAt = new Date(customEndDate).getTime();
      }

      const result = await updateTrialSettings(args);
      toast.success(result.message);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update trial settings");
    }
  };

  const handleBillingStatusChange = async (newStatus: "trial" | "active" | "past_due" | "cancelled") => {
    try {
      const result = await updateBillingStatus({
        accountId: account._id,
        planStatus: newStatus,
      });
      toast.success(result.message);
      setTrialData((prev: any) => ({ ...prev, planStatus: newStatus }));
    } catch (error: any) {
      toast.error(error.message || "Failed to update billing status");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Current Status Overview */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Account Status</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              account.status === "active" 
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}>
              {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Billing Status</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              trialData.planStatus === "trial" 
                ? "bg-orange-100 text-orange-800"
                : trialData.planStatus === "active"
                ? "bg-green-100 text-green-800"
                : trialData.planStatus === "past_due"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}>
              {trialData.planStatus.charAt(0).toUpperCase() + trialData.planStatus.slice(1)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Account Created</label>
            <div className="text-sm text-gray-900">
              {formatDate(account._creationTime)}
              <div className="text-xs text-gray-500">
                {trialInfo?.daysSinceCreation} days ago
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Information */}
      {trialInfo && (
        <div className="border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trial Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Trial Period</label>
              <div className="text-lg font-semibold text-gray-900">
                {trialInfo.trialPeriod} days
              </div>
              <div className="text-sm text-gray-500">
                Standard trial length
              </div>
            </div>
            
            {account.trialEndsAt && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Trial End Date</label>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDateTime(account.trialEndsAt)}
                </div>
                <div className={`text-sm ${trialInfo.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                  {trialInfo.isExpired 
                    ? `Expired ${Math.abs(trialInfo.daysRemaining)} days ago`
                    : `${trialInfo.daysRemaining} days remaining`
                  }
                </div>
              </div>
            )}
          </div>

          {/* Trial Status Alert */}
          {trialInfo.isTrialActive && (
            <div className={`rounded-lg p-4 mb-4 ${
              trialInfo.isExpired 
                ? "bg-red-50 border border-red-200"
                : trialInfo.daysRemaining <= 3
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-blue-50 border border-blue-200"
            }`}>
              <div className={`font-medium ${
                trialInfo.isExpired 
                  ? "text-red-800"
                  : trialInfo.daysRemaining <= 3
                  ? "text-yellow-800"
                  : "text-blue-800"
              }`}>
                {trialInfo.isExpired 
                  ? "⚠️ Trial Expired"
                  : trialInfo.daysRemaining <= 3
                  ? "⏰ Trial Ending Soon"
                  : "✅ Trial Active"
                }
              </div>
              <div className={`text-sm mt-1 ${
                trialInfo.isExpired 
                  ? "text-red-600"
                  : trialInfo.daysRemaining <= 3
                  ? "text-yellow-600"
                  : "text-blue-600"
              }`}>
                {trialInfo.isExpired 
                  ? `Trial expired ${Math.abs(trialInfo.daysRemaining)} days ago. Consider extending or upgrading.`
                  : trialInfo.daysRemaining <= 3
                  ? `Only ${trialInfo.daysRemaining} days left in trial period.`
                  : `Trial is active with ${trialInfo.daysRemaining} days remaining.`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trial Management Actions */}
      <div className="border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Trial Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Extend Trial */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Extend Trial</h4>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(e) => setExtensionDays(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
              />
              <span className="text-sm text-gray-600">days</span>
              <button
                onClick={() => handleTrialAction("extend")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Extend Trial
              </button>
            </div>
          </div>

          {/* Custom End Date */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Set Custom End Date</h4>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => handleTrialAction("set_custom_end")}
                disabled={!customEndDate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleTrialAction("restart")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Restart Trial (14 days)
            </button>
            <button
              onClick={() => handleTrialAction("end")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              End Trial Now
            </button>
          </div>
        </div>
      </div>

      {/* Billing Status Management */}
      <div className="border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Billing Status</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { status: "trial", label: "Trial", color: "orange" },
            { status: "active", label: "Active", color: "green" },
            { status: "past_due", label: "Past Due", color: "red" },
            { status: "cancelled", label: "Cancelled", color: "gray" },
          ].map(({ status, label, color }) => (
            <button
              key={status}
              onClick={() => handleBillingStatusChange(status as any)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                trialData.planStatus === status
                  ? `bg-${color}-100 text-${color}-800 border-2 border-${color}-300`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Current Status:</strong> {trialData.planStatus}</p>
          <p className="mt-1">Use these controls to manually update the billing status. In production, this would typically be automated based on payment processing.</p>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (userData: any) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "clientuser" as "orgadmin" | "clientuser",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as "orgadmin" | "clientuser"})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="clientuser">Client User</option>
              <option value="orgadmin">Organization Admin</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSubmit }: {
  user: any;
  onClose: () => void;
  onSubmit: (updates: any) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="clientuser">Client User</option>
              <option value="orgadmin">Organization Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
