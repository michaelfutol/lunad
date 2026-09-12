# LUNAD Integration Audit

## Inputs reviewed

1. LUNAD master product/engineering specification developed in the project thread.
2. Google Studio export `lunad-mobility (1).zip`.
3. Previous Grok artifact supplied to the project, which was verified to be a different septic-designer workspace and therefore is not a valid LUNAD code source.
4. Owner direction that Google Studio / Google Stitch should be treated as the preferred UI/UX authority for LUNAD.

## Integration doctrine

### Google Studio / Stitch owns the visual-interaction layer
Use Google Studio/Stitch as the primary source for:

- passenger interaction flow;
- driver interaction flow;
- dispatcher screen composition;
- digital-pila presentation;
- mobile information hierarchy;
- spacing and responsive layout;
- component visual treatment;
- accessibility-oriented interaction polish;
- design-system evolution;
- screen-to-screen experience.

This is an explicit product decision, not merely a temporary prototype preference.

### Canonical backend owns system truth
Google Studio/Stitch must consume canonical backend contracts and must not become authoritative for:

- dispatch ranking;
- queue eligibility;
- permit requirements;
- fare policy;
- platform-fee accounting;
- financial ledger integrity;
- database concurrency;
- audit policy;
- regulatory status;
- service-zone enforcement;
- security/authorization.

If a Google-generated UI needs data or actions that do not exist, add a clean backend contract rather than embedding business truth inside the component.

## Google Studio: keep / reuse

The Google Studio build contains several useful domain and UX ideas worth preserving:

- Clear role-based Passenger / Driver / Dispatcher / Admin views.
- Separate TypeScript domain modules for `DispatchEngine`, `EligibilityEngine`, `FareEngine`, `DigitalPilaEngine`, `RideStateMachine`, and `LedgerEngine`.
- Good emphasis on digital pila and manual dispatcher fallback.
- Integer-centavo money handling.
- Explicit ride lifecycle states.
- Append-only ledger concept and reversal entries.
- Human-friendly booking codes.
- PWA shell, offline indicator, install affordance, and low-end-phone-oriented UI.
- Feature flags for future vehicle/service classes.
- Demo/test ride distinction.

Google Studio/Stitch should remain the preferred design authority even when individual prototype domain implementations are replaced.

## Google Studio: replace before field use

### 1. Browser/localStorage as source of truth
The current `LunadCoreService` persists production-like state in browser `localStorage`. This is unsuitable for real multi-user operations.

**Replace with:** Supabase/PostgreSQL/PostGIS plus authenticated server-authoritative mutations and realtime subscriptions.

### 2. Fake atomic concurrency
`DispatchEngine.attemptAtomicAssignment()` uses an in-memory JavaScript `Set`. This cannot protect a real distributed deployment and resets per runtime/browser.

**Replace with:** database transaction / row lock / conditional update / unique constraint so exactly one driver can claim a ride across all clients and servers.

### 3. Synthetic SVG map
`MagdalenaMap.tsx` is a hand-drawn SVG representation, not an authoritative geographic map. It is useful as a design mockup only.

**Replace with:** MapLibre + real basemap provider + Geoapify/other provider abstraction + PostGIS while preserving the Google/Stitch map interaction design where useful.

### 4. Straight-line distance used as fare/routing distance
The prototype uses Haversine distance. This is acceptable for rough proximity checks but not as authoritative road-route distance or ETA.

**Replace with:** provider-routed road distance when the fare policy needs distance; retain PostGIS/Haversine for cheap pre-filtering where appropriate.

### 5. Invented operational seed data
The prototype includes realistic-looking TODA names, contacts, terminals, permit authorities, route/fare assumptions, and geographic coordinates. These must not be mistaken for verified local facts.

**Replace with:** explicitly synthetic names (`Test Terminal A`, `Demo TODA A`) until field/LGU validation. Production regulatory rules remain disabled/unverified until confirmed.

### 6. Permit assumptions are overconfident
The prototype marks specific permits/license/TODA membership as required for classes including E-Trike. Requirements must be municipality- and service-specific and field-verified.

**Replace with:** regulatory rule records carrying verification status, authority source, effective date, and applicability.

### 7. Dangerous fare fallback
If no matching fare rule exists, the prototype falls back to the first fare rule.

**Replace with:** fail closed: return `FARE_RULE_UNAVAILABLE` and require dispatcher/admin resolution. Never silently quote another class's fare.

### 8. Service zones not enforced in dispatch
Zones exist in state but are not integrated into the eligibility/dispatch decision.

**Replace with:** PostGIS polygon/zone checks as explicit EligibilityEngine gates.

### 9. Test suite contains a weak/incorrect state-machine assertion
The test computes `SEARCHING -> ASSIGNED`, which is not a legal transition in the state machine, but does not include that assertion in the final pass condition. This can falsely report a canonical lifecycle test as passing.

**Replace with:** real automated Vitest/Node + database integration + Playwright tests that fail the build on incorrect transitions.

### 10. AI Studio leftovers
The project declares Gemini API requirements and `@google/genai`, but no LUNAD functionality needs Gemini.

**Remove:** Gemini dependency, GEMINI_API_KEY requirement, AI Studio media plugin/metadata when moving to canonical LUNAD unless a later user-facing AI feature has a specific justified use.

## Canonical merge decision

### Google Studio / Stitch contributes and leads
- Visual design system
- Mobile interaction patterns
- Role screens and information hierarchy
- Driver offer/ride lifecycle UX
- Dispatcher/digital-pila UX
- Responsive/mobile behavior
- Accessibility and interaction polish
- TypeScript domain interfaces and useful engine concepts where they remain clean

### Grok/master architecture contributes
- Production Supabase/PostGIS backend
- RLS/auth/security model
- Atomic dispatch/ledger database invariants
- Multi-tenant / multi-municipality foundation
- Provider-agnostic maps
- Compliance configuration and auditability
- Private server-side matching/scoring
- Real automated test layers
- Commerce/Fulfillment extension architecture

## Merge rule

Never average two implementations merely because both exist.

For each module:

- choose Google/Stitch when the question is primarily user experience or presentation;
- choose canonical backend/system architecture when the question is data integrity, security, regulatory logic, financial integrity, or concurrency;
- preserve stable interfaces between the two so either side can evolve independently.

## Next canonical implementation sequence

1. Keep Google Studio/Stitch as UI design authority.
2. Port only cleaned shared domain types/contracts from the prototype.
3. Build Supabase migrations and backend contracts first.
4. Implement server-side ride state, eligibility, queue, fare, dispatch, and ledger transactions.
5. Connect Google/Stitch-led screens to backend contracts without re-embedding business rules in UI.
6. Replace SVG map with real provider abstraction while preserving superior Google/Stitch interaction design.
7. Use synthetic demo data only.
8. Run Golden Path ride and ₱1 fee tests.
9. Add field-verified Magdalena data only after actual visits/records validation.
