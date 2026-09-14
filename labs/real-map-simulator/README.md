# LUNAD Real-Map Simulator

A controlled QA harness for LUNAD before real drivers are onboarded.

## Doctrine
- Dummy drivers/vehicles only.
- Real Santa Magdalena geography and map tiles.
- Real road-following routing.
- Same ride-state concepts as production.
- Test rides are always `is_test=true` and must never post revenue or production KPIs.

## Lab flow
1. Choose pickup and destination using GPS, search, or direct map tapping.
2. Choose Padyak, E-Trike, or Tricycle.
3. Preview the road route.
4. Request a LAB ride.
5. A synthetic vehicle routes to pickup, then to destination.
6. The visible remaining itinerary contracts as the vehicle progresses.
7. Test fee is always PHP 0.

This standalone harness exists for visual/route QA. Production realtime dispatch remains in the canonical app under `apps/web`.