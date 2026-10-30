import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import { Loading } from './components/Primitives';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Lessons from './pages/Lessons';
import Curriculum from './pages/Curriculum';
import Practitioners from './pages/Practitioners';
import Credentials from './pages/Credentials';
import Communicator from './pages/Communicator';
import Profile from './pages/Profile';
function Protected(){const {user,loading}=useAuth();if(loading)return <Loading label="Checking your session..."/>;return user?<AppShell/>:<Navigate to="/login" replace/>}
export default function App(){const {user}=useAuth();return <Routes><Route path="/" element={<Navigate to={user?'/app':'/login'} replace/>}/><Route path="/login" element={user?<Navigate to="/app" replace/>:<Login/>}/><Route path="/register" element={user?<Navigate to="/app" replace/>:<Register/>}/><Route path="/app" element={<Protected/>}><Route index element={<Dashboard/>}/><Route path="lessons" element={<Lessons/>}/><Route path="curriculum" element={<Curriculum/>}/><Route path="practitioners" element={<Practitioners/>}/><Route path="credentials" element={<Credentials/>}/><Route path="communicator" element={<Communicator/>}/><Route path="profile" element={<Profile/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
