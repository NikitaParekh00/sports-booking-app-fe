import TurfDetailClient from "@/components/TurfDetailClient";

interface TurfDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TurfDetailPage({ params }: TurfDetailPageProps) {
  const { id } = await params;
  return <TurfDetailClient turfId={id} />;
}
