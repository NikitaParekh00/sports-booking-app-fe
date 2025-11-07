export default function AuctionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // No wrapper needed - MobileContainerWrapper handles it
    return <>{children}</>;
}

