import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Languages,
  MapPin,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import PractitionerCard from '../components/PractitionerCard';
import api from '../services/api';
import './Dashboard.css';

const cardSurface = 'rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] shadow-sm backdrop-blur-xl';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-5 py-2.5 text-sm font-extrabold text-sb-midnight transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.6)] px-4 py-2.5 text-sm font-bold text-sb-signal transition hover:border-sb-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback;
}

function todayLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function PageError({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SessionStatus({ status }) {
  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
  };
  const classes = {
    pending: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    accepted: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
    declined: 'border-red-300/30 bg-red-300/10 text-red-100',
    completed: 'border-sb-signal/30 bg-sb-signal/10 text-sb-signal',
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classes[status] || classes.pending}`}>
      {labels[status] || 'Pending'}
    </span>
  );
}

function SessionRequestDialog({ practitioner, submitting, error, success, onClose, onSubmit }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  function submit(event) {
    event.preventDefault();
    setFormError('');
    if (!date || !time) {
      setFormError('Choose a date and time for your practice request.');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setFormError('Choose a future date and time.');
      return;
    }
    onSubmit({ practitionerId: practitioner.id, scheduledAt: scheduledAt.toISOString(), message });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section
        className="my-auto w-full max-w-xl rounded-3xl border border-[rgba(92,225,214,0.24)] bg-[#0b1c2b] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-request-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sb-signal">Demo request · not a booking</p>
            <h2 id="practice-request-title" className="mt-2 text-2xl font-extrabold text-sb-soft">Request practice with {practitioner.name}</h2>
          </div>
          <button type="button" className={secondaryButton} aria-label="Close request form" disabled={submitting} onClick={onClose}><X size={18} /></button>
        </div>
        <p className="sb-integration-muted mb-5">
          This placeholder profile is not a real practitioner. Your request will be stored as Pending in your demo sessions; nobody will be contacted.
        </p>
        {success ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-100" role="status">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <p>Your demo practice request is saved as <strong>Pending</strong>. It has not been sent to or accepted by a real practitioner.</p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submit}>
            {(formError || error) && <PageError>{formError || error}</PageError>}
            <label className="flex flex-col gap-2 text-sm font-semibold text-sb-soft">
              Date
              <input className="rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.8)] px-4 py-3 text-sb-soft" type="date" min={todayLocalDate()} required value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-sb-soft">
              Time
              <input className="rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.8)] px-4 py-3 text-sb-soft" type="time" required value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-sb-soft">
              Message <span className="font-normal text-sb-muted">(optional, up to 1000 characters)</span>
              <textarea className="min-h-28 rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.8)] px-4 py-3 text-sb-soft" maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What would you like to practice?" />
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className={button} disabled={submitting}>
                {submitting ? 'Saving request…' : 'Save demo request'}
              </button>
              <button type="button" className={secondaryButton} disabled={submitting} onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default function PractitionersPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [practitioners, setPractitioners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('');
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [requestPractitioner, setRequestPractitioner] = useState(null);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const [directoryResponse, sessionsResponse] = await Promise.all([
          api.get('/practitioners'),
          api.get('/practitioners/sessions'),
        ]);
        if (!active) return;
        setPractitioners(directoryResponse.data.data || []);
        setSessions(sessionsResponse.data.data || []);
      } catch (loadError) {
        if (!active) return;
        if (loadError.response?.status === 401) {
          onLogout();
          return;
        }
        setError(messageFrom(loadError, 'Unable to load the practitioner directory. Please try again.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPage();
    return () => {
      active = false;
    };
  }, [onLogout]);

  const options = useMemo(() => ({
    specializations: [...new Set(practitioners.map((item) => item.specialization))].sort(),
    locations: [...new Set(practitioners.map((item) => item.location))].sort(),
    availabilities: [...new Set(practitioners.map((item) => item.availability))].sort(),
  }), [practitioners]);

  const filteredPractitioners = useMemo(() => {
    const query = search.trim().toLowerCase();
    return practitioners.filter((practitioner) => (
      (!query || practitioner.name.toLowerCase().includes(query))
      && (!specialization || practitioner.specialization === specialization)
      && (!location || practitioner.location === location)
      && (!availability || practitioner.availability === availability)
    ));
  }, [availability, location, practitioners, search, specialization]);

  async function submitRequest(payload) {
    setSubmitting(true);
    setRequestError('');
    try {
      const response = await api.post('/practitioners/sessions', payload);
      setSessions((current) => [response.data.data, ...current]);
      setRequestSuccess(true);
    } catch (requestErrorValue) {
      if (requestErrorValue.response?.status === 401) {
        onLogout();
        return;
      }
      setRequestError(messageFrom(requestErrorValue, 'The practice request could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  }

  function openRequest(practitioner) {
    setSelectedPractitioner(null);
    setRequestError('');
    setRequestSuccess(false);
    setRequestPractitioner(practitioner);
  }

  function closeRequest() {
    if (submitting) return;
    setRequestPractitioner(null);
    setRequestError('');
    setRequestSuccess(false);
  }

  function navigateSidebar(id) {
    if (id === 'quizzes') navigate('/quiz');
    else if (id === 'practitioners') navigate('/practitioners');
    else navigate('/', { state: { activeNav: id } });
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-sb-midnight bg-[radial-gradient(at_0%_0%,rgba(146,117,255,0.12)_0px,transparent_45%),radial-gradient(at_100%_100%,rgba(92,225,214,0.1)_0px,transparent_45%)] text-sb-body">
      <AppSidebar activeNav="practitioners" user={user} onNavigate={navigateSidebar} onLogout={onLogout} />
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-transparent">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.85)] px-5 py-4 backdrop-blur-xl max-sm:flex-wrap sm:px-8">
          <div className="flex items-center gap-3 text-sb-muted">
            <Users size={18} className="text-sb-signal" />
            <span>Human Practice · {user?.name || 'Learner'}</span>
          </div>
          <span className="sb-integration-language"><Languages size={15} /> Indian Sign Language</span>
        </header>
        <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
          <header>
            <div className="sb-integration-section-heading">
              <h1 className="sb-integration-page-title">Human Practice</h1>
              <span className="sb-lesson-badge badge-active">Demo directory</span>
            </div>
            <p className="sb-integration-muted mt-2 max-w-3xl">
              Explore placeholder practitioner profiles and save practice requests to your account.
              No real practitioners are listed or contacted, and every new request remains Pending.
            </p>
          </header>

          <div className="sb-integration-contract">
            <Shield size={18} />
            <span>Profiles, availability, biographies, and experience are illustrative demo data. Session requests are saved for your account only; there are no bookings or real practitioner responses.</span>
          </div>

          <section aria-labelledby="directory-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="directory-title" className="text-xl font-extrabold text-sb-soft">Practitioner directory</h2>
                <p className="sb-integration-muted mt-1">Search by name, then narrow the illustrative profiles with filters.</p>
              </div>
              <span className="text-sm text-sb-muted">{loading ? 'Loading profiles…' : `${filteredPractitioners.length} demo profiles`}</span>
            </div>
            <div className={`${cardSurface} mb-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4`}>
              <label className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-sb-muted" />
                <input className="w-full rounded-xl border border-[rgba(92,225,214,0.18)] bg-[rgba(7,20,33,0.6)] py-3 pl-10 pr-3 text-sm text-sb-soft" type="search" aria-label="Search practitioners by name" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-sb-muted">
                Specialization
                <select className="rounded-xl border border-[rgba(92,225,214,0.18)] bg-[rgba(7,20,33,0.6)] px-3 py-3 text-sm text-sb-soft" value={specialization} onChange={(event) => setSpecialization(event.target.value)}>
                  <option value="">All specializations</option>
                  {options.specializations.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-sb-muted">
                Location
                <select className="rounded-xl border border-[rgba(92,225,214,0.18)] bg-[rgba(7,20,33,0.6)] px-3 py-3 text-sm text-sb-soft" value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">All locations</option>
                  {options.locations.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-sb-muted">
                Availability
                <select className="rounded-xl border border-[rgba(92,225,214,0.18)] bg-[rgba(7,20,33,0.6)] px-3 py-3 text-sm text-sb-soft" value={availability} onChange={(event) => setAvailability(event.target.value)}>
                  <option value="">Any availability</option>
                  {options.availabilities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            {error && <PageError>{error}</PageError>}
            {loading ? (
              <div className={`${cardSurface} flex min-h-40 items-center justify-center gap-3 p-8 text-sb-muted`} role="status">
                <span className="size-5 animate-spin rounded-full border-2 border-sb-signal border-t-transparent" /> Loading demo profiles…
              </div>
            ) : !error && filteredPractitioners.length === 0 ? (
              <div className={`${cardSurface} flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center text-sb-muted`}>
                <Users size={30} className="text-sb-signal" />
                <h3 className="text-lg font-bold text-sb-soft">No matching profiles</h3>
                <p>Try a different name or clear one or more filters.</p>
                <button type="button" className={secondaryButton} onClick={() => {
                  setSearch('');
                  setSpecialization('');
                  setLocation('');
                  setAvailability('');
                }}>Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredPractitioners.map((practitioner) => (
                  <PractitionerCard
                    key={practitioner.id}
                    practitioner={practitioner}
                    onViewProfile={() => setSelectedPractitioner(practitioner)}
                    onRequestSession={() => openRequest(practitioner)}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="sessions-title">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 id="sessions-title" className="text-xl font-extrabold text-sb-soft">My sessions</h2>
                <p className="sb-integration-muted mt-1">Saved demo requests for this signed-in account.</p>
              </div>
              {!loading && <span className="text-sm text-sb-muted">{sessions.length} requests</span>}
            </div>
            {loading ? (
              <div className={`${cardSurface} flex items-center gap-3 p-5 text-sb-muted`} role="status">
                <span className="size-4 animate-spin rounded-full border-2 border-sb-signal border-t-transparent" /> Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <div className={`${cardSurface} flex flex-col items-center gap-3 p-8 text-center text-sb-muted`}>
                <CalendarDays size={28} className="text-sb-signal" />
                <h3 className="font-bold text-sb-soft">No practice requests yet</h3>
                <p>Choose a demo profile to save a request. It will remain Pending; no practitioner is contacted.</p>
              </div>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
                {sessions.map((session) => (
                  <li key={session.id} className={`${cardSurface} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                    <div className="min-w-0">
                      <p className="font-bold text-sb-soft">{session.practitioner?.name || 'Demo practitioner'}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-sb-muted">
                        <Clock3 size={15} className="shrink-0 text-sb-signal" />
                        {new Date(session.scheduledAt).toLocaleString()}
                      </p>
                      {session.message && <p className="mt-2 break-words text-sm text-sb-body">{session.message}</p>}
                    </div>
                    <SessionStatus status={session.status} />
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-3 text-sm text-red-100" role="status">Session data could not be loaded.</p>}
          </section>
        </div>
      </main>

      {selectedPractitioner && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedPractitioner(null);
        }}>
          <section className="my-auto w-full max-w-2xl rounded-3xl border border-[rgba(92,225,214,0.24)] bg-[#0b1c2b] p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="practitioner-profile-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-sb-violet to-sb-signal text-xl font-extrabold text-sb-midnight">
                  {selectedPractitioner.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Placeholder profile</p>
                  <h2 id="practitioner-profile-title" className="text-2xl font-extrabold text-sb-soft">{selectedPractitioner.name}</h2>
                </div>
              </div>
              <button type="button" className={secondaryButton} aria-label="Close practitioner details" onClick={() => setSelectedPractitioner(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <p className="flex items-start gap-2 text-sm text-sb-body"><Users size={17} className="mt-0.5 shrink-0 text-sb-signal" /><span><strong>Specialization</strong><br />{selectedPractitioner.specialization}</span></p>
              <p className="flex items-start gap-2 text-sm text-sb-body"><Clock3 size={17} className="mt-0.5 shrink-0 text-sb-signal" /><span><strong>Experience</strong><br />Illustrative only · {selectedPractitioner.experienceYears} years</span></p>
              <p className="flex items-start gap-2 text-sm text-sb-body"><Languages size={17} className="mt-0.5 shrink-0 text-sb-signal" /><span><strong>Languages</strong><br />{selectedPractitioner.languages.join(', ')}</span></p>
              <p className="flex items-start gap-2 text-sm text-sb-body"><MapPin size={17} className="mt-0.5 shrink-0 text-sb-signal" /><span><strong>Location</strong><br />{selectedPractitioner.location}</span></p>
              <p className="flex items-start gap-2 text-sm text-sb-body"><CalendarDays size={17} className="mt-0.5 shrink-0 text-sb-signal" /><span><strong>Availability</strong><br />{selectedPractitioner.availability} (illustrative)</span></p>
            </div>
            <div className="my-5 rounded-2xl border border-[rgba(92,225,214,0.12)] bg-[rgba(24,48,65,0.45)] p-4">
              <h3 className="mb-2 font-bold text-sb-soft">About this demo profile</h3>
              <p className="text-sm leading-relaxed text-sb-body">{selectedPractitioner.bio}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={button} onClick={() => openRequest(selectedPractitioner)}>Request practice session <ArrowRight size={15} /></button>
              <button type="button" className={secondaryButton} onClick={() => setSelectedPractitioner(null)}>Close profile</button>
            </div>
          </section>
        </div>
      )}

      {requestPractitioner && (
        <SessionRequestDialog
          key={requestPractitioner.id}
          practitioner={requestPractitioner}
          submitting={submitting}
          error={requestError}
          success={requestSuccess}
          onClose={closeRequest}
          onSubmit={submitRequest}
        />
      )}
    </div>
  );
}
