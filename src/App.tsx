import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { formatMoney } from './lib/utils';
import type { UserStats, LeaderboardEntry, PopupState } from './types';
import { AuthScreen } from './components/AuthScreen';
import { Navigation } from './components/Navigation';
import { SpinWheel } from './components/SpinWheel';
import { Leaderboard } from './components/Leaderboard';
import { Profile } from './components/Profile';
import { SettingsModal } from './components/SettingsModal';
import { ResultPopup } from './components/ResultPopup';
import './index.css';

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserStats | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // App UI state
  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'profile' | 'settings'>('home');
  const [popup, setPopup] = useState<PopupState>({ show: false, type: 'win', amount: 0, label: '' });

  // Game/Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);

  // Audio state
  const [bgMusic, setBgMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Derived state
  const userUsername = useMemo(() => user?.username || 'Unknown', [user?.username]);

  const displayLeaderboard = useMemo(() => {
    const list = [...leaderboard];
    if (user && user.balance >= 0 && !list.find(l => l.username === userUsername)) {
      list.push({ rank: 999, username: userUsername, avatar_url: user.avatar_url, balance: user.balance });
    }
    return list.sort((a, b) => b.balance - a.balance).map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [leaderboard, user, userUsername]);

  async function fetchLeaderboard() {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', { row_limit: 10 });
      if (data && !error) setLeaderboard(data);
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  }

  const fetchUserData = useCallback(async (id: string, email: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) {
        setUser({
          id,
          email,
          username: data.username || email.split('@')[0],
          avatar_url: data.avatar_url,
          balance: data.balance,
          spins: data.spins,
          losses: data.losses
        });
        fetchLeaderboard();
      }
    } catch (e) {
      console.error('Fetch user failed', e);
    }
  }, []);

  // Auth initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserData(session.user.id, session.user.email || '').finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }).catch(() => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserData(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'signup' && !agreedToTerms) {
      setAuthError('You must agree to the Terms and Privacy Policy.');
      return;
    }

    setIsProcessingAuth(true);

    try {
      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { agreed_to_terms: true }
          }
        });
        if (signUpError) throw signUpError;
        
        // If "Confirm Email" is disabled in Supabase, signUp returns a session immediately.
        // If not, we try to sign in manually.
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage === 'Invalid login credentials') {
        setAuthError('Incorrect password or account does not exist');
      } else {
        setAuthError(errorMessage);
      }
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Sound logic
  useEffect(() => {
    if (!bgAudioRef.current) {
      // No bundled background track is currently shipped, so keep this silent until one is added.
      bgAudioRef.current = new Audio();
      bgAudioRef.current.loop = true;
      bgAudioRef.current.volume = 0.15;
    }
    
    if (bgMusic) {
      bgAudioRef.current.play().catch(() => {});
    } else {
      bgAudioRef.current.pause();
    }
  }, [bgMusic]);

  const playSound = useCallback((type: 'tick' | 'win' | 'loss' | 'mega') => {
    if (!sfx) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;
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
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
      } else if (type === 'loss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      } else if (type === 'mega') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(800, now + 0.2);
        osc.frequency.setValueAtTime(1200, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);
        osc.start(now); osc.stop(now + 1.0);
      }
    } catch (e) {
      console.error('Sound playback failed', e);
    }
  }, [sfx]);

  // Loading Splash
  if (isLoading) {
    return (
      <div className="auth-wrapper app-loading">
        <div className="app-loading-inner">
          <h1 className="text-gradient auth-title">Wheel Rush</h1>
          <div className="app-loading-dots">
            {[0, 1, 2].map(i => (
              <div key={i} className="app-loading-dot" style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <AuthScreen 
        authMode={authMode} setAuthMode={setAuthMode}
        email={email} setEmail={setEmail} 
        password={password} setPassword={setPassword} 
        agreedToTerms={agreedToTerms} setAgreedToTerms={setAgreedToTerms}
        authError={authError} handleAuth={handleAuth} 
        isProcessingAuth={isProcessingAuth}
      />
    );
  }

  return (
    <>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="app-main">
        <div className="top-bar">
          <div className="balance-badge">
            <span className="balance-label">Balance</span>
            <span className="balance-amount">{formatMoney(user.balance)}</span>
          </div>
        </div>

        {activeTab === 'home' && (
          <SpinWheel 
            key="home"
            user={user} setUser={setUser}
            isSpinning={isSpinning} setIsSpinning={setIsSpinning}
            isCooldown={isCooldown} setIsCooldown={setIsCooldown}
            currentRotation={currentRotation} setCurrentRotation={setCurrentRotation}
            playSound={playSound} setPopup={setPopup}
          />
        )}

        {activeTab === 'leaderboard' && <Leaderboard key="leaderboard" displayLeaderboard={displayLeaderboard} userUsername={userUsername} />}
        {activeTab === 'profile' && <Profile key="profile" user={user} userUsername={userUsername} displayLeaderboard={displayLeaderboard} />}
        
        {activeTab === 'settings' && (
          <SettingsModal 
            user={user}
            setUser={setUser}
            bgMusic={bgMusic} 
            setBgMusic={setBgMusic} 
            sfx={sfx} 
            setSfx={setSfx} 
            handleLogout={handleLogout} 
          />
        )}
      </div>

      <ResultPopup popup={popup} setPopup={setPopup} />
    </>
  );
}
