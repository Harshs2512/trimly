// components/BookingModal.jsx
"use client";
import { useState } from "react";
import axios from "axios";

export default function BookingModal({ barber, onClose }) {
    const [service, setService] = useState((barber.services && barber.services[0]?.name) || "");
    const [msg, setMsg] = useState("");

    async function submit(e) {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user) {
            setMsg("Please login to book.");
            return;
        }
        try {
            const payload = {
                userId: user.email,
                barberId: barber._id,
                service,
                timeSlot: new Date().toISOString()
            };
            await axios.post("/api/bookings", payload);
            setMsg("Booked! You'll be notified.");
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            setMsg("Error creating booking");
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white max-w-md w-full p-6 rounded">
                <h3 className="text-lg font-medium">Book at {barber.shopName}</h3>
                <form onSubmit={submit} className="mt-4 space-y-3">
                    <select value={service} onChange={e => setService(e.target.value)} className="w-full p-2 border rounded">
                        {(barber.services || []).map((s, i) => <option key={i} value={s.name}>{s.name} - ₹{s.price}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Confirm</button>
                        <button type="button" onClick={onClose} className="flex-1 border rounded py-2">Cancel</button>
                    </div>
                </form>
                {msg && <p className="mt-3 text-sm text-green-600">{msg}</p>}
            </div>
        </div>
    );
}
