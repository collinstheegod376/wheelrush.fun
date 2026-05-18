import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './index.css';

// Types
type UserStats = {
  id: string;
  email: string;
  balance: number;
  spins: number;
  losses: number;
};

const OUTCOMES = [
  { label: '$10B', value: 10000000000, color: '#bbf7d0', textColor: '#166534', icon: '🏆', weight: 0.5 },
  { label: 'Loss', value: -1, color: '#1e293b', textColor: '#ef4444', icon: '💀', weight: 20 },
  { label: '$500k', value: 500000, color: '#f8fafc', textColor: '#0f172a', icon: '', weight: 20 },
  { label: '$1M', value: 1000000, color: '#fef08a', textColor: '#0f172a', icon: '', weight: 20 },
  { label: '$10M', value: 10000000, color: '#f8fafc', textColor: '#0f172a', icon: '', weight: 15 },
  { label: '$100M', value: 100000000, color: '#fef08a', textColor: '#0f172a', icon: '', weight: 10 },
  { label: '$1B', value: 1000000000, color: '#f8fafc', textColor: '#0f172a', icon: '', weight: 4.5 },
  { label: '-$1B', value: -1000000000, color: '#fee2e2', textColor: '#ef4444', icon: '📉', weight: 10 },
];

export default function App() {
  const [user, setUser] = useState<UserStats | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'profile'>('home');
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Settings
  const [bgMusic, setBgMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [track, setTrack] = useState('unbeknownst');
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mock Leaderboard (Falls back if Supabase is not setup)
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { rank: 1, email: 'alex@example.com', balance: 45230.50 },
    { rank: 2, email: 'crypto@example.com', balance: 32105.25 },
    { rank: 3, email: 'lucky@example.com', balance: 28750.00 },
  ]);

  useEffect(() => {
    // Check initial auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserData(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserData(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [user?.balance]);

  const fetchUserData = async (id: string, email: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) {
        setUser({ id, email, balance: data.balance, spins: data.spins, losses: data.losses });
      } else if (error && error.code === 'PGRST116') {
        // Create profile if doesn't exist
        const newProfile = { id, email, balance: 0, spins: 0, losses: 0 };
        await supabase.from('profiles').insert([newProfile]);
        setUser(newProfile);
      } else {
        // Fallback mock
        setUser({ id, email, balance: 0, spins: 0, losses: 0 });
      }
    } catch {
      setUser({ id, email, balance: 0, spins: 0, losses: 0 });
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, balance')
        .order('balance', { ascending: false })
        .limit(10);
      
      if (data && !error) {
        setLeaderboard(data.map((d, i) => ({ rank: i + 1, email: d.email, balance: d.balance })));
      }
    } catch {
      // Keep mock data if error
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // In dev without actual email confirmation, it might just log them in if email confirm is disabled
        // Let's just switch to login to be safe, or if it auto logged in, the onAuthStateChange will catch it.
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (!data.session) setAuthMode('login'); // They need to verify, or we mock it.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      if (err.message.includes('URL')) {
        // Mock login if supabase URL is placeholder
        setUser({ id: 'mock-id', email, balance: 0, spins: 0, losses: 0 });
      } else {
        setAuthError(err.message);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowSettings(false);
  };

  // Sound Effects Generator using Web Audio API
  const playSound = (type: 'tick' | 'win' | 'loss') => {
    if (!sfx) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'tick') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'loss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const spinWheel = async () => {
    if (isSpinning || !user) return;
    setIsSpinning(true);

    // Play ticking sound while spinning
    let ticks = 0;
    const tickInterval = setInterval(() => {
      playSound('tick');
      ticks++;
      if (ticks > 15) clearInterval(tickInterval);
    }, 200);

    // Select random outcome using weighted probability
    const totalWeight = OUTCOMES.reduce((sum, item) => sum + item.weight, 0);
    let randomNum = Math.random() * totalWeight;
    let randomIndex = 0;
    
    for (let i = 0; i < OUTCOMES.length; i++) {
      if (randomNum < OUTCOMES[i].weight) {
        randomIndex = i;
        break;
      }
      randomNum -= OUTCOMES[i].weight;
    }
    const selectedOutcome = OUTCOMES[randomIndex];

    // Math for wheel rotation:
    // Wheel has 8 segments, 45 degrees each.
    // Segment 0 is drawn from 0 to 45 deg, centered at 22.5.
    // SVG is rotated -112.5 deg globally so Segment 0 is at 12 o'clock.
    // To land on 'randomIndex', we want to rotate backwards by (randomIndex * 45) degrees relative to start.
    const segmentDegree = 360 / OUTCOMES.length;
    const extraSpins = 5 * 360; // 5 full spins minimum
    const offset = Math.random() * 30 - 15; // Random land inside the 45deg slice
    const targetDegree = currentRotation + extraSpins + (360 - (randomIndex * segmentDegree)) + offset;

    const wheel = wheelRef.current;
    if (wheel) {
      wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)';
      wheel.style.transform = `rotate(${targetDegree}deg)`;
    }

    setTimeout(async () => {
      clearInterval(tickInterval);
      setCurrentRotation(targetDegree % 360);

      // Reset transition to snap to normalized degree
      if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${targetDegree % 360}deg)`;
      }

      // Calculate new stats
      let newBalance = user.balance;
      let newLosses = user.losses;

      if (selectedOutcome.value === -1) {
        // Special case: "Loss" sets positive balance to 0, but leaves debt as is (no free bailouts)
        if (newBalance > 0) newBalance = 0;
        newLosses += 1;
        playSound('loss');
      } else if (selectedOutcome.value < 0) {
        // Negative value (like -$1B) subtracts from balance
        newBalance += selectedOutcome.value;
        newLosses += 1;
        playSound('loss');
      } else {
        // Positive win
        newBalance += selectedOutcome.value;
        playSound('win');
      }

      const updatedUser = {
        ...user,
        balance: newBalance,
        spins: user.spins + 1,
        losses: newLosses
      };
      setUser(updatedUser);

      // Update Supabase
      if (user.id !== 'mock-id') {
        try {
          await supabase.from('profiles').update({
            balance: newBalance,
            spins: updatedUser.spins,
            losses: newLosses
          }).eq('id', user.id);
        } catch (e) {
          console.error('Update failed', e);
        }
      }

      setIsSpinning(false);
    }, 4000);
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Auth Screen
  if (!user) {
    return (
      <div className="auth-wrapper animate-fade-in">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 className="text-gradient" style={{ fontSize: '36px', fontWeight: 900 }}>Wheel Rush</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>Sign in to start spinning</p>
          </div>
          {authError && (
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {authError}
            </div>
          )}
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="form-input" placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="form-input" placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-light)', fontSize: '14px' }}>
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              {authMode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inject user into leaderboard for current display
  const displayLeaderboard = [...leaderboard];
  if (!displayLeaderboard.find(l => l.email === user.email)) {
    displayLeaderboard.push({ rank: 999, email: user.email, balance: user.balance });
  }
  displayLeaderboard.sort((a, b) => b.balance - a.balance).forEach((item, index) => {
    item.rank = index + 1;
  });

  return (
    <>
      <div className="app-sidebar">
        <div style={{ padding: '0 16px', display: window.innerWidth > 768 ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: 900 }}>Wheel Rush</h1>
        </div>
        <div className="nav-menu">
          <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <span className="nav-icon">🎯</span>
            <span className="nav-label">Home</span>
          </button>
          <button className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <span className="nav-icon">🏆</span>
            <span className="nav-label">Leaders</span>
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-icon">👧🏽</span>
            <span className="nav-label">Profile</span>
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="top-bar">
          <div className="balance-badge">
            <span className="balance-label">Balance</span>
            <span className="balance-amount">{formatMoney(user.balance)}</span>
          </div>
          <button className="btn" style={{ background: 'transparent', fontSize: '24px', padding: '8px' }} onClick={() => setShowSettings(true)}>
            ⚙️
          </button>
        </div>

        {activeTab === 'home' && (
          <div className="wheel-section animate-fade-in">
            <div className="wheel-container">
              <div className="wheel-pointer"></div>
              <div className="wheel" ref={wheelRef}>
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
                        <path d={d} fill={outcome.color} stroke="#f7a528" strokeWidth="0.5" />
                        <text 
                          x={textX} 
                          y={textY} 
                          fill={outcome.textColor} 
                          fontSize="4.5" 
                          fontWeight="900" 
                          fontFamily="Outfit"
                          textAnchor="middle" 
                          alignmentBaseline="middle"
                          transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
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

            <button className="btn btn-primary spin-btn-large" onClick={spinWheel} disabled={isSpinning}>
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </button>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-fade-in" style={{ padding: '24px 0' }}>
            <h1 className="text-gradient" style={{ textAlign: 'center', fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Leaderboard</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: '24px' }}>Top players globally</p>
            
            <div className="lb-list">
              {displayLeaderboard.map(item => (
                <div key={item.email} className={`lb-item ${item.email === user.email ? 'current-user' : ''}`}>
                  <div className="lb-rank">#{item.rank}</div>
                  <div className="lb-avatar">{item.email ? item.email[0].toUpperCase() : '?'}</div>
                  <div className="lb-info">
                    <div className="lb-name">{item.email ? item.email.split('@')[0] : 'Unknown'}</div>
                  </div>
                  <div className="lb-balance">{formatMoney(item.balance)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-content animate-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                {user.email ? user.email[0].toUpperCase() : '?'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>{user.email ? user.email.split('@')[0] : 'Unknown'}</div>
            </div>

            <div className="stats-grid">
              <div className="stat-card yellow">
                <div className="stat-icon">🏆</div>
                <div className="stat-title">Global Rank</div>
                <div className="stat-value">#{displayLeaderboard.find(l => l.email === user.email)?.rank || '-'}</div>
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
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>⚙️ Settings</div>
              <button className="btn" style={{ padding: '8px 16px', background: '#f1f5f9', color: 'var(--text-light)' }} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px' }}>Audio</h3>
              <div className="setting-row">
                <div>
                  <div style={{ fontWeight: 700 }}>🎶 Background Music</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Play ambient music</div>
                </div>
                <label className="switch"><input type="checkbox" checked={bgMusic} onChange={e => setBgMusic(e.target.checked)} /><span className="slider"></span></label>
              </div>
              <div className="setting-row">
                <div>
                  <div style={{ fontWeight: 700 }}>🔔 Sound Effects</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Enable wheel ticks & dings</div>
                </div>
                <label className="switch"><input type="checkbox" checked={sfx} onChange={e => setSfx(e.target.checked)} /><span className="slider"></span></label>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px' }}>Select Track</h3>
              {['unbeknownst', 'titanium', 'damn'].map(t => (
                <div key={t} className={`track-item ${track === t ? 'active' : ''}`} onClick={() => setTrack(t)}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{t}</span>
                  {track === t && <span style={{ color: 'var(--primary-color)', fontWeight: 900 }}>✓</span>}
                </div>
              ))}
            </div>

            <button className="btn" style={{ width: '100%', background: '#fee2e2', color: '#ef4444' }} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      )}
    </>
  );
}
