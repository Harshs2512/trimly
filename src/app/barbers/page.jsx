// app/barbers/page.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import BarberCard from "@/components/BarberCard";

export default function BarbersPage() {
  const [list, setList] = useState([]);
  useEffect(()=>{ axios.get("/api/barbers").then(r=>setList(r.data)).catch(()=>{}); }, []);
  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold">Barbers near you</h2>
      <div className="mt-4 grid grid-cols-1 gap-4">
        {list.map(b => <BarberCard key={b._id} barber={b} />)}
        {list.length===0 && <p className="text-gray-500">No barbers yet. You can add some from the dashboard (seed data).</p>}
      </div>
    </div>
  );
}
