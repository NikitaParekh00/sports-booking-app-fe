import BookingSummaryClient from "@/components/BookingSummaryClient";

interface BookingSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    price?: string;
  }>;
}

export default async function BookingSummaryPage({ params, searchParams }: BookingSummaryPageProps) {
  const { id } = await params;
  const { date, time, price } = await searchParams;

  return (
    <BookingSummaryClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
    />
  );
}
