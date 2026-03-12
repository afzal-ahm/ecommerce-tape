import { useState, useEffect } from "react";
import { Search, Plus, Trash, Save } from "lucide-react";
import { toast } from "sonner";
import api from "../../api/api";

// Types
interface Product {
    id: string;
    name: string;
    image?: string | null;
    images?: { url: string }[];
    slug: string;
}

interface VariantItem {
    productId: string;
    name: string;
    image: string | null;
    label: string;
    order: number;
    isDefault: boolean;
}

interface VariantGroup {
    id?: string;
    name: string;
    type: string;
    items: VariantItem[];
    _count?: { items: number };
}

// Helper function to get proper image URL
// R2 CDN URL for images
const R2_CDN_URL = "https://pub-5378641ac9774021be7c65a006461132.r2.dev";

const getImageUrl = (imageData: any, fallbackImageUrl?: string | null): string | null => {
    // If we have a fallback URL (e.g. product.image), use it if imageData is empty
    const data = (Array.isArray(imageData) && imageData.length > 0) ? imageData : fallbackImageUrl;

    if (!data) return null;

    // If it's an array, get first item
    if (Array.isArray(data)) {
        if (data.length > 0) {
            return getImageUrl(data[0]);
        }
        return getImageUrl(null, fallbackImageUrl);
    }

    // If it's an object with url property
    if (typeof data === 'object' && data !== null && 'url' in data) {
        const url = (data as any).url as string;
        // Already a full URL - return as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        // Relative path - add R2 CDN prefix
        return `${R2_CDN_URL}/${url}`;
    }

    // If it's a string
    if (typeof data === 'string') {
        // Already a full URL - return as-is
        if (data.startsWith('http://') || data.startsWith('https://')) {
            return data;
        }
        // Relative path - add R2 CDN prefix
        return `${R2_CDN_URL}/${data}`;
    }

    return null;
};

