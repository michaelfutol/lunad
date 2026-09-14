'use client';

import { useEffect, useState } from 'react';
import { LabAuthCard } from '@/components/LabAuthCard';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { RealtimeRide } from '@/lib/realtimeRide';

export default function DispatcherLabPage() {
  return <main className="realtime-lab-page"><LabAuthCard roleLabel="Dispatcher Observer">{() => <DispatcherLab />}</LabAuthCard></main>;
}

function DispatcherLab() {
  const [rides, setRides] = useState<RealtimeRide[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState('Connecting to realtime…');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function load() {
      const { data, error } = await supabase
        .from('ride_requests')
        .select('id,booking_code,requested_vehicle_class,status,pickup_label,dropoff_label,platform_fee_centavos,is_test,assigned_driver_id,assigned_vehicle_id,created_at')
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) setMessage(error.message);
      else {
        setRides((data ?? []) as RealtimeRide[]);
        setMessage('Live');
      }
    }

    void load();

    const rideChannel = supabase
      .channel('dispatcher:rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, (payload) => {
        const next = payload.new as RealtimeRide;
        setRides((current) => [next, ...current.filter((ride) => ride.id !== next.id)].slice(0, 25));
      })
      .subscribe();

    const eventChannel = supabase
      .channel('dispatcher:events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_events' }, (payload) => {
        setEvents((current) => [payload.new as Record<string, unknown>, ...current].slice(0, 20));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(rideChannel);
      void supabase.removeChannel(eventChannel);
    };
  }, []);

  return (
    <section className="realtime-panel dispatcher-panel">
      <div className="realtime-head"><div><span>REALTIME LAB</span><h1>Dispatcher Observer</h1></div><b className="lab-pill">{message}</b></div>
      <p className="realtime-message">This screen should update without refresh while Passenger and Driver devices act on the same ride.</p>
      <div className="dispatcher-grid">
        <div>
          <h2>Active / recent rides</h2>
          <div className="ride-list">
            {rides.map((ride) => (
              <article key={ride.id} className="mini-ride-card">
                <div><small>{ride.booking_code}</small><b>{ride.status.replaceAll('_', ' ')}</b></div>
                <span>{ride.requested_vehicle_class}</span>
                <p>{ride.pickup_label ?? 'Pickup'} → {ride.dropoff_label ?? 'Destination'}</p>
                <em>{ride.is_test ? 'TEST · ₱0' : `FEE ₱${(ride.platform_fee_centavos / 100).toFixed(2)}`}</em>
              </article>
            ))}
            {!rides.length && <div className="empty-state">No visible rides yet.</div>}
          </div>
        </div>
        <div>
          <h2>Immutable ride events</h2>
          <div className="event-list">
            {events.map((event, index) => (
              <article key={`${String(event.id ?? index)}`}><b>{String(event.event_type ?? 'EVENT')}</b><small>{String(event.occurred_at ?? '')}</small></article>
            ))}
            {!events.length && <div className="empty-state">New events will stream here.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
