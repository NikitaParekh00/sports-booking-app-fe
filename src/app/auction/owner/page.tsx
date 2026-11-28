import { redirect } from 'next/navigation';

type Props = {
    searchParams: Promise<{ session?: string }>;
};

/** Timed bidding lives on profile page — keep this URL as a redirect. */
export default async function AuctionOwnerRedirect({ searchParams }: Props) {
    const { session } = await searchParams;
    const qs = session ? `?mode=profile&session=${encodeURIComponent(session)}` : '?mode=profile';
    redirect(`/auction/confirm${qs}`);
}