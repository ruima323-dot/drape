import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
            Drape
          </h1>
          <div className="drape-card space-y-4 py-8">
            <p className="text-charcoal font-medium">Password updated</p>
            <p className="text-sm text-charcoal-muted">
              Redirecting you to the app...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
            Drape
          </h1>
          <p className="mt-2 text-charcoal-muted">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="drape-card space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-charcoal mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-charcoal text-cream-100 rounded-card text-sm font-medium hover:bg-charcoal-light transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
