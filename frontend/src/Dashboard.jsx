
import { useEffect, useState } from "react";
import api from "./services/api";
import authService from "./services/authService";
import "./Dashboard.css";

function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profileResponse, progressResponse] = await Promise.all([
          api.get("/profile"),
          api.get("/progress"),
        ]);

        setProfile(profileResponse.data.data);
        setProgress(progressResponse.data.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load your dashboard."
        );
      }
    }

    loadDashboard();
  }, []);

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>SignBridge AI 🤟</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <section className="welcome-section">
        <h2>
          Welcome{profile?.name ? `, ${profile.name}` : ""}!
        </h2>
        <p>Your journey towards inclusive communication starts here.</p>
      </section>

      {error && <p className="dashboard-error">{error}</p>}

      <section className="dashboard-stats">
        <article className="dashboard-card">
          <h3>📚 Learn ISL</h3>
          <p>Start learning Indian Sign Language, one lesson at a time.</p>
          <span>Coming soon</span>
        </article>

        <article className="dashboard-card">
          <h3>🤖 AI Conversation Tutor</h3>
          <p>Practise everyday conversations with your AI tutor.</p>
          <span>Coming soon</span>
        </article>

        <article className="dashboard-card">
          <h3>📊 My Progress</h3>
          <p>
            Lessons completed: {progress?.completedLessons ?? 0}
          </p>
          <p>
            Overall progress: {progress?.percent ?? 0}%
          </p>
        </article>

        <article className="dashboard-card">
          <h3>👤 My Profile</h3>
          <p>{profile?.email || "Loading profile..."}</p>
          <p>
            Preferred language:{" "}
            {profile?.preferences?.language || "en"}
          </p>
        </article>
      </section>
    </main>
  );
}

export default Dashboard;
