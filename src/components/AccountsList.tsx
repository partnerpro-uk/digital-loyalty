import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { UserSelectModal } from "./UserSelectModal";

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

  // Organize accounts by hierarchy for hierarchy view
  const organizeByHierarchy = (accounts: any[]) => {
    const franchises = accounts.filter(a => a.type === "franchise" && !a.parentId);
    const individuals = accounts.filter(a => a.type === "individual" && !a.parentId);
    
    return franchises.map(franchise => ({
      ...franchise,
      subAccounts: accounts.filter(a => a.parentId === franchise._id)
    })).concat(individuals.map(individual => ({ ...individual, subAccounts: [] })));
  };

  const displayAccounts = viewMode === "hierarchy" 
    ? organizeByHierarchy(filteredAccounts)
    : filteredAccounts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage all franchise and individual client accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <span className="text-lg">+</span>
          <span>Create Account</span>
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="all">All Types</option>
              <option value="franchise">Franchise</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="all">All Accounts</option>
              <option value="hierarchy">Hierarchy View</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing {filteredAccounts.length} of {accounts.length} clients</span>
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Franchise</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Individual</span>
          </span>
        </div>
      </div>

      {/* Accounts Display */}
      {viewMode === "hierarchy" ? (
        <HierarchyView 
          accounts={displayAccounts} 
          onViewAsUser={onViewAsUser}
          onManage={(account) => {
            setSelectedAccount(account);
            setShowManageModal(true);
          }}
          onCreateSubAccount={(parentAccount) => {
            setSelectedAccount(parentAccount);
            setShowSubAccountModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAccounts.map((account) => (
            <AccountCard 
              key={account._id} 
              account={account} 
              onViewAsUser={onViewAsUser}
              onManage={(account) => {
                setSelectedAccount(account);
                setShowManageModal(true);
              }}
              onCreateSubAccount={account.type === "franchise" ? (account) => {
                setSelectedAccount(account);
                setShowSubAccountModal(true);
              } : undefined}
            />
          ))}
        </div>
      )}

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No clients found matching your criteria</div>
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

function HierarchyView({ accounts, onViewAsUser, onManage, onCreateSubAccount }: {
  accounts: any[];
  onViewAsUser: (accountId: string, userId: string) => void;
  onManage: (account: any) => void;
  onCreateSubAccount: (account: any) => void;
}) {
  return (
    <div className="space-y-6">
      {accounts.map((account) => (
        <div key={account._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Parent Account */}
          <div className="p-6 border-b border-gray-100">
            <AccountCard 
              account={account} 
              onViewAsUser={onViewAsUser}
              onManage={onManage}
              onCreateSubAccount={account.type === "franchise" ? onCreateSubAccount : undefined}
              isHierarchyView={true}
            />
          </div>

          {/* Sub-Accounts */}
          {account.subAccounts && account.subAccounts.length > 0 && (
            <div className="bg-gray-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Sub-Accounts ({account.subAccounts.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {account.subAccounts.map((subAccount: any) => (
                  <div key={subAccount._id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <AccountCard 
                      account={subAccount} 
                      onViewAsUser={onViewAsUser}
                      onManage={onManage}
                      isSubAccount={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Sub-Account Button */}
          {account.type === "franchise" && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => onCreateSubAccount(account)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">+</span>
                  <span>Add Sub-Account</span>
                </div>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AccountCard({ account, onViewAsUser, onManage, onCreateSubAccount, isHierarchyView = false, isSubAccount = false }: { 
  account: any; 
  onViewAsUser: (accountId: string, userId: string) => void;
  onManage: (account: any) => void;
  onCreateSubAccount?: (account: any) => void;
  isHierarchyView?: boolean;
  isSubAccount?: boolean;
}) {
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const accountUsers = useQuery(api.admin.getAccountUsers, { accountId: account._id });

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
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`font-semibold text-gray-900 truncate ${isSubAccount ? 'text-sm' : 'text-base'}`}>
              {account.name}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(account.type)}`}>
              {account.type === "franchise" ? "F" : "I"}
            </span>
            {isSubAccount && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                Sub
              </span>
            )}
          </div>
          <p className={`text-gray-600 truncate ${isSubAccount ? 'text-xs' : 'text-sm'}`}>
            {account.primaryContact.email}
          </p>
        </div>
      </div>

      {/* Main Metric - Customers */}
      <div className="mb-3">
        <div className="flex items-baseline space-x-2">
          <div className={`font-bold text-gray-900 ${isSubAccount ? 'text-xl' : 'text-2xl'}`}>
            {account.customerCount}
          </div>
          <div className="text-sm text-gray-500">customers</div>
        </div>
      </div>

      {/* Secondary Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500">
            {account.userCount} users
          </div>
          <div className="text-xs text-gray-500">
            ${account.plan?.price}/{account.plan?.billingPeriod}
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(account.planStatus)}`}>
          {account.planStatus}
        </span>
      </div>

      {/* Trial Info */}
      {account.trialStatus && (
        <div className="mb-3 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          Trial: {account.trialStatus.daysRemaining} days left
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-1">
        <button 
          onClick={() => onManage(account)}
          className="flex-1 bg-gray-100 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          Manage
        </button>
        {accountUsers && accountUsers.length > 0 && (
          <button
            onClick={() => setShowUserSelectModal(true)}
            className="flex-1 bg-gray-900 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            View As
          </button>
        )}
        {onCreateSubAccount && !isSubAccount && (
          <button
            onClick={() => onCreateSubAccount(account)}
            className="bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            + Sub
          </button>
        )}
      </div>

      {/* User Selection Modal */}
      {showUserSelectModal && (
        <UserSelectModal
          account={account}
          users={accountUsers || []}
          onSelectUser={(userId) => {
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
  const [activeTab, setActiveTab] = useState<"details" | "users" | "settings">("details");
  const [formData, setFormData] = useState({
    name: account.name,
    status: account.status,
    planId: account.planId,
  });

  const plans = useQuery(api.plans.listPlans);
  const accountUsers = useQuery(api.admin.getAccountUsers, { accountId: account._id });
  const updateAccount = useMutation(api.admin.updateAccount);
  const updateAccountStatus = useMutation(api.admin.updateAccountStatus);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAccount({
        accountId: account._id,
        name: formData.name,
        planId: formData.planId as any,
      });
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

  const filteredPlans = plans?.filter(plan => plan.type === account.type) || [];

  const tabs = [
    { id: "details", label: "Account Details", icon: "📋" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                        onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
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
                <span className="text-sm text-gray-500">
                  {accountUsers?.length || 0} users
                </span>
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
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accountUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === "orgadmin" 
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === "active" 
                                ? "bg-green-100 text-green-800"
                                : user.status === "invited"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? (
                              new Date(user.lastLogin).toLocaleDateString()
                            ) : (
                              "Never"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">No users found for this account</div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    formData.status === "active" 
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {formData.status}
                  </span>
                  {formData.status === "active" ? (
                    <button
                      onClick={() => handleStatusChange("suspended")}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Suspend Account
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange("active")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Activate Account
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-gray-500">Account ID:</span>
                    <div className="text-sm text-gray-900 font-mono">{account._id}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Created:</span>
                    <div className="text-sm text-gray-900">
                      {new Date(account._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Primary Contact:</span>
                    <div className="text-sm text-gray-900">{account.primaryContact.email}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">User Count:</span>
                    <div className="text-sm text-gray-900">{account.userCount}</div>
                  </div>
                  {account.parentId && (
                    <div>
                      <span className="text-sm text-gray-500">Parent Account:</span>
                      <div className="text-sm text-gray-900">Sub-account</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
