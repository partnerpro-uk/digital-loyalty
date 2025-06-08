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
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-600">PartnerPro Admin</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const [viewAsSessionToken, setViewAsSessionToken] = useState<string | null>(null);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const createProfile = useMutation(api.users.createUserProfile);

  // Auto-create profile for new users
  useEffect(() => {
    if (loggedInUser && !loggedInUser.profile) {
      createProfile();
    }
  }, [loggedInUser, createProfile]);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                PartnerPro Admin Platform
              </h1>
              <p className="text-gray-600">
                Multi-tenant SaaS administration and client management
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function UserDashboard({ 
  user, 
  viewAsSessionToken, 
  setViewAsSessionToken 
}: { 
  user: any; 
  viewAsSessionToken: string | null;
  setViewAsSessionToken: (token: string | null) => void;
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
        onExit={() => setViewAsSessionToken(null)} 
      />
    );
  }

  if (role === "superadmin") {
    return <SuperAdminDashboard user={user} onViewAsUser={setViewAsSessionToken} />;
  }

  return <ClientDashboard user={user} sessionToken={viewAsSessionToken || undefined} />;
}
