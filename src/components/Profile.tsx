import React from 'react';
import { formatMoney } from '../lib/utils';
import type { UserStats, LeaderboardEntry } from '../types';

interface ProfileProps {
  user: UserStats;
  userUsername: string;
  displayLeaderboard: LeaderboardEntry[];
}

export const Profile: React.FC<ProfileProps> = ({ user, userUsername, displayLeaderboard }) => {
  const globalRank = displayLeaderboard.find(l => l.username === userUsername)?.rank || '-';

  return (
    <div className="profile-content animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.email ? user.email[0].toUpperCase() : '?'
          )}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800 }}>{userUsername}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card yellow">
          <div className="stat-icon">🏆</div>
          <div className="stat-title">Global Rank</div>
          <div className="stat-value">#{globalRank}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🎰</div>
          <div className="stat-title">Total Spins</div>
          <div className="stat-value">{user.spins}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">📉</div>
          <div className="stat-title">Losses</div>
          <div className="stat-value">{user.losses}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-title">Net Balance</div>
          <div className="stat-value">{formatMoney(user.balance)}</div>
        </div>
      </div>
    </div>
  );
};
