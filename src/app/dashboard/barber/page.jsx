import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/authz";
import { getDb } from "@/lib/mongodb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BarberProfileForm from "@/components/dashboard/BarberProfileForm";
import ServiceManager from "@/components/dashboard/ServiceManager";
import BookingManager from "@/components/dashboard/BookingManager";
import { Scissors, UserCircle, CalendarCheck, Settings } from "lucide-react";

export default async function BarberDashboard() {
  const session = await getActiveSession();
  if (!session) redirect("/login");
  if (session.user.role !== "barber") redirect("/dashboard");

  const db = await getDb();
  const profile = await db.collection("barbers").findOne({ userId: session.user.id, deletedAt: { $exists: false } });
  const plainProfile = profile ? {
    ...profile,
    _id: profile._id.toString(),
    createdAt: profile.createdAt?.toISOString?.() || profile.createdAt,
    updatedAt: profile.updatedAt?.toISOString?.() || profile.updatedAt,
    verifiedAt: profile.verifiedAt?.toISOString?.() || profile.verifiedAt,
  } : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 max-w-6xl pt-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border border-primary/20"><span className="w-2 h-2 rounded-full bg-primary" /> Workspace</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Barber <span className="text-primary">Dashboard</span></h1>
          <p className="mt-2 text-lg text-muted-foreground">Manage booking requests, services and your shop profile.</p>
          {plainProfile && <p className="mt-3 text-sm font-medium">Verification: <span className={plainProfile.verificationStatus === "verified" ? "text-green-600" : plainProfile.verificationStatus === "rejected" ? "text-red-600" : "text-yellow-600"}>{plainProfile.verificationStatus || "pending"}</span></p>}
        </div>

        <Tabs defaultValue={plainProfile ? "bookings" : "profile"} className="space-y-8">
          <TabsList className="bg-card border p-1.5 rounded-2xl h-auto flex flex-wrap justify-start gap-2">
            <TabsTrigger value="bookings" className="rounded-xl px-6 py-3 gap-2"><CalendarCheck className="w-4 h-4" /> Bookings</TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl px-6 py-3 gap-2"><Scissors className="w-4 h-4" /> Services</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl px-6 py-3 gap-2"><Settings className="w-4 h-4" /> Shop Profile</TabsTrigger>
          </TabsList>

          <div className="bg-card/40 border rounded-3xl p-6 md:p-8">
            <TabsContent value="bookings" className="m-0">
              {!plainProfile ? <Empty icon={UserCircle} title="Profile incomplete" text="Complete your Shop Profile before managing bookings." /> : <BookingManager barberId={plainProfile._id} timezone={plainProfile.timezone || "Asia/Kolkata"} />}
            </TabsContent>
            <TabsContent value="services" className="m-0">
              {!plainProfile ? <Empty icon={Scissors} title="Profile incomplete" text="Complete your Shop Profile before adding services." /> : <ServiceManager barberId={plainProfile._id} services={plainProfile.services || []} />}
            </TabsContent>
            <TabsContent value="profile" className="m-0"><BarberProfileForm initialData={plainProfile} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, text }) {
  return <div className="text-center py-12"><Icon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" /><h3 className="text-xl font-bold mb-2">{title}</h3><p className="text-muted-foreground">{text}</p></div>;
}
