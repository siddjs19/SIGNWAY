import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Eye,
  FileCheck,
  Languages,
  LogOut,
  MessageSquare,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import './Dashboard.css';

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: TrendingUp },
  { id: 'lessons', label: 'Lessons & Curricula', icon: BookOpen, badge: 'LEARN' },
  { id: 'quizzes', label: 'Quizzes & Tests', icon: ClipboardCheck, badge: 'ASSESS' },
  { id: 'studio', label: 'Live Studio & AI Chat', icon: Video, badge: 'COMING SOON' },
  { id: 'community', label: 'Practice Partners & ISL', icon: Users, badge: 'UNAVAILABLE' },
  { id: 'achievements', label: 'Credentials & Blockchain', icon: Trophy, badge: 'PLANNED' },
  { id: 'settings', label: 'Profile & Settings', icon: Settings },
];

const cardSurface = 'rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] shadow-sm backdrop-blur-xl';
const columnCard = `${cardSurface} flex flex-col gap-5 p-6`;
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-5 py-2.5 text-sm font-extrabold text-sb-midnight shadow-md transition hover:opacity-95 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-60';
const outlineButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.6)] px-5 py-2.5 text-sm font-extrabold text-sb-signal transition hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-60';

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function youtubeEmbedUrl(embedUrl) {
  try {
    const url = new URL(embedUrl);
    if (
      url.protocol === 'https:'
      && url.hostname === 'www.youtube.com'
      && /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
      && url.searchParams.get('feature') === 'oembed'
    ) {
      return url.href;
    }
  } catch {
    return '';
  }
  return '';
}

