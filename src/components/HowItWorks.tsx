import { Search, Calendar, Scissors, Bell } from "lucide-react";

const steps = [
  { icon: Search, step: "01", title: "Browse Barbers", description: "Review verified shop profiles, service menus, prices and booking hours." },
  { icon: Calendar, step: "02", title: "Choose an Available Slot", description: "Trimlly checks the selected service duration and existing bookings before showing available times." },
  { icon: Bell, step: "03", title: "Wait for Barber Confirmation", description: "Your request starts as pending. The barber can accept or decline it and you receive an in-app update." },
  { icon: Scissors, step: "04", title: "Manage the Appointment", description: "Customers can cancel or reschedule eligible bookings, while barbers complete or mark no-show appointments." },
];

export default function HowItWorks() {
  return <section id="about" className="py-20 bg-gradient-to-b from-muted/30 to-background"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center max-w-3xl mx-auto mb-16 space-y-4"><div className="inline-block px-4 py-2 bg-primary/10 rounded-full"><span className="text-primary font-semibold text-sm">How It Works</span></div><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Four clear steps from <span className="text-primary">discovery to service</span></h2><p className="text-lg text-muted-foreground">Booking status remains explicit throughout the process.</p></div><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">{steps.map((item) => <div key={item.step} className="relative bg-card border rounded-2xl p-6 space-y-4"><div className="absolute -top-4 -right-4 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">{item.step}</div><div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center"><item.icon className="w-8 h-8 text-primary" /></div><h3 className="text-xl font-bold">{item.title}</h3><p className="text-muted-foreground leading-relaxed">{item.description}</p></div>)}</div></div></section>;
}
