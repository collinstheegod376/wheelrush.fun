import React from 'react';
import { formatCompact } from '../lib/utils';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  displayLeaderboard: LeaderboardEntry[];
  userUsername: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ displayLeaderboard, userUsername }) => {
  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      <h1 className="text-gradient" style={{ textAlign: 'center', fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Leaderboard</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: '24px' }}>Top players globally</p>

      <div className="lb-list">
        {displayLeaderboard.map(item => (
          <div key={item.username} className={`lb-item ${item.username === userUsername ? 'current-user' : ''}`}>
            <div className="lb-rank">#{item.rank}</div>
            <div className="lb-avatar">
              {item.avatar_url ? (
                <img src={item.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>{item.username ? item.username[0].toUpperCase() : '?'}</span>
              )}
            </div>
            <div className="lb-info">
              <div className="lb-name">{item.username || 'Unknown'}</div>
            </div>
            <div className="lb-balance" style={{ marginLeft: 'auto', paddingLeft: '12px' }}>{formatCompact(item.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
