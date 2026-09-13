'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { LabAuthCard } from '@/components/LabAuthCard';
import { createRealtimeRide, getMagdalenaLabContext, subscribeToRide, type RealtimeRide } from '@/lib/realtimeRide';
import type { RouteResult } from '@/lib/geo';

type Point = { lng: number; lat: number; label: string };

const SATELLITE: maplibregl.StyleSpecification = {
  version: 8,
  sources: { imagery: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Imagery © Esri and contributors' } },
  layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
};

export default function PassengerLabPage() {
  return <main className="realtime-lab-page passenger-realtime-page"><LabAuthCard roleLabel="Passenger Phone A">{() => <PassengerRealtimeLab />}</LabAuthCard></main>;
}

function PassengerRealtimeLab() {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const dropoffMarker = useRef<maplibregl.Marker | null>(null);
  const [pickup, setPickup] = useState<Point>({ lng: 124.10724, lat: 12.64599, label: 'Sta. Magdalena Municipal Hall' });
  const [dropoff, setDropoff] = useState<Point>({ lng: 124.10775, lat: 12.64583, label: 'Santa Magdalena Public Market' });
  const [target, setTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [mode, setMode] = useState<'PADYAK' | 'ETRIKE' | 'TRICYCLE'>('ETRIKE');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [ride, setRide] = useState<RealtimeRide | null>(null);
  const [message, setMessage] = useState('Tap the satellite map to adjust pickup or destination.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!host.current || map.current) return;
    const instance = new maplibregl.Map({ container: host.current, style: SATELLITE, center: [124.1075, 12.6462], zoom: 16.8 });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current = instance;
    const handler = (event: maplibregl.MapMouseEvent) => {
      if (ride) return;
      const point = { lng: event.lngLat.lng, lat: event.lngLat.lat, label: `Pinned · ${event.lngLat.lat.toFixed(5)}, ${event.lngLat.lng.toFixed(5)}` };
      if (target === 'pickup') { setPickup(point); setTarget('dropoff'); } else { setDropoff(point); setTarget('pickup'); }
      setRoute(null);
    };
    instance.on('click', handler);
    return () => { instance.off('click', handler); instance.remove(); map.current = null; };
  }, [target, ride]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    pickupMarker.current?.remove(); dropoffMarker.current?.remove();
    pickupMarker.current = new maplibregl.Marker({ color: '#0b684d', draggable: !ride }).setLngLat([pickup.lng, pickup.lat]).addTo(instance);
    dropoffMarker.current = new maplibregl.Marker({ color: '#d07a00', draggable: !ride }).setLngLat([dropoff.lng, dropoff.lat]).addTo(instance);
  }, [pickup, dropoff, ride]);

  useEffect(() => {
    if (!ride) return;
    return subscribeToRide(ride.id, (next) => { setRide(next); setMessage(`Realtime update: ${next.status.replaceAll('_', ' ')}`); });
  }, [ride?.id]);

  function drawRoute(result: RouteResult) {
    const instance = map.current;
    if (!instance) return;
    const render = () => {
      if (instance.getLayer('m2-route')) instance.removeLayer('m2-route');
      if (instance.getSource('m2-route')) instance.removeSource('m2-route');
      instance.addSource('m2-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: result.geometry } });
      instance.addLayer({ id: 'm2-route', type: 'line', source: 'm2-route', paint: { 'line-color': '#19e68c', 'line-width': 6 } });
    };
    if (instance.isStyleLoaded()) render(); else instance.once('load', render);
  }

  async function previewRoute() {
    setBusy(true); setMessage('Routing on actual roads…');
    try {
      const response = await fetch('/api/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pickup, dropoff, mode: mode === 'PADYAK' ? 'padyak' : mode === 'ETRIKE' ? 'etrike' : 'tricycle' }) });
      if (!response.ok) throw new Error('ROUTE_UNAVAILABLE');
      const result = await response.json() as RouteResult;
      setRoute(result); drawRoute(result);
      setMessage(`${(result.distanceMeters / 1000).toFixed(2)} km · ~${Math.max(1, Math.round(result.durationSeconds / 60))} min`);
    } catch { setMessage('Route unavailable. No fake straight-line fallback.'); }
    finally { setBusy(false); }
  }

  async function requestRide() {
    if (!route || busy) return;
    setBusy(true); setMessage('Creating persistent TEST ride…');
    try {
      const context = await getMagdalenaLabContext();
      const created = await createRealtimeRide({ ...context, vehicleClass: mode, pickup, dropoff, roadDistanceM: route.distanceMeters, estimatedDurationS: route.durationSeconds, isTest: true });
      setRide(created); setMessage('Persistent ride created. Driver and dispatcher should update without refresh.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ride request failed'); }
    finally { setBusy(false); }
  }

  return (
    <section className="realtime-panel passenger-realtime-panel">
      <div className="realtime-head"><div><span>REALTIME LAB</span><h1>Passenger Phone A</h1></div><b className="lab-pill">TEST · ₱0</b></div>
      <div ref={host} className="m2-map" />
      {!ride && <div className="target-switch"><button className={target === 'pickup' ? 'active' : ''} onClick={() => setTarget('pickup')}>Set pickup</button><button className={target === 'dropoff' ? 'active' : ''} onClick={() => setTarget('dropoff')}>Set destination</button></div>}
      <div className="m2-route-copy"><div><small>PICKUP</small><b>{pickup.label}</b></div><div><small>DESTINATION</small><b>{dropoff.label}</b></div></div>
      {!ride && <div className="m2-modes">{(['PADYAK','ETRIKE','TRICYCLE'] as const).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => { setMode(item); setRoute(null); }}>{item === 'ETRIKE' ? 'E-TRIKE' : item}</button>)}</div>}
      <p className="realtime-message">{message}</p>
      {!ride && <><button className="full-action secondary-m2" onClick={previewRoute} disabled={busy}>Preview road route</button><button className="full-action" onClick={requestRide} disabled={!route || busy}>Request TEST ride</button></>}
      {ride && <article className="ride-state-card"><small>{ride.booking_code}</small><h2>{ride.status.replaceAll('_', ' ')}</h2><p>{ride.requested_vehicle_class} · test ride · platform fee ₱0</p></article>}
    </section>
  );
}
