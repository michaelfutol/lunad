'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { LocationChooser } from '@/components/LocationChooser';
import type { LngLat, RouteMode, RouteResult } from '@/lib/geo';

type Place = LngLat & { label: string };
type Target = 'pickup' | 'dropoff';

const MAGDALENA_CENTER: [number, number] = [124.1075, 12.6463];
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
};
const STREET_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export function PassengerMap() {
  const mapHost = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const dropoffMarker = useRef<maplibregl.Marker | null>(null);

  const [pickup, setPickup] = useState<Place>({ label: 'Sta. Magdalena Municipal Hall', lng: 124.10724, lat: 12.64599 });
  const [dropoff, setDropoff] = useState<Place>({ label: 'Santa Magdalena Public Market', lng: 124.10775, lat: 12.64583 });
  const [mode, setMode] = useState<RouteMode>('tricycle');
  const [layer, setLayer] = useState<'satellite' | 'street'>('satellite');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [pinTarget, setPinTarget] = useState<Target | null>(null);
  const [chooserTarget, setChooserTarget] = useState<Target | null>(null);

  const modeLabel = useMemo(
    () => mode === 'padyak' ? 'Padyak' : mode === 'etrike' ? 'E-Trike' : 'Tricycle',
    [mode],
  );

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapHost.current, style: SATELLITE_STYLE, center: MAGDALENA_CENTER, zoom: 16 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = async (event: maplibregl.MapMouseEvent) => {
      if (!pinTarget) return;
      const point = await reverseGeocode(event.lngLat.lat, event.lngLat.lng);
      if (pinTarget === 'pickup') setPickup(point); else setDropoff(point);
      setPinTarget(null);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [pinTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(layer === 'satellite' ? SATELLITE_STYLE : STREET_STYLE);
  }, [layer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickupMarker.current?.remove();
    dropoffMarker.current?.remove();

    const nextPickupMarker = new maplibregl.Marker({ color: '#0b684d', draggable: true })
      .setLngLat([pickup.lng, pickup.lat]).addTo(map);
    const nextDropoffMarker = new maplibregl.Marker({ color: '#d07a00', draggable: true })
      .setLngLat([dropoff.lng, dropoff.lat]).addTo(map);

    pickupMarker.current = nextPickupMarker;
    dropoffMarker.current = nextDropoffMarker;

    nextPickupMarker.on('dragend', async () => {
      const p = nextPickupMarker.getLngLat();
      setPickup(await reverseGeocode(p.lat, p.lng));
    });
    nextDropoffMarker.on('dragend', async () => {
      const p = nextDropoffMarker.getLngLat();
      setDropoff(await reverseGeocode(p.lat, p.lng));
    });
  }, [pickup, dropoff]);

  useEffect(() => {
    setRoute(null);
    setRouteError('');
  }, [pickup.lng, pickup.lat, dropoff.lng, dropoff.lat, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawRoute = () => {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
      if (!route) return;

      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: route.geometry },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#19e68c', 'line-width': 6, 'line-opacity': 0.92 },
      });

      const coords = route.geometry.coordinates;
      if (coords.length > 1) {
        const start = coords[0];
        const bounds = new maplibregl.LngLatBounds(start, start);
        coords.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: { top: 100, right: 42, bottom: 360, left: 42 }, maxZoom: 17 });
      }
    };

    if (map.isStyleLoaded()) drawRoute();
    else map.once('styledata', drawRoute);
  }, [route, layer]);

  async function reverseGeocode(lat: number, lng: number): Promise<Place> {
    try {
      const response = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
      if (!response.ok) throw new Error('reverse unavailable');
      return await response.json();
    } catch {
      return { lat, lng, label: `Pinned · ${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  }

  function choosePlace(target: Target, place: Place) {
    if (target === 'pickup') setPickup(place); else setDropoff(place);
    setChooserTarget(null);
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 17 });
  }

  function startPin(target: Target) {
    setChooserTarget(null);
    setPinTarget(target);
  }

  function useGps(target: Target) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const place = await reverseGeocode(coords.latitude, coords.longitude);
      choosePlace(target, place);
    }, () => undefined, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
  }

  async function calculateRoute() {
    setRouting(true);
    setRoute(null);
    setRouteError('');
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff, mode }),
      });
      if (!response.ok) throw new Error('Routing is temporarily unavailable');
      setRoute(await response.json());
    } catch {
      setRouteError('Road routing is temporarily unavailable. LUNAD will never substitute a fake straight-line route.');
    } finally {
      setRouting(false);
    }
  }

  return (
    <main className="app-shell">
      <div ref={mapHost} className="map" />
      <header className="app-bar">
        <div className="brand-mark">L</div>
        <div><strong>LUNAD</strong><small>Sta. Magdalena Mobility Lab</small></div>
        <div className="layer-switch">
          <button className={layer === 'satellite' ? 'active' : ''} onClick={() => setLayer('satellite')}>SAT</button>
          <button className={layer === 'street' ? 'active' : ''} onClick={() => setLayer('street')}>MAP</button>
        </div>
      </header>

      {pinTarget && <div className="pin-banner">Tap the exact {pinTarget === 'pickup' ? 'pickup' : 'destination'} on the map</div>}

      <section className="booking-sheet">
        <div className="handle" />
        <p className="eyebrow">Local ride</p>
        <h1>Saan tayo?</h1>

        <div className="location-card">
          <button className="location-row" onClick={() => setChooserTarget('pickup')}>
            <span className="pin green">●</span><span><small>Pickup</small><b>{pickup.label}</b></span><em>SET</em>
          </button>
          <button className="location-row" onClick={() => setChooserTarget('dropoff')}>
            <span className="pin amber">◆</span><span><small>Destination</small><b>{dropoff.label}</b></span><em>SET</em>
          </button>
        </div>

        <div className="rides">
          <button onClick={() => setMode('padyak')} className={mode === 'padyak' ? 'selected' : ''}>🚲<b>Padyak</b><small>Short local trips</small></button>
          <button onClick={() => setMode('etrike')} className={mode === 'etrike' ? 'selected' : ''}>⚡<b>E-Trike</b><small>Electric local ride</small></button>
          <button onClick={() => setMode('tricycle')} className={mode === 'tricycle' ? 'selected' : ''}>🛺<b>Tricycle</b><small>Regular local ride</small></button>
        </div>

        <button className="route-button" disabled={routing} onClick={calculateRoute}>
          {routing ? 'Finding road route…' : route ? 'Refresh itinerary' : `Show ${modeLabel} itinerary`}
        </button>
        {route && <div className="route-summary"><b>{(route.distanceMeters / 1000).toFixed(2)} km</b><span>≈ {Math.max(1, Math.round(route.durationSeconds / 60))} min · road-following route</span></div>}
        {routeError && <p className="route-error">{routeError}</p>}

        <button className="request-button" disabled={!route}>Request {modeLabel}</button>
        <small className="lab-note">Controlled pre-alpha. No official fare is shown until field/LGU validation.</small>
      </section>

      {chooserTarget && (
        <LocationChooser
          title={chooserTarget === 'pickup' ? 'Set pickup' : 'Set destination'}
          onClose={() => setChooserTarget(null)}
          onSelect={(place) => choosePlace(chooserTarget, place)}
          onPickMap={() => startPin(chooserTarget)}
          onUseGps={chooserTarget === 'pickup' ? () => useGps('pickup') : undefined}
        />
      )}
    </main>
  );
}