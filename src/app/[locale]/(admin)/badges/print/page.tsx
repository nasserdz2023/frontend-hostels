"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to new standalone print page
export default function BadgePrintRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the new standalone print page
        window.location.href = "/badges/print-view";
    }, []);

    return (
        <div className="flex items-center justify-center h-screen">
            <p>جاري التحويل للطباعة...</p>
        </div>
    );
}
