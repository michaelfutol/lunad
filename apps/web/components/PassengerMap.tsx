'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { LngLat, RouteMode, RouteResult } from '@/lib/geo';

type Place = LngLat & { label: string };

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
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarker = useRef<Marker | null>(null);
  const dropoffMarker = useRef<Marker | null>(null);

  const [pickup, setPickup] = useState<Place>({
    label: 'Sta. Magdalena Municipal Hall',
    lng: 124.10724,
    lat: 12.64599,
  });
  const [dropoff, setDropoff] = useState<Place>({
    label: 'Santa Magdalena Public Market',
    lng: 124.10775,
    lat: 12.64583,
  });
  const [mode, setMode] = useState<RouteMode>('tricycle');
  const [layer, setLayer] = useState<'satellite' | 'street'>('satellite');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [pinTarget, setPinTarget] = useState<'pickup' | 'dropoff' | null>(null);

  const modeLabel = useMemo(
    () => mode === 'padyak' ? 'Padyak' : mode === 'etrike' ? 'E-Trike' : 'Tricycle',
    [mode],
  );

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapHost.current,
      style: SATELLITE_STYLE,
      center: MAGDALENA_CENTER,
      zoom: 16,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'bottom-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (event: maplibregl.MapMouseEvent) => {
      if (!pinTarget) return;
      const point: Place = {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        label: `Pinned · ${event.lngLat.lat.toFixed(5)}, ${event.lngLat.lng.toFixed(5)}`,
      };
      if (pinTarget === 'pickup') setPickup(point);
      else setDropoff(point);
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

    pickupMarker.current = new maplibregl.Marker({ color: '#0b684d', draggable: true })
      .setLngLat([pickup.lng, pickup.lat])
      .addTo(map);
    dropoffMarker.current = new maplibregl.Marker({ color: '#d07a00', draggable: true })
      .setLngLat([dropoff.lng, dropoff.lat])
      .addTo(map);

    pickupMarker.current.on('dragend', () => {
      const p = pickupMarker.current!.getLngLat();
      setPickup({ lng: p.lng, lat: p.lat, label: `Pinned · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` });
    });
    dropoffMarker.current.on('dragend', () => {
      const p = dropoffMarker.current!.getLngLat();
      setDropoff({ lng: p.lng, lat: p.lat, label: `Pinned · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` });
    });
  }, [pickup, dropoff]);

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
        paint: { 'line-color': '#19e68c', 'line-width': 6, 'line-opacity': 0.9 },
      });

      const coords = route.geometry.coordinates;
      if (coords.length > 1) {
        const start = coords[0];
        const bounds = new maplibregl.LngLatBounds(start, start);
        coords.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, {
          padding: { top: 100, right: 42, bottom: 360, left: 42 },
          maxZoom: 17,
        });
      }
    };

    if (map.isStyleLoaded()) drawRoute();
    else map.once('styledata', drawRoute);
  }, [route, layer]);

  async function calculateRoute() {
    setRouting(true);
    setRoute(null);
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff, mode }),
      });
      if (!response.ok) throw new Error('Routing is temporarily unavailable');
      setRoute(await response.json());
    } catch {
      setRoute(null);
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
          <button className="location-row" onClick={() => setPinTarget('pickup')}>
            <span className="pin green">●</span>
            <span><small>Pickup</small><b>{pickup.label}</b></span>
            <em>MAP</em>
          </button>
          <button className="location-row" onClick={() => setPinTarget('dropoff')}>
            <span className="pin amber">◆</span>
            <span><small>Destination</small><b>{dropoff.label}</b></span>
            <em>MAP</em>
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

        {route && (
          <div className="route-summary">
            <b>{(route.distanceMeters / 1000).toFixed(2)} km</b>
            <span>≈ {Math.max(1, Math.round(route.durationSeconds / 60))} min · road-following route</span>
          </div>
        )}

        <button className="request-button" disabled={!route}>Request {modeLabel}</button>
        <small className="lab-note">Controlled pre-alpha. No official fare is shown until field/LGU validation.</small>
      </section>
    </main>
  );
}