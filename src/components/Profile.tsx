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
      <div className="profile-header">
        <div className="profile-avatar-large">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.email ? user.email[0].toUpperCase() : '?'
          )}
        </div>
        <div className="profile-username">{userUsername}</div>
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
