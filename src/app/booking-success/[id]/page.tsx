import BookingSuccessClient from "@/components/BookingSuccessClient";

interface BookingSuccessPageProps {
  params: {
    id: string;
  };
  searchParams: {
    date?: string;
    time?: string;
    price?: string;
    quantity?: string;
  };
}

export default function BookingSuccessPage({ params, searchParams }: BookingSuccessPageProps) {
  return (
    <BookingSuccessClient 
      turfId={params.id}
      selectedDate={searchParams.date}
      selectedTime={searchParams.time}
      selectedPrice={searchParams.price}
      quantity={searchParams.quantity}
    />
  );
}
