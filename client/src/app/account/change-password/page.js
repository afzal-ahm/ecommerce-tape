"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi } from "@/lib/utils";

export default function ChangePasswordPage() {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => { if (!loading && !isAuthenticated) router.push("/auth"); }, [isAuthenticated, loading, router]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
    const togglePasswordVisibility = (field) => { setShowPassword((prev) => ({ ...prev, [field]: !prev[field] })); };

    const validateForm = () => {
        if (!formData.currentPassword) { setMessage({ type: "error", text: "Current password is required" }); return false; }
        if (formData.newPassword.length < 8) { setMessage({ type: "error", text: "New password must be at least 8 characters long" }); return false; }
        if (formData.newPassword !== formData.confirmPassword) { setMessage({ type: "error", text: "New passwords do not match" }); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            await fetchApi("/users/change-password", { method: "POST", credentials: "include", body: JSON.stringify({ currentPassword: formData.currentPassword, newPassword: formData.newPassword }) });
            setMessage({ type: "success", text: "Password changed successfully" });
            setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Failed to change password. Please try again." });
        } finally { setIsSubmitting(false); }
    };

    if (loading) return <div className="container mx-auto py-10 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    const PasswordInput = ({ name, label, field }) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <Input id={name} name={name} type={showPassword[field] ? "text" : "password"} value={formData[name]} onChange={handleChange} required minLength={name === "newPassword" ? 8 : undefined} className="pr-10" />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" onClick={() => togglePasswordVisibility(field)}>
                    <DynamicIcon name={showPassword[field] ? "EyeOff" : "Eye"} className="h-5 w-5" />
                </button>
            </div>
            {name === "newPassword" && <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>}
        </div>
    );

    return (
        <ClientOnly>
            <div className="container mx-auto py-10 px-4">
                <div className="flex items-center mb-8">
                    <Link href="/account" className="inline-flex items-center text-sm text-gray-600 hover:text-primary mr-4"><DynamicIcon name="ArrowLeft" className="mr-1 h-4 w-4" />Back to Account</Link>
                    <h1 className="text-3xl font-bold">Change Password</h1>
                </div>
                <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
                    {message.text && <div className={`mb-6 p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{message.text}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <PasswordInput name="currentPassword" label="Current Password" field="current" />
                        <PasswordInput name="newPassword" label="New Password" field="new" />
                        <PasswordInput name="confirmPassword" label="Confirm New Password" field="confirm" />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Changing Password..." : "Change Password"}</Button>
                    </form>
                </div>
            </div>
        </ClientOnly>
    );
}
