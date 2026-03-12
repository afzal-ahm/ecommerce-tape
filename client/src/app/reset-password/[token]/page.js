"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/utils";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Password requirement component
const PasswordRequirement = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-red-500"}`}>
        {met ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        <span>{text}</span>
    </div>
);

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token;

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Password validation checks
    const [passwordChecks, setPasswordChecks] = useState({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
        hasSymbol: false,
    });
    const [passwordsMatch, setPasswordsMatch] = useState(false);

    // Update password checks whenever password changes
    useEffect(() => {
        setPasswordChecks({
            minLength: password.length >= 8,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password),
        });
    }, [password]);

    // Check if passwords match
    useEffect(() => {
        setPasswordsMatch(password.length > 0 && password === confirmPassword);
    }, [password, confirmPassword]);

    const allRequirementsMet = Object.values(passwordChecks).every(Boolean);
    const canSubmit = allRequirementsMet && passwordsMatch && !isSubmitting;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canSubmit) {
            if (!allRequirementsMet) {
                toast.error("Please meet all password requirements");
                return;
            }
            if (!passwordsMatch) {
                toast.error("Passwords do not match");
                return;
            }
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetchApi(`/users/reset-password/${token}`, {
                method: "POST",
                body: JSON.stringify({ password }),
            });

            if (response.success) {
                setIsSuccess(true);
                toast.success("Password reset successfully!");
                setTimeout(() => {
                    router.push("/auth?tab=login");
                }, 3000);
            } else {
                toast.error(response.message || "Failed to reset password");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            if (error.message?.includes("Invalid reset token") || error.message?.includes("expired")) {
                toast.error("This reset link has expired. Please request a new one.");
            } else {
                toast.error(error.message || "Failed to reset password. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
                    <p className="text-gray-600 mb-6">
                        Your password has been changed successfully. You will be redirected to login page shortly.
                    </p>
                    <Link href="/auth?tab=login">
                        <Button className="w-full">Go to Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image
                            src="/logo.png"
                            alt="D-Fix Kart"
                            width={150}
                            height={50}
                            className="mx-auto h-12 w-auto"
                        />
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-7 h-7 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
                        <p className="text-gray-600 mt-2 text-sm">
                            Enter your new password below
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            {password.length > 0 && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1.5">
                                    <p className="text-xs font-medium text-gray-600 mb-2">Password must have:</p>
                                    <PasswordRequirement met={passwordChecks.minLength} text="At least 8 characters" />
                                    <PasswordRequirement met={passwordChecks.hasLetter} text="At least one letter (a-z, A-Z)" />
                                    <PasswordRequirement met={passwordChecks.hasNumber} text="At least one number (0-9)" />
                                    <PasswordRequirement met={passwordChecks.hasSymbol} text="At least one symbol (!@#$%^&*)" />
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className={`pr-10 ${confirmPassword.length > 0
                                            ? passwordsMatch
                                                ? "border-green-500 focus:ring-green-500"
                                                : "border-red-500 focus:ring-red-500"
                                            : ""
                                        }`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && (
                                <p className={`text-xs mt-1 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={!canSubmit}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resetting Password...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/auth?tab=login"
                            className="text-sm text-primary hover:underline"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
