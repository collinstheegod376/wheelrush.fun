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
      const { error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', user.id);
      if (error) throw error;
      setUser(prev => prev ? { ...prev, username: newUsername } : null);
      setMsg({ text: 'Username updated successfully!', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
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
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant Preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploadStatus('uploading');
    setMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setUploadStatus('done');
      
      // Clear "Done" after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
      
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
      setPreviewUrl(null); // Revert preview on error
      setUploadStatus('idle');
    }
  };

  return (
    <div className="tab-pane animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Settings</h1>
        <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={handleLogout}>Sign Out</button>
      </div>

      <div className="settings-tabs-container">
        <div className="settings-tabs-nav">
          <button className={`sub-tab ${activeSubTab === 'account' ? 'active' : ''}`} onClick={() => setActiveSubTab('account')}>Account</button>
          <button className={`sub-tab ${activeSubTab === 'security' ? 'active' : ''}`} onClick={() => setActiveSubTab('security')}>Security</button>
          <button className={`sub-tab ${activeSubTab === 'game' ? 'active' : ''}`} onClick={() => setActiveSubTab('game')}>Game & Audio</button>
        </div>

        <div className="settings-tab-content card" style={{ padding: '32px' }}>
          {msg && (
            <div className={`status-msg ${msg.type}`} style={{ marginBottom: '24px', padding: '12px', borderRadius: '8px' }}>
              {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
            </div>
          )}

          {activeSubTab === 'account' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', position: 'relative', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {previewUrl || user.avatar_url ? (
                      <img src={previewUrl || user.avatar_url || ''} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>👤</div>
                    )}
                    
                    {uploadStatus !== 'idle' && (
                      <div style={{ 
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                        background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', 
                        alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' 
                      }}>
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
                    style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary-color)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 10 }}
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
                <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '8px' }}>This will be visible on the leaderboard.</p>
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
              <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', fontSize: '14px', color: '#64748b' }}>
                💡 Tip: Use a strong password to keep your virtual billions safe!
              </div>
            </div>
          )}

          {activeSubTab === 'game' && (
            <div className="animate-fade-in">
              <div className="setting-row">
                <div>
                  <div style={{ fontWeight: 700 }}>🎶 Background Music</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Atmospheric soundtrack</div>
                </div>
                <label className="switch"><input type="checkbox" checked={bgMusic} onChange={e => setBgMusic(e.target.checked)} /><span className="slider"></span></label>
              </div>
              
              <div className="setting-row">
                <div>
                  <div style={{ fontWeight: 700 }}>🔔 Sound Effects</div>
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
