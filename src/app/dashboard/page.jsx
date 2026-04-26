import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const client = await clientPromise;
  const db = client.db("trimly");
  
  // Fetch bookings for this user
  // Note: stored userId is a string. If using ObjectIds, need conversion.
  // My booking implementation stores userId as string from session.user.id
  const bookings = await db.collection("bookings")
    .find({ userId: session.user.id }) 
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="container mx-auto p-6 mt-20">
      <div className="flex justify-between items-center mb-8">
         <h1 className="text-3xl font-bold">Welcome, {session.user.name}</h1>
         <Link href="/barbers"><Button variant="outline">Book New Appointment</Button></Link>
      </div>
      
      {session.user.role === 'barber' && (
        <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Barber Dashboard</h2>
          <p className="mb-4 text-muted-foreground">Manage your shop, services, and upcoming appointments.</p>
          <Link href="/dashboard/barber"><Button>Go to Barber Dashboard</Button></Link>
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4">Your Bookings</h2>
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed text-muted-foreground">
             <p>No bookings found.</p>
             <Link href="/barbers" className="text-primary hover:underline mt-2 inline-block">Find a barber near you</Link>
          </div>
        ) : (
          bookings.map(booking => (
            <div key={booking._id.toString()} className="border border-border p-4 rounded-lg bg-card shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h3 className="font-semibold text-lg">{booking.service}</h3>
                  <p className="text-sm text-muted-foreground">
                    At {new Date(booking.timeSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {/* Ideally we'd fetch barber name too, but for now just showing ID or simple details */}
               </div>
               <div className="flex items-center gap-3">
                   <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                     ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                       booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'}`}>
                    {booking.status}
                  </span>
                  {/* Action buttons could go here */}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
