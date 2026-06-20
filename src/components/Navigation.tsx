import React from 'react';

interface NavigationProps {
  activeTab: 'home' | 'leaderboard' | 'profile' | 'settings';
  setActiveTab: (tab: 'home' | 'leaderboard' | 'profile' | 'settings') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="app-sidebar">
      <div className="sidebar-logo">
        <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: 900 }}>Wheel Rush</h1>
      </div>
      <div className="nav-menu">
        <button type="button" className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Home</span>
        </button>
        <button type="button" className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Leaders</span>
        </button>
        <button type="button" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <span className="nav-icon">👧🏽</span>
          <span className="nav-label">Profile</span>
        </button>
        <button type="button" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </div>
    </div>
  );
};
