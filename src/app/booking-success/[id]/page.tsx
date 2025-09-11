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
  }>;
}

export default async function BookingSuccessPage({ params, searchParams }: BookingSuccessPageProps) {
  const { id } = await params;
  const { date, time, price, quantity } = await searchParams;

  return (
    <BookingSuccessClient
      turfId={id}
      selectedDate={date}
      selectedTime={time}
      selectedPrice={price}
      quantity={quantity}
    />
  );
}
