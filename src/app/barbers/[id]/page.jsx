// app/barbers/[id]/page.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import BookingModal from "@/components/BookingModal";

export default function BarberDetail() {
    const params = useParams();
    const id = params.id;
    const [barber, setBarber] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => { axios.get(`/api/barbers/${id}`).then(r => setBarber(r.data)).catch(() => { }); }, [id]);

    return barber ? (
        <div className="mt-6">
            <h2 className="text-2xl font-semibold">{barber.shopName}</h2>
            <p className="text-gray-600">{barber.address}</p>
            <p className="mt-2">Estimated wait: <b>{barber.waitingTime || 0} min</b></p>

            <div className="mt-4">
                <h3 className="font-medium">Services</h3>
                <ul className="mt-2">
                    {(barber.services || []).map((s, idx) => (
                        <li key={idx} className="flex justify-between py-2 border-b">
                            <span>{s.name}</span><span>₹{s.price}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-4">
                <button onClick={() => setOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded">Book / Join Queue</button>
            </div>

            {open && <BookingModal barber={barber} onClose={() => setOpen(false)} />}
        </div>
    ) : <p>Loading...</p>;
}
