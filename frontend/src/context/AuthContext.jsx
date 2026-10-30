import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
const Ctx = createContext(null);
export function AuthProvider({children}) {
  const [user,setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('sb_user')); } catch { return null; } });
  const [loading,setLoading] = useState(Boolean(localStorage.getItem('sb_token')));
  useEffect(() => {
    if (!localStorage.getItem('sb_token')) { setLoading(false); return; }
    api.get('/auth/me').then(r => { setUser(r.data.user); localStorage.setItem('sb_user', JSON.stringify(r.data.user)); }).catch(()=>setUser(null)).finally(()=>setLoading(false));
  },[]);
  const accept = data => { localStorage.setItem('sb_token',data.token); localStorage.setItem('sb_user',JSON.stringify(data.user)); setUser(data.user); };
  const login = async credentials => accept((await api.post('/auth/login',credentials)).data);
  const register = async payload => accept((await api.post('/auth/register',payload)).data);
  const logout = () => { localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); setUser(null); };
  return <Ctx.Provider value={{user,loading,login,register,logout,setUser}}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
