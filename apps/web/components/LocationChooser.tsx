'use client';

import { useState } from 'react';
import type { LngLat } from '@/lib/geo';

type Place = LngLat & { label: string };

type Props = {
  title: string;
  onClose: () => void;
  onSelect: (place: Place) => void;
  onPickMap: () => void;
  onUseGps?: () => void;
};

export function LocationChooser({ title, onClose, onSelect, onPickMap, onUseGps }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setMessage('Type at least 2 characters.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('search unavailable');
      const data = await response.json();
      setResults(data);
      if (!data.length) setMessage('No result. Try a barangay/landmark or pick directly on the map.');
    } catch {
      setResults([]);
      setMessage('Search unavailable. Pick directly on the map instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chooser-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="chooser-sheet">
        <div className="handle" />
        <div className="chooser-head">
          <div><p className="eyebrow">Choose location</p><h2>{title}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="search-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Place, landmark, barangay…" inputMode="search" />
          <button onClick={search} disabled={busy}>{busy ? '…' : 'Search'}</button>
        </div>
        {onUseGps && <button className="secondary-action" onClick={onUseGps}>◎ Use my current GPS</button>}
        <button className="secondary-action" onClick={onPickMap}>⌖ Pick directly on map</button>
        <div className="search-results">
          {results.map((result) => (
            <button key={`${result.lat}-${result.lng}-${result.label}`} onClick={() => onSelect(result)}>
              <b>{result.label.split(',')[0]}</b><span>{result.label}</span>
            </button>
          ))}
        </div>
        {message && <p className="chooser-message">{message}</p>}
        <p className="chooser-footnote">Controlled lab search only. Production autocomplete will use the LUNAD provider layer and LUNAD Places.</p>
      </section>
    </div>
  );
}