import BookingSummaryClient from "@/components/BookingSummaryClient";

interface BookingSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    price?: string;
    slot_id?: string;
    court_id?: string;
  }>;
}

export default async function BookingSummaryPage({ params, searchParams }: BookingSummaryPageProps) {
  const { id } = await params;
  const { date, time, price, slot_id, court_id } = await searchParams;

  return (
    <BookingSummaryClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
      slotId={slot_id}
      courtId={court_id}
    />
  );
}
