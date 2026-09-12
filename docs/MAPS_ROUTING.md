# Maps and Routing Architecture

## Product requirement
LUNAD must let a mobile user select an exact pickup/dropoff by GPS, text/landmark search, map tap, or draggable pin, then display an actual road-following itinerary. A straight line between pins is never an acceptable route representation.

## Layers
### Renderer
MapLibre GL JS.

### Basemaps
- Satellite is the preferred exact-pickup view for the controlled laboratory because users can visually identify houses, gates, alleys, coastlines, and structures.
- Street mode remains available because road labels and road-network context are easier to read.
- Basemap providers must stay replaceable. Satellite imagery is not survey-grade position truth; exact pickup is the combination of GPS + user-selected pin + correction.

### Search/geocoding
Expose a provider interface. Public Nominatim is permitted only for low-volume controlled testing and must not be used for launch autocomplete. Production options can include Geoapify, Mapbox, another licensed provider, or a self-hosted geocoder. LUNAD Places is the first-party layer for verified local landmarks, terminals, merchants, colloquial pickup points, and barangay references.

### Routing
Expose route calculation only through the LUNAD server API. Current laboratory adapter targets Valhalla so the browser never depends directly on a public demo endpoint. `VALHALLA_URL` can point to a self-hosted instance later.

The public Valhalla/FOSSGIS demo server is laboratory-only and fair-use limited. It must not be the commercial Sorsogon City production dependency.

### Route profiles
- Padyak: bicycle costing initially.
- E-Trike: auto costing initially until a verified local/custom costing policy is defined.
- Tricycle: auto costing initially until local restrictions are encoded.

These cost profiles are technical approximations, not legal route permissions. Municipality-specific restrictions remain a separate rules/configuration layer.

## Active-trip route behavior
Before pickup: show Driver -> Passenger route.
After passenger onboard: show Pickup/current driver position -> Destination route.
As the driver advances, the UI should emphasize the remaining route rather than permanently displaying the full completed path. When the driver meaningfully deviates from the planned route, request a reroute. Map matching/snap-to-road can be added once live GPS sampling is active.

## Data ownership/moat
LUNAD Places and verified local road/terminal/pickup corrections should become proprietary operational data while respecting OSM/provider licenses. Do not fork or falsify the underlying road network; store local operational overlays and verified place intelligence separately.
