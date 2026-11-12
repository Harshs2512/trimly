import ReviewsClient from "./ReviewsClient";

export const metadata = {
  title: "Customer Reviews & Barber Ratings",
  description:
    "Explore authentic ratings, grooming experiences, and real reviews left by clients at verified barbershops across Trimlly India.",
  alternates: {
    canonical: "/reviews",
  },
  openGraph: {
    title: "Customer Reviews & Barber Ratings | Trimlly",
    description:
      "Read verified customer reviews and ratings for barbers and salons across India. Honest grooming feedback from real clients.",
    url: "/reviews",
    siteName: "Trimlly",
    locale: "en_IN",
    type: "website",
  },
};

export default function ReviewsPage() {
  return <ReviewsClient />;
}
