# LUNAD Maps & Geospatial Decision

## Goal

Provide reliable local mapping, location search, routing support, service-zone enforcement, terminal geofencing, and driver dispatch without making LUNAD financially or technically dependent on one map vendor.

## Initial provider stack

### Rendering
**MapLibre GL JS**

Reason: open-source client renderer and provider flexibility.

### Basemap
**OpenFreeMap** for the laboratory/development stage.

Reason: simple MapLibre integration, no API key, suitable for early low-volume use. It is not treated as an SLA-backed permanent production dependency.

### Geocoding / reverse geocoding / basic routing
**Geoapify** initially, behind an adapter interface.

Do not import Geoapify calls directly throughout components. All provider calls must pass through a `GeoProvider` service contract so another provider can replace it later.

### Internal spatial operations
**Supabase PostgreSQL + PostGIS**

Use PostGIS for:
- service-zone containment;
- terminal/geofence checks;
- cheap driver proximity filtering;
- municipality scope;
- local place coordinates;
- future hotspot aggregation.

### Driver turn-by-turn navigation
Use external navigation links instead of building embedded turn-by-turn navigation in V0.1.

Preferred behavior:

`NAVIGATE TO PICKUP` -> open Google Maps/Waze-compatible navigation URL on the driver's phone.

This keeps navigation quality high while LUNAD focuses on dispatch.

## LUNAD Places

Create an internal verified places/landmarks table. Global providers are not assumed to know all local businesses, terminals, sitios, barangay landmarks, sari-sari stores, or colloquial pickup points.

Suggested fields:
- id
- municipality_id
- name
- normalized_name
- aliases
- category
- lat/lng geography
- address_text
- barangay
- landmark_notes
- merchant_id nullable
- verification_status
- verified_at
- source
- active

Initial production place records should be field-verified. Demo builds use synthetic names.

## Distance policy

Do not confuse three different distance concepts:

1. **Straight-line distance** — cheap candidate pre-filtering only.
2. **Road-route distance** — ETA and distance-based fares where legally applicable.
3. **Service-zone geometry** — PostGIS containment/intersection rules.

The prototype Haversine function may remain as a utility but must not silently become authoritative road distance.

## Failure behavior

If geocoder/routing provider is unavailable:
- manual pin selection must still work;
- landmark notes must remain usable;
- dispatcher can manually assist;
- existing ride state must remain intact;
- do not fabricate route distance/ETA.

## Privacy

Exact unassigned driver locations are not public.

Driver location collection occurs only while operationally relevant (online/pila/assigned/active trip) and retention must be configurable.

## Future production hardening

As volume grows, evaluate:
- commercial SLA tile provider;
- self-hosted regional tiles for Sorsogon;
- alternate geocoder/routing providers;
- offline/low-connectivity map caching;
- municipality-maintained LUNAD Places datasets.
