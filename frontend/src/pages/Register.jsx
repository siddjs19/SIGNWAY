import { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

export default function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password should be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { name, email, password } = formData;
      await authService.register({ name, email, password });
      onRegisterSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create your account. Check your connection and try again.');
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
          <p className="sb-subtitle">Join the inclusive AI gesture community</p>
        </div>

        {/* Tab switch */}
        <div className="sb-tabs">
          <button className="sb-tab-btn" onClick={onSwitchToLogin}>Sign In</button>
          <button className="sb-tab-btn active">Register</button>
        </div>

        {error && <div className="sb-error-text" role="alert" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="sb-form-group">
            <label className="sb-label" htmlFor="register-name">Full Name</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                id="register-name"
                className="sb-input"
                placeholder="Alex Rivera"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="sb-form-group">
            <label className="sb-label" htmlFor="register-email">Email Address</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                id="register-email"
                className="sb-input"
                placeholder="alex@signbridge.ai"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <p className="sb-form-group">Learning focus: Indian Sign Language (ISL)</p>

          <div className="sb-form-group">
            <label className="sb-label" htmlFor="register-password">Password</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="register-password"
                className="sb-input"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
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

          <div className="sb-form-group">
            <label className="sb-label" htmlFor="register-confirm-password">Confirm Password</label>
            <div className="sb-input-box">
              <svg className="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="register-confirm-password"
                className="sb-input"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>

          <button type="submit" className="sb-submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Get Started Free'}
          </button>
        </form>
      </div>
    </div>
  );
}
