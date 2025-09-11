import BookingPageClient from "@/components/BookingPageClient";

interface BookingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;
  return <BookingPageClient turfId={id} />;
}
