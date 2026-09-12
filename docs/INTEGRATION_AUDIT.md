# LUNAD Integration Audit

## Inputs reviewed

1. LUNAD master product/engineering specification developed in the project thread.
2. Google Studio export `lunad-mobility (1).zip`.
3. Previous Grok artifact supplied to the project, which was verified to be a different septic-designer workspace and therefore is not a valid LUNAD code source.

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

These should be treated as **prototype/domain reference**, not production authority.

## Google Studio: replace before field use

### 1. Browser/localStorage as source of truth
The current `LunadCoreService` persists production-like state in browser `localStorage`. This is unsuitable for real multi-user operations.

**Replace with:** Supabase/PostgreSQL/PostGIS plus authenticated server-authoritative mutations and realtime subscriptions.

### 2. Fake atomic concurrency
`DispatchEngine.attemptAtomicAssignment()` uses an in-memory JavaScript `Set`. This cannot protect a real distributed deployment and resets per runtime/browser.

**Replace with:** database transaction / row lock / conditional update / unique constraint so exactly one driver can claim a ride across all clients and servers.

### 3. Synthetic SVG map
`MagdalenaMap.tsx` is a hand-drawn SVG representation, not an authoritative geographic map. It is useful as a design mockup only.

**Replace with:** MapLibre + real basemap provider + Geoapify/other provider abstraction + PostGIS.

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

**Remove:** Gemini dependency, GEMINI_API_KEY requirement, AI Studio media plugin/metadata when moving to canonical LUNAD.

## Canonical merge decision

### Google Studio contributes
- Mobile interaction patterns
- Role screens and information hierarchy
- Driver offer/ride lifecycle UX
- Dispatcher/digital-pila UX
- TypeScript domain interfaces and useful engine concepts

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

## Next canonical implementation sequence

1. Establish repo structure and architecture docs.
2. Port only cleaned domain types/contracts from Google prototype.
3. Create Supabase migrations first.
4. Implement server-side ride state, eligibility, queue, fare, dispatch, and ledger transactions.
5. Connect a cleaned Google-derived UI to backend contracts.
6. Replace SVG map with real provider abstraction.
7. Use synthetic demo data only.
8. Run Golden Path ride and ₱1 fee tests.
9. Add field-verified Magdalena data only after actual visits/records validation.
