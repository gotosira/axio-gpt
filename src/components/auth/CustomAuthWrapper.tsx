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
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setShowAuthModal(true);
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <p className="text-white text-lg">Loading...</p>
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
      
      <CustomAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
