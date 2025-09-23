"use client";

import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

interface CustomAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomAuthModal({ isOpen, onClose, onSuccess }: CustomAuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <span className="text-lg">×</span>
        </button>

        {/* Modal content */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with logo */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">A</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? "Welcome to AXIO-GPT" : "Welcome Back"}
            </h1>
            <p className="text-white/80">
              {isSignUp 
                ? "Sign up to start chatting with AI and save your conversations" 
                : "Sign in to continue using AXIO GPT"
              }
            </p>
          </div>

          {/* Form content */}
          <div className="p-8">
            {isSignUp ? (
              <SignUpForm 
                onSwitchToSignIn={() => setIsSignUp(false)}
                onSuccess={onSuccess}
              />
            ) : (
              <SignInForm 
                onSwitchToSignUp={() => setIsSignUp(true)}
                onSuccess={onSuccess}
              />
            )}
          </div>

          {/* Features */}
          <div className="bg-gray-50 px-8 py-6 border-t">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Save all your conversations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Access from any device</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Use your custom AI assistant</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t">
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
