"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuctionClient from "@/components/AuctionClient";

function AuctionPageContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session');
    
    return <AuctionClient initialSessionId={sessionId || undefined} />;
}

export default function AuctionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
            <AuctionPageContent />
        </Suspense>
    );
}

