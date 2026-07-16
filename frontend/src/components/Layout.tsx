import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ChatBox from './ChatBox';
import StyleQuestionnaire from './today/StyleQuestionnaire';
import AvatarConfigModal from './today/AvatarConfigModal';
import { api } from '../lib/api';
import type { AvatarConfig } from '@drape/shared';

export default function Layout() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAvatarSetup, setShowAvatarSetup] = useState(false);
  const [checkedProfile, setCheckedProfile] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);

  useEffect(() => {
    api.get<{ avatarConfig: AvatarConfig | null; styleProfile: { preferences: Record<string, unknown> } | null }>('/users/me')
      .then((data) => {
        const prefs = data.styleProfile?.preferences;
        const hasProfile = prefs && Object.keys(prefs).length > 0;
        const hasSelfie = !!data.avatarConfig?.selfieUrl;

        if (!hasProfile) {
          // New user — show questionnaire first, then avatar setup
          setShowQuiz(true);
        } else if (!hasSelfie) {
          // Existing user who never set up avatar — prompt directly
          setShowAvatarSetup(true);
        }

        if (data.avatarConfig) {
          setAvatarConfig(data.avatarConfig);
        }
      })
      .catch(() => {})
      .finally(() => setCheckedProfile(true));
  }, []);

  const handleQuizComplete = () => {
    setShowQuiz(false);
    // If user hasn't uploaded a selfie yet, prompt avatar setup
    if (!avatarConfig?.selfieUrl) {
      setShowAvatarSetup(true);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>
      <ChatBox />

      {/* First-login style quiz */}
      {checkedProfile && (
        <StyleQuestionnaire
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          onComplete={handleQuizComplete}
        />
      )}

      {/* Avatar setup after quiz */}
      {checkedProfile && (
        <AvatarConfigModal
          isOpen={showAvatarSetup}
          onClose={() => setShowAvatarSetup(false)}
          currentConfig={avatarConfig}
          onSave={(config) => {
            setAvatarConfig(config);
            setShowAvatarSetup(false);
          }}
        />
      )}
    </div>
  );
}
