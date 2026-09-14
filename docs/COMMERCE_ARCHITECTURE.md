# LUNAD Commerce Architecture

## Magdalena Online Marketplace
A local, mobile-first social-commerce marketplace for Sta. Magdalena. The app, not Facebook, is the system of record.

### Core economics
- Listing: free.
- Basic seller account/store: free.
- Successful confirmed marketplace transaction: PHP 1 platform fee.
- Cancelled/failed transaction: PHP 0.
- Delivery/service fees are separate from the PHP 1 marketplace transaction fee.

### Listing model
A listing can represent a casual one-off item or a merchant catalog item. Minimum fields: seller, title, category, photos, price or negotiable flag, condition where applicable, quantity/availability, location/barangay, description, fulfillment options, timestamps and status.

### Buyer/seller lifecycle
DRAFT -> ACTIVE -> RESERVED/ORDERED -> ACCEPTED -> FULFILLING/MEETUP -> COMPLETED, with explicit cancellation/dispute paths.

Completion must be auditable. Early options:
- buyer and seller confirm using a transaction QR/short code;
- eligible LUNAD delivery completion confirms the commerce fulfillment event;
- admin can resolve exceptions with reason and audit log.

Exactly one PHP 1 marketplace ledger event may exist for a qualifying completed transaction.

## Facebook distribution
Every public listing may receive a shareable public page with Open Graph metadata. Seller triggers sharing from the LUNAD app. Do not rely on silent posting to personal profiles. Official Page syndication may be added only through supported Meta APIs and explicit authorization.

## Merchant OS
Free Basic is an acquisition tool, not a crippled trial. It should support:
- store profile;
- catalog and prices;
- stock/availability;
- order queue;
- preparing/ready/pickup/delivered statuses;
- LUNAD fulfillment request;
- simple daily sales view.

Optional advanced modules later: POS, purchasing, accounting/export, staff accounts, analytics, websites/ecommerce sync, CRM/marketing automation.

## Mhenching reference integration
Mhenching Variety Store is Merchant #001/reference. Existing Mhenching UI may remain separately branded; when it needs fulfillment it can create a LUNAD delivery job through the common fulfillment contract.

## Pabili
Pabili is available even when the target merchant is not onboarded. Request contains desired items, target/optional store, budget, notes and proof/receipt requirements. A delivery partner may accept, purchase, upload receipt evidence and deliver. Repeated Pabili demand from a store should become a merchant onboarding lead.

## Shared fulfillment
Drivers/providers explicitly opt into eligible service types. Passenger ride eligibility and delivery eligibility are not assumed to be identical. Shared network services must pass the same driver/vehicle/compliance gate before dispatch.

## Municipality feature flags
Sta. Magdalena can progressively enable Ride, Market, Food, Shops, Pabili and Delivery. Sorsogon City initially prioritizes Ride. Other underserved municipalities may enable the full commerce stack according to demand and competition.
