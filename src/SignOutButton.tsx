"use client";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  
  return (
    <button
      onClick={() => void signOut()}
      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
    >
      Sign Out
    </button>
  );
}
