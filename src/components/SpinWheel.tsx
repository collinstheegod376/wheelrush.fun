import React, { useRef } from 'react';
import { OUTCOMES } from '../lib/constants';
import type { UserStats, PopupState } from '../types';
import { supabase } from '../supabase';

interface SpinWheelProps {
  user: UserStats;
  setUser: (user: UserStats) => void;
  isSpinning: boolean;
  setIsSpinning: (state: boolean) => void;
  isCooldown: boolean;
  setIsCooldown: (state: boolean) => void;
  currentRotation: number;
  setCurrentRotation: (rot: number) => void;
  playSound: (type: 'tick' | 'win' | 'loss' | 'mega') => void;
  setPopup: (popup: PopupState) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  user,
  setUser,
  isSpinning,
  setIsSpinning,
  isCooldown,
  setIsCooldown,
  currentRotation,
  setCurrentRotation,
  playSound,
  setPopup
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, []);

  const spinWheel = async () => {
    if (isSpinning || isCooldown || !user) return;
    setIsSpinning(true);

    let ticks = 0;
    tickIntervalRef.current = setInterval(() => {
      playSound('tick');
      ticks++;
      if (ticks > 15 && tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    }, 200);

    try {
      const { data: serverResult, error } = await supabase.rpc('spin_wheel');
      
      if (error) throw error;
      
      // Basic schema validation
      if (!serverResult || typeof serverResult.outcome_index !== 'number' || typeof serverResult.new_balance !== 'number') {
        throw new Error('Invalid response from server');
      }

      const randomIndex = serverResult.outcome_index;
      const segmentDegree = 360 / OUTCOMES.length;
      const extraSpins = 5 * 360;
      const offset = Math.random() * 30 - 15;

      const targetModulo = 360 - (randomIndex * segmentDegree);
      const currentRemainder = currentRotation % 360;

      let degreesToSpin = targetModulo - currentRemainder;
      if (degreesToSpin <= 0) degreesToSpin += 360;

      const targetDegree = currentRotation + degreesToSpin + extraSpins + offset;

      const wheel = wheelRef.current;
      if (wheel) {
        wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)';
        wheel.style.transform = `rotate(${targetDegree}deg)`;
      }

      spinTimeoutRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        setCurrentRotation(targetDegree % 360);

        if (wheel) {
          wheel.style.transition = 'none';
          wheel.style.transform = `rotate(${targetDegree % 360}deg)`;
        }

        if (serverResult.is_loss) {
          playSound('loss');
          setPopup({
            show: true,
            type: 'loss',
            amount: serverResult.value === -1 ? 0 : serverResult.value,
            label: serverResult.value === -1 ? 'YOU LOST' : serverResult.label
          });
        } else {
          if (serverResult.value >= 1000000000) playSound('mega');
          else playSound('win');
          setPopup({
            show: true,
            type: 'win',
            amount: serverResult.value,
            label: serverResult.label
          });
        }

        // Haptic Feedback for wins
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(serverResult.is_loss ? 50 : 200);
        }

        setUser({
          ...user,
          balance: serverResult.new_balance,
          spins: serverResult.new_spins,
          losses: serverResult.new_losses
        });

        setIsSpinning(false);
        
        // Start 1.5s cooldown
        setIsCooldown(true);
        cooldownTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) setIsCooldown(false);
        }, 1500);
      }, 4000);
    } catch (err) {
      console.error('Spin failed:', err);
      if (isMounted.current) {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        setIsSpinning(false);
        setPopup({ show: true, type: 'loss', amount: 0, label: 'ERROR' });
      }
    }
  };

  return (
    <div className="wheel-section animate-fade-in">
      <div className="wheel-container">
        <div className="wheel-pointer"></div>
        <div className="wheel" ref={wheelRef} style={{ transform: `rotate(${currentRotation}deg)` }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-112.5deg)', overflow: 'visible' }}>
            {OUTCOMES.map((outcome, i) => {
              const angle = 360 / OUTCOMES.length;
              const startAngle = i * angle;
              const endAngle = startAngle + angle;

              const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
              const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
              const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
              const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180);

              const d = `M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`;

              const midAngle = startAngle + (angle / 2);
              const textX = 50 + 35 * Math.cos(Math.PI * midAngle / 180);
              const textY = 50 + 35 * Math.sin(Math.PI * midAngle / 180);

              return (
                <g key={i}>
                  <path d={d} fill={outcome.color} stroke="#2563eb" strokeWidth="0.5" />
                  <text
                    x={textX}
                    y={textY}
                    fill={outcome.textColor}
                    fontSize="4.5"
                    fontWeight="900"
                    fontFamily="Outfit"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${((midAngle + 90) % 360) > 180 ? midAngle - 90 : midAngle + 90}, ${textX}, ${textY})`}
                  >
                    {outcome.icon && <tspan x={textX} dy="-3">{outcome.icon}</tspan>}
                    <tspan x={textX} dy={outcome.icon ? "5" : "0"}>{outcome.label}</tspan>
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="wheel-center">SPIN</div>
        </div>
      </div>

      <button className="btn btn-primary spin-btn-large" onClick={spinWheel} disabled={isSpinning || isCooldown}>
        {isSpinning ? 'SPINNING...' : isCooldown ? 'COOLDOWN...' : 'SPIN'}
      </button>
    </div>
  );
};
