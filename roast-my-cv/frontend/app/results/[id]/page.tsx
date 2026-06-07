import { RoastDisplay } from "@/components/RoastDisplay";

export default function ResultsPage({ params }: { params: { id: string } }) {
  return <RoastDisplay id={params.id} />;
}
