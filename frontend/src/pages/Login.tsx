import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const err = await signup(email, password, name);
        if (err) {
          setError(err);
        } else {
          setSignUpSuccess(true);
        }
      } else {
        const err = await login(email, password);
        if (err) {
          setError(err);
        } else {
          navigate('/');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
            Drape
          </h1>
          <div className="drape-card space-y-4 py-8">
            <p className="text-charcoal font-medium">Check your email</p>
            <p className="text-sm text-charcoal-muted">
              We sent a password reset link to <strong>{email}</strong>. Follow the link to set a new password.
            </p>
          </div>
          <button
            onClick={() => { setResetSent(false); setIsForgotPassword(false); }}
            className="text-sm text-gold hover:text-gold-muted"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-display font-bold text-charcoal tracking-tight">
            Drape
          </h1>
          <div className="drape-card space-y-4 py-8">
            <p className="text-charcoal font-medium">Check your email</p>
            <p className="text-sm text-charcoal-muted">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
            </p>
          </div>
          <button
            onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}
            className="text-sm text-gold hover:text-gold-muted"
          >
            Back to sign in
          </button>
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
          <p className="mt-2 text-charcoal-muted">
            {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="drape-card space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-cream-300 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                placeholder="you@example.com"
                required
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
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(null); }}
              className="w-full text-sm text-charcoal-muted hover:text-charcoal"
            >
              Back to sign in
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="drape-card space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-cream-300 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                placeholder="Your name"
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
              Password
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

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-charcoal text-cream-100 rounded-card text-sm font-medium hover:bg-charcoal-light transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          {!isSignUp && (
            <button
              type="button"
              onClick={() => { setIsForgotPassword(true); setError(null); }}
              className="w-full text-sm text-charcoal-muted hover:text-charcoal"
            >
              Forgot password?
            </button>
          )}
        </form>
        )}

        <p className="text-center text-sm text-charcoal-muted">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setIsForgotPassword(false); }}
            className="text-gold hover:text-gold-muted font-medium"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
