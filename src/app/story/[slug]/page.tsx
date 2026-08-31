import { permanentRedirect } from "next/navigation";
import { lessonPath } from "@/lib/activities";

/** Old Zoom links used /story/[slug]. The public path is /lesson/[slug]. */
export default async function LegacyStoryRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;
  permanentRedirect(lessonPath(slug, session));
}
