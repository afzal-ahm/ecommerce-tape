"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { fetchApi, formatDate } from "@/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";
import { User, MapPin, Lock, Edit, Package, Users, Copy, Check, Heart, ArrowRight } from "lucide-react";

export default function AccountPage() {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: "", phone: "", profileImage: null });
    const [preview, setPreview] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [referralCode, setReferralCode] = useState("");
    const [referralStats, setReferralStats] = useState(null);
    const [isLoadingReferral, setIsLoadingReferral] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user) setFormData({ name: user.name || "", phone: user.phone || "", profileImage: null });
    }, [user]);

    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) return;
            try {
                const response = await fetchApi("/users/addresses", { credentials: "include" });
                setAddresses(response.data.addresses || []);
            } catch (error) { console.error("Failed to fetch addresses:", error); }
        };
        fetchAddresses();
    }, [user]);

    useEffect(() => {
        const fetchReferralData = async () => {
            if (!user) return;
            try {
                setIsLoadingReferral(true);
                const response = await fetchApi("/referrals/my-code", { credentials: "include" });
                if (response.success) {
                    setReferralCode(response.data.referralCode);
                    setReferralStats(response.data.stats);
                }
            } catch (error) { console.error("Failed to fetch referral data:", error); }
            finally { setIsLoadingReferral(false); }
        };
        fetchReferralData();
    }, [user]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "profileImage" && files.length > 0) {
            setFormData((prev) => ({ ...prev, profileImage: files[0] }));
            setPreview(URL.createObjectURL(files[0]));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage({ type: "", text: "" });
        try {
            await updateProfile(formData);
            setIsEditing(false);
            setMessage({ type: "success", text: "Profile updated successfully" });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Failed to update profile" });
        } finally { setIsSubmitting(false); }
    };

    const menuItems = [
        { icon: Package, label: "My Orders", href: "/account/orders", desc: "View order history" },
        { icon: MapPin, label: "Addresses", href: "/account/addresses", desc: "Manage shipping addresses" },
        { icon: Heart, label: "Wishlist", href: "/wishlist", desc: "View saved items" },
        { icon: Lock, label: "Security", href: "/account/change-password", desc: "Change password" },
    ];

    return (
        <ProtectedRoute>
            <ClientOnly>
                <div className="min-h-screen bg-gray-50">
                    {/* Header */}
                    <section className="py-8 bg-[#2D2D2D]">
                        <div className="section-container">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-white">{user?.name || "User"}</h1>
                                    <p className="text-gray-400 text-sm">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="section-container py-8">
                        {/* Quick Links */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {menuItems.map((item, index) => (
                                <Link key={index} href={item.href} className="card-premium p-4 hover:border-primary/20">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                                        <item.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{item.label}</h3>
                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                </Link>
                            ))}
                        </div>

                        {/* Profile Information */}
                        <div className="card-premium p-6 mb-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
                                {!isEditing && (
                                    <Button variant="outline" onClick={() => setIsEditing(true)} size="sm" className="gap-2">
                                        <Edit className="h-4 w-4" /> Edit
                                    </Button>
                                )}
                            </div>

                            {message.text && (
                                <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                                    {message.text}
                                </div>
                            )}

                            {isEditing ? (
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                            <Input name="name" type="text" value={formData.name} onChange={handleChange} className="input-premium" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                            <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-premium" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? "Saving..." : "Save Changes"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setPreview(null); setFormData({ name: user?.name || "", phone: user?.phone || "", profileImage: null }); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Full Name</p>
                                        <p className="font-medium text-gray-900 break-words">{user?.name || "Not provided"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-500 mb-1">Email</p>
                                        <p
                                            className="font-medium text-gray-900 truncate"
                                            title={user?.email || ""}
                                        >
                                            {user?.email || "Not provided"}
                                        </p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-500 mb-1">Phone</p>
                                        <p
                                            className="font-medium text-gray-900 truncate"
                                            title={user?.phone || ""}
                                        >
                                            {user?.phone || "Not provided"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Member Since</p>
                                        <p className="font-medium text-gray-900">{user?.createdAt ? formatDate(user.createdAt) : "Unknown"}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Addresses */}
                        <div className="card-premium p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Saved Addresses</h2>
                                <Link href="/account/addresses">
                                    <Button variant="outline" size="sm" className="gap-1">
                                        Manage <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>

                            {addresses.length > 0 ? (
                                <div className="grid gap-4">
                                    {addresses.slice(0, 2).map((address) => (
                                        <div key={address.id} className="border border-gray-100 rounded-xl p-4">
                                            {address.isDefault && (
                                                <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md mb-2 font-medium">Default</span>
                                            )}
                                            <p className="font-medium text-gray-900">{address.name || user?.name}</p>
                                            <p className="text-sm text-gray-600">{address.street}, {address.city}, {address.state} {address.postalCode}</p>
                                            <p className="text-sm text-gray-600">{address.country}</p>
                                        </div>
                                    ))}
                                    {addresses.length > 2 && <p className="text-sm text-gray-500">+ {addresses.length - 2} more addresses</p>}
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                                    <MapPin className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-500 text-sm">No addresses added yet</p>
                                    <Link href="/account/addresses">
                                        <Button variant="outline" size="sm" className="mt-3">Add Address</Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Referral Program */}
                        <div className="bg-gradient-to-r from-primary/5 via-orange-50 to-primary/5 rounded-2xl p-6 border border-primary/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-bold text-gray-900">Referral Program</h2>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">Share your referral code and earn rewards!</p>

                            {isLoadingReferral ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white rounded-xl p-4 border border-primary/20 mb-4">
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Your Referral Code</label>
                                        <div className="flex items-center gap-2">
                                            <Input value={referralCode} readOnly className="font-mono text-lg font-bold bg-gray-50" />
                                            <Button
                                                onClick={() => { navigator.clipboard.writeText(referralCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                                className={copied ? "bg-green-500 hover:bg-green-600" : "btn-primary"}
                                            >
                                                {copied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                                            </Button>
                                        </div>
                                    </div>

                                    {referralStats && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-white rounded-xl p-3 text-center border">
                                                <p className="text-xl font-bold text-primary">{referralStats.totalReferrals || 0}</p>
                                                <p className="text-xs text-gray-500">Total Referrals</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 text-center border">
                                                <p className="text-xl font-bold text-green-600">{referralStats.completedReferrals || 0}</p>
                                                <p className="text-xs text-gray-500">Completed</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 text-center border">
                                                <p className="text-xl font-bold text-yellow-600">{referralStats.pendingReferrals || 0}</p>
                                                <p className="text-xs text-gray-500">Pending</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 text-center border">
                                                <p className="text-xl font-bold text-primary">₹{parseFloat(referralStats.totalEarnings || 0).toFixed(0)}</p>
                                                <p className="text-xs text-gray-500">Earnings</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </ClientOnly>
        </ProtectedRoute>
    );
}
