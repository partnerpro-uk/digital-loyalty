import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function SuperAdminUserManagement() {
  const [activeTab, setActiveTab] = useState<"overview" | "search" | "accounts">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Queries
  const systemUserStats = useQuery(api.adminUsers.getSystemUserStats);
  const allAccounts = useQuery(api.admin.listAccounts, {});
  const searchResults = useQuery(
    api.adminUsers.searchUsers,
    searchTerm.length >= 2 ? { searchTerm } : "skip"
  );
  const accountUsers = useQuery(
    api.admin.getAccountUsers,
    selectedAccount ? { accountId: selectedAccount as any } : "skip"
  );

  // Mutations
  const updateUserStatus = useMutation(api.adminUsers.updateUserStatus);
  const deleteUser = useMutation(api.adminUsers.deleteUser);
  const resetUserPassword = useMutation(api.adminUsers.resetUserPassword);

  const handleUpdateUserStatus = async (userId: string, status: "active" | "suspended" | "invited") => {
    try {
      await updateUserStatus({ userId: userId as any, status });
      toast.success(`User status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser({ userId: userId as any });
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset password for ${userName}? They will receive an email with reset instructions.`)) {
      return;
    }

    try {
      await resetUserPassword({ userId: userId as any });
      toast.success("Password reset email sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send password reset");
    }
  };

  if (!systemUserStats || !allAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "System Overview", icon: "📊" },
    { id: "search", label: "Search Users", icon: "🔍" },
    { id: "accounts", label: "By Account", icon: "🏢" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage users across all accounts in the system</p>
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
      {activeTab === "overview" && (
        <SystemOverviewTab stats={systemUserStats} />
      )}

      {activeTab === "search" && (
        <SearchUsersTab
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchResults={searchResults}
          onUserAction={(user, action) => {
            if (action === "view") {
              setSelectedUser(user);
              setShowUserModal(true);
            } else if (action === "suspend") {
              handleUpdateUserStatus(user._id, "suspended");
            } else if (action === "activate") {
              handleUpdateUserStatus(user._id, "active");
            } else if (action === "delete") {
              handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`);
            } else if (action === "reset") {
              handleResetPassword(user._id, `${user.firstName} ${user.lastName}`);
            }
          }}
        />
      )}

      {activeTab === "accounts" && (
        <AccountUsersTab
          accounts={allAccounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          accountUsers={accountUsers}
          onUserAction={(user, action) => {
            if (action === "view") {
              setSelectedUser(user);
              setShowUserModal(true);
            } else if (action === "suspend") {
              handleUpdateUserStatus(user._id, "suspended");
            } else if (action === "activate") {
              handleUpdateUserStatus(user._id, "active");
            } else if (action === "delete") {
              handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`);
            } else if (action === "reset") {
              handleResetPassword(user._id, `${user.firstName} ${user.lastName}`);
            }
          }}
        />
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onAction={(action) => {
            if (action === "suspend") {
              handleUpdateUserStatus(selectedUser._id, "suspended");
            } else if (action === "activate") {
              handleUpdateUserStatus(selectedUser._id, "active");
            } else if (action === "delete") {
              handleDeleteUser(selectedUser._id, `${selectedUser.firstName} ${selectedUser.lastName}`);
              setShowUserModal(false);
              setSelectedUser(null);
            } else if (action === "reset") {
              handleResetPassword(selectedUser._id, `${selectedUser.firstName} ${selectedUser.lastName}`);
            }
          }}
        />
      )}
    </div>
  );
}

