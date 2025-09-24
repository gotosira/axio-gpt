"use client";

import React, { useState, useEffect } from "react";
import { CustomAuthModal } from "./CustomAuthModal";

interface CustomAuthWrapperProps {
  children: React.ReactNode;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export function CustomAuthWrapper({ children }: CustomAuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setShowAuthModal(false);
      } else {
        setUser(null);
        // Redirect unauthenticated users to full-screen login page, unless already there
        if (typeof window !== 'undefined') {
          const isOnLogin = window.location.pathname.startsWith('/login');
          if (!isOnLogin) {
            window.location.href = '/login';
          }
        }
        setShowAuthModal(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      if (typeof window !== 'undefined') {
        const isOnLogin = window.location.pathname.startsWith('/login');
        if (!isOnLogin) {
          window.location.href = '/login';
        }
      }
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    checkAuthStatus(); // Refresh user data
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
      setShowAuthModal(true);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202123] flex items-center justify-center animate-fade-in">
        <div className="text-center animate-scale-in">
          <img src="/Happy_Hugging_loading.gif" alt="loading" className="w-56 h-56 md:w-64 md:h-64 mx-auto mb-6 object-contain" />
          <p className="text-white text-lg">Please be patient, we are loading some goodies!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Render children */}
      <div className="app-fade-wrapper">
        {children}
      </div>
      {/* Keep modal available if you want inline auth, but disabled by default to favor /login */}
      {false && (
        <CustomAuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
