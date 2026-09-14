# LUNAD M2 — Realtime Two-Device Ride Test

## Purpose

Prove that one persistent server-authoritative TEST ride is shared in realtime by Passenger Phone A, Driver Phone B, and Dispatcher Observer C.

This is a TEST-only milestone. Expected platform fee: PHP 0.

## Preconditions

- Dedicated LUNAD Supabase project created.
- Migrations 0001 through 0004 applied successfully.
- Security/performance advisors reviewed after DDL.
- Vercel preview configured with:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- Dedicated test identities exist:
  - passenger test account
  - driver test account with APPROVED synthetic driver/vehicle records
  - dispatcher test account with active DISPATCHER membership
- Driver status AVAILABLE or PILA.
- No real resident PII, permit scans, or production fares in the lab dataset.

## Devices

### Phone A — Passenger
Open `/lab/passenger`.

1. Sign in with passenger test account.
2. Set pickup/dropoff on actual satellite map.
3. Choose Padyak, E-Trike, or Tricycle.
4. Preview actual road route.
5. Request TEST ride.
6. Confirm persistent booking code appears.
7. Leave page open; do not refresh.

Expected: status starts SEARCHING.

### Observer C — Dispatcher
Open `/lab/dispatcher`.

1. Sign in with dispatcher test account.
2. Confirm Passenger A ride appears without refresh.
3. Use lab SQL/admin helper to create an offer for the eligible synthetic driver until a full dispatcher assignment control is wired.
4. Confirm immutable DRIVER_OFFERED event appears.

### Phone B — Driver
Open `/lab/driver`.

1. Sign in with driver test account.
2. Confirm incoming OFFER appears without refresh.
3. Tap ACCEPT.

Expected:
- Driver sees ASSIGNED.
- Passenger A changes to ASSIGNED without refresh.
- Dispatcher C changes to ASSIGNED without refresh.
- Competing accept attempt cannot win.

Continue Driver B:

4. START TO PICKUP -> DRIVER_EN_ROUTE.
5. MARK ARRIVED -> DRIVER_ARRIVED.
6. PASSENGER ONBOARD -> IN_TRIP.
7. COMPLETE TRIP -> COMPLETED.

Each state must appear on Passenger A and Dispatcher C without refresh.

## Ledger assertions

For TEST ride:

- ride_requests.is_test = true
- platform_fee_centavos = 0
- zero PLATFORM_FEE ledger rows for the test ride

For later Magdalena production qualification test:

- platform_fee_centavos = 100
- exactly one PLATFORM_FEE row with amount_centavos = -100
- retrying completion cannot create a second fee

For Sorsogon City launch later:

- municipality default/configured platform fee = 500 centavos
- same idempotency invariant applies

## Concurrency test

Create two eligible synthetic drivers and two live offers for one TEST ride.

Trigger ACCEPT as closely together as possible from two independent sessions.

Pass condition:

- exactly one accept succeeds
- exactly one ride_offers row becomes ACCEPTED
- losing offer becomes unavailable/withdrawn
- ride_requests has exactly one assigned_driver_id

Database protections:

- ride row FOR UPDATE lock in `accept_ride_offer`
- partial unique index `one_accepted_offer_per_ride_idx`

## Failure tests

- expired offer -> must fail closed
- driver already busy -> must fail closed
- illegal transition -> must fail closed
- unauthenticated mutation -> denied
- passenger cannot see unassigned driver exact presence
- driver cannot read unrelated passenger rides
- non-staff cannot read all municipality rides
- websocket event missed -> canonical query can recover current state

## M2 exit gate

M2 is DONE only when:

1. Three-view realtime test passes on separate devices/sessions.
2. 20 consecutive TEST rides complete without P0/P1 defects.
3. Two-driver concurrent acceptance produces exactly one winner.
4. Test rides produce no platform revenue.
5. One qualifying Magdalena production-style test produces exactly one PHP 1 ledger fee.
6. Security advisor has no unresolved critical RLS/auth issue affecting the ride loop.
