import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { AccountsList } from "./AccountsList";
import { SuperAdminUserManagement } from "./SuperAdminUserManagement";
import { PlansManager } from "./PlansManager";

interface SuperAdminDashboardProps {
  user: any;
  onViewAsUser: (accountId: string, userId: string) => void;
}

export function SuperAdminDashboard({ user, onViewAsUser }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "users" | "plans">("dashboard");

  const systemStats = useQuery(api.admin.getSystemStats, {});
  const platformStats = useQuery(api.admin.getPlatformStats, {});

  if (!systemStats || !platformStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "clients", label: "Client Accounts", icon: "🏢" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "plans", label: "Plans Manager", icon: "💳" },
  ];

  return (
    <div className="flex bg-white" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        <nav className="p-6">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium text-left transition-colors border ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
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
          {activeTab === "plans" && (
            <PlansManager />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ systemStats, platformStats }: { systemStats: any; platformStats: any }) {
  const stats = [
    { label: "Total Client Accounts", value: platformStats.totalAccounts, color: "border-blue-200 bg-blue-50", textColor: "text-blue-900", change: "+12%" },
    { label: "Franchise Clients", value: platformStats.franchiseAccounts, color: "border-purple-200 bg-purple-50", textColor: "text-purple-900", change: "+8%" },
    { label: "Individual Clients", value: platformStats.individualAccounts, color: "border-green-200 bg-green-50", textColor: "text-green-900", change: "+15%" },
    { label: "Active Accounts", value: platformStats.activeAccounts, color: "border-emerald-200 bg-emerald-50", textColor: "text-emerald-900", change: "+5%" },
    { label: "Trial Accounts", value: platformStats.trialAccounts, color: "border-orange-200 bg-orange-50", textColor: "text-orange-900", change: "-3%" },
    { label: "Total Users", value: platformStats.totalUsers, color: "border-indigo-200 bg-indigo-50", textColor: "text-indigo-900", change: "+18%" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Platform Overview</h1>
        <p className="text-gray-600">Monitor system performance and client account metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-white border ${stat.color} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} border flex items-center justify-center`}>
                <div className="w-4 h-4 bg-gray-400"></div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-700' : 'text-red-700'
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
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Accounts</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 h-2">
                  <div 
                    className="bg-green-600 h-2" 
                    style={{ width: `${(platformStats.activeAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{platformStats.activeAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trial Accounts</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 h-2">
                  <div 
                    className="bg-orange-600 h-2" 
                    style={{ width: `${(platformStats.trialAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{platformStats.trialAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expired Trials</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 h-2">
                  <div 
                    className="bg-red-600 h-2" 
                    style={{ width: `${(platformStats.expiredTrials / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{platformStats.expiredTrials}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Types</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Franchise Clients</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 h-2">
                  <div 
                    className="bg-blue-600 h-2" 
                    style={{ width: `${(platformStats.franchiseAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{platformStats.franchiseAccounts}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Individual Clients</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 h-2">
                  <div 
                    className="bg-green-600 h-2" 
                    style={{ width: `${(platformStats.individualAccounts / platformStats.totalAccounts) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{platformStats.individualAccounts}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="bg-white border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{platformStats.totalAccounts}</div>
            <div className="text-sm text-gray-600">Total Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{platformStats.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{platformStats.activeAccounts}</div>
            <div className="text-sm text-gray-600">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">$24.5k</div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