function ApiError({ children }) {
  if (!children) return null;
  return (
    <div className="sb-integration-error" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}

export default function DashboardConnected({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  const [profile, setProfile] = useState(user || null);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [language, setLanguage] = useState(user?.preferences?.language || 'en');
  const [accessibilityMode, setAccessibilityMode] = useState(
    user?.preferences?.accessibilityMode || false,
  );
  const [reducedMotion, setReducedMotion] = useState(
    user?.preferences?.reducedMotion || false,
  );
  const [saveConversations, setSaveConversations] = useState(
    user?.consent?.saveConversations ?? true,
  );
  const [communityMatching, setCommunityMatching] = useState(
    user?.consent?.communityMatching ?? false,
  );

  const [progress, setProgress] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSignIndex, setSelectedSignIndex] = useState(0);
  const [quizzes, setQuizzes] = useState([]);
  const [activeResourceId, setActiveResourceId] = useState('');
  const [failedVideoIds, setFailedVideoIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshingLessons, setRefreshingLessons] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pageError, setPageError] = useState('');
  const [lessonError, setLessonError] = useState('');
  const [quizError, setQuizError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const completedLessonIds = useMemo(
    () => new Set((progress?.completedLessonIds || []).map(String)),
    [progress],
  );
  const visibleLessons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return lessons.filter((lesson) => (
      !query
      || lesson.title.toLowerCase().includes(query)
      || lesson.description.toLowerCase().includes(query)
      || lesson.category.toLowerCase().includes(query)
    ));
  }, [lessons, searchQuery]);
  const currentSign = selectedLesson?.signs?.[selectedSignIndex] || null;

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setPageLoading(true);
      setPageError('');
      const results = await Promise.allSettled([
        api.get('/profile'),
        api.get('/progress'),
        api.get('/lessons'),
      ]);

      if (!active) return;
      if (results.some(
        (result) => result.status === 'rejected' && result.reason.response?.status === 401,
      )) {
        onLogout();
        return;
      }

      const [profileResult, progressResult, lessonsResult] = results;
      if (profileResult.status === 'fulfilled') {
        const nextProfile = profileResult.value.data.profile;
        setProfile(nextProfile);
        setProfileName(nextProfile.name || '');
        setLanguage(nextProfile.preferences?.language || 'en');
        setAccessibilityMode(nextProfile.preferences?.accessibilityMode || false);
        setReducedMotion(nextProfile.preferences?.reducedMotion || false);
        setSaveConversations(nextProfile.consent?.saveConversations ?? true);
        setCommunityMatching(nextProfile.consent?.communityMatching ?? false);
      } else {
        setPageError(errorMessage(profileResult.reason, 'Unable to load your profile.'));
      }

      if (progressResult.status === 'fulfilled') {
        setProgress(progressResult.value.data.progress);
      } else {
        setPageError((message) => message || errorMessage(
          progressResult.reason,
          'Unable to load your learning progress.',
        ));
      }

      if (lessonsResult.status === 'fulfilled') {
        setLessons(lessonsResult.value.data.data || []);
      } else {
        setPageError((message) => message || errorMessage(
          lessonsResult.reason,
          'Unable to load published lessons.',
        ));
      }
      setPageLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [onLogout]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const refreshProgress = async () => {
    try {
      const response = await api.get('/progress');
      setProgress(response.data.progress);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        return;
      }
      setPageError(errorMessage(error, 'Unable to refresh your progress.'));
    }
  };

  const refreshLessons = async () => {
    setRefreshingLessons(true);
    setPageError('');
    try {
      const response = await api.get('/lessons');
      setLessons(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        return;
      }
      setPageError(errorMessage(error, 'Unable to refresh published lessons.'));
    } finally {
      setRefreshingLessons(false);
    }
  };

  const openLesson = async (lesson) => {
    setActiveNav('lessons');
    setLessonLoading(true);
    setLessonError('');
    setQuizError('');
    setSelectedLesson(null);
    setSelectedSignIndex(0);
    setQuizzes([]);
    setActiveResourceId('');
    setFailedVideoIds(new Set());

    try {
      const [lessonResult, quizResult] = await Promise.allSettled([
        api.get(`/lessons/${lesson._id}`),
        api.get('/quizzes', { params: { lessonId: lesson._id } }),
      ]);

      if ([lessonResult, quizResult].some(
        (result) => result.status === 'rejected' && result.reason.response?.status === 401,
      )) {
        onLogout();
        return;
      }
      if (lessonResult.status === 'rejected') throw lessonResult.reason;
      const lessonData = lessonResult.value.data.data;
      setSelectedLesson(lessonData);
      setActiveResourceId(lessonData.resources?.[0]?.videoId || '');

      if (quizResult.status === 'fulfilled') {
        setQuizzes(quizResult.value.data.data || []);
      } else {
        setQuizError(errorMessage(quizResult.reason, 'Unable to load quizzes.'));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        return;
      }
      setLessonError(errorMessage(error, 'Unable to open this lesson.'));
    } finally {
      setLessonLoading(false);
    }
  };

  const completeLesson = async () => {
    if (!selectedLesson) return;
    setLessonLoading(true);
    setLessonError('');
    try {
      const response = await api.patch('/progress/complete-lesson', {
        lessonId: selectedLesson._id,
      });
      setProgress(response.data.progress);
      setToastMessage(response.data.message);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        return;
      }
      setLessonError(errorMessage(error, 'Unable to save lesson completion.'));
    } finally {
      setLessonLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setPageError('');
    try {
      const response = await api.patch('/profile', {
        name: profileName,
        preferences: { language, accessibilityMode, reducedMotion },
        consent: { saveConversations, communityMatching },
      });
      setProfile(response.data.profile);
      setToastMessage('Profile and privacy preferences saved.');
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        return;
      }
      setPageError(errorMessage(error, 'Unable to save your profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const renderLessonDetail = () => {
    if (lessonLoading && !selectedLesson) {
      return <p className="sb-integration-state" role="status">Loading lesson…</p>;
    }
    if (lessonError) return <ApiError>{lessonError}</ApiError>;
    if (!selectedLesson) {
      return (
        <div className="sb-integration-empty">
          <BookOpen size={28} />
          <h3>Select a lesson to begin</h3>
          <p>Lesson details and quizzes are loaded from your SignBridge account.</p>
        </div>
      );
    }

    const resources = selectedLesson.resources || [];
    const activeResource = resources.find(resource => resource.videoId === activeResourceId) || resources[0];
    const activeEmbedUrl = activeResource
      && activeResource.metadataStatus === 'verified'
      && activeResource.availabilityStatus === 'available'
      && activeResource.embeddable
      ? youtubeEmbedUrl(activeResource.embedUrl)
      : '';
    const videoFailed = activeResource && failedVideoIds.has(activeResource.videoId);

    return (
      <article className="mx-auto flex w-full max-w-[1120px] flex-col gap-7">
        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Lesson navigation">
          <button
            type="button"
            className={outlineButton}
            onClick={() => {
              setSelectedLesson(null);
              setActiveNav('lessons');
            }}
          >
            <ArrowRight className="rotate-180" size={16} />
            Back to lessons
          </button>
          <span className="text-sm font-semibold text-sb-muted">
            {selectedLesson.category} · {selectedLesson.level}
          </span>
        </nav>

        <header className="space-y-2">
          <h2 className="m-0 text-2xl font-extrabold tracking-tight text-sb-soft sm:text-3xl">
            {selectedLesson.title}
          </h2>
          <p className="m-0 max-w-3xl text-sm leading-relaxed text-sb-body sm:text-base">
            {selectedLesson.description}
          </p>
        </header>

        <section className={`${cardSurface} overflow-hidden p-3 sm:p-5`} aria-label="Lesson video player">
          {activeEmbedUrl && !videoFailed ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-[#040d16]">
              <iframe
                className="h-full w-full"
                src={activeEmbedUrl}
                title={`${activeResource.title} — ${activeResource.author}`}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                onError={() => setFailedVideoIds(previous => new Set(previous).add(activeResource.videoId))}
              />
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-[rgba(92,225,214,0.2)] bg-[#040d16] p-6 text-center">
              <div className="max-w-lg">
                <Video size={32} className="mx-auto mb-3 text-sb-muted" />
                <h3 className="m-0 text-lg font-bold text-sb-soft">
                  {activeResource ? 'Embedded playback is unavailable' : 'No video is available for this lesson'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-sb-muted">
                  {activeResource
                    ? 'You can still open the original learning resource directly.'
                    : 'Check the lesson resources or return to the published lesson list.'}
                </p>
                {activeResource?.sourceUrl && (
                  <a
                    className="mt-4 inline-flex items-center gap-2 font-bold text-sb-signal underline underline-offset-4"
                    href={activeResource.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open original video on YouTube <ArrowRight size={15} />
                  </a>
                )}
              </div>
            </div>
          )}

          {activeResource && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-sb-signal">Official resource · ISLRTC</p>
                <h3 className="mt-1 truncate text-base font-extrabold text-sb-soft">{activeResource.title}</h3>
                <p className="mt-1 text-xs text-sb-muted">
                  {activeResource.author} · YouTube · {activeResource.metadataStatus === 'verified' ? 'Metadata checked' : 'Metadata not verified'}
                </p>
              </div>
              <a
                className="shrink-0 font-bold text-sb-signal underline underline-offset-4"
                href={activeResource.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open on YouTube
              </a>
            </div>
          )}
        </section>

        {resources.length > 1 && (
          <section aria-label="Select lesson video" className="space-y-3">
            <h3 className="m-0 text-sm font-extrabold text-sb-soft">More videos in this lesson</h3>
            <div className="flex flex-wrap gap-2">
              {resources.map((resource, index) => (
                <button
                  type="button"
                  key={resource.videoId}
                  aria-pressed={activeResource?.videoId === resource.videoId}
                  className={`${outlineButton} ${activeResource?.videoId === resource.videoId ? 'border-sb-signal bg-[rgba(92,225,214,0.12)]' : ''}`}
                  onClick={() => setActiveResourceId(resource.videoId)}
                >
                  <PlayCircle size={15} />
                  {index === 0 ? 'Primary: ' : ''}{resource.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={`${cardSurface} space-y-6 p-5 sm:p-7`} aria-labelledby="lesson-overview-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="sb-integration-eyebrow">Lesson overview</p>
              <h3 id="lesson-overview-heading" className="m-0 text-xl font-extrabold text-sb-soft sm:text-2xl">
                {selectedLesson.title}
              </h3>
              <p className="mt-2 max-w-3xl leading-relaxed text-sb-body">{selectedLesson.description}</p>
            </div>
            <button
              type="button"
              className={primaryButton}
              disabled={lessonLoading || completedLessonIds.has(String(selectedLesson._id))}
              onClick={completeLesson}
            >
              <CheckCircle2 size={16} />
              {completedLessonIds.has(String(selectedLesson._id)) ? 'Completed' : 'Mark complete'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[rgba(92,225,214,0.2)] px-3 py-1 text-xs font-bold text-sb-signal">
              {selectedLesson.category} · {selectedLesson.level}
            </span>
            {selectedLesson.duration && (
              <span className="rounded-full border border-[rgba(92,225,214,0.14)] px-3 py-1 text-xs font-semibold text-sb-muted">
                {selectedLesson.duration} min
              </span>
            )}
          </div>

          {selectedLesson.introduction && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="m-0 text-base font-extrabold text-sb-soft">About this lesson</h4>
                <span className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-200">
                  SignBridge text: {selectedLesson.contentReviewStatus === 'reviewed' ? 'reviewed' : 'awaiting qualified review'}
                </span>
              </div>
              <p className="m-0 leading-relaxed text-sb-body">{selectedLesson.introduction}</p>
            </div>
          )}

          {selectedLesson.learningObjectives?.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-sb-soft">Learning objectives</h4>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm leading-relaxed text-sb-body">
                {selectedLesson.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </div>
          )}

          {selectedLesson.signs?.length > 0 ? (
            <div className="space-y-4">
              <h4 className="m-0 text-sm font-bold text-sb-soft">Vocabulary and practice</h4>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lesson vocabulary">
                {selectedLesson.signs.map((sign, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedSignIndex === index}
                    className={`${outlineButton} ${selectedSignIndex === index ? 'border-sb-signal bg-[rgba(92,225,214,0.12)]' : ''}`}
                    key={sign._id || `${sign.term}-${index}`}
                    onClick={() => setSelectedSignIndex(index)}
                  >
                    {sign.term}
                  </button>
                ))}
              </div>
              {currentSign && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className={`${cardSurface} overflow-hidden p-4`}>
                    {currentSign.mediaType === 'video' && currentSign.mediaUrl ? (
                      <video className="max-h-80 w-full rounded-xl" controls src={currentSign.mediaUrl}>
                        Video playback is not supported.
                      </video>
                    ) : currentSign.mediaUrl ? (
                      <img className="max-h-80 w-full rounded-xl object-contain" src={currentSign.mediaUrl} alt={`Lesson media for ${currentSign.term}`} />
                    ) : (
                      <p className="text-sm text-sb-muted">No demonstration media was provided for this vocabulary item.</p>
                    )}
                  </div>
                  <div className={`${cardSurface} space-y-3 p-5`}>
                    <h4 className="m-0 font-bold text-sb-soft">{currentSign.term}</h4>
                    <p className="m-0 text-sm leading-relaxed text-sb-body"><strong>Meaning:</strong> {currentSign.meaning}</p>
                    {currentSign.explanation && <p className="m-0 text-sm leading-relaxed text-sb-body"><strong>Explanation:</strong> {currentSign.explanation}</p>}
                    {currentSign.example && <p className="m-0 text-sm leading-relaxed text-sb-body"><strong>Example:</strong> {currentSign.example}</p>}
                    <p className="m-0 text-xs text-amber-200">
                      {currentSign.verified ? 'Marked reviewed in lesson records' : 'Awaiting qualified ISL review'} · Individual sign accuracy is not independently validated here.
                    </p>
                    {currentSign.sourceUrl && (
                      <a className="text-sm font-bold text-sb-signal underline underline-offset-4" href={currentSign.sourceUrl} target="_blank" rel="noreferrer">
                        View listed source
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[rgba(92,225,214,0.18)] p-5">
              <h4 className="m-0 font-bold text-sb-soft">No SignBridge vocabulary entries</h4>
              <p className="mb-0 mt-2 text-sm leading-relaxed text-sb-muted">
                Use the attributed ISLRTC resource for its demonstrations. SignBridge has not added or independently verified individual sign records for this lesson.
              </p>
            </div>
          )}

          {selectedLesson.contentReviewNote && (
            <p className="m-0 rounded-xl bg-[rgba(7,20,33,0.6)] p-4 text-xs leading-relaxed text-sb-muted">
              {selectedLesson.contentReviewNote}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(92,225,214,0.14)] pt-5">
            <div>
              <h4 className="m-0 font-extrabold text-sb-soft">Ready to check your understanding?</h4>
              {quizzes.length === 0 && (
                <p className="mb-0 mt-1 text-sm text-sb-muted">
                  {quizError || 'No published quiz is currently available for this lesson.'}
                </p>
              )}
            </div>
            {quizzes.length > 0 ? (
              <button
                type="button"
                className={primaryButton}
                onClick={() => navigate(`/quiz/lesson/${selectedLesson._id}`)}
              >
                <ClipboardCheck size={17} /> Take lesson quiz
              </button>
            ) : (
              <button type="button" className={primaryButton} disabled>
                <ClipboardCheck size={17} /> Quiz unavailable
              </button>
            )}
          </div>
        </section>
      </article>
    );
  };

  const renderOverview = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <ApiError>{pageError}</ApiError>
      <section className="relative flex items-center justify-between gap-6 overflow-hidden rounded-3xl border border-[rgba(92,225,214,0.25)] bg-gradient-to-br from-[#102738] via-sb-slate to-[#1e3f59] p-6 text-sb-soft shadow-2xl sm:p-9 max-sm:flex-col max-sm:items-start">
        <div className="relative z-10">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back, {profile?.name || 'learner'}! 👋</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-sb-body">
            Your learning overview reflects published lessons and completions saved to your account.
            No recognition metrics or unverified learning totals are shown.
          </p>
        </div>
        <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#4de4d8] px-6 py-3.5 text-sm font-extrabold text-sb-midnight shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('lessons')}>
          <PlayCircle size={18} /><span>Browse lessons</span>
        </button>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-sb-soft"><Zap size={20} className="text-sb-signal" />Feature Shortcuts</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('lessons')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-[rgba(92,225,214,0.3)] bg-[rgba(92,225,214,0.12)] text-sb-signal transition group-hover:scale-105"><BookOpen size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Lessons & Curricula</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">Browse published lesson content, review supplied material, and complete quizzes.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Explore lessons <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => navigate('/quiz')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-[rgba(92,225,214,0.3)] bg-[rgba(92,225,214,0.12)] text-sb-signal transition group-hover:scale-105"><ClipboardCheck size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Quizzes & Tests</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">Choose an available lesson quiz or check full-course test readiness.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Explore quizzes <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('studio')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-[rgba(146,117,255,0.3)] bg-[rgba(146,117,255,0.15)] text-sb-violet transition group-hover:scale-105"><Video size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Recognition Studio</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">The recognition and communication workspace is not available yet.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Coming soon <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('community')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-sb-signal bg-[rgba(92,225,214,0.15)] text-sb-signal transition group-hover:scale-105"><Users size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Practice Partners</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">Directory, matching, and partner messaging are not implemented.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Unavailable <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('achievements')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-[rgba(167,243,208,0.3)] bg-[rgba(167,243,208,0.12)] text-[#a7f3d0] transition group-hover:scale-105"><Shield size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Credentials</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">Credential issuance and blockchain verification are not implemented.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Planned <ArrowRight size={14} /></span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><TrendingUp size={18} className="text-sb-signal" />Learning Progress</h2>
            <button type="button" className="sb-integration-text-button" onClick={refreshProgress}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          {pageLoading ? (
            <p className="sb-integration-state" role="status">Loading learning progress…</p>
          ) : selectedLesson ? (
            <>
              {lessonLoading && <p className="sb-integration-state" role="status">Loading lesson…</p>}
              {renderLessonDetail()}
            </>
          ) : (
            <>
              <p className="sb-integration-muted">Calculated from unique completions of published lessons.</p>
              <div className="sb-progress-stats-row">
                <div className="sb-stat-tile">
                  <div className="sb-stat-number">{progress?.completedLessons ?? 0}</div>
                  <div className="sb-stat-label">Lessons completed</div>
                </div>
                <div className="sb-stat-tile">
                  <div className="sb-stat-number">{progress?.totalLessons ?? 0}</div>
                  <div className="sb-stat-label">Published lessons</div>
                </div>
              </div>
              <div className="sb-progress-bar-container">
                <div className="sb-progress-header">
                    <span>Published lesson path</span>
                  <span>{progress?.percentage ?? 0}% complete</span>
                </div>
                <div
                  className="sb-progress-track"
                  role="progressbar"
                  aria-label="Lesson completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress?.percentage ?? 0}
                >
                  <div className="sb-progress-fill" style={{ width: `${progress?.percentage ?? 0}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 shadow-sm backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><BookOpen size={18} className="text-sb-signal" />Recent Lessons</h2>
          {pageLoading ? (
            <p className="sb-integration-state" role="status">Loading published lessons…</p>
          ) : lessons.length === 0 ? (
            <p className="sb-integration-empty-copy">No published lessons are available yet.</p>
          ) : (
            <div className="sb-lessons-list">
              {lessons.slice(0, 3).map((lesson) => (
                <button className="sb-lesson-item" type="button" key={lesson._id} onClick={() => openLesson(lesson)}>
                  <span className="sb-lesson-meta">
                    <span className="sb-lesson-thumb"><BookOpen size={20} /></span>
                    <span>
                      <span className="sb-lesson-title">{lesson.title}</span>
                      <span className="sb-lesson-sub">{lesson.category} · {lesson.level}</span>
                    </span>
                  </span>
                  <span className={`sb-lesson-badge ${completedLessonIds.has(String(lesson._id)) ? 'badge-completed' : 'badge-active'}`}>
                    {completedLessonIds.has(String(lesson._id)) ? 'Completed' : 'Open lesson'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderLessons = () => (
    <div className="sb-curriculum-container mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <ApiError>{pageError || lessonError}</ApiError>
      <header>
        <p className="sb-integration-eyebrow">Indian Sign Language</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="sb-integration-page-title">Lessons & Curricula</h1>
          <button type="button" className={outlineButton} onClick={refreshLessons} disabled={refreshingLessons}>
            <RefreshCw size={15} className={refreshingLessons ? 'animate-spin' : ''} />
            {refreshingLessons ? 'Refreshing…' : 'Refresh published lessons'}
          </button>
        </div>
        <p className="sb-integration-muted">
          Lesson content is shown as supplied. A review marker does not independently establish
          the accuracy of ISL instruction or linked media; content awaiting qualified review is labeled.
        </p>
      </header>
      {pageLoading ? (
        <p className="sb-integration-state" role="status">Loading published lessons…</p>
      ) : lessons.length === 0 ? (
        <div className="sb-integration-empty">
          <BookOpen size={28} />
          <h3>No published lessons yet</h3>
          <p>Only published lessons are available here. Draft lessons awaiting qualified ISL review are not shown to learners.</p>
          <button type="button" className={outlineButton} onClick={refreshLessons} disabled={refreshingLessons}>
            <RefreshCw size={15} className={refreshingLessons ? 'animate-spin' : ''} />
            {refreshingLessons ? 'Refreshing…' : 'Refresh published lessons'}
          </button>
        </div>
      ) : (
        <>
          <div className="sb-modules-nav-pills" role="group" aria-label="Published lessons">
            {visibleLessons.map((lesson) => (
              <button
                type="button"
                key={lesson._id}
                className={`sb-module-pill ${selectedLesson?._id === lesson._id ? 'active' : ''}`}
                onClick={() => openLesson(lesson)}
              >
                <BookOpen size={17} />
                <span>{lesson.title}</span>
                {completedLessonIds.has(String(lesson._id)) && <CheckCircle2 size={16} />}
              </button>
            ))}
            {visibleLessons.length === 0 && <p className="sb-integration-empty-copy">No lessons match your search.</p>}
          </div>
          <div className="sb-integration-lesson-list">
            <label className="sb-nav-search">
              <Search size={16} />
              <input
                type="search"
                aria-label="Search lessons"
                placeholder="Search published lessons"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
          {renderLessonDetail()}
        </>
      )}
    </div>
  );

  const renderStudio = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <div className="sb-integration-section-heading">
          <h1 className="sb-integration-page-title">Live Gesture Studio & AI Chat</h1>
          <span className="sb-lesson-badge badge-active">Not implemented yet</span>
        </div>
        <p className="sb-integration-muted">
          Sign recognition, sign-to-text translation, generated glosses, and AI chat are not available.
          This page does not access your camera or send images or conversations to a third party.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className={columnCard}>
          <div className="sb-integration-section-heading">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><Video size={18} className="text-sb-signal" />Camera & Recognition</h2>
            <span className="sb-integration-eyebrow">Coming soon</span>
          </div>
          <div className="sb-demo-viewport sb-integration-empty">
            <div>
              <Video size={32} />
              <h3>Recognition is not implemented</h3>
              <p>No camera preview or recognition process is running.</p>
            </div>
          </div>
          <div className="sb-prediction-hud">
            <p><strong>Prediction:</strong> Unavailable</p>
            <p><strong>Confidence:</strong> Not measured</p>
            <button type="button" className={primaryButton} disabled>
              <Video size={15} /> Start recognition
            </button>
          </div>
        </section>
        <section className={columnCard}>
          <div className="sb-integration-section-heading">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><MessageSquare size={18} className="text-sb-signal" />Communication</h2>
            <span className="sb-integration-eyebrow">Unavailable</span>
          </div>
          <div className="sb-chat-container">
            <div className="sb-chat-messages sb-integration-empty">
              <p>No messages or example conversations are shown.</p>
            </div>
            <label className="sb-integration-muted" htmlFor="disabled-studio-message">
              Message input is unavailable until a supported communication service is implemented.
            </label>
            <textarea id="disabled-studio-message" className="sb-editable-textarea" disabled />
            <button type="button" className={primaryButton} disabled>
              Send message
            </button>
          </div>
          <div className="sb-avatar-isl-card">
            <Sparkles size={18} />
            <span>No sign-sequence avatar or validated gloss player is available.</span>
          </div>
        </section>
      </div>
      <div className="sb-integration-contract">
        <Shield size={18} />
        <span>
          Future recognition must support an explicitly limited vocabulary, disclose limitations,
          and request clear consent before camera access or external processing. Unrestricted ISL
          translation is not claimed.
        </span>
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <div className="sb-integration-section-heading">
          <h1 className="sb-integration-page-title">Practice Partners & ISL Community</h1>
          <span className="sb-lesson-badge badge-active">Unavailable</span>
        </div>
        <p className="sb-integration-muted">
          There is no partner directory, matching, chat, or call service connected to this application.
          No learner profiles are being listed or shared.
        </p>
      </header>
      <section className={`${cardSurface} flex items-center justify-between gap-4 p-6 max-sm:flex-col max-sm:items-start`}>
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><Radio size={20} className="text-sb-signal" />Partner Discovery</h2>
          <p className="sb-integration-muted">Matching and directory visibility are not implemented.</p>
        </div>
        <label className="sb-switch sb-disabled-switch">
          <input type="checkbox" checked={communityMatching} disabled readOnly aria-label="Partner matching consent preference" />
          <span className="sb-slider" />
        </label>
      </section>
      <div className="sb-integration-filter-row" aria-label="Partner directory filters">
        <button className={outlineButton} type="button" disabled>All partners</button>
        <button className={outlineButton} type="button" disabled>ISL practitioners</button>
        <button className={outlineButton} type="button" disabled>Practice peers</button>
      </div>
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[rgba(92,225,214,0.14)] p-8 text-center text-[#8197ab]">
        <Users size={30} />
        <h2>No partner results</h2>
        <p>Partner profiles and matching will appear here only after a real, consent-based service exists.</p>
        <button type="button" className={outlineButton} disabled>
          <Video size={15} /> Start a practice call
        </button>
      </section>
      <div className="sb-integration-contract">
        <Shield size={18} />
        <span>Before activation, partner matching must be opt-in and disclose exactly what profile information is shared.</span>
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <div className="sb-integration-section-heading">
          <h1 className="sb-integration-page-title">Milestones & Credentials</h1>
          <span className="sb-lesson-badge badge-active">Blockchain not implemented</span>
        </div>
        <p className="sb-integration-muted">
          Your published lesson completions are available below. No certificates, on-chain proofs,
          transaction hashes, wallet addresses, recognition awards, or XP totals have been issued.
        </p>
      </header>
      <div className="my-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className={`${cardSurface} flex min-w-0 flex-col items-start gap-4 p-6`}>
          <span className="sb-metric-icon icon-deep-bg"><BookOpen size={22} /></span>
          <span className="break-all text-2xl font-extrabold text-sb-signal">{progress?.completedLessons ?? 0}</span>
          <span className="text-xs font-semibold text-sb-muted">Lessons completed</span>
        </article>
        <article className={`${cardSurface} flex min-w-0 flex-col items-start gap-4 p-6`}>
          <span className="sb-metric-icon icon-purple-bg"><TrendingUp size={22} /></span>
          <span className="break-all text-2xl font-extrabold text-sb-signal">{progress?.percentage ?? 0}%</span>
          <span className="text-xs font-semibold text-sb-muted">Learning path progress</span>
        </article>
        <article className={`${cardSurface} flex min-w-0 flex-col items-start gap-4 p-6`}>
          <span className="sb-metric-icon icon-light-bg"><FileCheck size={22} /></span>
          <span className="break-all text-2xl font-extrabold text-sb-signal">Not issued</span>
          <span className="text-xs font-semibold text-sb-muted">Verifiable credentials</span>
        </article>
      </div>
      <section>
        <div className="sb-section-heading">
          <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><Shield size={20} className="text-sb-signal" />Official Certificates & On-Chain Credentials</h2>
        </div>
        <article className={`${columnCard} relative sb-integration-credential-card`}>
          <span className="sb-chain-verified-pill sb-integration-unavailable-pill">
            <AlertCircle size={14} /> Not implemented
          </span>
          <h3>Credential issuance and verification are unavailable</h3>
          <p>
            No certificate has been issued or verified by this application. The backend has no
            blockchain contract or credential verification service.
          </p>
          <button type="button" className={outlineButton} disabled>
            <Shield size={14} /> Verify credential
          </button>
        </article>
      </section>
      <section>
        <div className="sb-section-heading">
          <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><Trophy size={20} className="text-sb-signal" />Learning Milestones</h2>
        </div>
        <div className="sb-achievements-grid">
          {(progress?.achievements || []).map((achievement) => (
            <article className="sb-achievement-card" key={achievement}>
              <div className="sb-achievement-badge-icon badge-unlocked"><CheckCircle2 size={22} /></div>
              <h3 className="sb-achieve-name">{achievement}</h3>
              <p className="sb-achieve-desc">Recorded from saved learning progress.</p>
            </article>
          ))}
          {(!progress?.achievements || progress.achievements.length === 0) && (
            <div className="sb-integration-empty">
              <Award size={28} />
              <p>No milestones have been recorded yet.</p>
            </div>
          )}
        </div>
      </section>
      <div className="sb-integration-contract">
        <Database size={18} />
        <span>Future credential proofs may be stored on-chain only after implementation; private information and conversations must remain off-chain.</span>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <h1 className="sb-integration-page-title">Profile & Settings</h1>
        <p className="sb-integration-muted">Update profile preferences and privacy consent saved to your account.</p>
      </header>
      <ApiError>{pageError}</ApiError>
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-2 shadow-sm" role="tablist" aria-label="Profile settings">
        {[
          { id: 'profile', title: 'Profile & Preferences', icon: User },
          { id: 'accessibility', title: 'Language & Accessibility', icon: Eye },
          { id: 'progress', title: 'Manage Saved Progress', icon: Database },
          { id: 'account', title: 'Account Data & Privacy', icon: Shield },
        ].map(({ id, title, icon: Icon }) => (
          <button
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal ${
              settingsSubTab === id
                ? 'border-transparent bg-gradient-to-br from-sb-violet to-sb-signal font-extrabold text-sb-midnight shadow-md'
                : 'border-transparent bg-transparent font-semibold text-sb-muted hover:bg-[rgba(7,20,33,0.5)] hover:text-sb-soft'
            }`}
            type="button"
            role="tab"
            aria-selected={settingsSubTab === id}
            key={id}
            onClick={() => setSettingsSubTab(id)}
          >
            <Icon size={16} /><span>{title}</span>
          </button>
        ))}
      </div>

      {settingsSubTab === 'profile' && (
        <form className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" onSubmit={saveProfile}>
          <section className={columnCard}>
            <div className="sb-settings-card-title"><User size={18} /><span>Personal Information</span></div>
            <p className="sb-settings-card-desc">These profile fields are read and saved using your authenticated account.</p>
            <div className="sb-two-col">
              <label className="sb-form-field">
                <span className="sb-form-label">Full Name</span>
                <input className="sb-input-field" value={profileName} minLength={2} maxLength={80} required onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <label className="sb-form-field">
                <span className="sb-form-label">Email Address</span>
                <input className="sb-input-field" value={profile?.email || ''} type="email" disabled />
              </label>
            </div>
            <div className="sb-integration-form-actions">
              <button className={primaryButton} type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </section>
        </form>
      )}

      {settingsSubTab === 'accessibility' && (
        <form className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" onSubmit={saveProfile}>
          <section className={columnCard}>
            <div className="sb-settings-card-title"><Languages size={18} /><span>Language & Accessibility</span></div>
            <div className="sb-two-col">
              <label className="sb-form-field">
                <span className="sb-form-label">Spoken language preference</span>
                <select className="sb-input-field" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </label>
            </div>
            <label className="sb-toggle-row">
              <span className="sb-toggle-info"><span className="sb-toggle-title">Accessibility mode</span><span className="sb-toggle-sub">Saved to your profile preferences.</span></span>
              <span className="sb-switch"><input type="checkbox" checked={accessibilityMode} onChange={(event) => setAccessibilityMode(event.target.checked)} /><span className="sb-slider" /></span>
            </label>
            <label className="sb-toggle-row">
              <span className="sb-toggle-info"><span className="sb-toggle-title">Reduce motion</span><span className="sb-toggle-sub">Saved to your profile preferences.</span></span>
              <span className="sb-switch"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /><span className="sb-slider" /></span>
            </label>
            <button className={primaryButton} type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save preferences'}
            </button>
          </section>
        </form>
      )}

      {settingsSubTab === 'progress' && (
        <section className={columnCard}>
          <div className="sb-settings-card-title"><Database size={18} /><span>Learning Progress</span></div>
          {pageLoading ? (
            <p className="sb-integration-state" role="status">Loading saved progress…</p>
          ) : (
            <div className="sb-storage-box">
              <p>{progress?.completedLessons ?? 0} of {progress?.totalLessons ?? 0} published lessons completed.</p>
              <p>{progress?.percentage ?? 0}% of the current published learning path.</p>
              <button type="button" className={outlineButton} onClick={refreshProgress}>
                <RefreshCw size={15} /> Refresh saved progress
              </button>
            </div>
          )}
        </section>
      )}

      {settingsSubTab === 'account' && (
        <form className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" onSubmit={saveProfile}>
          <section className={columnCard}>
            <div className="sb-settings-card-title"><Shield size={18} /><span>Account Data & Privacy</span></div>
            <p className="sb-settings-card-desc">
              Conversation and matching consent preferences are saved to your profile. Conversation
              and partner features are not enabled in this interface.
            </p>
            <label className="sb-toggle-row">
              <span className="sb-toggle-info"><span className="sb-toggle-title">Allow saving conversations</span><span className="sb-toggle-sub">Applies only if a conversation feature is later connected.</span></span>
              <span className="sb-switch"><input type="checkbox" checked={saveConversations} onChange={(event) => setSaveConversations(event.target.checked)} /><span className="sb-slider" /></span>
            </label>
            <label className="sb-toggle-row">
              <span className="sb-toggle-info"><span className="sb-toggle-title">Partner matching consent</span><span className="sb-toggle-sub">No directory or matching service is currently active.</span></span>
              <span className="sb-switch"><input type="checkbox" checked={communityMatching} onChange={(event) => setCommunityMatching(event.target.checked)} /><span className="sb-slider" /></span>
            </label>
            <button className={primaryButton} type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save privacy preferences'}
            </button>
          </section>
        </form>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#071421] bg-[radial-gradient(at_0%_0%,rgba(146,117,255,0.12)_0px,transparent_45%),radial-gradient(at_100%_100%,rgba(92,225,214,0.1)_0px,transparent_45%)] text-[#c9d9e8]">
      <aside className="z-30 flex w-[275px] shrink-0 flex-col border-r border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.95)] p-5 shadow-sm backdrop-blur-xl max-lg:w-[76px] max-lg:px-2 max-sm:w-14 max-sm:px-1">
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sb-violet to-sb-signal text-2xl text-sb-midnight shadow-lg" aria-hidden="true">🤟</div>
          <div className="max-lg:hidden">
            <div className="text-xl font-extrabold tracking-tight text-sb-soft">SignBridge <span className="text-sb-signal">AI</span></div>
            <div className="text-[0.68rem] font-bold uppercase tracking-widest text-sb-violet">Inclusive Sign & Speech</div>
          </div>
        </div>
        <div className="mb-2 ml-2 mt-5 text-xs font-bold uppercase tracking-widest text-sb-muted max-lg:sr-only">Menu</div>
        <nav aria-label="Main navigation">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {navigation.map(({ id, label, icon: Icon, badge }) => (
              <li key={id}>
                <button
                  type="button"
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal ${
                  activeNav === id
                    ? 'border-sb-signal bg-gradient-to-r from-sb-signal to-[#84f1e9] font-extrabold text-sb-midnight shadow-lg'
                    : 'border-transparent bg-transparent font-semibold text-sb-muted hover:border-[rgba(92,225,214,0.2)] hover:bg-[rgba(24,48,65,0.6)] hover:text-sb-soft'
                }`}
                aria-current={activeNav === id ? 'page' : undefined}
                aria-label={label}
                onClick={() => (id === 'quizzes' ? navigate('/quiz') : setActiveNav(id))}
                >
                  <Icon size={18} />
                  <span className="max-lg:hidden">{label}</span>
                  {badge && <span className="ml-auto rounded-xl bg-sb-violet px-2 py-0.5 text-[0.68rem] font-bold text-white max-lg:hidden">{badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sb-sidebar-bottom">
          <button
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.6)] p-3 text-left transition-colors hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)]"
            type="button"
            title="Open profile and settings"
            onClick={() => setActiveNav('settings')}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sb-violet to-sb-signal font-extrabold text-sb-midnight">{(profile?.name || 'L').charAt(0).toUpperCase()}</span>
            <span className="flex min-w-0 flex-col max-lg:hidden">
              <span className="truncate text-sm font-bold text-sb-soft">{profile?.name || 'Learner'}</span>
              <span className="text-xs text-sb-signal">ISL learner</span>
            </span>
          </button>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:border hover:border-red-500/30 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
            <LogOut size={16} /><span className="max-lg:hidden">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-transparent">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.85)] px-5 py-4 backdrop-blur-xl max-sm:flex-wrap sm:px-8">
          <label className="sb-nav-search !w-full max-w-[340px] max-md:max-w-[180px]">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search lessons"
              placeholder="Search published lessons..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => activeNav !== 'lessons' && setActiveNav('lessons')}
            />
          </label>
          <div className="sb-nav-actions">
            <span className="sb-integration-language"><Languages size={15} /> Indian Sign Language</span>
            <span className="sb-integration-progress-chip"><Zap size={15} /> {progress?.percentage ?? 0}% progress</span>
          </div>
        </header>
        {activeNav === 'dashboard' && renderOverview()}
        {activeNav === 'lessons' && renderLessons()}
        {activeNav === 'studio' && renderStudio()}
        {activeNav === 'community' && renderCommunity()}
        {activeNav === 'achievements' && renderAchievements()}
        {activeNav === 'settings' && renderSettings()}
      </main>
      {toastMessage && (
        <div className="sb-toast" role="status">
          <CheckCircle2 size={18} color="var(--sb-signal-teal)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
