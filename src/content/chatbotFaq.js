/**
 * Trimlly Chatbot FAQ — ground truth answers.
 * All answers reflect actual implemented behavior in the codebase.
 * Never invent prices, timings, or policies not enforced in code.
 */

export const CHATBOT_FAQ = [
  {
    id: "how_booking",
    question: "How does booking work?",
    answer:
      "Browse verified barbers by city, pick a service and open slot, then confirm with your phone number. You get an instant SMS + email confirmation. No advance payment — you pay at the salon via UPI or cash.",
  },
  {
    id: "is_free",
    question: "Is Trimlly free for customers?",
    answer:
      "Yes, completely free for customers. Browse, book, and cancel at no charge. You pay only the barber directly at the salon.",
  },
  {
    id: "which_cities",
    question: "Which cities are available?",
    answer:
      "Currently live in Indore, Bhopal, Mumbai, Delhi-NCR, Bengaluru, and Pune — with more cities coming soon. Use the barber directory to find verified salons near you.",
  },
  {
    id: "how_verified",
    question: "How are barbers verified?",
    answer:
      "Every partner salon submits shop photos, address, government-issued ID and business details. Our team reviews and approves within 24–48 hours. Verified badge = independently vetted.",
  },
  {
    id: "cancel_reschedule",
    question: "Can I cancel or reschedule?",
    answer:
      "Yes. You can cancel or reschedule your appointment from your Trimlly dashboard. We recommend doing so as early as possible so the barber can fill the slot.",
  },
  {
    id: "reminders",
    question: "Will I get a reminder?",
    answer:
      "Yes — you'll receive an SMS and email confirmation immediately after booking, plus a reminder before your appointment.",
  },
  {
    id: "owner_list",
    question: "How do I list my salon on Trimlly?",
    answer:
      "Sign up as a Salon Partner — it's free. Add your services, working hours, and photos. After verification (24–48 hrs) you appear on the directory and start receiving bookings.",
  },
  {
    id: "owner_cost",
    question: "What does it cost for salon owners?",
    answer:
      "Listing and receiving bookings is completely free. No monthly subscription, no setup fee. Trimlly only grows when your chairs are full.",
  },
  {
    id: "payment",
    question: "How do customers pay?",
    answer:
      "Customers pay directly at your salon using UPI (Google Pay, PhonePe, Paytm), card, or cash in INR. You keep 100% of payments — Trimlly does not handle money.",
  },
  {
    id: "support",
    question: "How do I contact support?",
    answer:
      "Use the WhatsApp button below for the fastest response, or message us on the Contact page. Business hours: Mon–Sat, 10 AM – 7 PM IST.",
  },
];

export const CHATBOT_SERVICES = [
  { id: "haircut", label: "Haircut & Styling" },
  { id: "beard", label: "Beard Trim & Grooming" },
  { id: "facial", label: "Facial & Skin Care" },
  { id: "bridal", label: "Bridal / Groom Package" },
  { id: "kids", label: "Kids Haircut" },
  { id: "other", label: "Other / Not Sure" },
];

export const CHATBOT_CITIES = [
  { id: "indore", label: "Indore" },
  { id: "bhopal", label: "Bhopal" },
  { id: "mumbai", label: "Mumbai" },
  { id: "delhi", label: "Delhi-NCR" },
  { id: "bengaluru", label: "Bengaluru" },
  { id: "pune", label: "Pune" },
  { id: "other", label: "Other City" },
];

export const BUSINESS_HOURS = {
  display: "Mon–Sat, 10 AM – 7 PM IST",
  // IST = UTC+5:30
  open: { hour: 10, minute: 0 },
  close: { hour: 19, minute: 0 },
  workdays: [1, 2, 3, 4, 5, 6], // 0=Sunday, 6=Saturday
};

export function isWithinBusinessHours() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const day = ist.getDay();
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const totalMinutes = hour * 60 + minute;
  const openMinutes = BUSINESS_HOURS.open.hour * 60 + BUSINESS_HOURS.open.minute;
  const closeMinutes = BUSINESS_HOURS.close.hour * 60 + BUSINESS_HOURS.close.minute;
  return BUSINESS_HOURS.workdays.includes(day) && totalMinutes >= openMinutes && totalMinutes < closeMinutes;
}

