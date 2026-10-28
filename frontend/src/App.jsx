

import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");

    if (token) {
      return { loggedIn: true };
    }

    return null;
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData || { loggedIn: true });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return user ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={handleLoginSuccess} />
  );
}

export default App;

