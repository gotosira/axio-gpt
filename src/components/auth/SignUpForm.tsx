"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/I18nProvider";

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  onSuccess: () => void;
  variant?: "card" | "plain"; // plain matches login page styling
}

export function SignUpForm({ onSwitchToSignIn, onSuccess, variant = "card" }: SignUpFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sign up failed");
      }

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">{t('fullName')}</Label>
        <Input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="Enter your full name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="Enter your password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" />
      </div>
      <button type="submit" className="w-full h-10 rounded-md bg-[#0b5cd6] text-white font-semibold hover:bg-[#0a56c8]" disabled={isLoading}>
        {isLoading ? "Creating Account..." : t('createAccountCta')}
      </button>
    </form>
  );

  if (variant === "plain") {
    return (
      <div>
        <div className="mb-2 text-sm font-semibold">{t('createAccount')}</div>
        <div className="mb-6 text-xs text-[#6b7280]">{t('signUpLead', { app: process.env.NEXT_PUBLIC_APP_NAME || 'APP' })}</div>
        {form}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {t('alreadyHave')}{" "}
            <button type="button" onClick={onSwitchToSignIn} className="text-blue-600 hover:text-blue-500 font-medium">{t('signIn')}</button>
          </p>
        </div>
      </div>
    );
  }

  // Fallback card variant (legacy)
  return (
    <div className="w-full max-w-md border rounded-md p-4">
      {form}
    </div>
  );
}
