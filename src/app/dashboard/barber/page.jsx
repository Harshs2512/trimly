import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BarberProfileForm from "@/components/dashboard/BarberProfileForm";
import ServiceManager from "@/components/dashboard/ServiceManager";

async function getBarberProfile(userId) {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection("barbers").findOne({ userId });
}

export default async function BarberDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "barber") {
    return <div className="text-center mt-10 text-red-600">Access Denied</div>;
  }

  const profile = await getBarberProfile(session.user.id);
  // Serializable profile (convert _id and dates if needed, but Next.js Server Components handle JSON structs usually fine, 
  // but _id is an object, sending to client component requires serialization)
  const plainProfile = profile ? {
    ...profile,
    _id: profile._id.toString(),
    workingHours: profile.workingHours || { open: "09:00", close: "17:00" },
    services: profile.services || [],
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  } : null;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Barber Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <BarberProfileForm user={session.user} initialData={plainProfile} />
        </TabsContent>
        <TabsContent value="services">
          <ServiceManager userId={session.user.id} services={plainProfile?.services} />
        </TabsContent>
        <TabsContent value="bookings">
          <div className="p-4 border rounded-md bg-muted/50 text-center text-muted-foreground">
            Bookings management coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
