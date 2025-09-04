import BookingPageClient from "@/components/BookingPageClient";

interface BookingPageProps {
  params: {
    id: string;
  };
}

export default function BookingPage({ params }: BookingPageProps) {
  return <BookingPageClient turfId={params.id} />;
}
