import { RoastDisplay } from "@/components/RoastDisplay";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoastDisplay id={id} />;
}
