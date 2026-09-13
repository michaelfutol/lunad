'use client';

import { useEffect, useMemo, useState } from 'react';
import { LabAuthCard } from '@/components/LabAuthCard';
import {
  acceptRealtimeOffer,
  getMyOpenOffers,
  getRide,
  subscribeToMyOffers,
  subscribeToRide,
  transitionRealtimeRide,
  type RealtimeRide,
  type RideOffer,
} from '@/lib/realtimeRide';

const NEXT_ACTION: Partial<Record<RealtimeRide['status'], { label: string; target: 'DRIVER_EN_ROUTE' | 'DRIVER_ARRIVED' | 'IN_TRIP' | 'COMPLETED' }>> = {
  ASSIGNED: { label: 'START TO PICKUP', target: 'DRIVER_EN_ROUTE' },
  DRIVER_EN_ROUTE: { label: 'MARK ARRIVED', target: 'DRIVER_ARRIVED' },
  DRIVER_ARRIVED: { label: 'PASSENGER ONBOARD', target: 'IN_TRIP' },
  IN_TRIP: { label: 'COMPLETE TRIP', target: 'COMPLETED' },
};

export default function DriverLabPage() {
  return <main className="realtime-lab-page"><LabAuthCard roleLabel="Driver Phone B">{() => <DriverLab />}</LabAuthCard></main>;
}

function DriverLab() {
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [ride, setRide] = useState<RealtimeRide | null>(null);
  const [message, setMessage] = useState('Waiting for an offer…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getMyOpenOffers().then(setOffers).catch((error) => setMessage(error.message ?? 'Could not load offers'));
    return subscribeToMyOffers((offer) => {
      setOffers((current) => [offer, ...current.filter((item) => item.id !== offer.id)]);
      setMessage('New ride offer received');
    });
  }, []);

  useEffect(() => {
    if (!ride) return;
    return subscribeToRide(ride.id, (next) => setRide(next));
  }, [ride?.id]);

  const nextAction = ride ? NEXT_ACTION[ride.status] : undefined;
  const activeOffer = useMemo(() => offers.find((offer) => offer.status === 'OFFERED'), [offers]);

  async function accept() {
    if (!activeOffer || busy) return;
    setBusy(true);
    setMessage('Claiming ride atomically…');
    try {
      const accepted = await acceptRealtimeOffer(activeOffer.id);
      setRide(accepted);
      setOffers((current) => current.filter((item) => item.id !== activeOffer.id));
      setMessage('Ride assigned to this driver');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Offer could not be accepted');
      void getMyOpenOffers().then(setOffers).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    if (!ride || !nextAction || busy) return;
    setBusy(true);
    try {
      setRide(await transitionRealtimeRide(ride.id, nextAction.target));
      setMessage(nextAction.target === 'COMPLETED' ? 'Trip completed' : 'Ride state updated');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transition failed');
      const fresh = await getRide(ride.id).catch(() => null);
      if (fresh) setRide(fresh);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="realtime-panel">
      <div className="realtime-head"><div><span>REALTIME LAB</span><h1>Driver Phone B</h1></div><b className="lab-pill">TEST ONLY</b></div>
      <p className="realtime-message">{message}</p>

      {!ride && activeOffer && (
        <article className="offer-card">
          <small>INCOMING OFFER</small>
          <h2>{activeOffer.ride_request_id.slice(0, 8).toUpperCase()}</h2>
          <p>Expires {new Date(activeOffer.expires_at).toLocaleTimeString()}</p>
          <div className="driver-actions"><button className="secondary-action" onClick={() => setOffers((x) => x.filter((o) => o.id !== activeOffer.id))}>PASS UI</button><button onClick={accept} disabled={busy}>ACCEPT</button></div>
        </article>
      )}

      {!ride && !activeOffer && <div className="empty-state">Keep this screen open. A dispatcher/lab offer should appear here without refresh.</div>}

      {ride && (
        <article className="ride-state-card">
          <small>{ride.booking_code}</small>
          <h2>{ride.status.replaceAll('_', ' ')}</h2>
          <div className="ride-route-copy"><b>{ride.pickup_label ?? 'Pickup'}</b><span>→</span><b>{ride.dropoff_label ?? 'Destination'}</b></div>
          <p>{ride.requested_vehicle_class} · {ride.is_test ? 'TEST RIDE · ₱0 PLATFORM FEE' : `PLATFORM FEE ₱${(ride.platform_fee_centavos / 100).toFixed(2)}`}</p>
          {nextAction && <button className="full-action" onClick={advance} disabled={busy}>{nextAction.label}</button>}
          {ride.status === 'COMPLETED' && <div className="success-state">Completed. Test rides must not create a platform-fee ledger entry.</div>}
        </article>
      )}
    </section>
  );
}
