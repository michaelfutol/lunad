'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { LocationChooser } from '@/components/LocationChooser';
import type { LngLat, RouteMode, RouteResult } from '@/lib/geo';

type Place = LngLat & { label: string };
type Target = 'pickup' | 'dropoff';
type RidePhase = 'PLANNING' | 'SEARCHING' | 'ASSIGNED' | 'DRIVER_EN_ROUTE' | 'DRIVER_ARRIVED' | 'IN_TRIP' | 'COMPLETED';
type LabVehicle = {
  id: string;
  mode: RouteMode;
  label: string;
  position: LngLat;
};

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

const LAB_FLEET: LabVehicle[] = [
  { id: 'LAB-P-001', mode: 'padyak', label: 'Test Padyak', position: { lng: 124.1059, lat: 12.6468 } },
  { id: 'LAB-E-001', mode: 'etrike', label: 'Test E-Trike', position: { lng: 124.1088, lat: 12.6474 } },
  { id: 'LAB-T-001', mode: 'tricycle', label: 'Test Tricycle', position: { lng: 124.1091, lat: 12.6449 } },
];

const PHASE_COPY: Record<RidePhase, string> = {
  PLANNING: 'Choose your trip',
  SEARCHING: 'Finding an eligible test driver…',
  ASSIGNED: 'Driver assigned',
  DRIVER_EN_ROUTE: 'Driver is on the way',
  DRIVER_ARRIVED: 'Driver has arrived',
  IN_TRIP: 'Trip in progress',
  COMPLETED: 'Test trip completed',
};

function markerElement(mode: RouteMode) {
  const el = document.createElement('div');
  el.className = `lab-vehicle-marker ${mode}`;
  el.textContent = mode === 'padyak' ? 'P' : mode === 'etrike' ? 'E' : 'T';
  return el;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sampledCoordinates(coords: [number, number][], maximum = 90) {
  if (coords.length <= maximum) return coords;
  const step = (coords.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, i) => coords[Math.min(coords.length - 1, Math.round(i * step))]);
}

