import React, { useState } from 'react';
import { LegalModal } from './LegalModal';

interface AuthScreenProps {
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (pass: string) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (val: boolean) => void;
  authError: string;
  handleAuth: (e: React.FormEvent) => void;
  isProcessingAuth: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  authMode, setAuthMode, email, setEmail, password, setPassword, 
  agreedToTerms, setAgreedToTerms, authError, handleAuth, isProcessingAuth
}) => {
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null);

  return (
    <div className="auth-wrapper animate-fade-in">
      {legalView && <LegalModal type={legalView} onClose={() => setLegalView(null)} />}
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="text-gradient" style={{ fontSize: '36px', fontWeight: 900 }}>Wheel Rush</h1>
          <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
            {authMode === 'login' ? 'Sign in to start spinning' : 'Create an account to play'}
          </p>
        </div>
        
        {authError && (
          <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {authError}
          </div>
        )}
        
        <form onSubmit={handleAuth}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="form-input" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              placeholder="you@example.com" 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="form-input" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              placeholder="••••••••" 
            />
          </div>

          {authMode === 'signup' && (
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input 
                type="checkbox" 
                id="terms"
                checked={agreedToTerms} 
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ color: 'var(--text-light)' }}>
                I agree to the{' '}
                <button 
                  type="button" 
                  onClick={() => setLegalView('terms')} 
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Terms
                </button> 
                {' '}and{' '}
                <button 
                  type="button" 
                  onClick={() => setLegalView('privacy')} 
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Privacy Policy
                </button>
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
            disabled={(authMode === 'signup' && !agreedToTerms) || isProcessingAuth}
          >
            {isProcessingAuth ? (
              <>
                <span className="spinner-small"></span>
                <span>Processing...</span>
              </>
            ) : (
              <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-light)', fontSize: '14px' }}>
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {authMode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
