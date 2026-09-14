# LUNAD Business Model — Locked Launch Pricing

## Core doctrine
LUNAD starts with very low transaction pricing to maximize adoption, network density, operational learning, and trust. Pricing is municipality/service-specific and must be configurable in the backend; never hard-code one fee globally.

## Sta. Magdalena laboratory
### Ride
- Platform fee: **PHP 1.00 per qualifying successfully completed app-generated ride**.
- Failed, cancelled, expired, no-driver, system-error, simulation, and test rides: **PHP 0.00**.
- No percentage commission during the laboratory phase.

### Magdalena Online Marketplace / LUNAD Market
- Listing: **free**.
- Basic seller account/storefront: **free**.
- Marketplace platform fee: **PHP 1.00 per confirmed successful transaction**.
- Cancelled/failed/unconfirmed transaction: **PHP 0.00**.
- LUNAD delivery/fulfillment charges are separate from the PHP 1 marketplace transaction fee.

## Sorsogon City launch
### Ride
- Launch platform fee: **PHP 5.00 per qualifying successfully completed app-generated ride**.
- Failed, cancelled, expired, no-driver, system-error, simulation, and test rides: **PHP 0.00**.
- Fee remains a fixed transaction charge at launch, not a percentage commission.

## Ledger invariants
- One qualifying completed ride may create at most one platform-fee ledger entry.
- Retried completion must not create a duplicate fee.
- Financial reversals are append-only reversing entries; never delete the original ledger entry.
- `is_test=true` rides and transactions never create production platform revenue.

## Configuration
The fee engine must support municipality + service + effective-date configuration, for example:

- Sta. Magdalena / RIDE = 100 centavos
- Sta. Magdalena / MARKETPLACE_TRANSACTION = 100 centavos
- Sorsogon City / RIDE = 500 centavos

Future pricing changes must be configuration changes with audit history, not code edits.

## Scale arithmetic
At a PHP 5 Sorsogon City ride fee:
- 10,000 completed rides/month = PHP 50,000 gross platform fees
- 50,000 completed rides/month = PHP 250,000
- 100,000 completed rides/month = PHP 500,000
- 200,000 completed rides/month = PHP 1,000,000

These are arithmetic scenarios only, not forecasts. Actual revenue depends on real completed booking volume, operating costs, incentives, taxes, payment losses, compliance costs, and other expenses.
