"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { forgotPassword, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;
        setSubmitting(true);
        try {
            await forgotPassword(email);
            toast.success(
                "If your email is registered, you will receive a password reset link"
            );
            router.push("/auth?tab=login");
        } catch (err) {
            toast.error(err.message || "Failed to request password reset");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <h1 className="text-2xl font-semibold mb-6">Forgot Password</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter your email address and we&apos;ll send you a link to reset your
                    password.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={submitting || loading}
                        className="w-full"
                    >
                        {submitting || loading ? "Sending..." : "Send reset link"}
                    </Button>
                </form>
                <div className="mt-4 text-sm">
                    <Link href="/auth" className="text-primary hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
