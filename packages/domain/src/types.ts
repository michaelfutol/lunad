// LUNAD canonical domain contracts.
// Keep this package provider-agnostic and free of UI/backend framework dependencies.

export type UserRole =
  | 'PASSENGER'
  | 'DRIVER'
  | 'OPERATOR'
  | 'DISPATCHER'
  | 'COMPLIANCE_OFFICER'
  | 'ADMIN'
  | 'SUPERADMIN';

export type VehicleClass =
  | 'PADYAK'
  | 'E_TRIKE'
  | 'TRICYCLE'
  | 'MOTORCYCLE'
  | 'E_BIKE'
  | 'E_CAR'
  | 'SEDAN'
  | 'TAXI'
  | 'MULTICAB'
  | 'JEEPNEY'
  | 'VAN'
  | 'PICKUP'
  | 'LIGHT_TRUCK'
  | 'HEAVY_TRUCK'
  | 'RENTAL_CAR';

export type ServiceType =
  | 'RIDE'
  | 'DELIVERY'
  | 'PABILI'
  | 'FOOD_DELIVERY'
  | 'SHOP_DELIVERY'
  | 'CARGO'
  | 'TRUCK_HIRE'
  | 'CAR_RENTAL';

export type DriverOperationalStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'PILA'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ON_TRIP'
  | 'PAUSED';

export type VerificationStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'APPROVED'
  | 'REQUEST_UPDATE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REVOKED';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'IN_TRIP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_DRIVER';

export type DispatchStrategy =
  | 'HYBRID'
  | 'NEAREST'
  | 'TERMINAL_QUEUE'
  | 'ROUND_ROBIN'
  | 'MANUAL';

export type QueueEntryStatus =
  | 'WAITING'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'PAUSED'
  | 'LEFT'
  | 'EXPIRED';

export type LedgerTransactionType =
  | 'PLATFORM_FEE'
  | 'CREDIT'
  | 'CASH_PAYMENT'
  | 'GCASH_PAYMENT'
  | 'ADMIN_ADJUSTMENT'
  | 'REVERSAL'
  | 'PROMOTIONAL_CREDIT'
  | 'OTHER';

export type FareRuleType = 'FIXED' | 'ZONE' | 'DISTANCE' | 'MATRIX' | 'MANUAL_APPROVED';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface FareQuote {
  id: string;
  fareRuleId: string;
  vehicleClass: VehicleClass;
  roadDistanceMeters: number | null;
  straightLineDistanceMeters: number | null;
  estimatedDurationSeconds: number | null;
  passengerFareCentavos: number;
  platformFeeCentavos: number;
  isDemoFare: boolean;
  quotedAt: string;
}

export interface RideRequest {
  id: string;
  bookingCode: string;
  organizationId: string;
  municipalityId: string;
  passengerId: string;
  serviceType: 'RIDE';
  requestedVehicleClass: VehicleClass;
  pickup: GeoPoint;
  pickupLabel: string;
  pickupNotes?: string;
  dropoff: GeoPoint;
  dropoffLabel: string;
  dropoffNotes?: string;
  fareQuoteId: string;
  status: RideStatus;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  dispatchStrategyUsed?: DispatchStrategy;
  dispatchReasonCode?: string;
  terminalIdUsed?: string;
  isTest: boolean;
  createdAt: string;
}

export interface EligibilityResult {
  eligible: boolean;
  internalReasonCodes: string[];
  publicMessage: string;
}

export interface FeatureFlags {
  ride: boolean;
  padyak: boolean;
  etrike: boolean;
  tricycle: boolean;
  motorcycle: boolean;
  ebike: boolean;
  ecar: boolean;
  car: boolean;
  delivery: boolean;
  pabili: boolean;
  foodDelivery: boolean;
  shopDelivery: boolean;
  cargo: boolean;
  truckHire: boolean;
  carRental: boolean;
  merchantMarketplace: boolean;
  publicReferrals: boolean;
  socialMarketing: boolean;
  percentageCommission: boolean;
  integratedDriverWallet: boolean;
}

export const MAGDALENA_PHASE1_VEHICLES: readonly VehicleClass[] = [
  'PADYAK',
  'E_TRIKE',
  'TRICYCLE',
] as const;

export const DEFAULT_LAB_PLATFORM_FEE_CENTAVOS = 100;
