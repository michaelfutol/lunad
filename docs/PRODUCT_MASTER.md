# LUNAD Product Master

## Mission
LUNAD is a mobile-first local mobility and commerce platform originating in Sta. Magdalena, Sorsogon, with Sorsogon City as the first full commercial mobility target.

## Product doctrine
- Android/mobile first for Passenger and Driver; desktop/tablet second for Dispatcher/Admin.
- Newest entrant must feel simpler, more local-aware, and more polished than incumbent ride-hailing apps.
- Sta. Magdalena is the controlled laboratory; Sorsogon City is the target polished ride-hailing product.
- Phase 1 transport: Padyak, E-Trike, traditional Tricycle.
- Pilot platform fee: PHP 1 per successfully completed app-generated booking only.
- No public social-media marketing during controlled laboratory stage.
- Google Studio/Stitch is the UI/UX authority; canonical backend/business rules remain provider-independent and server-side.
- No fabricated fares, permit rules, TODA names, terminals, officials, ETAs, or driver counts.

## Mobility product
Passenger must be able to:
1. use GPS for pickup;
2. type/search a place, landmark, barangay, or merchant;
3. tap anywhere on map to set pickup/dropoff;
4. drag pins for exact gate/house placement;
5. switch Satellite and Street map modes;
6. see actual road-following itinerary before confirmation;
7. choose Padyak, E-Trike, or Tricycle;
8. request a ride and see live assignment/status;
9. share/report a trip;
10. rate after completion.

Driver must be able to:
- go online/offline;
- opt into eligible service types;
- receive atomic ride offers;
- accept/pass;
- navigate to pickup;
- mark arrived, onboard, complete;
- enter digital pila where configured;
- see activity and platform ledger.

Dispatcher/Admin must have:
- live requests and rides;
- online/pila drivers;
- manual assign/reassign fallback;
- permit/vehicle eligibility;
- immutable ride-event history;
- incident handling;
- fare and municipality configuration;
- audit log and analytics.

## Maps and routing
- Rendering: MapLibre.
- Street basemap: OpenFreeMap/OSM-derived data initially.
- Satellite: external satellite raster provider with attribution and provider abstraction.
- Search/geocoding: provider abstraction; public Nominatim may be used only for controlled low-volume testing, not launch autocomplete.
- Routing: open/provider-independent route service contract. Valhalla is preferred for laboratory/self-host path; Mapbox may be evaluated for commercialization.
- LUNAD Places: first-party verified local landmarks, terminals, merchants, pickup points, barangay references.
- Route geometry must be drawn as the road-following itinerary, not a straight line. During active trip, remaining route should progressively contract/update and reroute after meaningful deviation.

## Compliance
Permit requirements are data/configuration, never hard-coded assumptions. Every driver/vehicle/service combination passes an eligibility engine before dispatch.

## Commerce roadmap
### Magdalena Online Marketplace / LUNAD Market
- Free listing.
- PHP 1 per confirmed successful marketplace transaction.
- Casual sellers and verified stores in one system.
- Facebook is a distribution channel, not the source of truth.
- Every listing gets a public share URL/Open Graph card; seller can share to Facebook through user-initiated sharing.
- Official page syndication may be added only through permitted Meta APIs.
- Buyer/seller completion can be confirmed by transaction QR/short code; LUNAD delivery completion can auto-confirm eligible orders.

### Merchant OS
Free basic merchant onboarding should support catalog, inventory, order status, pickup/delivery, simple sales view, and LUNAD fulfillment. Mhenching Variety Store is Merchant #001/reference integration.

### Pabili
Pabili fills gaps before a merchant is onboarded. Repeated Pabili demand becomes merchant-acquisition intelligence.

### Food/Shops/Delivery
Sta. Magdalena can become the full ecosystem laboratory. Sorsogon City should initially focus on LUNAD Ride, with commerce modules enabled municipality-by-municipality based on market conditions.

## Network flywheel
Ride demand increases driver utilization. Marketplace/Food/Pabili create off-peak delivery jobs. Merchant inventory improves search and local commerce. The same LUNAD identity may hold Passenger, Buyer, Seller, Driver, Delivery Partner, and Merchant roles subject to verification.

## Success gates
Alpha: 10-15 verified drivers.
Beta: ~25 verified drivers.
Operational Magdalena laboratory: ~50 verified local transport partners.
Sorsogon City onboarding begins rapidly after Magdalena reliability gates are met; do not wait for months of perfection.
