import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function SuperAdminUserManagement() {
  const [activeTab, setActiveTab] = useState<"superadmins" | "clients">("superadmins");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string, type: 'superadmin' | 'client'} | null>(null);

  // Queries
  const superAdmins = useQuery(api.adminUsers.getSuperAdmins);
  const allAccounts = useQuery(api.admin.listAccounts, {});
  const clientUsers = useQuery(api.adminUsers.getAllClientUsers);
  const accountUsers = useQuery(
    api.admin.getAccountUsers,
    selectedAccount ? { accountId: selectedAccount as any } : "skip"
  );

  // Mutations
  const createSuperAdmin = useMutation(api.adminUsers.createSuperAdmin);
  const updateUserStatus = useMutation(api.adminUsers.updateUserStatus);
  const deleteUser = useMutation(api.adminUsers.deleteUser);

  const handleCreateSuperAdmin = async (userData: any) => {
    try {
      await createSuperAdmin(userData);
      toast.success("Super admin created successfully");
      setShowCreateSuperAdminModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create super admin");
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: "active" | "suspended") => {
    try {
      await updateUserStatus({ userId: userId as any, status });
      toast.success(`User ${status === "active" ? "activated" : "suspended"} successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    }
  };

  const handleDeleteConfirm = (userId: string, userName: string, userType: 'superadmin' | 'client') => {
    setUserToDelete({ id: userId, name: userName, type: userType });
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser({ userId: userToDelete.id as any });
      toast.success(`${userToDelete.type === 'superadmin' ? 'Super admin' : 'User'} deleted successfully`);
      setShowDeleteConfirmModal(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  if (!superAdmins || !allAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: "superadmins", label: `Super Admins (${superAdmins?.length || 0})`, icon: "🔑" },
    { id: "clients", label: "Client Account Users", icon: "👥" },
  ];

  // Filter client users based on search
  const filteredClientUsers = clientUsers?.filter((user: any) =>
    !searchTerm || 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage system administrators and monitor client account users</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
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
      {activeTab === "superadmins" && (
        <SuperAdminsTab
          superAdmins={superAdmins}
          onCreateSuperAdmin={() => setShowCreateSuperAdminModal(true)}
          onUpdateStatus={handleUpdateUserStatus}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )}

      {activeTab === "clients" && (
        <ClientUsersTab
          accounts={allAccounts}
          clientUsers={filteredClientUsers}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          accountUsers={accountUsers}
          onUpdateStatus={handleUpdateUserStatus}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )}

      {/* Create Super Admin Modal */}
      {showCreateSuperAdminModal && (
        <CreateSuperAdminModal
          onClose={() => setShowCreateSuperAdminModal(false)}
          onSubmit={handleCreateSuperAdmin}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && userToDelete && (
        <DeleteConfirmationModal
          userName={userToDelete.name}
          userType={userToDelete.type}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}

function SuperAdminsTab({ superAdmins, onCreateSuperAdmin, onUpdateStatus, onDeleteConfirm }: {
  superAdmins: any[];
  onCreateSuperAdmin: () => void;
  onUpdateStatus: (userId: string, status: "active" | "suspended") => void;
  onDeleteConfirm: (userId: string, userName: string, userType: 'superadmin' | 'client') => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System Administrators</h2>
          <p className="text-sm text-gray-600">Manage users with system-wide administrative access</p>
        </div>
        <button
          onClick={onCreateSuperAdmin}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add Super Admin</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Administrator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {superAdmins.map((admin) => (
              <tr key={admin._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">
                        {admin.firstName[0]}{admin.lastName[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    admin.status === "active" 
                      ? "bg-green-100 text-green-800"
                      : admin.status === "invited"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {admin.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : "Never"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(admin._creationTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {admin.status === "suspended" && (
                      <button
                        onClick={() => onUpdateStatus(admin._id, "active")}
                        className="text-green-600 hover:text-green-900"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteConfirm(admin._id, `${admin.firstName} ${admin.lastName}`, 'superadmin')}
                      className="text-red-600 hover:text-red-900"
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

      {superAdmins.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">No super administrators found</div>
        </div>
      )}
    </div>
  );
}

function ClientUsersTab({ accounts, clientUsers, searchTerm, setSearchTerm, selectedAccount, setSelectedAccount, accountUsers, onUpdateStatus, onDeleteConfirm }: {
  accounts: any[];
  clientUsers: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedAccount: string | null;
  setSelectedAccount: (accountId: string | null) => void;
  accountUsers: any;
  onUpdateStatus: (userId: string, status: "active" | "suspended") => void;
  onDeleteConfirm: (userId: string, userName: string, userType: 'superadmin' | 'client') => void;
}) {
  const [viewMode, setViewMode] = useState<"all" | "by-account">("all");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Client Account Users</h2>
          <p className="text-sm text-gray-600">Monitor and overview users across all client accounts</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "all" | "by-account")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Users</option>
              <option value="by-account">By Account</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === "all" ? (
        <>
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users by name, email, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div className="text-sm text-gray-500">
              {clientUsers.length} users found
            </div>
          </div>

          {/* All Users Table */}
          <ClientUsersTable users={clientUsers} onUpdateStatus={onUpdateStatus} onDeleteConfirm={onDeleteConfirm} showAccount={true} />
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Select Account</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accounts.map((account) => (
                <button
                  key={account._id}
                  onClick={() => setSelectedAccount(account._id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedAccount === account._id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-500">
                    {account.userCount} users • {account.type}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(account._creationTime).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Account Users */}
          <div className="lg:col-span-2">
            {selectedAccount && accountUsers ? (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  Users in {accounts.find(a => a._id === selectedAccount)?.name}
                </h3>
                <ClientUsersTable users={accountUsers} onUpdateStatus={onUpdateStatus} onDeleteConfirm={onDeleteConfirm} showAccount={false} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="text-gray-500">Select an account to view its users</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientUsersTable({ users, onUpdateStatus, onDeleteConfirm, showAccount }: {
  users: any[];
  onUpdateStatus: (userId: string, status: "active" | "suspended") => void;
  onDeleteConfirm: (userId: string, userName: string, userType: 'superadmin' | 'client') => void;
  showAccount: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            {showAccount && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
            )}
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
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              {showAccount && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.accountName}</div>
                  <div className="text-sm text-gray-500">{user.accountType}</div>
                </td>
              )}
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
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user._creationTime).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  {user.status === "suspended" && (
                    <button
                      onClick={() => onUpdateStatus(user._id, "active")}
                      className="text-green-600 hover:text-green-900"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteConfirm(user._id, `${user.firstName} ${user.lastName}`, 'client')}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {users.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">No users found</div>
        </div>
      )}
    </div>
  );
}

function DeleteConfirmationModal({ userName, userType, onClose, onConfirm }: {
  userName: string;
  userType: 'superadmin' | 'client';
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-red-600 text-xl">🗑️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete {userType === 'superadmin' ? 'Super Admin' : 'User'}</h3>
            <p className="text-sm text-gray-600">This action cannot be undone</p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{userName}</strong>? 
            This will permanently remove their account and all associated data.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete {userType === 'superadmin' ? 'Super Admin' : 'User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateSuperAdminModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (userData: any) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Super Admin</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
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
              Create Super Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 