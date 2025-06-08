import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { AccountsList } from "./AccountsList";
import { SuperAdminUserManagement } from "./SuperAdminUserManagement";
import { DemoDataManager } from "./DemoDataManager";

interface SuperAdminDashboardProps {
  user: any;
  onViewAsUser: (accountId: string, userId: string) => void;
}

export function SuperAdminDashboard({ user, onViewAsUser }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "users" | "demo">("dashboard");

  const systemStats = useQuery(api.admin.getSystemStats, {});
  const platformStats = useQuery(api.admin.getPlatformStats, {});

  if (!systemStats || !platformStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "clients", label: "Client Accounts" },
    { id: "users", label: "User Management" },
    { id: "demo", label: "Demo Data" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Super Admin</h2>
          <p className="text-sm text-gray-600">{user.email}</p>
          <div className="mt-2">
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              SuperAdmin
            </span>
          </div>
        </div>
        <nav className="mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === "dashboard" && (
            <DashboardTab systemStats={systemStats} platformStats={platformStats} />
          )}
          {activeTab === "clients" && (
            <AccountsList onViewAsUser={onViewAsUser} />
          )}
          {activeTab === "users" && (
            <SuperAdminUserManagement />
          )}
          {activeTab === "demo" && (
            <DemoDataManager />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ systemStats, platformStats }: { systemStats: any; platformStats: any }) {
  const stats = [
    { label: "Total Client Accounts", value: platformStats.totalAccounts, color: "blue", change: "+12%" },
    { label: "Franchise Clients", value: platformStats.franchiseAccounts, color: "purple", change: "+8%" },
    { label: "Individual Clients", value: platformStats.individualAccounts, color: "green", change: "+15%" },
    { label: "Active Accounts", value: platformStats.activeAccounts, color: "emerald", change: "+5%" },
    { label: "Trial Accounts", value: platformStats.trialAccounts, color: "orange", change: "-3%" },
    { label: "Total Users", value: platformStats.totalUsers, color: "indigo", change: "+18%" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-gray-600 mt-1">Monitor system performance and client account metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <div className={`w-6 h-6 bg-${stat.color}-600 rounded`}></div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Account Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Accounts</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(platformStats.activeAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{platformStats.activeAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trial Accounts</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${(platformStats.trialAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{platformStats.trialAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expired Trials</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${(platformStats.expiredTrials / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{platformStats.expiredTrials}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Types</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Franchise Clients</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(platformStats.franchiseAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{platformStats.franchiseAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Individual Clients</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(platformStats.individualAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{platformStats.individualAccounts}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{platformStats.totalAccounts}</div>
            <div className="text-sm text-gray-600">Total Client Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{platformStats.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{platformStats.activeTrials}</div>
            <div className="text-sm text-gray-600">Active Trials</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{platformStats.paidAccounts}</div>
            <div className="text-sm text-gray-600">Paid Accounts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
