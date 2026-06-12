import { redirect } from "next/navigation";
import { getCollection } from "@/data/collections";

type Props = { params: Promise<{ slug: string }> };

export default async function LegacyCollectionRedirect({ params }: Props) {
  const { slug } = await params;
  if (getCollection(slug)) {
    redirect(`/collection/${slug}`);
  }
  redirect("/collections");
}
