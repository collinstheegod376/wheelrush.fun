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
        <div className="auth-header">
          <h1 className="text-gradient auth-title">Wheel Rush</h1>
          <p className="auth-subtitle">
            {authMode === 'login' ? 'Sign in to start spinning' : 'Create an account to play'}
          </p>
        </div>

        {authError && (
          <div className="status-msg error">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group-large">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          {authMode === 'signup' && (
            <div className="terms-container">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="terms" className="auth-terms-label">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setLegalView('terms')}
                  className="btn-link"
                >
                  Terms
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => setLegalView('privacy')}
                  className="btn-link"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
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

        <div className="auth-footer">
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="btn-link"
          >
            {authMode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
