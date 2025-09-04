import TurfDetailClient from "@/components/TurfDetailClient";

interface TurfDetailPageProps {
  params: {
    id: string;
  };
}

export default function TurfDetailPage({ params }: TurfDetailPageProps) {
  return <TurfDetailClient turfId={params.id} />;
}
