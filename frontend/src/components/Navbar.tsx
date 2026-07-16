import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { resolveImageUrl } from '../lib/imageUrl';
import type { AvatarConfig } from '@drape/shared';

const navItems = [
  { to: '/', label: "Today's Look", shortLabel: 'Today', icon: '✨' },
  { to: '/wardrobe', label: 'My Wardrobe', shortLabel: 'Wardrobe', icon: '👕' },
  { to: '/journey', label: 'Outfit Journey', shortLabel: 'Journey', icon: '📸' },
  { to: '/styling', label: 'Styling', shortLabel: 'Styling', icon: '🎨' },
] as const;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ avatarConfig: AvatarConfig | null }>('/users/me')
      .then((data) => {
        if (data.avatarConfig?.selfieUrl) {
          setSelfieUrl(resolveImageUrl(data.avatarConfig.selfieUrl));
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <>
      {/* Desktop top navbar */}
      <nav className="hidden sm:block bg-white border-b border-cream-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-charcoal tracking-tight">
                Drape
              </span>
            </NavLink>

            {/* Navigation links */}
            <div className="flex items-center gap-1">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-card text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cream-200 text-charcoal'
                        : 'text-charcoal-muted hover:text-charcoal hover:bg-cream-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>

            {/* User menu */}
            {user && (
              <div className="flex items-center gap-3">
                <NavLink to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {selfieUrl ? (
                    <img
                      src={selfieUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-cream-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-xs font-medium text-charcoal-muted">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-charcoal-muted">
                    {user.name}
                  </span>
                </NavLink>
                <button
                  onClick={logout}
                  className="text-sm text-charcoal-muted hover:text-charcoal transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top bar — logo + profile */}
      <nav className="sm:hidden bg-white border-b border-cream-300 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <NavLink to="/" className="flex items-center">
            <span className="text-xl font-display font-bold text-charcoal tracking-tight">
              Drape
            </span>
          </NavLink>

          {user && (
            <div className="flex items-center gap-2">
              <NavLink to="/profile" className="flex items-center hover:opacity-80 transition-opacity">
                {selfieUrl ? (
                  <img
                    src={selfieUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-cream-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-xs font-medium text-charcoal-muted">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </NavLink>
              <button
                onClick={logout}
                className="text-xs text-charcoal-muted hover:text-charcoal transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-cream-400 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-center px-4 py-2 rounded-pill transition-colors ${
                  isActive
                    ? 'bg-cream-200 text-charcoal font-semibold'
                    : 'text-charcoal-muted'
                }`
              }
            >
              <span className="text-xs font-medium">{shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
