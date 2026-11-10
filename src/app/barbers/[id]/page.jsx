import { permanentRedirect, notFound } from "next/navigation";
import { getBarberById } from "@/lib/barbers";

export const revalidate = 60;

export default async function BarberOldIdRedirectPage({ params }) {
  const { id } = await params;
  const barber = await getBarberById(id);

  if (!barber || !barber.canonicalSlug) {
    notFound();
  }

  // 301 Permanent Redirect to canonical human-readable slug URL
  permanentRedirect(barber.canonicalSlug);
}
