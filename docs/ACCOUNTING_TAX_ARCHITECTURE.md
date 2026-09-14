# LUNAD Accounting & Tax Architecture

Status: architecture baseline for review. This document is intentionally **BIR-ready**, not a claim of formal BIR compliance or registration.

## 1. Doctrine

LUNAD will keep honest books from the first real transaction.

Operational dashboards, driver/merchant ledgers, bank/cash movements, tax reports, and financial statements must reconcile to one auditable accounting source of truth.

Rules:

- Double-entry accounting.
- No off-book revenue.
- No physical deletion of posted journal entries.
- Corrections use reversal or adjusting entries.
- Money stored in integer centavos.
- Every posted entry carries source type, source ID, posting date/time, actor/system origin, and audit metadata.
- Source evidence (invoice, bill, receipt, bank/GCash reference, contract, settlement record) is linked to the entry where applicable.
- TEST/SIMULATION transactions never post production revenue or tax records.

## 2. Accounting boundary

Operational ledgers and the statutory/general ledger are related but not identical.

### Operational layer

Contains ride events, driver balances, merchant balances, marketplace transactions, payments, refunds, and settlements.

### Accounting layer

Contains chart of accounts, journal batches, journal entries, journal lines, accounting periods, source-document registry, tax configuration, and financial reports.

Only controlled posting rules can move an eligible operational event into the accounting ledger.

This prevents accidental revenue recognition from test data or incomplete rides/orders.

## 3. Core accounting entities

Planned data model:

- `accounting_entities`
- `accounting_periods`
- `chart_of_accounts`
- `journal_batches`
- `journal_entries`
- `journal_lines`
- `source_documents`
- `invoice_registry`
- `tax_profiles`
- `tax_codes`
- `settlement_batches`
- `bank_cash_accounts`
- `reconciliation_sessions`
- `period_closures`
- `accounting_audit_events`

A posted journal entry must always satisfy:

`sum(debits) = sum(credits)`

Database constraints should enforce this at controlled posting/finalization time.

## 4. Initial chart of accounts — conceptual

Final account numbers and tax treatment must be reviewed by a Philippine CPA/bookkeeper before statutory use.

### Assets

- Cash on Hand
- Bank Account
- GCash / E-wallet Clearing
- Accounts Receivable
- Prepaid Hosting / Services where applicable
- Equipment

### Liabilities

- Driver Settlement Payable
- Merchant Settlement Payable
- Customer Refunds Payable
- Accounts Payable
- Taxes Payable
- Withholding Taxes Payable where applicable

### Equity

- Owner's Capital / Share Capital as applicable
- Retained Earnings / Accumulated Results

### Revenue

- Ride Platform Fee Revenue — Magdalena
- Ride Platform Fee Revenue — Sorsogon City
- Marketplace Transaction Fee Revenue
- Delivery/Fulfillment Platform Revenue
- Merchant Software Revenue
- Other Platform Revenue

### Expenses

- Cloud Hosting
- Database / Compute
- Maps / Routing / Geocoding
- Domain / DNS
- Payment Processing
- SMS / Communications
- Software Subscriptions
- Customer Support
- Driver / Merchant Onboarding
- Legal / Professional Fees
- Accounting / Bookkeeping
- Permits / Licenses
- Marketing
- Payroll / Contractor Expense
- Office / Equipment
- Bank Charges
- Taxes and Licenses
- Depreciation where applicable

## 5. Platform-fee posting rules

### Sta. Magdalena production ride

After a qualifying production ride reaches `COMPLETED` and all fee rules succeed:

Platform fee = PHP 1.00.

The accounting posting depends on settlement method.

Example when driver owes the fee to LUNAD:

- Debit: Driver Receivable / Settlement Clearing — PHP 1.00
- Credit: Ride Platform Fee Revenue — Magdalena — PHP 1.00

When driver later pays a batch settlement:

- Debit: Cash/Bank/GCash
- Credit: Driver Receivable / Settlement Clearing

### Sorsogon City production ride

Same pattern, initial fee = PHP 5.00.

- Credit revenue to the separate Sorsogon City ride-fee revenue account for municipality-level reporting.

### Magdalena Marketplace completed transaction

Initial platform fee = PHP 1.00 per qualifying completed marketplace transaction.

If seller owes the fee:

- Debit: Merchant/Seller Receivable or Settlement Clearing
- Credit: Marketplace Transaction Fee Revenue

### Test, cancelled, failed, expired, no-driver

Platform revenue = PHP 0.00.

No revenue journal entry is created.

## 6. Passenger fare is not automatically LUNAD revenue

This is an important policy gate.

If LUNAD operates as an agent/platform and the transport service is legally/economically supplied by the driver/operator, the passenger fare should **not automatically be booked as LUNAD gross revenue** simply because it appears in the app.

If LUNAD never collects the passenger fare, the accounting may only need to recognize LUNAD's platform fee.

If LUNAD temporarily collects passenger money and must remit the driver's share, the collected amount may require a clearing/settlement-liability treatment rather than gross platform revenue.

The final principal-versus-agent accounting and tax treatment must be confirmed by a Philippine CPA/tax adviser based on LUNAD's actual contracts, payment flow, and registration.

The software therefore keeps fare, platform fee, driver share, payment collection, and settlement as separate fields/objects.

## 7. Honest expense capture

Every recurring or material operating cost should enter the books with evidence:

- Vercel
- Supabase
- map/routing provider
- domain renewals
- SMS/communications
- payment-gateway fees
- software subscriptions
- accounting/legal services
- payroll/contractors
- equipment
- permits/licenses
- bank fees
- refunds/losses

