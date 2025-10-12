// components/BarberCard.jsx
import Link from "next/link";

export default function BarberCard({ barber }) {
    return (
        <div className="bg-white p-4 rounded shadow flex items-center justify-between">
            <div>
                <h3 className="font-medium">{barber.shopName}</h3>
                <p className="text-sm text-gray-500">{barber.address}</p>
                <p className="text-sm mt-1">Wait: {barber.waitingTime || 0} min</p>
            </div>
            <div className="flex flex-col gap-2">
                <Link href={`/barbers/${barber._id}`} className="px-3 py-1 border rounded text-sm">View</Link>
            </div>
        </div>
    );
}
