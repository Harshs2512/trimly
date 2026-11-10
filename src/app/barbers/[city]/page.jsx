import { permanentRedirect, notFound } from "next/navigation";
import { getBarberById, getVerifiedBarbers } from "@/lib/barbers";

export const revalidate = 60;

export default async function BarberCityOrIdRoute({ params }) {
  const { city } = await params;
  if (!city) notFound();

  // 1. Check if the parameter is a legacy Barber ID (ObjectId or shortId)
  const barber = await getBarberById(city);
  if (barber && barber.canonicalSlug) {
    // 301 Permanent Redirect to canonical human-readable slug URL
    permanentRedirect(barber.canonicalSlug);
  }

  // 2. If it matches a city with active barbers, redirect to /barbers/city/[city]
  const { barbers } = await getVerifiedBarbers({ city, limit: 1 });
  if (barbers && barbers.length > 0) {
    permanentRedirect(`/barbers/city/${city.toLowerCase()}`);
  }

  // 3. Known Indian launch cities fallback
  const popularCities = [
    "indore",
    "bhopal",
    "mumbai",
    "delhi",
    "bengaluru",
    "pune",
    "hyderabad",
    "ahmedabad",
    "jaipur",
    "kolkata",
    "chennai",
    "chandigarh",
    "lucknow",
    "surat",
    "nagpur",
  ];
  if (popularCities.includes(city.toLowerCase())) {
    permanentRedirect(`/barbers/city/${city.toLowerCase()}`);
  }

  notFound();
}

