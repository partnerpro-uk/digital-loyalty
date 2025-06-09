import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface UserManagementProps {
  accountId: string;
  accountName: string;
  userRole: string;
  onBack: () => void;
}

export function UserManagement({ accountId, accountName, userRole, onBack }: UserManagementProps) {
  const [activeTab, setActiveTab] = useState<"users" | "create" | "stats">("users");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const accountUsers = useQuery(api.userManagement.getAccountUsers, { 
    accountId: accountId as any 
  });
  const userStats = useQuery(api.userManagement.getUserStats, { 
    accountId: accountId as any 
  });

  const createUser = useMutation(api.userManagement.createUser);
  const updateUser = useMutation(api.userManagement.updateUser);
  const updateUserPermissions = useMutation(api.userManagement.updateUserPermissions);
  const deleteUser = useMutation(api.userManagement.deleteUser);


  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "clientuser" as "orgadmin" | "clientuser",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createUser({
        accountId: accountId as any,
        userData: userForm,
      });
      
      toast.success("User created successfully");
      setUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "clientuser",
      });
      setActiveTab("users");
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
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



  if (!accountUsers) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "users", label: "Users", icon: "👥" },
    { id: "create", label: "Create User", icon: "➕" },
    { id: "stats", label: "Statistics", icon: "📊" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">{accountName}</p>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <UsersTab 
          users={accountUsers.users}
          onEditUser={setSelectedUser}
          onDeleteUser={handleDeleteUser}
          onEditPermissions={(user) => {
            setSelectedUser(user);
            setShowPermissionsModal(true);
          }}
        />
      )}

      {activeTab === "create" && (
        <CreateUserTab 
          userForm={userForm}
          setUserForm={setUserForm}
          onSubmit={handleCreateUser}
        />
      )}

      {activeTab === "stats" && userStats && (
        <StatsTab stats={userStats} />
      )}

      {/* Edit User Modal */}
      {selectedUser && !showPermissionsModal && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={updateUser}
        />
      )}

      {/* Permissions Modal */}
      {selectedUser && showPermissionsModal && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null);
            setShowPermissionsModal(false);
          }}
          onUpdate={updateUserPermissions}
        />
      )}
    </div>
  );
}

function UsersTab({ users, onEditUser, onDeleteUser, onEditPermissions }: {
  users: any[];
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string, userName: string) => void;
  onEditPermissions: (user: any) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        {user.permissions ? "Custom Permissions" : "Default Permissions"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone}</div>
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
                        <span className="text-xs text-green-600">✓ Email Verified</span>
                      ) : (
                        <span className="text-xs text-red-600">✗ Email Not Verified</span>
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
                        onClick={() => onEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onEditPermissions(user)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Permissions
                      </button>
                      <button
                        onClick={() => onDeleteUser(user._id, `${user.firstName} ${user.lastName}`)}
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
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No users found for this account.</div>
        </div>
      )}
    </div>
  );
}

function CreateUserTab({ userForm, setUserForm, onSubmit }: {
  userForm: any;
  setUserForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Create New User</h2>
      
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              required
              value={userForm.firstName}
              onChange={(e) => setUserForm({...userForm, firstName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={userForm.lastName}
              onChange={(e) => setUserForm({...userForm, lastName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={userForm.email}
            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            required
            value={userForm.phone}
            onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            value={userForm.role}
            onChange={(e) => setUserForm({...userForm, role: e.target.value as "orgadmin" | "clientuser"})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="clientuser">Client User</option>
            <option value="orgadmin">Organization Admin</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}

function StatsTab({ stats }: { stats: any }) {
  const statItems = [
    { label: "Total Users", value: stats.total, color: "blue" },
    { label: "Active Users", value: stats.active, color: "green" },
    { label: "Invited Users", value: stats.invited, color: "yellow" },
    { label: "Suspended Users", value: stats.suspended, color: "red" },
    { label: "Organization Admins", value: stats.orgAdmins, color: "purple" },
    { label: "Client Users", value: stats.clientUsers, color: "indigo" },
    { label: "Email Verified", value: stats.emailVerified, color: "green" },
    { label: "Recent Logins (7 days)", value: stats.recentLogins, color: "blue" },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">User Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                <div className={`w-6 h-6 bg-${stat.color}-600 rounded`}></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdate }: {
  user: any;
  onClose: () => void;
  onUpdate: any;
}) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        userId: user._id,
        updates: formData,
      });
      toast.success("User updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionsModal({ user, onClose, onUpdate }: {
  user: any;
  onClose: () => void;
  onUpdate: any;
}) {
  const [permissions, setPermissions] = useState(user.permissions || {
    customers: { view: true, create: false, edit: false, delete: false, export: false, import: false },
    communications: { sendEmail: false, sendSMS: false, bulkMessage: false, templates: false },
    reports: { basic: true, advanced: false, export: false, customReports: false },
    settings: { billingView: false, billingEdit: false, userManagement: false, integrations: false },
    features: { apiAccess: false, webhooks: false, customBranding: false, multiLocation: false },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        userId: user._id,
        permissions,
      });
      toast.success("Permissions updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update permissions");
    }
  };

  const updatePermission = (category: string, permission: string, value: boolean) => {
    setPermissions({
      ...permissions,
      [category]: {
        ...permissions[category],
        [permission]: value,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Edit Permissions - {user.firstName} {user.lastName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(permissions).map(([category, categoryPermissions]) => (
            <div key={category} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 capitalize">{category}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(categoryPermissions as any).map(([permission, value]) => (
                  <label key={permission} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => updatePermission(category, permission, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{permission.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Update Permissions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
