import React, { useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { UserStats } from '../types';

interface SettingsModalProps {
  user: UserStats;
  setUser: React.Dispatch<React.SetStateAction<UserStats | null>>;
  bgMusic: boolean;
  setBgMusic: (val: boolean) => void;
  sfx: boolean;
  setSfx: (val: boolean) => void;
  handleLogout: () => void;
}

type SubTab = 'account' | 'security' | 'game';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user, setUser, bgMusic, setBgMusic, sfx, setSfx, handleLogout
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('account');
  const [newUsername, setNewUsername] = useState(user.username);
  const [newPassword, setNewPassword] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateUsername = async () => {
    if (newUsername === user.username) return;
    setIsUpdating(true);
    setMsg(null);
    try {
      const { error } = await supabase.rpc('update_user_profile', {
        new_username: newUsername,
        new_avatar_url: null
      });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, username: newUsername } : null);
      setMsg({ text: 'Username updated successfully!', type: 'success' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg({ text: errorMessage, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    setIsUpdating(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setMsg({ text: 'Password updated successfully!', type: 'success' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg({ text: errorMessage, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMsg({ text: 'File size must be under 2MB', type: 'error' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMsg({ text: 'Valid formats: JPG, PNG, GIF, WebP', type: 'error' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploadStatus('uploading');
    setMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.rpc('update_user_profile', {
        new_username: null,
        new_avatar_url: publicUrl
      });

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setUploadStatus('done');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg({ text: errorMessage, type: 'error' });
      setPreviewUrl(null);
      setUploadStatus('idle');
    }
  };

  return (
    <div className="tab-pane animate-fade-in">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <button className="btn btn-danger" onClick={handleLogout}>Sign Out</button>
      </div>

      <div className="settings-tabs-container">
        <div className="settings-tabs-nav">
          <button className={`sub-tab ${activeSubTab === 'account' ? 'active' : ''}`} onClick={() => setActiveSubTab('account')}>Account</button>
          <button className={`sub-tab ${activeSubTab === 'security' ? 'active' : ''}`} onClick={() => setActiveSubTab('security')}>Security</button>
          <button className={`sub-tab ${activeSubTab === 'game' ? 'active' : ''}`} onClick={() => setActiveSubTab('game')}>Game & Audio</button>
        </div>

        <div className="settings-tab-content card settings-card">
          {msg && (
            <div className={`status-msg ${msg.type} settings-status`}>
              {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
            </div>
          )}

          {activeSubTab === 'account' && (
            <div className="animate-fade-in">
              <div className="settings-account-row">
                <div className="settings-avatar-wrap">
                  <div className="settings-avatar">
                    {previewUrl || user.avatar_url ? (
                      <img src={previewUrl || user.avatar_url || ''} alt="Profile" className="settings-avatar-img" />
                    ) : (
                      <div className="settings-avatar-fallback">👤</div>
                    )}

                    {uploadStatus !== 'idle' && (
                      <div className="settings-upload-overlay">
                        {uploadStatus === 'uploading' ? (
                          <>
                            <div className="spinner-small" style={{ marginBottom: '4px' }}></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '20px', marginBottom: '4px' }}>✅</span>
                            <span>Done!</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="settings-upload-btn"
                    disabled={uploadStatus === 'uploading'}
                  >
                    ✏️
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Profile Picture</h3>
                  <p style={{ color: 'var(--text-light)', fontSize: '14px', marginTop: '4px' }}>Recommended size: 500x500px</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Display Username</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleUpdateUsername} disabled={isUpdating || newUsername === user.username}>
                    Update
                  </button>
                </div>
                <p className="settings-helper">This will be visible on the leaderboard.</p>
              </div>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div className="animate-fade-in">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleUpdatePassword} disabled={isUpdating || !newPassword}>
                    Save Changes
                  </button>
                </div>
              </div>
              <div className="settings-tip">
                💡 Tip: Use a strong password to keep your virtual billions safe!
              </div>
            </div>
          )}

          {activeSubTab === 'game' && (
            <div className="animate-fade-in">
              <div className="setting-row">
                <div>
                  <div className="settings-toggle-label">🎶 Background Music</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Atmospheric soundtrack</div>
                </div>
                <label className="switch"><input type="checkbox" checked={bgMusic} onChange={e => setBgMusic(e.target.checked)} /><span className="slider"></span></label>
              </div>

              <div className="setting-row">
                <div>
                  <div className="settings-toggle-label">🔔 Sound Effects</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Spin ticks & win dings</div>
                </div>
                <label className="switch"><input type="checkbox" checked={sfx} onChange={e => setSfx(e.target.checked)} /><span className="slider"></span></label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
