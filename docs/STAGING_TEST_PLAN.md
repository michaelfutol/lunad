# LUNAD Staging Test Loop

## Current Vercel project

- Project: `lunad`
- Vercel project ID: `prj_TJjFK4ll3sFaIsoAHfulWNtYm6oH`
- Team: Futoltech 137
- Environment: preview / pre-alpha

The first live staging shell is intentionally a frontend interaction prototype only. It uses synthetic test data and does not represent official fares, permits, routes, drivers, availability, or regulatory rules.

## Current click-test flow

1. Passenger: enter pickup and destination.
2. Select Padyak, E-Trike, or Tricycle.
3. Request LUNAD.
4. Switch to Driver.
5. Accept the incoming test booking.
6. Advance through Start to Pickup -> Arrived -> Passenger Onboard -> Complete Test Trip.
7. Confirm the simulated ledger increases by exactly ₱1.
8. Switch to Dispatcher to inspect the same ride state.
9. Switch to Admin to inspect current pilot counters and configuration notes.

## Human review feedback to collect

- mobile readability
- confusing labels
- booking steps that feel unnecessary
- missing driver information
- awkward buttons or state transitions
- map/layout issues
- whether Padyak/E-Trike/Tricycle choices are immediately understandable
- whether Driver mode is safe and simple enough for low-end Android phones
- dispatcher needs discovered during testing
- bugs or states that become stuck

## Important limitations of this shell

- no Supabase authentication yet
- no real database/realtime backend yet
- no real MapLibre/Geoapify map yet
- no verified Magdalena places, fares, terminals, TODA records, or permit policies yet
- no actual multi-device concurrency yet
- no real payment or driver wallet

The canonical backend remains the Supabase/PostgreSQL/PostGIS architecture in this repository. Google Studio/Stitch remains the UI/UX authority; this staging shell exists so Michael can begin human testing immediately while the canonical implementation is wired up.
