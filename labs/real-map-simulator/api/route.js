const DEFAULT_ROUTER = 'https://valhalla1.openstreetmap.de/route';

function decodePolyline6(encoded) {
  let index = 0, lat = 0, lng = 0;
  const coordinates = [];
  while (index < encoded.length) {
    let result = 0, shift = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index < encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index < encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coordinates.push([lng / 1e6, lat / 1e6]);
  }
  return coordinates;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const { from, to, mode = 'tricycle' } = req.body || {};
  if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(from.lng) || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) {
    return res.status(400).json({ error: 'INVALID_ROUTE_REQUEST' });
  }
  const costing = mode === 'padyak' ? 'bicycle' : 'auto';
  try {
    const upstream = await fetch(DEFAULT_ROUTER, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-id': 'lunad-real-map-lab' },
      body: JSON.stringify({
        locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
        costing,
        units: 'kilometers',
        shape_format: 'polyline6'
      })
    });
    if (!upstream.ok) return res.status(502).json({ error: 'ROUTER_UNAVAILABLE', status: upstream.status });
    const data = await upstream.json();
    const summary = data?.trip?.summary;
    const shape = data?.trip?.legs?.[0]?.shape;
    if (!summary || !shape) return res.status(502).json({ error: 'ROUTER_RESPONSE_UNSUPPORTED' });
    const coordinates = decodePolyline6(shape);
    if (coordinates.length < 2) return res.status(502).json({ error: 'ROUTER_GEOMETRY_UNSUPPORTED' });
    return res.status(200).json({
      distanceMeters: Math.round(Number(summary.length || 0) * 1000),
      durationSeconds: Math.round(Number(summary.time || 0)),
      geometry: { type: 'LineString', coordinates },
      provider: 'valhalla-demo'
    });
  } catch (error) {
    return res.status(502).json({ error: 'ROUTE_FAILED', message: error instanceof Error ? error.message : 'unknown' });
  }
}
