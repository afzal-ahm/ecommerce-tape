"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast, Toaster } from "sonner";

function VerifyOtpContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { verifyOtp, resendVerification } = useAuth();

    const initialEmail = useMemo(
        () => searchParams.get("email") || "",
        [searchParams]
    );
    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        setEmail(initialEmail);
    }, [initialEmail]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!email) return toast.error("Email is required");
        if (!/^\d{6}$/.test(otp)) return toast.error("Enter 6-digit OTP");

        setIsSubmitting(true);
        try {
            await verifyOtp(email, otp);
            toast.success("Verification successful! Logging you in...");

            // Give context state a moment to update
            setTimeout(() => {
                router.push("/");
            }, 500);
        } catch (err) {
            toast.error(err.message || "Failed to verify OTP");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!email) return toast.error("Enter your email to resend OTP");
        try {
            await resendVerification(email);
            toast.success("OTP sent to your email");
            setResendCooldown(30);
        } catch (err) {
            toast.error(err.message || "Failed to resend OTP");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Toaster position="top-center" />
            <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
                    <p className="mt-2 text-gray-600">
                        Enter the 6-digit OTP sent to your email
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleVerify}>
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Email Address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="otp"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            One-Time Password (OTP)
                        </label>
                        <Input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6}"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="Enter 6-digit OTP"
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Verifying..." : "Verify"}
                    </Button>
                </form>

                <div className="flex items-center justify-between text-sm">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        className={`text-primary hover:underline disabled:text-gray-400`}
                    >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                    <Link href="/auth" className="text-gray-600 hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <VerifyOtpContent />
        </Suspense>
    );
}
