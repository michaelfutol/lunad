# LUNAD Canonical Roadmap — Milestones, Gates, and Asymptote

This roadmap exists to prevent endless development. LUNAD advances only when the current gate is met. Once the asymptote gate is reached, stop adding core features, freeze the stable core, and shift effort to field operations, acquisition, reliability, and revenue.

## Product doctrine

- Android/mobile first for Passenger and Driver.
- Competitor-grade core ride experience is the minimum; targeted local superiority is the goal.
- Sta. Magdalena is the controlled laboratory. Sorsogon City is the commercial-grade target.
- No invented LGU rules, fares, permits, terminals, driver counts, or operational facts.
- Test/simulation records never enter production revenue or accounting.
- Sta. Magdalena Ride platform fee: PHP 1 per successful production ride.
- Magdalena Marketplace fee: PHP 1 per confirmed successful marketplace transaction.
- Sorsogon City Ride launch platform fee: PHP 5 per successful production ride.
- Cancelled, failed, expired, no-driver, and test/simulation rides: PHP 0.
- Target technology variable cost: preferably <= PHP 0.50 per completed Sorsogon ride; PHP 1.00 is the design ceiling before corrective action.
- Honest, source-linked, double-entry, BIR-ready accounting is part of the product core.

---

# M0 — Canonical foundation

Status: **DONE / maintained continuously**

Required:
- Canonical GitHub repo and build branch.
- CI install/typecheck/build gate.
- Synthetic/demo data visibly marked.
- No wrong Grok/septic artifact merged.
- No localStorage or in-memory lock treated as production truth.
- Product, maps/routing, accounting, economics, and commerce decisions documented.

Exit gate:
- CI green.
- Canonical architecture exists in repo.

---

# M1 — Real geography + route foundation

Status: **DONE for laboratory golden path**

Required:
- MapLibre map.
- Satellite + street modes.
- GPS pickup.
- Typed place/landmark search.
- Tap-anywhere pickup/dropoff.
- Draggable exact pins.
- Road-following route geometry through provider abstraction.
- Never draw a fake straight line when routing fails.
- Padyak / E-Trike / Tricycle routing contracts.

Evidence reached:
- Live Vercel real-map laboratory.
- End-to-end automated E-Trike test completed on actual Sta. Magdalena geography.

Exit gate:
- Pickup -> destination route appears on actual road geometry.
- Routing failure fails honestly.

---

# M1.5 — Real-map dummy fleet simulator

Status: **DONE for first golden path; expand as regression harness**

Required:
- Synthetic Padyak, E-Trike, and Tricycle.
- Real coordinates and road geometry.
- SEARCHING -> ASSIGNED -> DRIVER_EN_ROUTE -> DRIVER_ARRIVED -> IN_TRIP -> COMPLETED.
- Dummy vehicle moves along routed geometry.
- Remaining itinerary contracts as vehicle progresses.
- 1x / accelerated QA speed.
- `is_test = true` and platform fee = PHP 0.

Exit gate:
- At least one complete dummy ride succeeds end-to-end without manual state editing.
- No accounting/revenue pollution.

---

# M2 — Realtime two-device ride core

Status: **NEXT MAJOR MILESTONE**

Build:
- Supabase/Postgres/PostGIS production data foundation.
- Auth + role model.
- Passenger request persisted server-side.
- Driver presence persisted/realtime.
- Realtime ride offers.
- Atomic driver acceptance: exactly one winner.
- Ride event log / state machine.
- Driver -> pickup routing.
- Pickup -> destination routing.
- Passenger screen updates automatically when driver accepts/moves/state changes.
- Test ride remains PHP 0.
- Production fee policy selected by municipality.

Test topology:
- Phone A: Passenger.
- Phone B: Driver.
- Laptop/Phone C: Dispatcher observer.

Exit gate — DO NOT advance until all are true:
- Passenger request appears on Driver device without refresh.
- Driver acceptance appears on Passenger device without refresh.
- Dispatcher sees the same canonical ride state.
- Simultaneous double-accept test produces exactly one winning driver.
- Duplicate completion cannot create duplicate fee entries.
- 20 consecutive lab golden rides complete without P0/P1 defect.

---

# M3 — Driver + Digital Pila + Dispatcher

