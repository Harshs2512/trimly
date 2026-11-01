"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  Scissors,
  User,
  ShieldCheck,
  MapPin,
  Search,
  RotateCcw,
  Clock,
  Compass,
  X,
  Store,
  Calendar,
  Layers,
  Eye,
  Edit3,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveCityCoordinates } from "@/lib/geo";

// Tile layer providers
const TILE_LAYERS = {
  dark: {
    name: "Dark Luxury",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
  street: {
    name: "Street View",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: "Clean Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
};

const METRO_PRESETS = [
  { name: "All India", coords: [22.5937, 78.9629], zoom: 5 },
  { name: "Delhi NCR", coords: [28.6139, 77.209], zoom: 12 },
  { name: "Mumbai", coords: [19.076, 72.8777], zoom: 12 },
  { name: "Bengaluru", coords: [12.9716, 77.5946], zoom: 12 },
  { name: "Hyderabad", coords: [17.385, 78.4867], zoom: 12 },
  { name: "Pune", coords: [18.5204, 73.8567], zoom: 12 },
  { name: "Jaipur", coords: [26.9124, 75.7873], zoom: 12 },
  { name: "Kolkata", coords: [22.5726, 88.3639], zoom: 12 },
];

export default function AdminGeoMap({ barbers = [], users = [], onInspectBarber, onEditUser }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [activeTileKey, setActiveTileKey] = useState("dark");
  const [filterType, setFilterType] = useState("all"); // "all" | "barbers" | "users" | "pending"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [leafletLib, setLeafletLib] = useState(null);

  // Normalizes latitude and longitude
  function extractLatLng(entity, index = 0) {
    let lat = null;
    let lng = null;

    if (Array.isArray(entity.coordinates) && entity.coordinates.length === 2) {
      lng = entity.coordinates[0];
      lat = entity.coordinates[1];
    } else if (entity.location?.coordinates && Array.isArray(entity.location.coordinates)) {
      lng = entity.location.coordinates[0];
      lat = entity.location.coordinates[1];
    } else {
      const fallback = resolveCityCoordinates(entity.city || entity.address);
      if (fallback) {
        lng = fallback[0];
        lat = fallback[1];
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      lat = 28.6139;
      lng = 77.209;
    }

    // Small micro-scatter for distinct pins in the exact same city center
    const scatterLat = (Math.sin(index * 3.7) * 0.015);
    const scatterLng = (Math.cos(index * 3.7) * 0.015);

    return [lat + scatterLat, lng + scatterLng];
  }

  // Filtered lists
  const filteredBarbers = useMemo(() => {
    let list = barbers;
    if (filterType === "pending") {
      list = list.filter((b) => b.verificationStatus === "pending");
    }
    if (filterType === "users") return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) =>
        (b.shopName || "").toLowerCase().includes(q) ||
        (b.city || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [barbers, filterType, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (filterType === "barbers" || filterType === "pending") return [];
    let list = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.city || "").toLowerCase().includes(q) ||
        (u.address || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filterType, searchQuery]);

  // Dynamically load Leaflet on client side
  useEffect(() => {
    let isCancelled = false;
    import("leaflet").then((module) => {
      if (!isCancelled) {
        setLeafletLib(module.default || module);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Leaflet Map once DOM is ready
  useEffect(() => {
    if (!leafletLib || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = leafletLib;
    const initialConfig = METRO_PRESETS[0];

    const map = L.map(mapContainerRef.current, {
      center: initialConfig.coords,
      zoom: initialConfig.zoom,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true,
    });

    const activeTile = TILE_LAYERS[activeTileKey];
    const tileLayer = L.tileLayer(activeTile.url, {
      attribution: activeTile.attribution,
      subdomains: activeTile.subdomains || "abc",
      maxZoom: activeTile.maxZoom,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersGroup;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      setIsMapReady(false);
    };
  }, [leafletLib]);

  // Handle Tile Layer Switch
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !tileLayerRef.current) return;
    const L = leafletLib;
    const activeTile = TILE_LAYERS[activeTileKey];

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newTileLayer = L.tileLayer(activeTile.url, {
      attribution: activeTile.attribution,
      subdomains: activeTile.subdomains || "abc",
      maxZoom: activeTile.maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [activeTileKey, leafletLib]);

  // Render Real Markers on the Map
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !markersLayerRef.current) return;
    const L = leafletLib;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    // 1. Render Barbershop Markers
    filteredBarbers.forEach((barber, idx) => {
      const [lat, lng] = extractLatLng(barber, idx);
      const isPending = barber.verificationStatus === "pending";

      const barberIcon = L.divIcon({
        className: "custom-barber-pin",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: ${isPending ? '#f59e0b' : '#178584'}; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.6); cursor: pointer; transition: transform 0.2s ease;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${isPending ? '#000000' : '#ffffff'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
            ${isPending ? '<span style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; border: 2px solid #ffffff;"></span>' : ''}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon: barberIcon });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; color: #111827; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0F172A;">${barber.shopName}</strong>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 7px; border-radius: 12px; background: ${isPending ? '#fef3c7' : '#dcfce7'}; color: ${isPending ? '#b45309' : '#15803d'};">
              ${barber.verificationStatus || 'pending'}
            </span>
          </div>
          <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">
            📍 ${barber.address || barber.city || 'Address pending'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
            👥 ${barber.staffCount ?? 1} staff • 🪑 ${barber.chairsCount ?? 1} chairs
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-bottom: 8px;">
            GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
          <button id="inspect-barber-${barber.id || barber._id}" style="width: 100%; padding: 6px 10px; font-size: 12px; font-weight: 600; background: #178584; color: #ffffff; border: none; border-radius: 8px; cursor: pointer;">
            Review Shop Profile &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`inspect-barber-${barber.id || barber._id}`);
        if (btn) {
          btn.onclick = () => {
            if (onInspectBarber) onInspectBarber(barber);
          };
        }
      });

      marker.on("click", () => {
        setSelectedEntity({ ...barber, type: "barber", lat, lng });
      });

      markersGroup.addLayer(marker);
    });

    // 2. Render Customer Markers
    filteredUsers.forEach((user, idx) => {
      const [lat, lng] = extractLatLng(user, idx + 50);

      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer; transition: transform 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([lat, lng], { icon: userIcon });

      const joinedDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "Recently";

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; color: #111827; min-width: 210px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0F172A;">${user.name}</strong>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 7px; border-radius: 12px; background: #dbeafe; color: #1e40af;">
              ${user.role || 'customer'}
            </span>
          </div>
          <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">
            📍 ${user.city || user.address || 'Delhi NCR'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
            📅 Joined: ${joinedDate}
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-bottom: 8px;">
            GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
          <button id="edit-user-${user.id || user._id}" style="width: 100%; padding: 6px 10px; font-size: 12px; font-weight: 600; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; cursor: pointer;">
            Manage User &amp; Location &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`edit-user-${user.id || user._id}`);
        if (btn) {
          btn.onclick = () => {
            if (onEditUser) onEditUser(user);
          };
        }
      });

      marker.on("click", () => {
        setSelectedEntity({ ...user, type: "user", lat, lng });
      });

      markersGroup.addLayer(marker);
    });
  }, [filteredBarbers, filteredUsers, leafletLib, onInspectBarber, onEditUser]);

  // FlyTo function for smooth real map animation
  function flyToMetro(preset) {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(preset.coords, preset.zoom, { duration: 1.2 });
  }

  // FlyTo a specific entity from list
  function locateEntityOnMap(entity, index) {
    if (!mapInstanceRef.current) return;
    const [lat, lng] = extractLatLng(entity, index);
    mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    setSelectedEntity({ ...entity, lat, lng });
  }

  return (
    <div className="bg-card/70 backdrop-blur border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Top Controls: Search, Tiles Switcher, and Fast Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Real Geographic Map</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Full street-level OpenStreetMap view displaying live locations of barbershops and customers.
          </p>
        </div>

        {/* Tile Style Switcher & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Map Layer Mode Switcher */}
          <div className="bg-secondary/40 border border-border/80 rounded-xl p-1 flex items-center text-xs">
            {Object.entries(TILE_LAYERS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setActiveTileKey(key)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeTileKey === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Locate user or barbershop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Layer Filter Pills and Metro Jump Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-primary" /> Filter:
          </span>
          {[
            { id: "all", label: `All Pins (${barbers.length + users.length})` },
            { id: "barbers", label: `Barbershops (${barbers.length})` },
            { id: "users", label: `Customers (${users.length})` },
            { id: "pending", label: `Pending Review (${barbers.filter((b) => b.verificationStatus === "pending").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                filterType === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Metro Presets */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-primary" /> Jump Metro:
          </span>
          {METRO_PRESETS.map((m) => (
            <button
              key={m.name}
              onClick={() => flyToMetro(m)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-secondary/30 hover:bg-primary/10 hover:text-primary transition shrink-0"
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Real Map Canvas & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Leaflet Real Street Map */}
        <div className="lg:col-span-3 relative h-[520px] rounded-3xl overflow-hidden border border-border/80 shadow-md">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-zinc-950/90 backdrop-blur-md border border-border/70 rounded-2xl p-3 text-xs space-y-1.5 shadow-xl hidden sm:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              Map Key
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#178584] border border-white" />
              <span className="font-medium text-white">Barbershop Lounge</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white" />
              <span className="font-medium text-white">Pending Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2563eb] border border-white" />
              <span className="font-medium text-white">Customer Location</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Directory of Plotted Locations */}
        <div className="bg-secondary/20 border border-border/70 rounded-3xl p-4 flex flex-col h-[520px]">
          <div className="pb-3 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Plotted Locations</h3>
              <p className="text-[11px] text-muted-foreground">Click entity to center on map</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {filteredBarbers.length + filteredUsers.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
            {/* Barbers list */}
            {filteredBarbers.map((b, i) => (
              <div
                key={`side-b-${b.id || b._id}`}
                onClick={() => locateEntityOnMap(b, i)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 group ${
                  selectedEntity?.id === (b.id || b._id)
                    ? "bg-primary/15 border-primary"
                    : "bg-card/60 border-border/60 hover:border-primary/40"
                }`}
              >
                <div className="space-y-0.5 overflow-hidden">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <Scissors className="w-3 h-3 text-primary shrink-0" />
                    <span>{b.shopName}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    📍 {b.address || b.city || "Delhi NCR"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Status: <span className="capitalize font-semibold text-foreground">{b.verificationStatus || "pending"}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg group-hover:bg-primary/20 group-hover:text-primary shrink-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

            {/* Users list */}
            {filteredUsers.map((u, i) => (
              <div
                key={`side-u-${u.id || u._id}`}
                onClick={() => locateEntityOnMap(u, i + 50)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 group ${
                  selectedEntity?.id === (u.id || u._id)
                    ? "bg-blue-600/15 border-blue-500"
                    : "bg-card/60 border-border/60 hover:border-blue-500/40"
                }`}
              >
                <div className="space-y-0.5 overflow-hidden">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <User className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{u.name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    📍 {u.city || u.address || "Delhi NCR"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 shrink-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

            {filteredBarbers.length === 0 && filteredUsers.length === 0 && (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No entities found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
