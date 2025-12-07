import BookingSummaryClient from "@/components/BookingSummaryClient";

interface BookingSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    price?: string;
    slot_ids?: string;
    available_count?: string;
  }>;
}

export default async function BookingSummaryPage({ params, searchParams }: BookingSummaryPageProps) {
  const { id } = await params;
  const { date, time, price, slot_ids, available_count } = await searchParams;

  return (
    <BookingSummaryClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
      slotIds={slot_ids}
      availableCount={available_count ? parseInt(available_count) : 1}
    />
  );
}
