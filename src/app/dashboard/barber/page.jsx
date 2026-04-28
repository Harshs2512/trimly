import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BarberProfileForm from "@/components/dashboard/BarberProfileForm";
import ServiceManager from "@/components/dashboard/ServiceManager";
import BookingManager from "@/components/dashboard/BookingManager";
import { Scissors, UserCircle, CalendarCheck, Settings } from "lucide-react";

async function getBarberProfile(userId) {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection("barbers").findOne({ userId });
}

export default async function BarberDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "barber") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
           <h2 className="text-3xl font-bold text-red-500">Access Denied</h2>
           <p className="text-muted-foreground">You do not have permission to view the Barber Workspace.</p>
        </div>
      </div>
    );
  }

  const profile = await getBarberProfile(session.user.id);
  const plainProfile = profile ? {
    ...profile,
    _id: profile._id.toString(),
    workingHours: profile.workingHours || { open: "09:00", close: "17:00" },
    services: profile.services || [],
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  } : null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-primary/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <div className="container mx-auto px-6 max-w-6xl pt-24">
        {/* Workspace Header */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Workspace
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">
            Barber <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Manage your schedule, update your services, and track your business performance.
          </p>
        </div>

        {/* Dashboard Tabs Area */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <Tabs defaultValue={plainProfile ? "bookings" : "profile"} className="space-y-8">
            <TabsList className="bg-card/50 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl h-auto flex flex-wrap justify-start gap-2 shadow-sm">
              <TabsTrigger value="bookings" className="rounded-xl px-6 py-3 font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <CalendarCheck className="w-4 h-4" /> Bookings
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-xl px-6 py-3 font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <Scissors className="w-4 h-4" /> Services
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-xl px-6 py-3 font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <Settings className="w-4 h-4" /> Shop Profile
              </TabsTrigger>
            </TabsList>

            <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <TabsContent value="bookings" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                {!plainProfile ? (
                  <div className="text-center py-12">
                    <UserCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Profile Incomplete</h3>
                    <p className="text-muted-foreground">You must complete your Shop Profile before managing bookings.</p>
                  </div>
                ) : (
                  <BookingManager barberId={plainProfile._id} />
                )}
              </TabsContent>

              <TabsContent value="services" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                {!plainProfile ? (
                  <div className="text-center py-12">
                    <Scissors className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Profile Incomplete</h3>
                    <p className="text-muted-foreground">You must complete your Shop Profile before adding services.</p>
                  </div>
                ) : (
                  <ServiceManager userId={session.user.id} services={plainProfile.services} />
                )}
              </TabsContent>

              <TabsContent value="profile" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                <BarberProfileForm user={session.user} initialData={plainProfile} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