Build:
- Driver online/offline.
- Vehicle/class eligibility.
- Incoming offer card optimized for one-handed Android use.
- Accept / Pass / Arrived / Start / Complete.
- Navigation handoff.
- GPS stale/network state.
- Digital Pila / terminal queue.
- FIFO where applicable and configurable eligibility exceptions.
- Manual dispatcher assignment/reassignment with reason.
- Live operations board.
- No exact unassigned driver locations shown to passengers.

Exit gate:
- Driver can complete a ride without admin intervention in the normal case.
- Dispatcher can recover a failed/no-driver/reassignment case.
- Pila logic is deterministic in automated tests.
- All manual overrides are auditable.

---

# M4 — Compliance, safety, identity, and trust

Build:
- Driver/vehicle onboarding.
- Configurable permit types and municipality policies.
- Permit expiry warnings.
- Association/TODA/terminal fields only when verified and required.
- Assigned driver identity and vehicle identifier shown after assignment.
- Trip sharing / report issue / emergency-access surface without clutter.
- Incident log and audit trail.

Exit gate:
- No unverified regulatory assumption can silently make a driver eligible/ineligible.
- Expired/incomplete required credentials fail closed when the verified policy requires them.
- Safety/incident actions create auditable records.

---

# M5 — Accounting + unit economics

Build:
- Immutable operational ledger.
- Municipality-specific platform fee rules.
- Magdalena Ride = PHP 1 successful production ride.
- Sorsogon City Ride = PHP 5 successful production ride.
- Marketplace = PHP 1 successful transaction.
- Test/cancelled/failed/no-driver = PHP 0.
- Driver settlement ledger and batching.
- Source-linked double-entry accounting export.
- Revenue/expense/cash receipt/cash disbursement/general journal/general ledger/trial balance support.
- Cost-per-trip telemetry: hosting, routing/geocoding, payment, messaging, support allocation.

Exit gate:
- 100% reconciliation between completed test dataset and expected fee ledger.
- Reversals use adjusting/reversal entries rather than deleting history.
- Every material platform expense can be tied to a source record/category.
- Unit economics dashboard warns if variable technology cost exceeds PHP 1/trip.

Note: software remains described as **BIR-ready**, not BIR-certified/compliant, until the registered business/books/invoicing setup is finalized and reviewed by a Philippine CPA/tax practitioner.

---

# M6 — UX and reliability hardening

Target: core ride flow should not feel materially inferior beside Grab/Angkas/Move It/JoyRide, while LUNAD should be better in its local strengths.

Hardening:
- Google Studio/Stitch-led Passenger and Driver visual refinement.
- One-handed Android ergonomics.
- Budget-phone performance.
- Outdoor readability.
- Weak-network and reconnect states.
- Route-provider failure states.
- GPS denied/stale state.
- Cancellation/reassignment/no-driver flows.
- App resume/background recovery.
- No browser alerts or prototype-only UI.
- Accessibility basics and large touch targets.

Internal release targets:
- Zero open P0 defects.
- Zero known P1 defects in golden ride path.
- 100 consecutive automated/simulated golden rides without state corruption or duplicate fee.
- Human QA on at least one low/mid-range Android and one additional mobile device class.
- Core booking action is understandable without developer explanation.

Exit gate:
- Human tester says the normal ride flow is clear and credible enough for a real stranger to use.
- Remaining issues are polish/P2-P3, not broken core behavior.

---

# M7 — Sta. Magdalena controlled field laboratory

Cohorts:
1. 10–15 verified partners.
2. 25 partners.
3. approximately 50 partners.

No broad social-media marketing initially.

Measure:
- active drivers;
- ride requests/completions;
- acceptance rate;
- no-driver rate;
- pickup wait;
- cancellations;
- rides per driver;
- repeat passengers;
- vehicle preference;
- manual-dispatch rate;
- routing/geocoding failures;
- incidents;
- fee accuracy;
- cost per completed ride.

Advance cohort only when the prior cohort is operationally stable.

Field exit gate:
- At least 2 consecutive weeks of stable operation OR enough completed rides to expose recurring defects, whichever gives stronger evidence.
- No unresolved safety-critical/P0 issue.
- No systemic double-booking or fee duplication.
- Accounting reconciliation remains exact.
- Manual dispatcher intervention is the exception, not required for the normal ride.
- Technology variable cost remains inside the design envelope or has a clear corrective plan.

At this gate, Magdalena is no longer a software experiment; it is a working local service.

---

# M8 — Sorsogon City commercial-grade launch

