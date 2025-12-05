import BookingSuccessClient from "@/components/BookingSuccessClient";

interface BookingSuccessPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    price?: string;
    quantity?: string;
    slot_id?: string;
    court_id?: string;
  }>;
}

export default async function BookingSuccessPage({ params, searchParams }: BookingSuccessPageProps) {
  const { id } = await params;
  const { date, time, price, quantity, slot_id, court_id } = await searchParams;

  return (
    <BookingSuccessClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
      quantity={quantity}
      slotId={slot_id}
      courtId={court_id}
    />
  );
}
