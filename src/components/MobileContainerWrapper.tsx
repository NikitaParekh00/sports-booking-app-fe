"use client";

import { usePathname } from 'next/navigation';

export default function MobileContainerWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAuctionPage = pathname?.startsWith('/auction');
    const isOwnerPage = pathname?.startsWith('/owner');
    const isAdminPage = pathname?.startsWith('/admin');
    const isTournamentsPage = pathname?.startsWith('/scoring/tournaments');

    if (isAuctionPage || isOwnerPage || isAdminPage || isTournamentsPage) {
        // For auction, owner, admin, and tournaments pages, render without mobile container (web layout)
        return <>{children}</>;
    }

    // For other pages, apply mobile container
    return (
        <div className="min-h-dvh md:min-h-screen md:bg-gray-200 md:flex md:items-center md:justify-center md:p-4 md:p-8">
            <div className="w-full md:max-w-[428px] bg-white min-h-dvh md:min-h-[926px] md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden relative">
                {children}
            </div>
        </div>
    );
}

