"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";

export default function AddressForm({ onSuccess, onCancel, existingAddress = null, isInline = false }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: existingAddress?.name || "",
        street: existingAddress?.street || "",
        city: existingAddress?.city || "",
        state: existingAddress?.state || "",
        postalCode: existingAddress?.postalCode || "",
        country: existingAddress?.country || "India",
        phone: existingAddress?.phone || "",
        isDefault: existingAddress?.isDefault || false,
    });
    const [errors, setErrors] = useState({});

    const validations = {
        name: (value) => !value.trim() ? "Name is required" : value.length < 2 ? "Name must be at least 2 characters" : "",
        phone: (value) => !value.trim() ? "Phone number is required" : !/^[0-9]{10}$/.test(value) ? "Enter valid 10-digit phone number" : "",
        postalCode: (value) => !value.trim() ? "Postal code is required" : !/^[0-9]{6}$/.test(value) ? "Enter valid 6-digit postal code" : "",
        street: (value) => !value.trim() ? "Street address is required" : "",
        city: (value) => !value.trim() ? "City is required" : "",
        state: (value) => !value.trim() ? "State is required" : "",
        country: (value) => !value.trim() ? "Country is required" : "",
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
        const validationError = validations[name]?.(newValue) || "";
        setErrors(prev => ({ ...prev, [name]: validationError }));
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(validations).forEach(field => {
            const error = validations[field](formData[field]);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { toast.error("Please fix the errors in the form"); return; }
        setLoading(true);
        try {
            const endpoint = existingAddress ? `/users/addresses/${existingAddress.id}` : "/users/addresses";
            const method = existingAddress ? "PATCH" : "POST";
            const response = await fetchApi(endpoint, { method, credentials: "include", body: JSON.stringify(formData) });
            if (!response.success) throw new Error(response.message || `Failed to ${existingAddress ? 'update' : 'add'} address`);
            toast.success(`Address ${existingAddress ? 'updated' : 'added'} successfully`);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to save address");
            setErrors(prev => ({ ...prev, general: error.message }));
        } finally { setLoading(false); }
    };

    const renderField = (name, label, placeholder, props = {}) => (
        <div className={props.className || ""}>
            <Label htmlFor={name}>{label}*</Label>
            <Input id={name} name={name} value={formData[name]} onChange={handleChange} className={errors[name] ? "border-red-500" : ""} placeholder={placeholder} {...props} />
            {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
        </div>
    );

    return (
        <div className={isInline ? "p-4 border rounded-lg mb-4" : ""}>
            {isInline && (
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Add New Address</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><XCircle className="h-5 w-5" /></button>
                </div>
            )}
            {errors.general && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">{errors.general}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderField("name", "Full Name", "Enter your full name", { className: "sm:col-span-2 lg:col-span-3" })}
                    {renderField("street", "Street Address", "House number, Street, Apartment, etc.", { className: "sm:col-span-2 lg:col-span-3" })}
                    {renderField("city", "City", "Enter city")}
                    {renderField("state", "State", "Enter state")}
                    {renderField("postalCode", "Postal Code", "Enter 6-digit postal code", { maxLength: 6 })}
                    {renderField("phone", "Phone Number", "Enter 10-digit phone number", { maxLength: 10 })}
                    {renderField("country", "Country", "Enter country", { className: "sm:col-span-2" })}
                    <div className="lg:col-span-3">
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="isDefault" name="isDefault" checked={formData.isDefault} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <Label htmlFor="isDefault" className="font-normal cursor-pointer">Set as default address</Label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    {onCancel && <Button type="button" onClick={onCancel} variant="outline" disabled={loading}>Cancel</Button>}
                    <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{existingAddress ? "Update Address" : "Save Address"}</Button>
                </div>
            </form>
        </div>
    );
}
