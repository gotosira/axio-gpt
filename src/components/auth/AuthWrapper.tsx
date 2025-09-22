"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LoginModal } from "./LoginModal";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    console.log("AuthWrapper - Session status:", status);
    console.log("AuthWrapper - Session data:", session);
    
    // Show login modal if no valid session
    if (status === "unauthenticated" || !session?.user?.id) {
      console.log("AuthWrapper - Showing login modal");
      setShowLoginModal(true);
    } else if (status === "authenticated" && session?.user?.id) {
      console.log("AuthWrapper - User authenticated, hiding login modal");
      setShowLoginModal(false);
    }
  }, [status, session]);

  // Show loading state while checking authentication
  if (status === "loading") {
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
      <div className={`app-fade-wrapper ${introDone ? 'ready' : ''}`}
        onAnimationEnd={() => setIntroDone(true)}
      >
        {children}
      </div>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
}

