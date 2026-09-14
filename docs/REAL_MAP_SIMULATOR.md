# LUNAD Real-Map Dummy Fleet Simulator

## Purpose

The simulator exists so LUNAD can test dispatch, routing, vehicle movement, ride states, dispatcher behavior, and UI before real drivers are onboarded.

The simulation must be fake only in **identity and movement source**. It must use the real LUNAD map/routing/dispatch contracts wherever available.

## Core rule

**Dummy vehicles. Real geography. Real routing. Real state machine.**

Synthetic vehicles and drivers are always marked `is_test=true` and must never be counted as production supply, production rides, platform revenue, or real driver activity.

## Lab fleet

Default lab fleet for Sta. Magdalena:

- LAB-P-001 — Padyak
- LAB-E-001 — E-Trike
- LAB-T-001 — Tricycle

Additional synthetic units may be created from the Lab panel.

Do not seed fake TODA names, permit numbers, fares, officials, or regulatory approvals.

## Vehicle placement

A tester can enter `LAB MODE` and use the actual map to:

1. choose vehicle class;
2. tap `Add dummy vehicle`;
3. tap an actual map position;
4. drag the synthetic vehicle marker if desired;
5. set AVAILABLE / OFFLINE / PILA state;
6. optionally choose automatic acceptance behavior.

The position stored is a real latitude/longitude on the same map used by passengers.

## Passenger test

Passenger uses the normal passenger UI:

1. set pickup using GPS, search, or map pin;
2. set destination using search or map pin;
3. choose Padyak, E-Trike, or Tricycle;
4. request actual road itinerary;
5. submit a test ride.

The ride must be explicitly marked `is_test=true` while simulator mode is active.

## Dispatch test

The simulator should use the same intended production stages:

`REQUESTED -> SEARCHING -> OFFERED -> ASSIGNED -> DRIVER_EN_ROUTE -> DRIVER_ARRIVED -> IN_TRIP -> COMPLETED`

The selected dummy driver must pass the same service-class and availability checks as a production driver. Regulatory requirements that are not yet field-verified must not be fabricated; lab-mode eligibility may use a documented test policy rather than fake permit data.

## Driver-to-pickup route

After a synthetic driver accepts, LUNAD requests a real road route:

`dummy vehicle current coordinates -> passenger pickup coordinates`

The simulator moves the vehicle marker along the returned route geometry rather than interpolating a straight line.

Supported speed multipliers:

- 1x — approximate real time
- 5x — standard QA
- 10x — quick regression test

## Pickup-to-destination route

After `DRIVER_ARRIVED` and `IN_TRIP`, request/use the passenger itinerary:

`pickup -> destination`

Move the synthetic vehicle along the actual road geometry.

## Contracting itinerary

During movement, keep a route-progress cursor. The remaining polyline should shrink as the vehicle advances.

Recommended visual behavior:

- travelled segment: removed or subdued;
- remaining segment: high emphasis;
- vehicle marker: current route-progress point;
- destination marker: always visible.

Do not recompute the route every animation frame.

## Off-route test

Lab controls may deliberately drag a vehicle away from its current route. If deviation exceeds the configured threshold:

1. mark `OFF_ROUTE` internally;
2. request a new route from current coordinate to the active target;
3. replace the remaining itinerary;
4. log a `ROUTE_RECALCULATED` test event.

## Event history

Even test rides should log QA events:

- RIDE_REQUESTED
- SEARCH_STARTED
- DRIVER_OFFERED
- DRIVER_ACCEPTED / OFFER_REJECTED / OFFER_EXPIRED
- DRIVER_EN_ROUTE
- DRIVER_ARRIVED
- TRIP_STARTED
- ROUTE_RECALCULATED if applicable
- TRIP_COMPLETED
- TEST_RIDE_COMPLETED

## Financial isolation

A simulated ride must never create a real platform-fee ledger entry.

Production rule:

- normal qualifying completed ride -> PHP 1 platform fee

Simulation rule:

- `is_test=true` -> PHP 0 platform fee

This invariant must exist in backend logic/database constraints once realtime persistence is active.

## Failure scenarios

The simulator must support deterministic QA scenarios:

- no eligible driver;
- first driver rejects;
- offer expires;
- driver accepts then cancels;
- passenger cancels;
- two dummy drivers attempt to accept simultaneously;
- stale driver GPS;
- route provider unavailable;
- dispatcher manual assignment;
- dispatcher reassignment;
- driver goes off-route;
- duplicate completion request.

## Phase A — before Supabase

Use an explicit single-browser Lab Simulator for UI/routing QA only. State may be local/in-memory, clearly labelled non-persistent.

This phase validates:

- map interaction;
- real routing;
- vehicle marker animation;
- itinerary contraction;
- state-machine UX.

It does **not** prove realtime multi-device dispatch.

## Phase B — after Supabase

Move simulator state to the same backend/API/realtime channels used by production.

Test topology:

- Phone A: Passenger
- Phone B or Browser B: Dummy Driver Lab
- Laptop/Phone C: Dispatcher

All clients must observe the same persistent ride in realtime.

At that point a dummy fleet run becomes a true system test rather than a visual simulation.

## Recommended first full scenario

Fleet:

- one Padyak at a manually chosen real coordinate;
- one E-Trike at another real coordinate;
- one Tricycle at another real coordinate.

Test:

1. Passenger selects real pickup and destination.
2. Passenger chooses E-Trike.
3. System finds only eligible synthetic E-Trike supply.
4. E-Trike receives offer.
5. Accept.
6. Vehicle follows real road route to pickup at 5x speed.
7. Mark/auto-transition to ARRIVED.
8. Start trip.
9. Vehicle follows pickup-to-destination road itinerary.
10. Remaining route contracts while moving.
11. Complete trip.
12. Verify full event history.
13. Verify platform fee = PHP 0 because test mode.
14. Repeat as a real non-test ride only after a real driver/backend pilot is authorized.