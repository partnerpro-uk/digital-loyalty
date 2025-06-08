import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function DemoDataManager() {
  const [isCreatingPlans, setIsCreatingPlans] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const plans = useQuery(api.admin.getPlans);
  const accounts = useQuery(api.admin.listAccounts, { limit: 5 });
  
  const createDemoPlans = useMutation(api.plans.createDemoPlans);
  const createDemoAccount = useMutation(api.plans.createDemoAccount);

  const handleCreatePlans = async () => {
    setIsCreatingPlans(true);
    try {
      const result = await createDemoPlans();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to create demo plans");
    } finally {
      setIsCreatingPlans(false);
    }
  };

  const handleCreateDemoAccount = async (type: "franchise" | "individual") => {
    if (!plans || plans.length === 0) {
      toast.error("Please create demo plans first");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const planId = type === "franchise" 
        ? plans.find(p => p.name === "Enterprise")?._id
        : plans.find(p => p.name === "Starter")?._id;

      if (!planId) {
        toast.error("Required plan not found");
        return;
      }

      const accountName = type === "franchise" 
        ? `Demo Franchise ${Math.floor(Math.random() * 1000)}`
        : `Demo Business ${Math.floor(Math.random() * 1000)}`;

      const result = await createDemoAccount({
        name: accountName,
        type,
        planId,
        adminEmail: `admin@${accountName.toLowerCase().replace(/\s+/g, '')}.com`,
        adminName: "Demo Admin",
        trialDays: 14,
      });

      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to create demo account");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Demo Data Management</h1>
      
      <div className="space-y-6">
        {/* Plans Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Demo Plans</h2>
            <button
              onClick={handleCreatePlans}
              disabled={isCreatingPlans || (plans && plans.length > 0)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingPlans ? "Creating..." : "Create Demo Plans"}
            </button>
          </div>
          
          {plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan._id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-2xl font-bold text-blue-600 my-2">
                    ${plan.price}<span className="text-sm text-gray-500">/{plan.billingPeriod}</span>
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {plan.features.maxUsers} users</li>
                    <li>• {plan.features.maxSubAccounts} sub-accounts</li>
                    <li>• {plan.features.apiCalls} API calls</li>
                    <li>• {plan.features.dataRetention} days retention</li>
                  </ul>
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      plan.type === "franchise" 
                        ? "bg-purple-100 text-purple-800" 
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {plan.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No plans created yet. Click the button above to create demo plans.</p>
          )}
        </div>

        {/* Demo Accounts Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Demo Accounts</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => handleCreateDemoAccount("individual")}
                disabled={isCreatingAccount || !plans || plans.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreatingAccount ? "Creating..." : "Create Individual Account"}
              </button>
              <button
                onClick={() => handleCreateDemoAccount("franchise")}
                disabled={isCreatingAccount || !plans || plans.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreatingAccount ? "Creating..." : "Create Franchise Account"}
              </button>
            </div>
          </div>

          {accounts && accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr key={account._id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.primaryContact.email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.type === "franchise" 
                            ? "bg-purple-100 text-purple-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {account.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.plan?.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.planStatus === "active" 
                            ? "bg-green-100 text-green-800"
                            : account.planStatus === "trial"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {account.planStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.trialStatus ? (
                          account.trialStatus.isExpired ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            <span className="text-orange-600">
                              {account.trialStatus.daysRemaining} days left
                            </span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.customerCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No demo accounts created yet. Use the buttons above to create demo accounts.</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Demo Data Instructions</h3>
          <div className="text-blue-800 space-y-2">
            <p>1. <strong>Create Demo Plans:</strong> This will create 3 plans (Starter, Professional, Enterprise) with different features and pricing.</p>
            <p>2. <strong>Create Demo Accounts:</strong> This will create sample accounts with trial periods and demo customers.</p>
            <p>3. <strong>Trial Management:</strong> All demo accounts start with a 14-day trial period that you can manage from the accounts list.</p>
            <p>4. <strong>View As Mode:</strong> Use the "View As" feature to see how the platform looks from a client's perspective.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