export function PassengerMap() {
  const mapHost = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarker = useRef<Marker | null>(null);
  const dropoffMarker = useRef<Marker | null>(null);
  const labVehicleMarker = useRef<Marker | null>(null);
  const simulationToken = useRef(0);

  const [pickup, setPickup] = useState<Place>({ label: 'Sta. Magdalena Municipal Hall', lng: 124.10724, lat: 12.64599 });
  const [dropoff, setDropoff] = useState<Place>({ label: 'Santa Magdalena Public Market', lng: 124.10775, lat: 12.64583 });
  const [mode, setMode] = useState<RouteMode>('tricycle');
  const [layer, setLayer] = useState<'satellite' | 'street'>('satellite');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeProgress, setRouteProgress] = useState(0);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [pinTarget, setPinTarget] = useState<Target | null>(null);
  const [chooserTarget, setChooserTarget] = useState<Target | null>(null);
  const [labMode, setLabMode] = useState(false);
  const [labSpeed, setLabSpeed] = useState<1 | 5 | 10>(10);
  const [phase, setPhase] = useState<RidePhase>('PLANNING');
  const [assignedVehicle, setAssignedVehicle] = useState<LabVehicle | null>(null);
  const [simulating, setSimulating] = useState(false);

  const modeLabel = useMemo(
    () => mode === 'padyak' ? 'Padyak' : mode === 'etrike' ? 'E-Trike' : 'Tricycle',
    [mode],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLabMode(params.get('lab') === '1');
  }, []);

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapHost.current, style: SATELLITE_STYLE, center: MAGDALENA_CENTER, zoom: 16 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    return () => {
      simulationToken.current += 1;
      labVehicleMarker.current?.remove();
      map.remove();
      mapRef.current = null;
    };
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

    const nextPickupMarker = new maplibregl.Marker({ color: '#0b684d', draggable: phase === 'PLANNING' })
      .setLngLat([pickup.lng, pickup.lat]).addTo(map);
    const nextDropoffMarker = new maplibregl.Marker({ color: '#d07a00', draggable: phase === 'PLANNING' })
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
  }, [pickup, dropoff, phase]);

  useEffect(() => {
    if (phase !== 'PLANNING') return;
    setRoute(null);
    setRouteProgress(0);
    setRouteError('');
    setAssignedVehicle(null);
    labVehicleMarker.current?.remove();
    labVehicleMarker.current = null;
  }, [pickup.lng, pickup.lat, dropoff.lng, dropoff.lat, mode, phase]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawRoute = () => {
      if (map.getLayer('route-line-complete')) map.removeLayer('route-line-complete');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route-complete')) map.removeSource('route-complete');
      if (map.getSource('route')) map.removeSource('route');
      if (!route) return;

      const coords = route.geometry.coordinates;
      const split = Math.max(0, Math.min(coords.length - 1, routeProgress));
      const completeCoords = coords.slice(0, split + 1);
      const remainingCoords = coords.slice(split);

      if (completeCoords.length > 1) {
        map.addSource('route-complete', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: completeCoords } },
        });
        map.addLayer({
          id: 'route-line-complete', type: 'line', source: 'route-complete',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.32 },
        });
      }

      if (remainingCoords.length > 1) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: remainingCoords } },
        });
        map.addLayer({
          id: 'route-line', type: 'line', source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#19e68c', 'line-width': 6, 'line-opacity': 0.95 },
        });
      }

      if (routeProgress === 0 && coords.length > 1) {
        const start = coords[0];
        const bounds = new maplibregl.LngLatBounds(start, start);
        coords.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: { top: 100, right: 42, bottom: 380, left: 42 }, maxZoom: 17 });
      }
    };

    if (map.isStyleLoaded()) drawRoute();
    else map.once('styledata', drawRoute);
  }, [route, routeProgress, layer]);

  async function reverseGeocode(lat: number, lng: number): Promise<Place> {
    try {
      const response = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
      if (!response.ok) throw new Error('reverse unavailable');
      return await response.json();
    } catch {
      return { lat, lng, label: `Pinned · ${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  }

  async function requestRoute(from: LngLat, to: LngLat, routeMode: RouteMode): Promise<RouteResult> {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pickup: from, dropoff: to, mode: routeMode }),
    });
    if (!response.ok) throw new Error('Routing is temporarily unavailable');
    return response.json();
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
    setRouteProgress(0);
    setRouteError('');
    try {
      setRoute(await requestRoute(pickup, dropoff, mode));
    } catch {
      setRouteError('Road routing is temporarily unavailable. LUNAD will never substitute a fake straight-line route.');
    } finally {
      setRouting(false);
    }
  }

  async function animateVehicle(result: RouteResult, token: number) {
    const coords = sampledCoordinates(result.geometry.coordinates);
    const marker = labVehicleMarker.current;
    if (!marker || coords.length < 2) return false;
    const frameMs = labSpeed === 10 ? 65 : labSpeed === 5 ? 115 : 260;
    for (let i = 0; i < coords.length; i++) {
      if (simulationToken.current !== token) return false;
      marker.setLngLat(coords[i]);
      setRouteProgress(Math.round((i / Math.max(1, coords.length - 1)) * (result.geometry.coordinates.length - 1)));
      await delay(frameMs);
    }
    return true;
  }

  async function startLabRide() {
    if (!labMode || simulating) return;
    const vehicle = LAB_FLEET.find((item) => item.mode === mode);
    if (!vehicle) return;
    const token = ++simulationToken.current;
    setSimulating(true);
    setAssignedVehicle(null);
    setPhase('SEARCHING');
    setRouteError('');
    try {
      await delay(700);
      if (simulationToken.current !== token) return;
      setAssignedVehicle(vehicle);
      setPhase('ASSIGNED');
      await delay(550);

      labVehicleMarker.current?.remove();
      const map = mapRef.current;
      if (!map) throw new Error('Map unavailable');
      labVehicleMarker.current = new maplibregl.Marker({ element: markerElement(vehicle.mode) })
        .setLngLat([vehicle.position.lng, vehicle.position.lat]).addTo(map);

      const approach = await requestRoute(vehicle.position, pickup, vehicle.mode);
      setRoute(approach);
      setRouteProgress(0);
      setPhase('DRIVER_EN_ROUTE');
      if (!(await animateVehicle(approach, token))) return;

      setPhase('DRIVER_ARRIVED');
      await delay(1000);
      if (simulationToken.current !== token) return;

      const passengerLeg = await requestRoute(pickup, dropoff, vehicle.mode);
      setRoute(passengerLeg);
      setRouteProgress(0);
      setPhase('IN_TRIP');
      if (!(await animateVehicle(passengerLeg, token))) return;

      setPhase('COMPLETED');
      setRouteProgress(passengerLeg.geometry.coordinates.length - 1);
    } catch {
      setRouteError('Lab trip stopped because a real routing/system step failed. No fake fallback was used.');
      setPhase('PLANNING');
    } finally {
      if (simulationToken.current === token) setSimulating(false);
    }
  }

  function resetLabRide() {
    simulationToken.current += 1;
    setSimulating(false);
    setPhase('PLANNING');
    setRouteProgress(0);
    setRoute(null);
    setAssignedVehicle(null);
    labVehicleMarker.current?.remove();
    labVehicleMarker.current = null;
  }

  const activeTrip = phase !== 'PLANNING';

  return (
    <main className="app-shell">
      <div ref={mapHost} className="map" />
      <header className="app-bar">
        <div className="brand-mark">L</div>
        <div><strong>LUNAD</strong><small>{labMode ? 'REAL-MAP LAB MODE' : 'Sta. Magdalena Mobility Lab'}</small></div>
        <div className="layer-switch">
          <button className={layer === 'satellite' ? 'active' : ''} onClick={() => setLayer('satellite')}>SAT</button>
          <button className={layer === 'street' ? 'active' : ''} onClick={() => setLayer('street')}>MAP</button>
        </div>
      </header>

      {pinTarget && <div className="pin-banner">Tap the exact {pinTarget === 'pickup' ? 'pickup' : 'destination'} on the map</div>}
      {labMode && <div className="lab-ribbon">TEST VEHICLES · REAL MAP · REAL ROUTES</div>}

      <section className={`booking-sheet ${activeTrip ? 'trip-state' : ''}`}>
        <div className="handle" />
        <div className="sheet-status-row">
          <div>
            <p className="eyebrow">{labMode ? 'Simulation' : 'Local ride'}</p>
            <h1>{activeTrip ? PHASE_COPY[phase] : 'Saan tayo?'}</h1>
          </div>
          {labMode && <span className="test-badge">TEST · ₱0 FEE</span>}
        </div>

        {activeTrip && assignedVehicle ? (
          <div className="driver-card">
            <div className={`driver-icon ${assignedVehicle.mode}`}>{assignedVehicle.mode === 'padyak' ? 'P' : assignedVehicle.mode === 'etrike' ? 'E' : 'T'}</div>
            <div><small>Assigned test vehicle</small><b>{assignedVehicle.id}</b><span>{assignedVehicle.label} · {modeLabel}</span></div>
            <div className="live-dot">LIVE</div>
          </div>
        ) : (
          <div className="location-card">
            <button className="location-row" onClick={() => setChooserTarget('pickup')}>
              <span className="pin green">●</span><span><small>Pickup</small><b>{pickup.label}</b></span><em>SET</em>
            </button>
            <button className="location-row" onClick={() => setChooserTarget('dropoff')}>
              <span className="pin amber">◆</span><span><small>Destination</small><b>{dropoff.label}</b></span><em>SET</em>
            </button>
          </div>
        )}

        {!activeTrip && (
          <>
            <div className="rides">
              <button onClick={() => setMode('padyak')} className={mode === 'padyak' ? 'selected' : ''}><span className="vehicle-glyph">P</span><b>Padyak</b><small>Short local trips</small></button>
              <button onClick={() => setMode('etrike')} className={mode === 'etrike' ? 'selected' : ''}><span className="vehicle-glyph">E</span><b>E-Trike</b><small>Electric local ride</small></button>
              <button onClick={() => setMode('tricycle')} className={mode === 'tricycle' ? 'selected' : ''}><span className="vehicle-glyph">T</span><b>Tricycle</b><small>Regular local ride</small></button>
            </div>

            <button className="route-button" disabled={routing} onClick={calculateRoute}>
              {routing ? 'Finding road route…' : route ? 'Refresh itinerary' : `Show ${modeLabel} itinerary`}
            </button>
          </>
        )}

        {route && <div className="route-summary"><b>{(route.distanceMeters / 1000).toFixed(2)} km</b><span>≈ {Math.max(1, Math.round(route.durationSeconds / 60))} min · road-following route</span></div>}
        {routeError && <p className="route-error">{routeError}</p>}

        {!activeTrip && (
          <button className="request-button" disabled={!route || routing} onClick={labMode ? startLabRide : undefined}>
            {labMode ? `Run test ${modeLabel} trip` : `Request ${modeLabel}`}
          </button>
        )}

        {labMode && activeTrip && (
          <div className="lab-controls">
            <div><span>Simulation speed</span><div className="speed-switch">{([1, 5, 10] as const).map((speed) => <button key={speed} disabled={simulating} className={labSpeed === speed ? 'active' : ''} onClick={() => setLabSpeed(speed)}>{speed}×</button>)}</div></div>
            <button className="reset-button" onClick={resetLabRide}>Reset test</button>
          </div>
        )}

        <small className="lab-note">{labMode ? 'Synthetic driver identity only. Geography, road routing, and ride states are exercised on the real map. Test rides never post revenue.' : 'Controlled pre-alpha. No official fare is shown until field/LGU validation.'}</small>
      </section>

      {chooserTarget && !activeTrip && (
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
