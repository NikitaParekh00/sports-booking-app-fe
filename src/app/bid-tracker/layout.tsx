import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Bid first timer",
	description: "Standalone tool to see tap order in real time",
};

export default function BidTrackerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
