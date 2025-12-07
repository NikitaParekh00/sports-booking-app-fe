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
    slot_ids?: string;
  }>;
}

export default async function BookingSuccessPage({ params, searchParams }: BookingSuccessPageProps) {
  const { id } = await params;
  const { date, time, price, quantity, slot_ids } = await searchParams;

  return (
    <BookingSuccessClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
      quantity={quantity}
      slotIds={slot_ids}
    />
  );
}