Each expense record should support:

- supplier/payee
- date
- amount
- tax treatment/code
- payment method/account
- invoice/receipt/reference
- attachment
- description/business purpose
- approving user where applicable

This allows the Unit Economics dashboard to use the same underlying records as bookkeeping instead of maintaining a separate fantasy cost model.

## 8. Reconciliation

LUNAD should support at least:

### Daily

- completed production rides vs posted platform fees
- completed marketplace transactions vs posted marketplace fees
- driver ledger movements vs accounting clearing accounts
- merchant ledger movements vs accounting clearing accounts
- cash/GCash/bank receipts vs settlement batches

### Monthly

- trial balance
- revenue by municipality/service
- expense by account/category
- accounts receivable/payable schedules
- driver/merchant clearing reconciliation
- bank/e-wallet reconciliation
- tax and license schedule
- exception report for unposted or mismatched operational transactions

A period should not be considered clean while unresolved differences remain.

## 9. BIR-ready books and reports

Current BIR materials recognize manual books, loose-leaf books, and computerized books of accounts. New registrants can choose among these forms; loose-leaf and computerized books/systems have additional registration/permit/acknowledgement requirements before statutory use.

The LUNAD accounting engine should be able to produce accountant-reviewable equivalents of:

- General Journal
- General Ledger
- Sales/Revenue Register
- Purchases/Expense Register
- Cash Receipts Book/Register
- Cash Disbursements Book/Register
- Trial Balance
- Accounts Receivable schedule
- Accounts Payable schedule
- Taxes and Licenses schedule
- supporting source-document index

The exact statutory book format and registration path will be selected with the accountant/BIR registration process.

## 10. Invoicing/document control

Do not generate legally represented BIR invoices merely because the app can print a PDF.

Maintain an invoice/document registry capable of storing:

- document type
- authorized series
- invoice number
- issue date
- customer/buyer data when legally required
- taxable amount/tax components as configured
- source transaction
- status: issued / voided / cancelled / replaced
- reason and replacement link

No reuse of issued invoice numbers.

Voided/cancelled documents remain in the audit trail.

Actual invoice format/series and computerized issuance must follow the taxpayer's BIR registration and applicable authority/acknowledgement before production use.

## 11. Tax configuration

Never hard-code "VAT", "non-VAT", percentage tax, withholding, or income-tax assumptions into transaction logic before the actual taxpayer registration is known.

Create configuration for:

- taxpayer legal name
- TIN / branch code
- RDO
- entity type
- registered address
- tax types from COR
- VAT/non-VAT status
- withholding classifications where applicable
- invoice series/configuration
- accounting-book type
- effective dates

Changes are versioned and auditable.

Historical transactions retain the tax configuration effective at the transaction date.

## 12. Period closing

Accounting periods may be OPEN, REVIEW, or CLOSED.

After close:

- ordinary users cannot alter postings in the closed period;
- adjustments require an authorized adjusting entry and appropriate period/date treatment;
- close/reopen actions require elevated permission and audit reason.

## 13. Roles and separation of duties

Planned roles:

- Operations — sees operational transactions, not accounting configuration.
- Bookkeeper — prepares/reconciles entries and reports.
- Accountant/Reviewer — reviews tax mapping and period close.
- Finance Admin — handles settlements/payment evidence.
- Superadmin — technical administration but should not silently rewrite posted accounting history.

## 14. Reports

Internal management reports:

- P&L / income statement
- balance sheet
- cash-flow view
- revenue by municipality
- revenue by product
- cloud/technology cost per completed trip
- contribution per transaction
- driver/merchant receivable aging
- settlement reconciliation

Tax/accountant package:

- registered-books export according to selected BIR method
- GL/journal exports
- sales/purchase/cash books
- trial balance
- tax schedules
- source-document index
- exception/reconciliation report

## 15. BIR legal/registration checkpoint

Before LUNAD uses its computerized accounting module as the company's statutory books or computerized invoicing system:

1. Establish the legal taxpayer/entity and secure/update BIR registration.
2. Confirm tax types and invoicing requirements from the Certificate of Registration and current rules.
3. Decide with the accountant whether statutory books will be manual, loose-leaf, or computerized.
4. If computerized books/accounting/CAS are selected, complete the applicable BIR acknowledgement/registration requirements before use.
5. Validate invoice format/numbering and required authority/acknowledgement before production issuance.
6. Have opening balances/chart of accounts/tax mappings reviewed by a Philippine CPA or qualified bookkeeper.

Until that gate is complete, LUNAD's module is an internal **BIR-ready accounting system**, not a representation that BIR has approved/certified it.

## 16. Non-negotiable audit invariants

- A qualifying production transaction posts revenue once, never twice.
- An operational transaction cannot be silently detached from its posted journal entry.
- A posted journal entry cannot be physically deleted.
- Reversals retain reference to the original.
- Debits equal credits.
- Invoice/document numbers are unique within their series.
- Test data never contaminates statutory records.
- Municipality fee rules remain historically traceable.
- Financial reports must reconcile to journal data, not separately maintained counters.

## 17. Initial fee policy snapshot

This is a business-policy snapshot, not a tax determination:

- Sta. Magdalena Ride: PHP 1.00 per qualifying completed production booking.
- Sorsogon City Ride launch: PHP 5.00 per qualifying completed production booking.
- Magdalena Marketplace: PHP 1.00 per qualifying completed marketplace transaction.
- Test/simulation/cancelled/failed transactions: PHP 0.00 platform revenue.

Fees remain configurable by municipality/service with effective dating and audit history.
