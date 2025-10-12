import { getServerSession } from "next-auth";
import authOptions from "@/lib/authOptions";

export default async function BarberDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "barber") {
    return <div className="text-center mt-10 text-red-600">Access Denied</div>;
  }

  return <div className="p-6">Welcome Barber: {session.user.name}</div>;
}
