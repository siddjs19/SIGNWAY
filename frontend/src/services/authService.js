
import api from "./api";

const authService = {
  // Register a new user
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // Login an existing user
  login: async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    // Save the JWT token after successful login
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }

    return response.data;
  },

  // Logout the user
  logout: () => {
    localStorage.removeItem("token");
  },
};

export default authService;
