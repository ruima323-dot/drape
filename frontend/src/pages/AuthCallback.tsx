import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Handles Supabase auth callbacks (email confirmation, magic links, etc).
 * Supabase redirects here with tokens in the URL that the client library
 * automatically picks up via `onAuthStateChange`.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase JS v2 automatically detects auth tokens in the URL hash/params
    // when using PKCE flow. We just need to wait for the session to resolve.
    const handleCallback = async () => {
      const { error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      // Check if the URL has an error param (e.g., expired link)
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlError = params.get('error_description') || hashParams.get('error_description');

      if (urlError) {
        setError(urlError);
        return;
      }

      // Success — redirect to login (user can now sign in)
      navigate('/login', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
            Drape
          </h1>
          <div className="drape-card space-y-4 py-8">
            <p className="text-charcoal font-medium">Something went wrong</p>
            <p className="text-sm text-charcoal-muted">{error}</p>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm text-gold hover:text-gold-muted font-medium"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
          Drape
        </h1>
        <div className="drape-card space-y-4 py-8">
          <p className="text-charcoal font-medium">Confirming your account...</p>
          <div className="flex justify-center">
            <div className="h-5 w-5 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
}
