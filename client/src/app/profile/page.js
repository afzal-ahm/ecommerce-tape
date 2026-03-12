"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Package, MapPin, LogOut, Plus, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatPrice } from "@/lib/products";

function ProfileContent() {
    const { user, isAuthenticated, logout, updateProfile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState(tabParam || "orders");
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [accountMessage, setAccountMessage] = useState({ type: "", text: "" });
    const [accountForm, setAccountForm] = useState({ name: "", phone: "" });

    // Update active tab when URL parameter changes
    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Keep account form in sync with user (for real-time UI updates)
    useEffect(() => {
        setAccountForm({
            name: user?.name || "",
            phone: user?.phone || "",
        });
    }, [user]);

    // Update URL when tab changes internally
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        router.push(`/profile?tab=${tabId}`, { scroll: false });
    };

    if (!isAuthenticated) {
        if (typeof window !== "undefined") {
            router.push("/auth");
        }
        return null;
    }

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const tabs = [
        { id: "orders", label: "My Orders", icon: Package },
        { id: "addresses", label: "Addresses", icon: MapPin },
        { id: "account", label: "Account Details", icon: User },
    ];

    return (
        <div className="pt-20 min-h-screen bg-muted/30">
            <div className="section-container py-12">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 sticky top-24">
                            {/* User Info */}
                            <div className="text-center mb-6 pb-6 border-b border-border">
                                <div className="w-20 h-20 bg-foreground text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                                    {user?.name?.charAt(0) || "U"}
                                </div>
                                <h2 className="font-display font-bold text-lg">{user?.name || "User"}</h2>
                                <p className="text-sm text-muted-foreground truncate" title={user?.email || ""}>
                                    {user?.email}
                                </p>
                            </div>

                            {/* Navigation */}
                            <nav className="space-y-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id
                                            ? "bg-foreground text-white"
                                            : "hover:bg-muted"
                                            }`}
                                    >
                                        <tab.icon className="h-5 w-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 mt-4 transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                Logout
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3">
                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <div>
                                <h1 className="font-display text-2xl font-bold mb-6">My Orders</h1>

                                {mockOrders.length > 0 ? (
                                    <div className="space-y-4">
                                        {mockOrders.map((order) => (
                                            <div key={order.id} className="bg-white rounded-2xl p-6">
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
                                                    <div>
                                                        <p className="font-mono font-bold">{order.id}</p>
                                                        <p className="text-sm text-muted-foreground">{order.date}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {order.status === "Delivered" ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                        ) : (
                                                            <Truck className="h-5 w-5 text-primary" />
                                                        )}
                                                        <span className={`font-medium ${order.status === "Delivered" ? "text-green-600" : "text-primary"
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-4">
                                                    {order.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                {item.name} x{item.qty}
                                                            </span>
                                                            <span className="font-medium">{formatPrice(item.price * item.qty)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                                    <span className="font-bold">Total</span>
                                                    <span className="font-display font-bold text-lg">{formatPrice(order.total)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl p-12 text-center">
                                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="font-semibold text-lg mb-2">No orders yet</h3>
                                        <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
                                        <Link href="/products">
                                            <Button className="rounded-full px-8">Start Shopping</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Addresses Tab */}
                        {activeTab === "addresses" && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h1 className="font-display text-2xl font-bold">Saved Addresses</h1>
                                    <Button className="rounded-full gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Address
                                    </Button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {mockAddresses.map((addr) => (
                                        <div key={addr.id} className="bg-white rounded-2xl p-6 relative">
                                            {addr.isDefault && (
                                                <span className="absolute top-4 right-4 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                                    Default
                                                </span>
                                            )}
                                            <p className="font-semibold mb-2">{addr.name}</p>
                                            <p className="text-muted-foreground text-sm mb-1">{addr.address}</p>
                                            <p className="text-muted-foreground text-sm mb-1">{addr.city}, {addr.state} - {addr.pincode}</p>
                                            <p className="text-muted-foreground text-sm">{addr.phone}</p>
                                            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                                                <button className="text-sm text-primary hover:underline">Edit</button>
                                                <button className="text-sm text-destructive hover:underline">Delete</button>
                                            </div>
                                        </div>
                                    ))}

                                    <button className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                                        <Plus className="h-8 w-8 mb-2" />
                                        <span>Add New Address</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Account Details Tab */}
                        {activeTab === "account" && (
                            <div>
                                <h1 className="font-display text-2xl font-bold mb-6">Account Details</h1>

                                <div className="bg-white rounded-2xl p-6">
                                    <form
                                        className="space-y-6"
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            setIsSavingAccount(true);
                                            setAccountMessage({ type: "", text: "" });
                                            try {
                                                await updateProfile({
                                                    name: accountForm.name,
                                                    phone: accountForm.phone,
                                                    profileImage: null,
                                                });
                                                setAccountMessage({ type: "success", text: "Profile updated successfully" });
                                            } catch (err) {
                                                setAccountMessage({
                                                    type: "error",
                                                    text: err?.message || "Failed to update profile",
                                                });
                                            } finally {
                                                setIsSavingAccount(false);
                                            }
                                        }}
                                    >
                                        {accountMessage.text && (
                                            <div
                                                className={`p-3 rounded-xl text-sm ${accountMessage.type === "success"
                                                    ? "bg-green-50 text-green-800 border border-green-200"
                                                    : "bg-red-50 text-red-800 border border-red-200"
                                                    }`}
                                            >
                                                {accountMessage.text}
                                            </div>
                                        )}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={accountForm.name}
                                                    onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    defaultValue={user?.email || ""}
                                                    readOnly
                                                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={accountForm.phone}
                                                    onChange={(e) => setAccountForm((p) => ({ ...p, phone: e.target.value }))}
                                                    placeholder="+91 9876543210"
                                                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border">
                                            <h3 className="font-semibold mb-4">Change Password</h3>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Current Password</label>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">New Password</label>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button size="lg" className="rounded-full px-8" disabled={isSavingAccount}>
                                            {isSavingAccount ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="pt-20 min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
