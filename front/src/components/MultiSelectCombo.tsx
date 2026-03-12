"use client"
import * as React from "react";
import { ChevronsUpDown, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type Item = { id: string; name?: string };

export interface MultiSelectComboProps {
    items: Item[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    label?: string;
    placeholder?: string;
    maxHeight?: number;
}

export default function MultiSelectCombo({ items, selectedIds, onChange, label, placeholder = "Select...", maxHeight = 240 }: MultiSelectComboProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const ref = React.useRef<HTMLDivElement | null>(null);

    const selectedItems = React.useMemo(() => {
        return selectedIds
            .map((id) => items.find((it) => it.id === id))
            .filter(Boolean) as Item[];
    }, [items, selectedIds]);

    const filtered = React.useMemo(() => {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter((i) => (i.name || "").toLowerCase().includes(q));
    }, [items, query]);

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
        else onChange(Array.from(new Set([...selectedIds, id])));
    };

    const removeId = (id: string) => {
        if (!selectedIds.includes(id)) return;
        onChange(selectedIds.filter((x) => x !== id));
    };

    // click outside to close
    React.useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!ref.current) return;
            if (e.target instanceof Node && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    return (
        <div ref={ref} className="relative">
            {label && <div className="mb-1 text-sm font-medium">{label}</div>}
            <div>
                <button
                    type="button"
                    className="w-full border rounded px-3 py-2 flex items-center justify-between bg-white"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                >
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                        {selectedIds.length === 0 ? (
                            <span className={cn("text-muted-foreground")}>{placeholder} <span className="text-xs text-muted-foreground">(applies to all)</span></span>
                        ) : selectedItems.length === 0 ? (
                            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                        ) : (
                            (() => {
                                const maxChips = 4;
                                const visible = selectedItems.slice(0, maxChips);
                                return (
                                    <>
                                        {visible.map((it) => (
                                            <span key={it.id} className="inline-flex items-center gap-2 bg-muted px-2 py-0.5 rounded text-sm">
                                                <span>{it.name}</span>
                                                <button type="button" aria-label={`Remove ${it.name}`} className="inline-flex p-1" onClick={(e) => { e.stopPropagation(); removeId(it.id); }}>
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        {selectedItems.length > maxChips && (
                                            <span className="text-sm text-muted-foreground">+{selectedItems.length - maxChips} more</span>
                                        )}
                                    </>
                                );
                            })()
                        )}
                    </div>
                    <ChevronsUpDown className="opacity-50" />
                </button>
            </div>

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow">
                    <div className="p-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Search ${placeholder}...`}
                            className="w-full border rounded px-2 py-1 mb-2"
                        />
                        <div style={{ maxHeight, overflow: "auto" }}>
                            {filtered.length === 0 ? (
                                <div className="text-xs text-muted-foreground p-2">No items found.</div>
                            ) : (
                                filtered.map((it) => (
                                    <label key={it.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted">
                                        <Checkbox checked={selectedIds.includes(it.id)} onCheckedChange={() => toggle(it.id)} />
                                        <span className="text-sm">{it.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="mt-2 flex justify-end">
                            <button type="button" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

