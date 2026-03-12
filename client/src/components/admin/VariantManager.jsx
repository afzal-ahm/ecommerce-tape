"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/utils";
import { Search, Plus, Trash, Save, Move, Check } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function VariantManager() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("LIST"); // LIST, CREATE, EDIT

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        type: "Color", // Default type
        items: []
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await fetchApi("/admin/variants");
            setGroups(res.data || []);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchProducts = async (query) => {
        if (!query) return;
        setSearching(true);
        try {
            const res = await fetchApi(`/public/products?search=${query}&limit=5`);
            setSearchResults(res.data.products || []);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearching(false);
        }
    };

    const addProductToGroup = (product) => {
        if (formData.items.find(item => item.productId === product.id)) {
            toast.error("Product already in group");
            return;
        }

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: product.id,
                    name: product.name,
                    image: product.image,
                    label: "", // To be filled by user
                    order: prev.items.length,
                    isDefault: prev.items.length === 0
                }
            ]
        }));
        setSearchResults([]);
        setSearchQuery("");
    };

    const removeProduct = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If setting default, unset others // Or standard radio behavior logic
        if (field === 'isDefault' && value === true) {
            newItems.forEach((item, i) => {
                if (i !== index) item.isDefault = false;
            });
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Group Name required");
        if (formData.items.length < 2) return toast.error("At least 2 products required");

        // Validate labels
        if (formData.items.some(i => !i.label)) return toast.error("All products must have a label");

        try {
            // Prepare payload
            const payload = {
                name: formData.name,
                type: formData.type,
                products: formData.items.map((item, idx) => ({
                    productId: item.productId,
                    label: item.label,
                    order: idx, // Simple order for now
                    isDefault: item.isDefault
                }))
            };

            if (formData.id) {
                await fetchApi(`/admin/variants/${formData.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                toast.success("Group updated");
            } else {
                await fetchApi("/admin/variants", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                toast.success("Group created");
            }

            fetchGroups();
            setView("LIST");
        } catch (error) {
            toast.error(error.message || "Failed to save");
        }
    };

    const handleEdit = (group) => {
        setFormData({
            id: group.id,
            name: group.name,
            type: group.type,
            items: group.items.map(item => ({
                productId: item.productId,
                name: item.product.name,
                image: item.product.image, // Ensure backend returns this
                label: item.label,
                order: item.order,
                isDefault: item.isDefault
            }))
        });
        setView("EDIT");
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this group? Products will remain.")) return;
        try {
            await fetchApi(`/admin/variants/${id}`, { method: "DELETE" });
            toast.success("Deleted");
            fetchGroups();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Variant Manager</h1>
                {view === "LIST" && (
                    <button
                        onClick={() => {
                            setFormData({ name: "", type: "Color", items: [] });
                            setView("CREATE");
                        }}
                        className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> New Group
                    </button>
                )}
                {view !== "LIST" && (
                    <button
                        onClick={() => setView("LIST")}
                        className="text-gray-500 hover:text-black"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {view === "LIST" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Products</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => (
                                <tr key={group.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium">{group.name}</td>
                                    <td className="p-4 text-gray-500">{group.type}</td>
                                    <td className="p-4">{group._count?.items || group.items?.length || 0} items</td>
                                    <td className="p-4 flex gap-3">
                                        <button onClick={() => handleEdit(group)} className="text-blue-600 hover:underline">Edit</button>
                                        <button onClick={() => handleDelete(group.id)} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {groups.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">No variant groups found. Create one to link products.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-6">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium mb-1">Group Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. T-Shirt Colors"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Variant Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="Color">Color</option>
                                <option value="Size">Size</option>
                                <option value="Material">Material</option>
                                <option value="Style">Style</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Add Products</label>
                        <div className="relative">
                            <input
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    handleSearchProducts(e.target.value);
                                }}
                                placeholder="Search products by name..."
                                className="w-full p-3 pl-10 border rounded-lg"
                            />
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && searchQuery && (
                            <div className="absolute z-10 mt-1 w-full max-w-4xl bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addProductToGroup(product)}
                                        className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden relative">
                                            {product.image && (
                                                <Image
                                                    src={`https://files.dfixkart.com/${product.image}`}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium line-clamp-1">{product.name}</p>
                                            <p className="text-xs text-gray-500">SKU: {product.slug}</p>
                                        </div>
                                        <Plus className="ml-auto text-blue-600" size={18} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Draggable List (Simplified as static list for now) */}
                    <div className="space-y-3 mb-8">
                        <label className="block text-sm font-medium">Group Items ({formData.items.length})</label>
                        {formData.items.map((item, index) => (
                            <div key={item.productId} className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
                                <span className="text-gray-400 cursor-move"><Move size={16} /></span>
                                <div className="w-12 h-12 bg-white rounded border overflow-hidden relative flex-shrink-0">
                                    {item.image && (
                                        <Image
                                            src={`https://files.dfixkart.com/${item.image}`}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.name}</p>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">Label</label>
                                    <input
                                        value={item.label}
                                        onChange={(e) => updateItem(index, 'label', e.target.value)}
                                        placeholder={formData.type === 'Color' ? "Red" : "Medium"}
                                        className="border rounded p-1 text-sm w-32"
                                    />
                                </div>

                                <div className="flex flex-col items-center">
                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-1">Default</label>
                                    <input
                                        type="radio"
                                        checked={item.isDefault}
                                        onChange={() => updateItem(index, 'isDefault', true)}
                                        name="defaultVariant"
                                        className="w-4 h-4"
                                    />
                                </div>

                                <button onClick={() => removeProduct(index)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                    <Trash size={18} />
                                </button>
                            </div>
                        ))}
                        {formData.items.length === 0 && (
                            <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-400">
                                Search and add products above
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            onClick={() => setView("LIST")}
                            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formData.items.length < 2}
                            className="bg-black text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} /> Save Group
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
