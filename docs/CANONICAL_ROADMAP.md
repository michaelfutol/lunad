# LUNAD Canonical Roadmap

## Stage 0 — Canonicalization

- Keep `main` as source of truth.
- Preserve Google Studio export as reference, not authority.
- Do not merge the previously supplied wrong Grok/septic artifact.
- Remove AI Studio/Gemini-only scaffolding from canonical code.
- Replace all realistic-looking unverified seed operations with explicit synthetic/demo records.

## Stage 1 — Data foundation

Create Supabase migrations for:
- organizations
- municipalities
- profiles
- passengers
- operators
- drivers
- vehicles
- driver_vehicle_assignments
- permit_types
- permits
- transport_associations
- terminals
- terminal_queue_entries
- service_zones
- fare_rules
- ride_requests
- ride_offers
- rides/ride_events
- driver_presence
- driver_ledger_entries
- payments
- ratings
- incidents
- feature_flags
- audit_logs
- places

Add RLS and indexes from day one.

## Stage 2 — Server-authoritative engines

Port/refine the useful Google Studio domain concepts into server-side contracts:
- EligibilityEngine
- DispatchEngine
- QueueEngine / Digital Pila
- FareEngine
- RideStateMachine
- LedgerEngine

Critical rules:
- no localStorage production truth;
- no in-memory concurrency locks;
- no silent fare fallback;
- service zones enforced;
- permit requirements configurable and municipality-scoped;
- exactly one driver can claim a ride;
- exactly one platform-fee ledger entry per qualifying completed ride.

## Stage 3 — Passenger + Driver PWA

Reuse the best Google Studio UX concepts while reconnecting all mutations to backend APIs/functions.

Passenger golden path:
Pickup -> Destination -> Padyak/E-Trike/Tricycle -> Quote -> Request -> Driver assigned -> Ride -> Complete.

Driver golden path:
Online/Pila -> Offer -> Accept -> En Route -> Arrived -> Start -> Complete -> ₱1 ledger entry.

## Stage 4 — Real geospatial layer

- MapLibre map.
- OpenFreeMap basemap during laboratory stage.
- GeoProvider abstraction.
- Geoapify initial geocoder/routing adapter.
- PostGIS service zones and proximity filtering.
- LUNAD Places.
- External Google Maps/Waze navigation handoff.

## Stage 5 — Dispatcher and compliance

- Live operations dashboard.
- Manual dispatch/reassignment with reason.
- Digital pila monitoring.
- Driver/vehicle/permit verification.
- Audit history.
- Incidents.
- Expiry warnings.

## Stage 6 — Automated validation

Required tests:
- state-machine transitions;
- fare rule unavailable fails closed;
- valid/invalid permit eligibility;
- queue FIFO by eligible class;
- two-driver simultaneous acceptance -> one winner;
- duplicate completion -> one ₱1 fee only;
- test ride -> ₱0 fee;
- reversal -> append-only +₱1;
- passenger/driver/tenant RLS isolation;
- full Playwright golden ride.

## Stage 7 — Magdalena field laboratory

Cohorts:
- 10–15 verified partners
- 25
- approximately 50

No broad social-media marketing initially.

Measure:
- active drivers
- ride requests/completions
- acceptance
- no-driver rate
- pickup wait
- cancellations
- rides per driver
- repeat passengers
- vehicle preference
- manual-dispatch rate
- incidents
- fee accuracy

## Stage 8 — Commerce foundation (behind flags)

Architect but do not distract Ride MVP:
- Merchant OS
- Mhenching Merchant #001 integration
- Delivery/Fulfillment job type
- Food/Shops catalog
- Pabili
- merchant inventory/catalog onboarding

Goal: allow merchant orders to request fulfillment from the same eligible local transport network while keeping Ride and Delivery state machines distinct.

## Stage 9 — Sorsogon City

Once Magdalena golden-path reliability is proven:
- create Sorsogon City municipality config;
- validate current permit/fare/TODA rules;
- recruit first 100 verified drivers;
- expand to 200 then 500 based on demand;
- initially prioritize LUNAD Ride where incumbent food delivery is already stronger.

No code fork: expansion is configuration + verified local datasets.
