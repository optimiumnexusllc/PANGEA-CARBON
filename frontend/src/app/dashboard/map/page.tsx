'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

const TYPE_COLORS = {
  SOLAR: '#FCD34D', WIND: '#38BDF8', HYDRO: '#00FF94',
  BIOMASS: '#F87171', HYBRID: '#A78BFA'
};
const TYPE_ICONS = {
  SOLAR: '☀️', WIND: '💨', HYDRO: '💧', BIOMASS: '🌿', HYBRID: '⚡'
};
const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—';

export default function MapPage() {
  const { t, lang } = useLang();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects({ limit: '100' }).then(d => {
      setProjects(d.projects || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstance.current) return;

    // Charger Leaflet dynamiquement
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;

      // Map dark style
      const map = L.map(mapRef.current, {
        center: [5, 20],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
      });

      // Tile sombre (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Zoom control custom
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;

      // Ajouter les markers des projets déjà chargés
      addMarkers(map, L);
    };
    document.body.appendChild(script);

    return () => { /* cleanup */ };
  }, []);

  const addMarkers = (map, L) => {
    projects.forEach(p => {
      if (!p.latitude || !p.longitude) return;
      const mrv = p.mrvRecords?.[0];
      const color = TYPE_COLORS[p.type] || '#4A6278';

      const icon = L.divIcon({
        html: `
          <div style="
            width: 36px; height: 36px;
            background: ${color}20;
            border: 2px solid ${color};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px;
            box-shadow: 0 0 12px ${color}60;
            cursor: pointer;
          ">${TYPE_ICONS[p.type] || '⚡'}</div>
          <div style="
            width: 8px; height: 8px;
            background: ${color};
            border-radius: 50%;
            position: absolute;
            bottom: -4px; left: 50%;
            transform: translateX(-50%);
          "></div>
        `,
        className: '',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const popup = L.popup({
        className: 'pangea-popup',
        maxWidth: 260,
        closeButton: true,
      }).setContent(`
        <div style="background:#121920;border:1px solid #1E2D3D;border-radius:10px;padding:16px;font-family:Inter,sans-serif;color:#E8EFF6;min-width:220px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="font-size:20px">${TYPE_ICONS[p.type]}</span>
            <div>
              <div style="font-weight:600;font-size:13px">${p.name}</div>
              <div style="font-size:11px;color:#4A6278">${p.country} · ${p.installedMW} MW</div>
            </div>
          </div>
          ${mrv ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
              <div style="background:#0D1117;border-radius:6px;padding:8px;">
                <div style="font-size:9px;color:#4A6278;margin-bottom:3px">CRÉDITS tCO₂e</div>
                <div style="font-size:15px;font-weight:700;color:#00FF94">${fmt(mrv.netCarbonCredits)}</div>
              </div>
              <div style="background:#0D1117;border-radius:6px;padding:8px;">
                <div style="font-size:9px;color:#4A6278;margin-bottom:3px">REVENUS USD</div>
                <div style="font-size:15px;font-weight:700;color:#38BDF8">$${fmt(mrv.revenueUSD)}</div>
              </div>
            </div>
          ` : `<div style="font-size:11px;color:#4A6278;margin-top:8px">No data MRV — ajoutez des lectures</div>`}
          <a href="/dashboard/projects/${p.id}" style="display:block;margin-top:10px;text-align:center;background:#00FF94;color:#080B0F;border-radius:6px;padding:6px;font-size:12px;font-weight:600;text-decoration:none">
            Voir le projet →
          </a>
        </div>
      `);

      L.marker([p.latitude, p.longitude], { icon })
        .addTo(map)
        .bindPopup(popup);
    });
  };

  // Re-ajouter markers quand projets chargés
  useEffect(() => {
    if !mapInstance.current || !(window.L || projects.length === 0) return;
    addMarkersmapInstance.current, (window.L);
  }, [projects]);

  const totalCredits = projects.reduce((s, p) => s + (p.mrvRecords?.[0]?.netCarbonCredits || 0), 0);
  const totalRev = projects.reduce((s, p) => s + (p.mrvRecords?.[0]?.revenueUSD || 0), 0);
  const projectsWithCoords = projects.filter(p => p.latitude && p.longitude);

  return (
    <div style={{ height: 'calc(100vh - 0px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ padding: '12px 20px', background: '#0D1117', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>PANGEA CARBON · GEOSPATIAL INTELLIGENCE</div>
          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#E8EFF6' }}>L('MRV Projects Map · Africa', 'Carte des projets MRV · Afrique')</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            ['Projects cartographiés', projectsWithCoords.length, '#38BDF8'],
            ['Credits tCO₂e', fmt(totalCredits), '#00FF94'],
            ['Revenue USD', '$' + fmt(totalRev), '#FCD34D'],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: color as string, fontFamily: 'Syne, sans-serif' }}>{String(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}/>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000,
          background: 'rgba(13,17,23,0.92)', border: '1px solid #1E2D3D',
          borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>LÉGENDE</div>
          {Object.entries(TYPE_ICONS).map(([type, icon]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${TYPE_COLORS[type]}20`, border: `1.5px solid ${TYPE_COLORS[type]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{icon}</div>
              <span style={{ fontSize: 11, color: '#8FA3B8' }}>{type}</span>
            </div>
          ))}
        </div>

        {/* No projects warning */}
        {!loading && projectsWithCoords.length === 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000,
            background: 'rgba(13,17,23,0.95)', border: '1px solid #1E2D3D', borderRadius: 12, padding: '24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', marginBottom: 4 }}>No projects géolocalisé</div>
            <div style={{ fontSize: 12, color: '#4A6278', marginBottom: 16 }}>Ajoutez des coordonnées à vos projets pour les voir sur la carte</div>
            <a href="/dashboard/projects/new" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              Create un projet →
            </a>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000 }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>

      {/* Leaflet popup dark style */}
      <style>{`
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { background: #121920 !important; }
        .leaflet-popup-close-button { color: #4A6278 !important; top: 8px !important; right: 8px !important; font-size: 18px !important; }
      `}</style>
    </div>
  );
}
