import React from 'react';
import { formatCompact } from '../lib/utils';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  displayLeaderboard: LeaderboardEntry[];
  userUsername: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ displayLeaderboard, userUsername }) => {
  return (
    <div className="lb-container animate-fade-in">
      <h1 className="text-gradient lb-header">Leaderboard</h1>
      <p className="lb-subtitle">Top players globally</p>

      <div className="lb-list">
        {displayLeaderboard.map(item => (
          <div key={item.username} className={`lb-item ${item.username === userUsername ? 'current-user' : ''}`}>
            <div className="lb-rank">#{item.rank}</div>
            <div className="lb-avatar">
              {item.avatar_url ? (
                <img src={item.avatar_url} alt="" className="lb-avatar-img" />
              ) : (
                <span>{item.username ? item.username[0].toUpperCase() : '?'}</span>
              )}
            </div>
            <div className="lb-info">
              <div className="lb-name">{item.username || 'Unknown'}</div>
            </div>
            <div className="lb-balance">{formatCompact(item.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
