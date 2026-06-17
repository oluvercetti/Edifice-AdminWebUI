import { ProjectDetailScreen } from "@/components/screens/ProjectDetailScreen";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailScreen id={id} />;
}
