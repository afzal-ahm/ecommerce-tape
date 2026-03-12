"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Edit, Trash2, Home, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AddressForm from "@/components/AddressForm";

export default function AddressesPage() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const response = await fetchApi("/users/addresses", { credentials: "include" });
            if (response.success) setAddresses(response.data.addresses || []);
        } catch (error) {
            console.error("Error fetching addresses:", error);
            toast.error("Failed to load your addresses");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAddresses(); }, []);

    const handleFormSuccess = () => { setShowAddForm(false); setEditingAddress(null); fetchAddresses(); };

    const handleDeleteAddress = async (id) => {
        if (!confirm("Are you sure you want to delete this address?")) return;
        setDeletingId(id);
        try {
            const response = await fetchApi(`/users/addresses/${id}`, { method: "DELETE", credentials: "include" });
            if (response.success) { toast.success("Address deleted successfully"); fetchAddresses(); }
        } catch (error) {
            toast.error(error.message || "Failed to delete address");
        } finally { setDeletingId(null); }
    };

    const handleSetDefaultAddress = async (id) => {
        try {
            const response = await fetchApi(`/users/addresses/${id}/default`, { method: "PATCH", credentials: "include" });
            if (response.success) { toast.success("Default address updated"); fetchAddresses(); }
        } catch (error) { toast.error(error.message || "Failed to set default address"); }
    };

    if (loading && addresses.length === 0) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-8">My Addresses</h1>
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="flex justify-between gap-2 items-center mb-8">
                <h1 className="text-xl lg:text-2xl font-semibold">My Addresses</h1>
                {!showAddForm && !editingAddress && <Button onClick={() => setShowAddForm(true)} className="px-3 lg:px-4 text-wrap py-2"><Plus className="h-4 w-4 mr-2" />Add New Address</Button>}
            </div>

            {showAddForm && (
                <div className="bg-white rounded-lg shadow p-6 mb-8 border">
                    <h2 className="text-xl font-semibold mb-4">Add New Address</h2>
                    <AddressForm onSuccess={handleFormSuccess} onCancel={() => setShowAddForm(false)} />
                </div>
            )}

            {editingAddress && (
                <div className="bg-white rounded-lg shadow p-6 mb-8 border">
                    <h2 className="text-xl font-semibold mb-4">Edit Address</h2>
                    <AddressForm existingAddress={editingAddress} onSuccess={handleFormSuccess} onCancel={() => setEditingAddress(null)} />
                </div>
            )}

            {addresses.length === 0 && !showAddForm && !editingAddress ? (
                <div className="bg-white rounded-lg shadow p-8 text-center border">
                    <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Addresses Found</h2>
                    <p className="text-gray-600 mb-6">You haven&apos;t added any addresses yet.</p>
                    <Button onClick={() => setShowAddForm(true)}><Plus className="h-4 w-4 mr-2" />Add New Address</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                        <div key={address.id} className="bg-white rounded-lg shadow p-5 border relative">
                            {address.isDefault && (
                                <div className="absolute top-3 right-3">
                                    <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full flex items-center"><Check className="h-3 w-3 mr-1" />Default</span>
                                </div>
                            )}
                            <div className="mb-4">
                                <h3 className="font-semibold text-lg">{address.name}</h3>
                                <p className="text-gray-600">{address.street}</p>
                                <p className="text-gray-600">{address.city}, {address.state} {address.postalCode}</p>
                                <p className="text-gray-600">{address.country}</p>
                                <p className="text-gray-600 mt-1"><span className="font-medium">Phone:</span> {address.phone}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {!address.isDefault && <Button variant="outline" size="sm" onClick={() => handleSetDefaultAddress(address.id)}><Home className="h-4 w-4 mr-2" />Set as Default</Button>}
                                <Button variant="outline" size="sm" onClick={() => setEditingAddress(address)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteAddress(address.id)} disabled={deletingId === address.id}>
                                    {deletingId === address.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
