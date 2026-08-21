import { createClient } from '@supabase/supabase-js';

/* Bir xil Supabase loyihasi — App.jsx dagi bilan bir xil manzil/kalit. */
const SUPABASE_URL = 'https://cuubcnnzjlmvcbgnctvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dWJjbm56amxtdmNiZ25jdHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkzMTAsImV4cCI6MjEwMjQ0NTMxMH0.x-b1KKEtjh928Ae2LXoyYPNK5Ov1rE5tv8nUJk-4Kn0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
