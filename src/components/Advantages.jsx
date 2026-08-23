import { CheckCircle2, Users, Scissors } from "lucide-react";

export default function Advantages() {
  const customerBenefits = ["Browse approved barber profiles and service menus", "Select only currently available appointment times", "Track pending, confirmed and historical bookings", "Cancel or reschedule eligible bookings from your dashboard", "Receive in-app booking status notifications"];
  const barberBenefits = ["Accept or decline incoming booking requests", "Complete appointments or mark no-shows", "Configure services, INR pricing and service duration", "Set shop hours, closed days and booking rules", "Manage a protected barber workspace tied to your own profile"];
  return (
    <section id="benefits" className="py-20 bg-background"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center max-w-3xl mx-auto mb-16 space-y-4"><div className="inline-block px-4 py-2 bg-accent/10 rounded-full"><span className="font-semibold text-sm">Why Trimlly?</span></div><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Useful for <span className="text-primary">customers and barbers</span></h2><p className="text-lg text-muted-foreground">Keep appointment requests and shop availability in one controlled workflow.</p></div><div className="grid lg:grid-cols-2 gap-12"><Benefit title="For Customers" icon={Users} items={customerBenefits} /><Benefit title="For Barbers" icon={Scissors} items={barberBenefits} /></div></div></section>
  );
}
function Benefit({ title, icon: Icon, items }) { return <div className="space-y-6"><div className="flex items-center gap-4"><div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center"><Icon className="w-8 h-8 text-primary" /></div><h3 className="text-2xl font-bold">{title}</h3></div><ul className="space-y-4">{items.map((item) => <li key={item} className="flex items-start gap-3"><CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul></div>; }
