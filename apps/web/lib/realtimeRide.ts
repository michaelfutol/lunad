'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase';

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

export type RealtimeRide = {
  id: string;
  booking_code: string;
  requested_vehicle_class: string;
  status: RideStatus;
  pickup_label: string | null;
  dropoff_label: string | null;
  platform_fee_centavos: number;
  is_test: boolean;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  created_at: string;
};

export type RideOffer = {
  id: string;
  ride_request_id: string;
  driver_id: string;
  vehicle_id: string;
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
  offered_at: string;
  expires_at: string;
};

export async function createRealtimeRide(input: {
  organizationId: string;
  municipalityId: string;
  vehicleClass: 'PADYAK' | 'ETRIKE' | 'TRICYCLE';
  pickup: { lng: number; lat: number; label: string };
  dropoff: { lng: number; lat: number; label: string };
  roadDistanceM?: number | null;
  estimatedDurationS?: number | null;
  isTest?: boolean;
}): Promise<RealtimeRide> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('create_ride_request', {
    p_organization_id: input.organizationId,
    p_municipality_id: input.municipalityId,
    p_vehicle_class: input.vehicleClass,
    p_pickup_lng: input.pickup.lng,
    p_pickup_lat: input.pickup.lat,
    p_pickup_label: input.pickup.label,
    p_dropoff_lng: input.dropoff.lng,
    p_dropoff_lat: input.dropoff.lat,
    p_dropoff_label: input.dropoff.label,
    p_road_distance_m: input.roadDistanceM ?? null,
    p_estimated_duration_s: input.estimatedDurationS ?? null,
    p_is_test: input.isTest ?? true,
  });
  if (error) throw error;
  return data as RealtimeRide;
}

export async function acceptRealtimeOffer(offerId: string): Promise<RealtimeRide> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('accept_ride_offer', { p_offer_id: offerId });
  if (error) throw error;
  return data as RealtimeRide;
}

export async function transitionRealtimeRide(
  rideId: string,
  target: Extract<RideStatus, 'DRIVER_EN_ROUTE' | 'DRIVER_ARRIVED' | 'IN_TRIP' | 'COMPLETED'>,
): Promise<RealtimeRide> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('driver_transition_ride', {
    p_ride_id: rideId,
    p_target: target,
  });
  if (error) throw error;
  return data as RealtimeRide;
}

export async function getMyOpenOffers(): Promise<RideOffer[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('ride_offers')
    .select('id,ride_request_id,driver_id,vehicle_id,status,offered_at,expires_at')
    .eq('status', 'OFFERED')
    .gt('expires_at', new Date().toISOString())
    .order('offered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RideOffer[];
}

export async function getRide(rideId: string): Promise<RealtimeRide | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('ride_requests')
    .select('id,booking_code,requested_vehicle_class,status,pickup_label,dropoff_label,platform_fee_centavos,is_test,assigned_driver_id,assigned_vehicle_id,created_at')
    .eq('id', rideId)
    .maybeSingle();
  if (error) throw error;
  return data as RealtimeRide | null;
}

export function subscribeToRide(
  rideId: string,
  onRide: (ride: RealtimeRide) => void,
  onEvent?: (event: Record<string, unknown>) => void,
): () => void {
  const supabase = getSupabaseBrowserClient();
  const channels: RealtimeChannel[] = [];

  const rideChannel = supabase
    .channel(`ride:${rideId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ride_requests', filter: `id=eq.${rideId}` },
      (payload) => onRide(payload.new as RealtimeRide),
    )
    .subscribe();
  channels.push(rideChannel);

  if (onEvent) {
    const eventChannel = supabase
      .channel(`ride-events:${rideId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_events', filter: `ride_request_id=eq.${rideId}` },
        (payload) => onEvent(payload.new as Record<string, unknown>),
      )
      .subscribe();
    channels.push(eventChannel);
  }

  return () => {
    channels.forEach((channel) => void supabase.removeChannel(channel));
  };
}

export function subscribeToMyOffers(onOffer: (offer: RideOffer) => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase
    .channel('driver:offers')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ride_offers' },
      (payload) => onOffer(payload.new as RideOffer),
    )
    .subscribe();

  return () => void supabase.removeChannel(channel);
}
