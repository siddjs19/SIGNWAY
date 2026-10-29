import { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

export default function Login({
  onSwitchToRegister,
  onLoginSuccess,
  initialError = '',
  notice = '',
}) {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(
        formData.email,
        formData.password,
        formData.rememberMe,
      );
      onLoginSuccess?.(response.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-auth-wrapper">
      <div className="sb-auth-card">
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-logo-badge">🤟</div>
          <h1 className="sb-title">SignBridge <span>AI</span></h1>
          <p className="sb-subtitle">Learn Indian Sign Language. Connect with the world.</p>
        </div>

        {/* Tab switch */}
        <div className="sb-tabs">
          <button className="sb-tab-btn active">Sign In</button>
          <button className="sb-tab-btn" onClick={onSwitchToRegister}>Register</button>
        </div>

        {error && <div className="sb-error-text" role="alert" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {notice && <div className="sb-integration-auth-notice" role="status">{notice}</div>}

        <form onSubmit={handleSubmit}>
          <div className="sb-form-group">
            <label className="sb-label" htmlFor="login-email">Email Address</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                id="login-email"
                className="sb-input"
                placeholder="name@signbridge.ai"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="sb-form-group">
            <label className="sb-label" htmlFor="login-password">Password</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                className="sb-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="sb-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="sb-row-flex">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              />
              Remember me
            </label>
            <span title="Password reset is not available yet">Password reset unavailable</span>
          </div>

          <button type="submit" className="sb-submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Bridge'}
          </button>
        </form>

        <div className="sb-guest-footer">
          <p>Guest access is not available. Create an account to save your learning progress.</p>
        </div>
      </div>
    </div>
  );
}