function SystemOverviewTab({ stats }: { stats: any }) {
  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      change: "+12%",
      changeType: "positive",
      icon: "👥",
      color: "blue"
    },
    {
      label: "Active Users",
      value: stats.activeUsers,
      change: "+8%",
      changeType: "positive",
      icon: "✅",
      color: "green"
    },
    {
      label: "Suspended Users",
      value: stats.suspendedUsers,
      change: "-5%",
      changeType: "negative",
      icon: "⚠️",
      color: "red"
    },
    {
      label: "Invited Users",
      value: stats.invitedUsers,
      change: "+15%",
      changeType: "positive",
      icon: "📧",
      color: "yellow"
    },
  ];

  const roleStats = [
    {
      label: "Super Admins",
      value: stats.superAdmins,
      percentage: Math.round((stats.superAdmins / stats.totalUsers) * 100),
      color: "bg-red-500"
    },
    {
      label: "Organization Admins",
      value: stats.orgAdmins,
      percentage: Math.round((stats.orgAdmins / stats.totalUsers) * 100),
      color: "bg-purple-500"
    },
    {
      label: "Client Users",
      value: stats.clientUsers,
      percentage: Math.round((stats.clientUsers / stats.totalUsers) * 100),
      color: "bg-blue-500"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">{stat.icon}</span>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                stat.changeType === 'positive' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Role Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">User Roles Distribution</h2>
          <div className="space-y-4">
            {roleStats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{stat.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${stat.color}`}
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{stat.percentage}% of total users</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">New Users (Last 7 days)</span>
              <span className="text-sm font-semibold text-green-700">{stats.newUsersWeek}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Active Logins (Last 24h)</span>
              <span className="text-sm font-semibold text-blue-700">{stats.activeLogins24h}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Password Resets (Last 7 days)</span>
              <span className="text-sm font-semibold text-yellow-700">{stats.passwordResets}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Email Verification Pending</span>
              <span className="text-sm font-semibold text-gray-700">{stats.emailVerificationPending}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchUsersTab({ searchTerm, setSearchTerm, searchResults, onUserAction }: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any;
  onUserAction: (user: any, action: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Users
          </label>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
          <p className="text-sm text-gray-500 mt-2">
            Enter at least 2 characters to search
          </p>
        </div>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length})
            </h2>
          </div>
          
          {searchResults.length > 0 ? (
            <UserTable users={searchResults} onUserAction={onUserAction} showAccount={true} />
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-500">No users found matching your search criteria</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountUsersTab({ accounts, selectedAccount, setSelectedAccount, accountUsers, onUserAction }: {
  accounts: any[];
  selectedAccount: string | null;
  setSelectedAccount: (accountId: string | null) => void;
  accountUsers: any;
  onUserAction: (user: any, action: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account._id}
              className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                selectedAccount === account._id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedAccount(account._id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">{account.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  account.type === "franchise" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                }`}>
                  {account.type}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">{account.primaryContact.email}</p>
              <div className="mt-2 text-sm text-gray-500">
                {account.userCount} users
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Users */}
      {selectedAccount && accountUsers && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Account Users ({accountUsers.length})
            </h2>
          </div>
          
          {accountUsers.length > 0 ? (
            <UserTable users={accountUsers} onUserAction={onUserAction} showAccount={false} />
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-500">No users found for this account</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserTable({ users, onUserAction, showAccount }: {
  users: any[];
  onUserAction: (user: any, action: string) => void;
  showAccount: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
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
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {user._id.slice(-8)}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{user.email}</div>
                <div className="text-sm text-gray-500">{user.phone}</div>
              </td>
              {showAccount && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.accountName}</div>
                  <div className="text-sm text-gray-500">{user.accountType}</div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === "superadmin" 
                    ? "bg-red-100 text-red-800"
                    : user.role === "orgadmin" 
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col space-y-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.status === "active" 
                      ? "bg-green-100 text-green-800"
                      : user.status === "invited"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {user.status}
                  </span>
                  {user.emailVerified ? (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  ) : (
                    <span className="text-xs text-red-600">✗ Unverified</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.lastLogin ? (
                  new Date(user.lastLogin).toLocaleDateString()
                ) : (
                  "Never"
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onUserAction(user, "view")}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                  {user.status === "active" ? (
                    <button
                      onClick={() => onUserAction(user, "suspend")}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserAction(user, "activate")}
                      className="text-green-600 hover:text-green-900"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => onUserAction(user, "reset")}
                    className="text-purple-600 hover:text-purple-900"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => onUserAction(user, "delete")}
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
  );
}

function UserDetailsModal({ user, onClose, onAction }: {
  user: any;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
            <p className="text-sm text-gray-600 mt-1">{user.firstName} {user.lastName}</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <span className="text-sm text-gray-900 ml-2">{user.firstName} {user.lastName}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="text-sm text-gray-900 ml-2">{user.email}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone:</span>
                  <span className="text-sm text-gray-900 ml-2">{user.phone}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">User ID:</span>
                  <span className="text-sm text-gray-900 ml-2 font-mono">{user._id}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Role:</span>
                  <span className={`text-sm ml-2 px-2 py-1 rounded-full ${
                    user.role === "superadmin" 
                      ? "bg-red-100 text-red-800"
                      : user.role === "orgadmin" 
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`text-sm ml-2 px-2 py-1 rounded-full ${
                    user.status === "active" 
                      ? "bg-green-100 text-green-800"
                      : user.status === "invited"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {user.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email Verified:</span>
                  <span className={`text-sm ml-2 ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.emailVerified ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Account:</span>
                  <span className="text-sm text-gray-900 ml-2">{user.accountName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Created</div>
                <div className="text-sm text-gray-900 font-medium">
                  {new Date(user._creationTime).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Last Login</div>
                <div className="text-sm text-gray-900 font-medium">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          {user.permissions && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Permissions</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(user.permissions, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Last updated: {new Date(user._creationTime).toLocaleString()}
          </div>
          <div className="flex space-x-3">
            {user.status === "active" ? (
              <button
                onClick={() => onAction("suspend")}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Suspend User
              </button>
            ) : (
              <button
                onClick={() => onAction("activate")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Activate User
              </button>
            )}
            <button
              onClick={() => onAction("reset")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Reset Password
            </button>
            <button
              onClick={() => onAction("delete")}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
