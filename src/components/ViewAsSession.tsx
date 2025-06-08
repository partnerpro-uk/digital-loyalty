import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ClientDashboard } from "./ClientDashboard";

interface ViewAsSessionProps {
  sessionToken: string;
  onExit: () => void;
}

export function ViewAsSession({ sessionToken, onExit }: ViewAsSessionProps) {
  const user = useQuery(api.auth.loggedInUser);
  const sessionInfo = useQuery(api.admin.getViewAsSessionInfo, { sessionToken });

  if (!user || !sessionInfo) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Enhanced View As Banner */}
      <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="font-semibold">🔍 View As Mode Active</span>
          <div className="flex items-center space-x-6 text-orange-100">
            <div>
              <span className="text-xs uppercase tracking-wide">Account:</span>
              <span className="ml-1 font-medium">{sessionInfo.account.name}</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide">User:</span>
              <span className="ml-1 font-medium">
                {sessionInfo.user.firstName} {sessionInfo.user.lastName}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide">Role:</span>
              <span className="ml-1 font-medium capitalize">{sessionInfo.user.role}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-orange-200">
            Session expires: {new Date(sessionInfo.expiresAt).toLocaleTimeString()}
          </div>
          <button
            onClick={onExit}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Exit View As
          </button>
        </div>
      </div>
      
      {/* Client Dashboard with session token */}
      <ClientDashboard user={user} sessionToken={sessionToken} />
    </div>
  );
}
