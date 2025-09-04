import BookingSummaryClient from "@/components/BookingSummaryClient";

interface BookingSummaryPageProps {
  params: {
    id: string;
  };
  searchParams: {
    date?: string;
    time?: string;
    price?: string;
  };
}

export default function BookingSummaryPage({ params, searchParams }: BookingSummaryPageProps) {
  return (
    <BookingSummaryClient 
      turfId={params.id}
      selectedDate={searchParams.date}
      selectedTime={searchParams.time}
      selectedPrice={searchParams.price}
    />
  );
}
