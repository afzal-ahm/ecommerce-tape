"use client";

import { useState, useEffect } from "react";

// ClientOnly component to prevent hydration errors
// Prevents rendering until the component is mounted on the client
export function ClientOnly({ children, fallback = null }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return fallback;
    }

    return children;
}
