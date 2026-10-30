import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  MessageCircle,
  UserRound,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bell
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
const nav = [
  ['Dashboard', '/app', LayoutDashboard],
  ['Lessons', '/app/lessons', BookOpen],
  ['Curriculum', '/app/curriculum', GraduationCap],
  ['Practitioners', '/app/practitioners', Users],
  ['Credentials', '/app/credentials', Award],
  ['AI Communicator', '/app/communicator', MessageCircle],
  ['Profile', '/app/profile', UserRound]
]
export default function AppShell () {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const initials = (user?.name || 'Learner')
    .split(' ')
    .map(x => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className='app-shell'>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className='brand'>
          <div className='brand-mark'>
            <Sparkles size={22} />
          </div>
          <div>
            <b>
              signway<span> AI</span>
            </b>
            <small>Learn · Connect · Empower</small>
          </div>
          <button
            className='mobile-close icon-btn'
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className='nav-caption'>WORKSPACE</div>
        <nav>
          {nav.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'AI Communicator' && <i className='nav-dot' />}
            </NavLink>
          ))}
        </nav>
        <div className='sidebar-bottom'>
          <div className='support-card'>
            <div className='support-icon'>
              <Sparkles size={17} />
            </div>
            <b>Keep learning</b>
            <p>Small steps make meaningful connections.</p>
            <NavLink to='/app/curriculum'>
              View learning path <span>→</span>
            </NavLink>
          </div>
          <button
            className='user-mini'
            onClick={() => navigate('/app/profile')}
          >
            <div className='avatar'>{initials}</div>
            <div className='user-mini-text'>
              <b>{user?.name || 'Learner'}</b>
              <small>{user?.email}</small>
            </div>
            <UserRound size={17} />
          </button>
          <button
            className='logout-btn'
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      {open && (
        <button
          className='mobile-scrim'
          onClick={() => setOpen(false)}
          aria-label='Close menu'
        />
      )}
      <main className='main-area'>
        <header className='topbar'>
          <button
            className='mobile-menu icon-btn'
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className='breadcrumb'>
            Workspace <span>/</span> <b>SIGNWAY</b>
          </div>
          <div className='topbar-right'>
            <span className='status-pill'>
              <i /> Learning space
            </span>
            <button className='icon-btn' title='Notifications'>
              <Bell size={18} />
            </button>
            <div className='avatar avatar-small'>{initials}</div>
          </div>
        </header>
        <div className='page-content'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
