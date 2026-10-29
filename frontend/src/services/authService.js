
import api, { clearStoredToken, storeToken } from "./api";

const authService = {
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  login: async (email, password, rememberMe = false) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    if (response.data.token) {
      storeToken(response.data.token, rememberMe);
    }

    return response.data;
  },

  logout: () => {
    clearStoredToken();
  },
};

export default authService;
