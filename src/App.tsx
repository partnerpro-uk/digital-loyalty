import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { ClientDashboard } from "./components/ClientDashboard";
import { ViewAsSession } from "./components/ViewAsSession";
import { useEffect, useState } from "react";

export default function App() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1">
        <Content loggedInUser={loggedInUser} />
      </main>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
          },
        }}
      />
    </div>
  );
}

function Content({ loggedInUser }: { loggedInUser: any }) {
  const [viewAsSessionToken, setViewAsSessionToken] = useState<string | null>(null);
  const createProfile = useMutation(api.users.createUserProfile);
  const startViewAsSession = useMutation(api.admin.startViewAsUserSession);
  const endViewAsSession = useMutation(api.admin.endViewAsUserSession);

  // Auto-create profile for new users
  useEffect(() => {
    if (loggedInUser && !loggedInUser.profile) {
      createProfile();
    }
  }, [loggedInUser, createProfile]);

  const handleViewAsUser = async (accountId: string, userId: string) => {
    try {
      const session = await startViewAsSession({ 
        accountId: accountId as any, 
        userId: userId as any 
      });
      setViewAsSessionToken(session.sessionToken);
    } catch (error) {
      console.error('Failed to start view-as session:', error);
    }
  };

  const handleEndViewAs = async () => {
    if (viewAsSessionToken) {
      try {
        await endViewAsSession({ sessionToken: viewAsSessionToken });
        setViewAsSessionToken(null);
      } catch (error) {
        console.error('Failed to end view-as session:', error);
      }
    }
  };

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Authenticated>
        <UserDashboard 
          user={loggedInUser} 
          viewAsSessionToken={viewAsSessionToken}
          setViewAsSessionToken={setViewAsSessionToken}
          onViewAsUser={handleViewAsUser}
          onEndViewAs={handleEndViewAs}
        />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white border border-gray-200 p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-black mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  PartnerPro Admin
                </h1>
                <p className="text-gray-600 text-sm">
                  Multi-tenant SaaS administration platform
                </p>
              </div>
              <SignInForm />
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function UserDashboard({ 
  user, 
  viewAsSessionToken, 
  setViewAsSessionToken,
  onViewAsUser,
  onEndViewAs
}: { 
  user: any; 
  viewAsSessionToken: string | null;
  setViewAsSessionToken: (token: string | null) => void;
  onViewAsUser: (accountId: string, userId: string) => void;
  onEndViewAs: () => void;
}) {
  const role = user.profile?.role;

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account Setup Required
          </h2>
          <p className="text-gray-600">
            Your account profile is being set up. Please contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  // Handle view-as session
  if (viewAsSessionToken) {
    return (
      <ViewAsSession 
        sessionToken={viewAsSessionToken} 
        onExit={onEndViewAs} 
      />
    );
  }

  if (role === "superadmin") {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader user={user} viewAsSessionToken={viewAsSessionToken} onEndViewAs={onEndViewAs} />
        <SuperAdminDashboard user={user} onViewAsUser={onViewAsUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader user={user} viewAsSessionToken={viewAsSessionToken} onEndViewAs={onEndViewAs} />
      <ClientDashboard user={user} sessionToken={viewAsSessionToken || undefined} />
    </div>
  );
}

// New App Header Component
function AppHeader({ user, viewAsSessionToken, onEndViewAs }: { 
  user: any; 
  viewAsSessionToken: string | null;
  onEndViewAs: () => void;
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const viewAsInfo = useQuery(
    api.admin.getViewAsSessionInfo, 
    viewAsSessionToken ? { sessionToken: viewAsSessionToken } : "skip"
  );

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">PartnerPro</h1>
          </div>
        </div>

        {/* View As Status */}
        {viewAsSessionToken && viewAsInfo && (
          <div className="flex items-center space-x-3 ml-8">
            <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 border border-orange-200">
              <span className="text-sm font-medium text-orange-800">VIEWING AS:</span>
              <span className="text-sm text-orange-700">
                {viewAsInfo.user.firstName} {viewAsInfo.user.lastName} @ {viewAsInfo.account.name}
              </span>
            </div>
            <button
              onClick={onEndViewAs}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              Exit View As
            </button>
          </div>
        )}
      </div>
      
      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
              <span className="text-white font-medium text-xs">
                {user.profile?.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {user.profile?.firstName} {user.profile?.lastName}
              </div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 shadow-lg z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.profile?.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    <span className={`px-2 py-0.5 border ${
                      user.profile?.role === "superadmin" 
                        ? "bg-red-50 text-red-800 border-red-200"
                        : user.profile?.role === "orgadmin"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}>
                      {user.profile?.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Account Settings
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Preferences
              </button>
              <div className="border-t border-gray-200 my-2"></div>
              <SignOutButton />
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          ></div>
        )}
      </div>
    </header>
  );
}
