import { NextRequest, NextResponse } from 'next/server';
import { costingFor, type LngLat, type RouteMode } from '@/lib/geo';

const DEFAULT_ROUTER = 'https://valhalla1.openstreetmap.de/route';

function isPoint(value: unknown): value is LngLat {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.lng === 'number' && typeof p.lat === 'number' && Number.isFinite(p.lng) && Number.isFinite(p.lat);
}

function decodePolyline6(encoded: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push([lng / 1e6, lat / 1e6]);
  }

  return coordinates;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | {
    pickup?: unknown;
    dropoff?: unknown;
    mode?: RouteMode;
  };

  if (!body || !isPoint(body.pickup) || !isPoint(body.dropoff)) {
    return NextResponse.json({ error: 'INVALID_ROUTE_REQUEST' }, { status: 400 });
  }

  const mode: RouteMode = body.mode === 'padyak' || body.mode === 'etrike' || body.mode === 'tricycle'
    ? body.mode
    : 'tricycle';

  const endpoint = process.env.VALHALLA_URL || DEFAULT_ROUTER;
  const payload = {
    locations: [
      { lat: body.pickup.lat, lon: body.pickup.lng },
      { lat: body.dropoff.lat, lon: body.dropoff.lng },
    ],
    costing: costingFor(mode),
    units: 'kilometers',
    directions_options: { units: 'kilometers' },
    shape_format: 'polyline6',
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-client-id': 'lunad-mobility-lab',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'ROUTER_UNAVAILABLE', status: upstream.status }, { status: 502 });
    }

    const data = await upstream.json();
    const summary = data?.trip?.summary;
    const shape = data?.trip?.legs?.[0]?.shape;

    if (!summary || typeof shape !== 'string' || !shape.length) {
      return NextResponse.json({ error: 'ROUTER_RESPONSE_UNSUPPORTED' }, { status: 502 });
    }

    const coordinates = decodePolyline6(shape);
    if (coordinates.length < 2) {
      return NextResponse.json({ error: 'ROUTER_GEOMETRY_UNSUPPORTED' }, { status: 502 });
    }

    return NextResponse.json({
      distanceMeters: Math.round(Number(summary.length || 0) * 1000),
      durationSeconds: Math.round(Number(summary.time || 0)),
      geometry: { type: 'LineString', coordinates },
      provider: endpoint.includes('openstreetmap.de') ? 'valhalla-demo' : 'valhalla',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'ROUTE_FAILED',
      message: error instanceof Error ? error.message : 'unknown',
    }, { status: 502 });
  }
}