'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase';

export function LabAuthCard({ roleLabel, children }: { roleLabel: string; children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const configured = hasSupabaseConfig();

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [configured]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage('Signing in…');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed');
    }
  }

  async function signUp() {
    setMessage('Creating test login…');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_test_user: true,
            full_name: roleLabel,
            preferred_name: roleLabel,
          },
        },
      });
      if (error) throw error;
      setMessage('Test account created. If email confirmation is enabled, confirm it before signing in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-up failed');
    }
  }

  if (!configured) {
    return <div className="lab-auth-card"><b>{roleLabel}</b><p>Supabase is not configured on this deployment yet.</p></div>;
  }

  if (user) return <>{children(user)}</>;

  return (
    <form className="lab-auth-card" onSubmit={signIn}>
      <span>REALTIME LAB</span>
      <h1>{roleLabel}</h1>
      <p>Use a dedicated test account. Never use a production driver identity in this pre-alpha lab.</p>
      <input type="email" autoComplete="email" placeholder="Test email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      <button type="submit">Sign in</button>
      <button type="button" className="secondary-action" onClick={signUp}>Create test login</button>
      {message && <small>{message}</small>}
    </form>
  );
}
