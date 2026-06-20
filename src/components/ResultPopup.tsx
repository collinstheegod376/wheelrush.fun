import React from 'react';
import { formatMoney } from '../lib/utils';
import type { PopupState } from '../types';

interface ResultPopupProps {
  popup: PopupState;
  setPopup: (p: PopupState) => void;
}

export const ResultPopup: React.FC<ResultPopupProps> = ({ popup, setPopup }) => {
  if (!popup.show) return null;

  const confettiPieces = popup.type === 'win'
    ? Array.from({ length: 20 }, (_, i) => ({
        key: `confetti-${i}`,
        left: `${(i * 17) % 100}%`,
        animationDuration: `${1 + (i % 4) * 0.4}s`,
        backgroundColor: ['#ffd166', '#2ed573', '#ff9f1c', '#ffffff'][i % 4]
      }))
    : [];

  return (
    <div className={`popup-overlay ${popup.type === 'win' ? 'popup-win' : 'popup-loss'} ${popup.amount >= 10000000000 ? 'shake-screen' : ''}`}>
      <div className="confetti-container">
        {confettiPieces.map(piece => (
          <div
            key={piece.key}
            className="confetti-piece"
            style={{
              left: piece.left,
              top: '-10%',
              animation: `slideUp ${piece.animationDuration} ease-in infinite`,
              backgroundColor: piece.backgroundColor
            }}
          />
        ))}
      </div>
      <div className="popup-content">
        {popup.type === 'win' ? (
          <>
            <div className="win-title">{popup.amount >= 10000000000 ? '👑 MEGA JACKPOT' : '🎉 WINNER!'}</div>
            <div className="win-amount">+{formatMoney(popup.amount)}</div>
            <button type="button" className="btn btn-claim" onClick={() => setPopup({ ...popup, show: false })}>CLAIM REWARD</button>
          </>
        ) : (
          <>
            <div className="loss-title">{popup.label === 'YOU LOST' ? '💀 BANKRUPT' : '📉 LOSS'}</div>
            <div className="loss-amount">{popup.label === 'YOU LOST' ? 'BALANCE CLEARED' : formatMoney(popup.amount)}</div>
            <button type="button" className="btn btn-try-again" onClick={() => setPopup({ ...popup, show: false })}>TRY AGAIN</button>
          </>
        )}
      </div>
    </div>
  );
};
