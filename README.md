# LUNAD Mobility

Hyper-local mobility and digital dispatch platform originating in Sta. Magdalena, Sorsogon, Philippines.

## Current phase

**Sta. Magdalena laboratory / pre-alpha.** Initial supported transport classes are **Padyak, E-Trike, and traditional Tricycle**. Pilot platform fee target is **₱1 per successfully completed app-generated booking**. Public social-media marketing remains off during the laboratory phase.

## Canonical product direction

LUNAD is not a Grab clone. It is a local mobility operating layer designed around existing transport operators, terminals/pila, configurable permit eligibility, human dispatcher fallback, and low-bandwidth Android use.

Long-term modules may include LUNAD Ride, Delivery/Fulfillment, Pabili, Food/Shops, Merchant OS, Cargo, truck/car hire, and integrations with local merchant systems such as Mhenching. These remain behind feature flags until the Ride MVP is proven.

## UI/UX authority

**Google Studio / Google Stitch is the primary UI/UX design authority for LUNAD.** Its strengths should drive screen composition, information hierarchy, interaction flow, responsive behavior, spacing, visual polish, driver/passenger ergonomics, and design-system evolution.

The UI layer must remain a client of canonical backend contracts. Google Studio/Stitch must not become the source of truth for dispatch rules, permit eligibility, fares, ledger accounting, audit policy, or database concurrency. Those remain server-authoritative.

When Google Studio/Stitch and backend architecture disagree:

- UI/interaction presentation: prefer Google Studio/Stitch unless usability/security requires otherwise.
- Domain rules/security/data integrity: canonical backend wins.
- Any UI-proposed regulatory/fare content must remain synthetic or unverified until field-confirmed.

## Architecture target

- Mobile-first installable PWA
- Google Studio/Stitch-led UI and design system
- TypeScript/React frontend
- Supabase/PostgreSQL/PostGIS backend target
- Server-authoritative Dispatch, Eligibility, Fare, Queue, Ride State, and Ledger engines
- Provider-agnostic mapping: MapLibre/OpenFreeMap initially, Geoapify geocoding/routing, PostGIS geofencing/dispatch, external Google Maps navigation links as a fallback/driver-navigation handoff
- Multi-municipality foundation for Sta. Magdalena -> Sorsogon City

## Current source status

The Google Studio prototype has been reviewed as a strong **UI/domain prototype** and is now the preferred visual/interaction reference. However, its browser/localStorage state, demo SVG mapping, simulated concurrency locking, and invented/synthetic operational seed data are **not production-authoritative**.

The previously supplied Grok ZIP was a different project (septic designer), so no Grok LUNAD code has been merged from that artifact. Grok/master-PRD architectural ideas remain part of the canonical backend/system design direction.

See `docs/INTEGRATION_AUDIT.md` and `docs/MAPS_GEO_DECISION.md` for current integration decisions.

> Note: this repository is temporarily public by owner choice. Never commit real credentials, personal data, permit scans, API secrets, or production environment files.
