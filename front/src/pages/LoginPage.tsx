"use client";

import type React from "react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { loginbg } from "@/assets";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate inputs
    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      setFormError(error.message || "Failed to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={loginbg}
            alt="Admin Login Background"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
        {/* Background Gradient Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Admin Login Panel
            </h1>
            <p className="text-gray-400 text-sm">
              Enter your credentials to access the admin dashboard
            </p>
          </div>

          {/* Error Display */}
          {(error || formError) && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm p-4">
              <p className="text-sm text-red-400 font-medium text-center">
                {formError || error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  disabled={isSubmitting}
                  required
                  className={`w-full h-12 px-4 bg-gray-900/50 backdrop-blur-sm border rounded-lg text-white placeholder-gray-500 
                    transition-all duration-200
                    ${
                      focusedField === "email"
                        ? "border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.1)]"
                        : "border-gray-700 hover:border-gray-600"
                    }
                    focus:outline-none focus:ring-0
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={isSubmitting}
                  required
                  className={`w-full h-12 px-4 pr-20 bg-gray-900/50 backdrop-blur-sm border rounded-lg text-white placeholder-gray-500 
                    transition-all duration-200
                    ${
                      focusedField === "password"
                        ? "border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.1)]"
                        : "border-gray-700 hover:border-gray-600"
                    }
                    focus:outline-none focus:ring-0
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 
                border border-gray-700 hover:border-gray-600 
                text-white rounded-lg
                shadow-lg shadow-black/20
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center space-x-2
                group"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <svg
                    className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