Preconditions:
- Magdalena field gate passed.
- Current Sorsogon City regulatory/permit/association/fare context verified from authoritative local sources.
- Sorsogon City configuration added without code fork.

Launch sequence:
- recruit/verify initial driver cohort;
- controlled geographic/service-hour launch;
- PHP 5 completed-ride platform fee;
- monitor supply-demand balance;
- expand driver count and service area based on real demand rather than vanity targets.

Commercial exit gate:
- Realtime system remains stable under materially higher concurrent usage.
- Driver supply can serve demand without chronic no-driver behavior.
- Cost per completed trip supports the PHP 5 fee model.
- Support/incident/accounting workflows work at operational volume.
- Core ride experience is judged competitor-grade or better by repeated human testing.

---

# M9 — Magdalena Marketplace / Commerce

Build after Ride core is stable enough that Commerce will not delay M2–M8:
- Facebook-style local marketplace feed.
- Free listings.
- Casual seller + merchant/store modes.
- PHP 1 only on confirmed successful marketplace transaction.
- Search/categories/barangay/distance filters.
- Listing share link with Open Graph preview.
- User-initiated Facebook sharing.
- Seller/buyer confirmation or transaction QR/code.
- LUNAD Delivery / pickup / meetup options.
- Merchant OS basic catalog/inventory/order flow.
- Mhenching = Merchant #001.
- Pabili for non-onboarded merchants.
- Food/Shops modules behind municipality feature flags.

Commerce exit gate:
- Listing -> buyer intent -> seller confirmation -> completion -> PHP 1 ledger works end-to-end.
- Delivery can reuse LUNAD fulfillment without corrupting Passenger Ride state machines.
- Marketplace accounting reconciles independently from Ride accounting.

---

# THE ASYMPTOTE GATE — WHEN WE STOP BUILDING CORE FEATURES

LUNAD has reached **Product Asymptote v1** when ALL of the following are true:

1. **Core reliability**
   - No open P0/P1 issue in the normal ride path.
   - Passenger -> Driver -> Dispatcher -> Completion is stable in production-like use.
   - Concurrency and duplicate-fee invariants are proven.

2. **UX parity achieved**
   - A new passenger can book without explanation.
   - A new driver can accept and complete without developer help.
   - Mobile experience no longer looks materially inferior beside major PH ride apps.

3. **Local superiority exists**
   - Exact satellite/map pinning.
   - Useful local landmark support/LUNAD Places path.
   - Padyak/E-Trike/Tricycle support.
   - Digital Pila/dispatcher recovery.
   - Low-bandwidth/error recovery.
   - Transparent PHP 1 / PHP 5 fee policy.

4. **Operations are not software-dependent**
   - Normal rides do not require developer intervention.
   - Support can diagnose rides from event/audit records.
   - Driver/vehicle/compliance records are operationally usable.

5. **Economics are sustainable**
   - Fee ledger is exact.
   - Cost per trip is measured, not guessed.
   - PHP 5 Sorsogon model has positive contribution before broader overhead, or there is a validated pricing/cost correction.

6. **Books are trustworthy**
   - Operational transactions reconcile to accounting records.
   - No silent deletion/editing of posted financial history.
   - CPA/BIR registration tasks are explicit before statutory use.

7. **Marginal-return test**
   - Two consecutive improvement cycles produce mostly cosmetic/P3 requests rather than meaningful reliability, conversion, safety, cost, or operational gains.
   - A proposed new core feature cannot reasonably improve one of: completed-trip rate, driver utilization, user comprehension, safety, unit cost, compliance, or retention by a material amount.

When all seven are true:

> **STOP core feature development. Freeze v1. Harvest.**

Move engineering capacity to:
- bug/security maintenance;
- field data corrections;
- operational automation;
- driver/merchant acquisition;
- Sorsogon expansion;
- Marketplace/Commerce;
- revenue and cost optimization.

Do not reopen the core roadmap simply because a competitor adds a feature. Reopen only when real user/driver/operations data shows a material problem or opportunity.

---

# Current position — 2026-09-13

- M0: DONE.
- M1: DONE for laboratory.
- M1.5: first golden-path dummy ride DONE and independently browser-tested.
- M2: **NEXT** — realtime two-device canonical ride.
- M3–M9: pending by gate.

Nearest milestone:

> **Phone A Passenger + Phone B Driver + Dispatcher observer, all sharing one server-authoritative ride in realtime, with test fee PHP 0 and atomic single-driver acceptance.**
