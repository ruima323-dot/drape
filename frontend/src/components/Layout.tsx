import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ChatBox from './ChatBox';
import StyleQuestionnaire from './today/StyleQuestionnaire';
import { api } from '../lib/api';

export default function Layout() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [checkedProfile, setCheckedProfile] = useState(false);

  useEffect(() => {
    api.get<{ styleProfile: { preferences: Record<string, unknown> } | null }>('/users/me')
      .then((data) => {
        const prefs = data.styleProfile?.preferences;
        if (!prefs || Object.keys(prefs).length === 0) {
          setShowQuiz(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckedProfile(true));
  }, []);

  return (
    <div className="min-h-screen bg-cream-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <ChatBox />

      {/* First-login style quiz */}
      {checkedProfile && (
        <StyleQuestionnaire
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          onComplete={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
}
