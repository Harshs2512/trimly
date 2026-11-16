export default function manifest() {
  return {
    name: "Trimlly - Book Barber & Salon Appointments Online in India",
    short_name: "Trimlly",
    description:
      "Book verified barbers and salons across India with real-time chair slots, transparent INR prices, and instant confirmation.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#006b75",
    orientation: "portrait",
    categories: ["lifestyle", "business", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}

