import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { UserManagement } from "./UserManagement";
import IndividualDashboard from "./IndividualDashboard";
import { Customers } from "./Customers";
import { CardBuilder } from "./CardBuilder";

interface ClientDashboardProps {
  user: any;
  sessionToken?: string;
}

export function ClientDashboard({ user, sessionToken }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "customers" | "communications" | "cardbuilder" | "users">("dashboard");
  const [showUserManagement, setShowUserManagement] = useState(false);

  const dashboardData = useQuery(api.client.getDashboardData, { 
    sessionToken: sessionToken || undefined 
  });



  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
      </div>
    );
  }

  // Show user management if requested
  if (showUserManagement && dashboardData.userInfo.role === "orgadmin") {
    return (
      <UserManagement
        accountId={dashboardData.currentAccount?._id || ""}
        accountName={dashboardData.account.name}
        userRole={dashboardData.userInfo.role}
        onBack={() => setShowUserManagement(false)}
      />
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "customers", label: "Customers", icon: "👥" },
    { id: "communications", label: "Communications", icon: "📧" },
    { id: "cardbuilder", label: "Card Builder", icon: "🎫" },
    { id: "users", label: "Users", icon: "👤" },
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(tab => {
    if (tab.id === "customers") return dashboardData.permissions?.customers?.view;
    if (tab.id === "communications") return dashboardData.permissions?.communications?.sendEmail;
    if (tab.id === "cardbuilder") return true; // Card Builder available to all client account users
    if (tab.id === "users") return dashboardData.userInfo.role === "orgadmin" && dashboardData.permissions?.settings?.userManagement;
    return true;
  });

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {dashboardData.account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 truncate">{dashboardData.account.name}</h2>
              <p className="text-xs text-gray-600 truncate">{dashboardData.userInfo.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium border ${
              dashboardData.userInfo.role === "orgadmin" 
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}>
              {dashboardData.userInfo.role === "orgadmin" ? "ADMIN" : "USER"}
            </span>
            {dashboardData.isViewAsMode && (
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200">
                VIEW AS
              </span>
            )}
          </div>
        </div>
        
        <nav className="p-4">
          <div className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "dashboard" && (
          <IndividualDashboard />
        )}
        {activeTab === "customers" && (
          <div className="p-8">
            {!dashboardData ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
              </div>
            ) : !dashboardData.permissions?.customers?.view ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-gray-500">You don't have permission to view customers.</div>
              </div>
            ) : (
              <Customers />
            )}
          </div>
        )}
        {activeTab === "communications" && (
          <div className="p-8">
            {!dashboardData ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
              </div>
            ) : !dashboardData.permissions?.communications?.sendEmail ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-gray-500">You don't have permission to access communications.</div>
              </div>
            ) : (
              <CommunicationsTab permissions={dashboardData.permissions.communications} />
            )}
          </div>
        )}
        {activeTab === "cardbuilder" && (
          <div className="p-8">
            <CardBuilder />
          </div>
        )}
        {activeTab === "users" && (
          <div className="p-8">
            {!dashboardData ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
              </div>
            ) : !(dashboardData.userInfo.role === "orgadmin" && dashboardData.permissions?.settings?.userManagement) ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-gray-500">You don't have permission to manage users.</div>
              </div>
            ) : (
              <UsersTab 
                accountId={dashboardData.currentAccount?._id || ""}
                accountName={dashboardData.account.name}
                onManageUsers={() => setShowUserManagement(true)}
                sessionToken={sessionToken}
              />
            )}
          </div>
        )}
      </div>


    </div>
  );
}

function DashboardTab({ dashboardData }: { dashboardData: any }) {
  const stats = [
    { label: "Total Customers", value: dashboardData.stats.totalCustomers, color: "blue" },
    { label: "Active Customers", value: dashboardData.stats.activeCustomers, color: "green" },
    { label: "Inactive Customers", value: dashboardData.stats.inactiveCustomers, color: "red" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {dashboardData.account.planStatus === "trial" && (
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            Trial: {dashboardData.account.trialDaysRemaining} days remaining
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Account Type</span>
              <span className="font-semibold capitalize">{dashboardData.account.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plan</span>
              <span className="font-semibold">{dashboardData.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-semibold ${
                dashboardData.account.status === "active" ? "text-green-600" : "text-red-600"
              }`}>
                {dashboardData.account.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Limits</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Max Customers</span>
              <span className="font-semibold">{dashboardData.limits.maxCustomers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Emails</span>
              <span className="font-semibold">{dashboardData.limits.maxMonthlyEmails.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Users</span>
              <span className="font-semibold">{dashboardData.limits.maxUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function CommunicationsTab({ permissions }: { permissions: any }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Communications</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Email Features</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Send Email</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                permissions.sendEmail 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {permissions.sendEmail ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bulk Messaging</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                permissions.bulkMessage 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {permissions.bulkMessage ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Templates</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                permissions.templates 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {permissions.templates ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">SMS Features</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Send SMS</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                permissions.sendSMS 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {permissions.sendSMS ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {permissions.sendEmail && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex space-x-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Compose Email
            </button>
            {permissions.bulkMessage && (
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                Send Bulk Message
              </button>
            )}
            {permissions.templates && (
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                Manage Templates
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ accountId, accountName, onManageUsers, sessionToken }: {
  accountId: string;
  accountName: string;
  onManageUsers: () => void;
  sessionToken?: string;
}) {
  const userStats = useQuery(api.userManagement.getUserStats, { 
    accountId: accountId as any 
  });
  const accountUsers = useQuery(api.userManagement.getAccountUsers, { 
    accountId: accountId as any 
  });

  if (!userStats || !accountUsers) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: userStats.total, color: "blue" },
    { label: "Active Users", value: userStats.active, color: "green" },
    { label: "Invited Users", value: userStats.invited, color: "yellow" },
    { label: "Organization Admins", value: userStats.orgAdmins, color: "purple" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={onManageUsers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Manage Users
        </button>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
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

      {/* Recent Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
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
              {accountUsers.users.slice(0, 5).map((user) => (
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
        {accountUsers.users.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No users found for this account.</div>
            <button
              onClick={onManageUsers}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Your First User
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
