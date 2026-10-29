import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import api, { clearStoredToken, getStoredToken } from './services/api';
import authService from './services/authService';

export default function App() {
  return (
    <BrowserRouter>
      <SignBridgeApplication />
    </BrowserRouter>
  );
}

function SignBridgeApplication() {
  const [authView, setAuthView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [registrationNotice, setRegistrationNotice] = useState('');

  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setAuthView('login');
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getStoredToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await api.get('/profile');
        if (active) setCurrentUser(response.data.profile);
      } catch (error) {
        clearStoredToken();
        if (active && error.response?.status !== 401) {
          setSessionError(
            error.response?.data?.message || 'Unable to verify your session. Please sign in again.',
          );
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071421] p-6 text-[#c9d9e8]">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  if (currentUser) {
    return (
      <Routes>
        <Route path="/" element={<Dashboard user={currentUser} onLogout={handleLogout} />} />
        <Route path="/quiz" element={<QuizPage onLogout={handleLogout} />} />
        <Route path="/quiz/lesson/:lessonId" element={<QuizPage onLogout={handleLogout} />} />
        <Route path="/quiz/full-course" element={<QuizPage onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return authView === 'login' ? (
    <Login
      onSwitchToRegister={() => setAuthView('register')}
      onLoginSuccess={(user) => {
        setCurrentUser(user);
        setRegistrationNotice('');
      }}
      initialError={sessionError}
      notice={registrationNotice}
    />
  ) : (
    <Register
      onSwitchToLogin={() => setAuthView('login')}
      onRegisterSuccess={() => {
        setRegistrationNotice('Account created. Sign in to continue.');
        setAuthView('login');
      }}
    />
  );
}
