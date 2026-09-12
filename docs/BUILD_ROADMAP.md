# LUNAD Build Roadmap

## Milestone 0 — Canonical foundation (now)
- Lock product master and module boundaries.
- Create mobile-first app scaffold.
- Keep mapping/routing behind provider interfaces.
- Preserve current PostGIS/Supabase schema work.
- Add CI/typecheck/build gates before merging to main.

## Milestone 1 — Passenger route selection
Definition of done:
- GPS pickup.
- Search place/landmark.
- Tap map for pickup/dropoff.
- Draggable markers.
- Satellite/Street toggle.
- Road-following route polyline with distance/duration.
- Reroute contract ready.
- Padyak/E-Trike/Tricycle selection.
- No fabricated fare if an approved fare rule is absent.

## Milestone 2 — Realtime ride loop
Definition of done:
- Persistent auth/profile.
- Passenger creates ride request from Phone A.
- Eligible Driver B receives offer in realtime.
- Only one driver can accept atomically.
- Passenger sees driver assignment/status in realtime.
- Dispatcher simultaneously sees request/ride.
- Driver transitions EN_ROUTE -> ARRIVED -> IN_TRIP -> COMPLETED.
- Exactly one PHP 1 platform-fee ledger event is created on eligible completion.
- Immutable ride events exist for audit.

## Milestone 3 — Driver and digital pila
- Driver verification and vehicle assignment.
- Configurable permits and expiry.
- Online/Offline.
- Terminal/Pila mode.
- Queue dispatch + nearest/hybrid strategy.
- Manual dispatcher fallback.
- Low-bandwidth/offline-safe command retries.

## Milestone 4 — Safety and pilot ops
- Trip share.
- Incident/report workflow.
- Driver/passenger contact controls.
- Pilot analytics.
- CSV exports.
- Admin audit log.
- 10-15 driver closed alpha.

## Milestone 5 — Magdalena beta
- ~25 verified drivers.
- Validate pickup landmarks, terminals, service zones, and fare/permit policy from real field/LGU information.
- Improve LUNAD Places from actual usage.
- Measure acceptance, pickup wait, cancellation, no-driver rate, repeat passengers, and bookings/active driver.

## Milestone 6 — Magdalena operational laboratory
- ~50 verified transport partners.
- Stable ride lifecycle on separate devices.
- Operational dispatcher procedure.
- Incident response and regulatory register active.
- Prepare Sorsogon City launch pack.

## Milestone 7 — Sorsogon City commercial ride product
- Municipality-specific fare/permit/service-zone configuration.
- 100 founding drivers -> 200 -> 500 target progression.
- Production routing/search provider decision or self-hosted routing.
- Android/PWA hardening; native wrapper only if justified.
- Higher-grade observability, security, privacy, backups, and support operations.

## Parallel commerce track — starts after Milestone 2 core is stable
### Magdalena Online Marketplace / LUNAD Market
- Listing/feed/search/categories.
- Seller profiles and verified merchants.
- Free listing; PHP 1 successful-transaction ledger fee.
- Buyer reserve/buy -> seller accept -> completion QR/short code.
- Open Graph public listing pages and user-initiated Facebook sharing.

### Merchant OS
- Catalog/inventory.
- Orders.
- Pickup/LUNAD delivery toggle.
- Basic sales view.
- Mhenching as Merchant #001 integration reference.

### Pabili
- Free-form buy request.
- Assigned eligible delivery partner.
- Receipt/photo and settlement workflow.
- Repeated merchant demand surfaced for onboarding.

## Non-goals for the current alpha
- Native iOS.
- Percentage commission.
- Full payment gateway.
- AI dispatch forecasting.
- Food/Cargo/Truck hire in the Passenger Ride UI.
- Public social-media launch campaigns.
