export type LngLat = { lng: number; lat: number };

export type RouteMode = 'padyak' | 'etrike' | 'tricycle';

export type LineStringGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineStringGeometry;
  provider: string;
};

export function costingFor(mode: RouteMode): string {
  if (mode === 'padyak') return 'bicycle';
  return 'auto';
}