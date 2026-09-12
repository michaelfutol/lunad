# Google Studio Reference Build

The uploaded Google Studio export is retained conceptually as a **reference implementation**, not the canonical production source.

## Valuable reference modules

- `src/core/dispatch.ts`
- `src/core/eligibility.ts`
- `src/core/fare.ts`
- `src/core/ledger.ts`
- `src/core/pila.ts`
- `src/core/stateMachine.ts`
- role-based passenger/driver/dispatcher/admin UI patterns

## Do not port unchanged

- `src/core/storage.ts` browser/localStorage production state
- in-memory assignment lock
- hand-drawn SVG map as operational geography
- realistic-looking unverified terminals/TODAs/permit assumptions
- fallback to first fare rule when no matching rule exists
- AI Studio/Gemini scaffolding

The canonical implementation should preserve the useful domain boundaries while moving authority to Supabase/PostgreSQL/PostGIS and real authenticated server functions/database transactions.
