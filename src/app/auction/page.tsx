"use client";

import { useSearchParams } from "next/navigation";
import AuctionClient from "@/components/AuctionClient";

export default function AuctionPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session');
    
    return <AuctionClient initialSessionId={sessionId || undefined} />;
}

