import { NextRequest, NextResponse } from 'next/server';
import { costingFor, type LngLat, type RouteMode } from '@/lib/geo';

const DEFAULT_ROUTER = 'https://valhalla1.openstreetmap.de/route';

function isPoint(value: unknown): value is LngLat {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.lng === 'number' && typeof p.lat === 'number' && Number.isFinite(p.lng) && Number.isFinite(p.lat);
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
    shape_format: 'geojson',
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

    if (!summary || !shape) {
      return NextResponse.json({ error: 'ROUTER_RESPONSE_UNSUPPORTED' }, { status: 502 });
    }

    const geometry = typeof shape === 'string' ? JSON.parse(shape) : shape;
    if (geometry?.type !== 'LineString' || !Array.isArray(geometry?.coordinates)) {
      return NextResponse.json({ error: 'ROUTER_GEOMETRY_UNSUPPORTED' }, { status: 502 });
    }

    return NextResponse.json({
      distanceMeters: Math.round(Number(summary.length || 0) * 1000),
      durationSeconds: Math.round(Number(summary.time || 0)),
      geometry,
      provider: endpoint.includes('openstreetmap.de') ? 'valhalla-demo' : 'valhalla',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'ROUTE_FAILED',
      message: error instanceof Error ? error.message : 'unknown',
    }, { status: 502 });
  }
}