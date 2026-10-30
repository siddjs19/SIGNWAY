import { useEffect, useState } from 'react'
import { UserRound, Save, ShieldCheck } from 'lucide-react'
import api, { messageOf } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeading, Loading, ErrorState, Status } from '../components/Primitives';
export default function Profile () {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
      name: '',
      preferredLanguage: 'English',
      saveConversations: true
    }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('')
  useEffect(() => {
    api
      .get('/profile')
      .then(r => setForm({ ...form, ...r.data.data }))
      .catch(e => setError(messageOf(e)))
      .finally(() => setLoading(false))
  }, [])
  const save = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const r = await api.patch('/profile', form)
      setUser({ ...user, ...r.data.data })
      localStorage.setItem(
        'sb_user',
        JSON.stringify({ ...user, ...r.data.data })
      )
      setSuccess('Profile updated successfully.')
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  if (loading) return <Loading label='Loading profile...' />
  return (
    <>
      <PageHeading
        eyebrow='ACCOUNT SETTINGS'
        title='Your profile'
        description='Manage your personal details and communication preferences.'
      />
      <div className='profile-layout'>
        <section className='panel profile-card'>
          <div className='profile-avatar-large'>
            {(form.name || user?.name || 'U')
              .split(' ')
              .map(x => x[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <h3>{form.name || user?.name}</h3>
          <p>{user?.email}</p>
          <Status tone='success'>Authenticated account</Status>
        </section>
        <section className='panel profile-form'>
          <div className='panel-heading'>
            <div>
              <h3>Personal information</h3>
              <p>Your information is stored in your account.</p>
            </div>
          </div>
          {error && <ErrorState message={error} />}
          {success && <div className='success-message'>{success}</div>}
          <form onSubmit={save}>
            <label>
              Full name
              <input
                className='field'
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Email address
              <input className='field' value={user?.email || ''} disabled />
            </label>
            <label>
              Preferred language
              <select
                className='field'
                value={form.preferredLanguage || 'English'}
                onChange={e =>
                  setForm({ ...form, preferredLanguage: e.target.value })
                }
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
            </label>
            <label className='check-row'>
              <input
                type='checkbox'
                checked={form.saveConversations !== false}
                onChange={e =>
                  setForm({ ...form, saveConversations: e.target.checked })
                }
              />{' '}
              Save conversation history to my account
            </label>
            <div className='privacy-note'>
              <ShieldCheck size={16} /> When disabled, new conversations are
              temporary and are not stored as conversation history.
            </div>
            <button className='btn btn-primary' disabled={busy}>
              <Save size={16} />
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