export default function VariantManager() {
    const [groups, setGroups] = useState<VariantGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [view, setView] = useState<"LIST" | "CREATE" | "EDIT">("LIST");

    // Form State
    const [formData, setFormData] = useState<VariantGroup>({
        name: "",
        type: "Size",
        items: [],
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Product[]>([]);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/variants");
            console.log("API Response for variants:", res.data);
            const data = res.data?.data || res.data || [];
            setGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch groups", error);
            toast.error("Failed to load variant groups");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchProducts = async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/public/products?search=${query}&limit=5`);
            const products = res.data?.data?.products || res.data?.products || [];
            setSearchResults(products);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const addProductToGroup = (product: Product) => {
        // Check if already exists
        if (formData.items.some((item) => item.productId === product.id)) {
            toast.error("Product already in group");
            return;
        }

        // Get image URL from product (check both images array and single image field)
        const imageUrl = getImageUrl(product.images, product.image);

        setFormData((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: product.id,
                    name: product.name,
                    image: imageUrl,
                    label: "",
                    order: prev.items.length,
                    isDefault: prev.items.length === 0,
                },
            ],
        }));
        setSearchResults([]);
        setSearchQuery("");
    };

    const removeProduct = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        // Update isDefault if needed
        if (newItems.length > 0 && !newItems.some(item => item.isDefault)) {
            newItems[0].isDefault = true;
        }
        setFormData((prev) => ({ ...prev, items: newItems }));
    };

    const updateItem = (index: number, field: keyof VariantItem, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "isDefault" && value === true) {
            newItems.forEach((item, i) => {
                if (i !== index) item.isDefault = false;
            });
        }

        setFormData((prev) => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Group Name required");
        if (formData.items.length < 2) return toast.error("At least 2 products required");
        if (formData.items.some((i) => !i.label)) return toast.error("All products must have a label");

        setActionLoading(true);
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                products: formData.items.map((item, idx) => ({
                    productId: item.productId,
                    label: item.label,
                    order: idx,
                    isDefault: item.isDefault
                }))
            };

            if (formData.id) {
                await api.put(`/admin/variants/${formData.id}`, payload);
                toast.success("Group updated");
            } else {
                await api.post("/admin/variants", payload);
                toast.success("Group created");
            }

            fetchGroups();
            setView("LIST");
            setFormData({ name: "", type: "Size", items: [] });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async (group: any) => {
        setActionLoading(true);
        try {
            const res = await api.get(`/admin/variants/${group.id}`);
            const fullGroup = res.data?.data || res.data;

            if (!fullGroup) {
                toast.error("Group not found");
                return;
            }

            const items = fullGroup.items || [];

            setFormData({
                id: fullGroup.id,
                name: fullGroup.name || "",
                type: fullGroup.type || "Size",
                items: items.map((item: any) => ({
                    productId: item.productId,
                    name: item.product?.name || "Unknown Product",
                    image: getImageUrl(item.product?.images, item.product?.image),
                    label: item.label || "",
                    order: item.order ?? 0,
                    isDefault: item.isDefault ?? false
                }))
            });
            setView("EDIT");
        } catch (error: any) {
            console.error("Edit error:", error);
            toast.error(error.response?.data?.message || "Failed to load group");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (groupId: string) => {
        console.log("Delete button clicked for group ID:", groupId);
        console.log("Current groups in state:", groups.map(g => ({ id: g.id, name: g.name })));

        if (!confirm("Delete this variant group? Products will remain unchanged.")) return;

        setActionLoading(true);
        try {
            await api.delete(`/admin/variants/${groupId}`);
            toast.success("Group deleted");
            // Remove from local state immediately
            setGroups(prev => prev.filter(g => g.id !== groupId));
        } catch (error: any) {
            console.error("Delete error:", error);
            // If 404, the item was already deleted - just remove from UI
            if (error.response?.status === 404) {
                toast.info("Group was already deleted");
                setGroups(prev => prev.filter(g => g.id !== groupId));
            } else {
                toast.error(error.response?.data?.message || "Failed to delete");
                // Refresh the list in case of error
                fetchGroups();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", type: "Size", items: [] });
        setSearchQuery("");
        setSearchResults([]);
        setView("LIST");
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Variant Manager</h1>
                {view === "LIST" && (
                    <button
                        onClick={() => {
                            setFormData({ name: "", type: "Size", items: [] });
                            setView("CREATE");
                        }}
                        className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> New Group
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
                            {groups.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        No variant groups created yet
                                    </td>
                                </tr>
                            ) : (
                                groups.map((group) => (
                                    <tr key={group.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-medium">{group.name}</td>
                                        <td className="p-4 text-gray-500">{group.type}</td>
                                        <td className="p-4">
                                            {group._count?.items || 0} items
                                        </td>
                                        <td className="p-4 flex gap-3">
                                            <button
                                                onClick={() => handleEdit(group)}
                                                disabled={actionLoading}
                                                className="text-blue-600 hover:underline disabled:opacity-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(group.id!)}
                                                disabled={actionLoading}
                                                className="text-red-600 hover:underline disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
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
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Brown Tape Sizes"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Variant Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="Size">Size</option>
                                <option value="Color">Color</option>
                                <option value="Material">Material</option>
                                <option value="Quantity">Quantity</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Add Products</label>
                        <div className="relative">
                            <input
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearchProducts(e.target.value);
                                }}
                                placeholder="Search products..."
                                className="w-full p-3 pl-10 border rounded-lg"
                            />
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        </div>

                        {searchResults.length > 0 && searchQuery && (
                            <div className="mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => addProductToGroup(product)}
                                        className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                            {getImageUrl(product.images, product.image) ? (
                                                <img
                                                    src={getImageUrl(product.images, product.image) || ''}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                                    No img
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium line-clamp-1">{product.name}</p>
                                        </div>
                                        <Plus className="text-blue-600" size={18} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mb-8">
                        <label className="block text-sm font-medium">
                            Group Items ({formData.items.length})
                        </label>
                        {formData.items.length === 0 ? (
                            <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-500">
                                Search and add at least 2 products to create a variant group
                            </div>
                        ) : (
                            formData.items.map((item, index) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50"
                                >

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.name}</p>
                                    </div>
                                    <input
                                        value={item.label}
                                        onChange={(e) => updateItem(index, "label", e.target.value)}
                                        placeholder="Label (e.g. 24 Rolls)"
                                        className="border rounded p-1 text-sm w-32"
                                    />
                                    <div className="flex flex-col items-center">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Default</label>
                                        <input
                                            type="radio"
                                            checked={item.isDefault}
                                            onChange={() => updateItem(index, "isDefault", true)}
                                            name="defaultVariant"
                                            className="w-4 h-4"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeProduct(index)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            onClick={resetForm}
                            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formData.items.length < 2 || actionLoading}
                            className="bg-black text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} /> {actionLoading ? 'Saving...' : 'Save Group'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
