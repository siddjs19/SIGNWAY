import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Camera,
  Database,
  Eye,
  FileCheck,
  Languages,
  Loader2,
  MessageSquare,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
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
import AppSidebar from '../components/AppSidebar';
import {
  createHandLandmarker,
  extractHandLandmarks,
  normalizeRecognitionFrame,
} from '../services/handLandmarker';
import { startIslBridgeRecognitionLoop } from '../services/islBridgeRecognitionLoop';
import './Dashboard.css';

const cardSurface = 'rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] shadow-sm backdrop-blur-xl';
const columnCard = `${cardSurface} flex flex-col gap-5 p-6`;
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-5 py-2.5 text-sm font-extrabold text-sb-midnight shadow-md transition hover:opacity-95 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-60';
const outlineButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.6)] px-5 py-2.5 text-sm font-extrabold text-sb-signal transition hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-60';
const RECOGNITION_FRAME_COUNT = 30;
const MAX_ISL_BRIDGE_IMAGE_BYTES = 2 * 1024 * 1024;
const ISL_BRIDGE_DEFAULT_INTERVAL_MS = 700;
const ISL_BRIDGE_MAX_FRAME_WIDTH = 480;

function captureJpegDataUrl(video) {
  if (
    !video
    || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    || video.videoWidth === 0
    || video.videoHeight === 0
  ) {
    return Promise.reject(new Error('The camera preview is not ready. Wait for a frame and try again.'));
  }

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, ISL_BRIDGE_MAX_FRAME_WIDTH / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.reject(new Error('Could not prepare a camera frame for recognition.'));
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not capture a JPEG frame from the camera.'));
        return;
      }
      if (blob.size > MAX_ISL_BRIDGE_IMAGE_BYTES) {
        reject(new Error('Captured frame is larger than the 2 MiB limit. Try reducing camera resolution.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:image/jpeg;base64,')) {
          resolve(reader.result);
        } else {
          reject(new Error('The camera frame could not be encoded as JPEG.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read the captured JPEG frame.'));
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.65);
  });
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState(() => location.state?.activeNav || 'dashboard');
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
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [landmarkerStatus, setLandmarkerStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [landmarkerError, setLandmarkerError] = useState('');
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [landmarkConsent, setLandmarkConsent] = useState(false);
  const [recognitionRequestStatus, setRecognitionRequestStatus] = useState('idle');
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const [recognitionPrediction, setRecognitionPrediction] = useState(null);
  const [recognitionFrameCount, setRecognitionFrameCount] = useState(0);
  const [islBridgeConsent, setIslBridgeConsent] = useState(false);
  const [islBridgeStatus, setIslBridgeStatus] = useState('idle');
  const [islBridgeError, setIslBridgeError] = useState('');
  const [islBridgeResult, setIslBridgeResult] = useState(null);
  const [islBridgeIsRunning, setIslBridgeIsRunning] = useState(false);
  const [islBridgeLatencyMs, setIslBridgeLatencyMs] = useState(null);
  const [recognitionProviderMode, setRecognitionProviderMode] = useState('isl-bridge');
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraStartTokenRef = useRef(0);
  const handLandmarkerRef = useRef(null);
  const detectionFrameRef = useRef(null);
  const recognitionFramesRef = useRef([]);
  const recognitionRequestInFlightRef = useRef(false);
  const islBridgeRequestInFlightRef = useRef(false);
  const islBridgeRecognitionStopRef = useRef(null);

  const completedLessonIds = useMemo(
    () => new Set((progress?.completedLessonIds || []).map(String)),
    [progress],
  );
  const inProgressLessonIds = useMemo(
    () => new Set((progress?.inProgressLessonIds || []).map(String)),
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
  const lessonModules = useMemo(() => {
    const groups = new Map();
    for (const lesson of visibleLessons) {
      const title = lesson.moduleTitle || lesson.category || 'Course lessons';
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title).push(lesson);
    }
    return [...groups.entries()].map(([title, items]) => ({ title, lessons: items }));
  }, [visibleLessons]);
  const currentSign = selectedLesson?.signs?.[selectedSignIndex] || null;

  const stopRecognitionCamera = useCallback(() => {
    islBridgeRecognitionStopRef.current?.();
    islBridgeRecognitionStopRef.current = null;
    setIslBridgeIsRunning(false);
    cameraStartTokenRef.current += 1;
    window.cancelAnimationFrame(detectionFrameRef.current);
    detectionFrameRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    recognitionFramesRef.current = [];
    setDetectedHandCount(0);
    setRecognitionFrameCount(0);
    setRecognitionPrediction(null);
    setRecognitionRequestStatus('idle');
    setRecognitionMessage('');
    setIslBridgeConsent(false);
    setIslBridgeStatus('idle');
    setIslBridgeError('');
    setIslBridgeResult(null);
    setIslBridgeLatencyMs(null);
    setLandmarkConsent(false);
    setCameraStatus('idle');
    setLandmarkerStatus('idle');
    setLandmarkerError('');
  }, []);

  useEffect(() => {
    return () => {
      islBridgeRecognitionStopRef.current?.();
      islBridgeRecognitionStopRef.current = null;
      cameraStartTokenRef.current += 1;
      window.cancelAnimationFrame(detectionFrameRef.current);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      handLandmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (activeNav !== 'studio' && (cameraStatus === 'starting' || cameraStreamRef.current)) {
      stopRecognitionCamera();
    }
  }, [activeNav, cameraStatus, stopRecognitionCamera]);

  const handleSidebarNavigate = (id) => {
    if (id === 'quizzes') {
      navigate('/quiz');
      return;
    }
    if (id === 'practitioners') {
      navigate('/practitioners');
      return;
    }
    if (id === 'credentials') {
      navigate('/credentials');
      return;
    }
    setActiveNav(id);
  };

  async function startRecognitionCamera() {
    if (cameraStatus === 'starting' || cameraStatus === 'active') return;
    const startToken = cameraStartTokenRef.current + 1;
    cameraStartTokenRef.current = startToken;
    setCameraStatus('starting');
    setCameraError('');
    setLandmarkerError('');
    setRecognitionMessage('');
    setRecognitionRequestStatus('idle');
    setRecognitionPrediction(null);
    recognitionFramesRef.current = [];
    setRecognitionFrameCount(0);
    setLandmarkConsent(false);
    setIslBridgeConsent(false);
    setIslBridgeStatus('idle');
    setIslBridgeError('');
    setIslBridgeResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError('Camera access is unavailable in this browser or page context. Use a supported browser over HTTPS or localhost.');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
      });
    } catch (error) {
      if (cameraStartTokenRef.current !== startToken) return;
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        setCameraStatus('denied');
        setCameraError('Camera permission was denied. Allow camera access in your browser settings, then try again.');
      } else if (['NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'OverconstrainedError'].includes(error.name)) {
        setCameraStatus('unavailable');
        setCameraError('No usable camera is available. Connect or enable a camera, then try again.');
      } else {
        setCameraStatus('error');
        setCameraError('The camera could not be started. Please try again.');
      }
      return;
    }

    if (cameraStartTokenRef.current !== startToken) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    cameraStreamRef.current = stream;
    if (!cameraVideoRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStatus('error');
      setCameraError('The camera preview could not be initialized.');
      return;
    }

    cameraVideoRef.current.srcObject = stream;
    try {
      await cameraVideoRef.current.play();
    } catch {
      if (cameraStartTokenRef.current !== startToken) return;
      stopRecognitionCamera();
      setCameraStatus('error');
      setCameraError('The local camera preview could not be played.');
      return;
    }
    if (cameraStartTokenRef.current !== startToken) return;
    setCameraStatus('active');
    setLandmarkerStatus('loading');

    let landmarker;
    try {
      landmarker = await createHandLandmarker();
    } catch {
      if (cameraStartTokenRef.current !== startToken) return;
      setLandmarkerStatus('error');
      setLandmarkerError('MediaPipe could not load its browser runtime or hand-landmark model. Check your connection and try restarting the camera.');
      return;
    }

    if (cameraStreamRef.current !== stream || cameraStartTokenRef.current !== startToken) {
      landmarker.close();
      return;
    }

    handLandmarkerRef.current = landmarker;
    setLandmarkerStatus('ready');
    let lastDetectionTime = 0;

    const detectHands = (timestamp) => {
      const video = cameraVideoRef.current;
      if (!cameraStreamRef.current || !handLandmarkerRef.current || !video) return;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && timestamp - lastDetectionTime >= 100) {
        lastDetectionTime = timestamp;
        try {
          const result = handLandmarkerRef.current.detectForVideo(video, timestamp);
          const payload = extractHandLandmarks(result);
          setDetectedHandCount(payload.hands.length);
          const frame = normalizeRecognitionFrame(payload.hands);
          if (frame) {
            const nextFrames = [...recognitionFramesRef.current, frame].slice(-RECOGNITION_FRAME_COUNT);
            recognitionFramesRef.current = nextFrames;
            setRecognitionFrameCount(nextFrames.length);
          }
        } catch {
          setLandmarkerStatus('error');
          setLandmarkerError('Local hand-landmark extraction failed. Stop and restart the camera to try again.');
          recognitionFramesRef.current = [];
          setRecognitionFrameCount(0);
          setDetectedHandCount(0);
          handLandmarkerRef.current.close();
          handLandmarkerRef.current = null;
          return;
        }
      }
      detectionFrameRef.current = window.requestAnimationFrame(detectHands);
    };

    detectionFrameRef.current = window.requestAnimationFrame(detectHands);
  }

  async function recognizeCurrentSign() {
    if (
      recognitionRequestInFlightRef.current
      || !landmarkConsent
      || recognitionFramesRef.current.length !== RECOGNITION_FRAME_COUNT
    ) return;

    recognitionRequestInFlightRef.current = true;
    setRecognitionRequestStatus('loading');
    setRecognitionMessage('');
    setRecognitionPrediction(null);
    try {
      const response = await api.post('/recognition/landmarks', {
        sequence: recognitionFramesRef.current,
      });
      if (!response.data?.success) {
        throw new Error('The recognition service returned an invalid response.');
      }
      if (response.data.abstained === true) {
        setRecognitionRequestStatus('abstained');
        setRecognitionMessage(response.data.message || 'Jestally did not return a sign for this sequence.');
        return;
      }
      if (!response.data?.prediction?.sign) {
        throw new Error('The recognition service returned an invalid response.');
      }
      setRecognitionPrediction(response.data.prediction);
      setRecognitionRequestStatus('success');
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
      } else {
        setRecognitionRequestStatus('error');
        setRecognitionMessage(
          error.response?.data?.message
          || error.message
          || 'Recognition failed. No prediction was produced.',
        );
      }
    } finally {
      recognitionRequestInFlightRef.current = false;
    }
  }

  function startContinuousIslBridgeRecognition() {
    if (
      islBridgeRecognitionStopRef.current
      || cameraStatus !== 'active'
      || !islBridgeConsent
    ) return;

    setIslBridgeError('');
    setIslBridgeResult(null);
    setIslBridgeLatencyMs(null);
    setIslBridgeStatus('running');
    setIslBridgeIsRunning(true);
    islBridgeRecognitionStopRef.current = startIslBridgeRecognitionLoop({
      intervalMs: ISL_BRIDGE_DEFAULT_INTERVAL_MS,
      captureFrame: () => captureJpegDataUrl(cameraVideoRef.current),
      submitFrame: async (image) => {
        const response = await api.post('/recognition/isl-bridge/frame', {
          image,
          language: 'en',
        });
        if (
          response.data?.success !== true
          || !response.data?.result
          || !['sign', 'word', 'sentence'].every((key) => (
            typeof response.data.result[key] === 'string'
          ))
        ) {
          throw new Error('ISL Bridge returned an invalid response.');
        }
        return response.data.result;
      },
      onRequestStart: () => {
        setIslBridgeStatus('loading');
        setIslBridgeError('');
      },
      onResult: (result) => {
        setIslBridgeResult(result);
        setIslBridgeStatus('success');
        setIslBridgeError('');
      },
      onEmpty: () => setIslBridgeStatus('empty'),
      onError: (error) => {
        if (error.response?.status === 401) {
          onLogout();
          return;
        }
        setIslBridgeStatus('error');
        setIslBridgeError(
          error.response?.data?.message
          || error.message
          || 'ISL Bridge recognition failed. No result was produced.',
        );
      },
      onLatency: (latencyMs) => setIslBridgeLatencyMs(Math.round(latencyMs)),
      requestLock: islBridgeRequestInFlightRef,
    });
  }

  function stopContinuousIslBridgeRecognition() {
    islBridgeRecognitionStopRef.current?.();
    islBridgeRecognitionStopRef.current = null;
    setIslBridgeIsRunning(false);
    if (islBridgeStatus === 'running' || islBridgeStatus === 'loading') {
      setIslBridgeStatus(islBridgeResult ? 'success' : 'idle');
    }
  }

  function selectRecognitionProvider(provider) {
    stopContinuousIslBridgeRecognition();
    setRecognitionProviderMode(provider);
    setRecognitionRequestStatus('idle');
    setRecognitionMessage('');
    setRecognitionPrediction(null);
    setIslBridgeStatus('idle');
    setIslBridgeError('');
    setIslBridgeResult(null);
    setIslBridgeLatencyMs(null);
  }

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
    setPageError('');
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

      try {
        const accessResponse = await api.post('/progress/access-lesson', {
          lessonId: lessonData._id,
        });
        setProgress(accessResponse.data.progress);
      } catch (error) {
        if (error.response?.status === 401) {
          onLogout();
          return;
        }
        setPageError(errorMessage(error, 'Unable to save lesson activity.'));
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
      <article className="mx-auto flex w-full max-w-280 flex-col gap-7">
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
            <span className="rounded-full border border-[rgba(92,225,214,0.14)] px-3 py-1 text-xs font-semibold text-sb-muted">
              {completedLessonIds.has(String(selectedLesson._id))
                ? 'Completed'
                : inProgressLessonIds.has(String(selectedLesson._id))
                  ? 'In progress'
                  : 'Not started'}
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

          {selectedLesson.practiceActivities?.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-sb-soft">Guided practice</h4>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm leading-relaxed text-sb-body">
                {selectedLesson.practiceActivities.map((activity) => <li key={activity}>{activity}</li>)}
              </ul>
              <p className="mb-0 mt-2 text-xs text-sb-muted">
                These activities guide review of the linked source; they do not assess signing accuracy.
              </p>
            </div>
          )}

          {selectedLesson.keyTakeaways?.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-sb-soft">Key takeaways</h4>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm leading-relaxed text-sb-body">
                {selectedLesson.keyTakeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}
              </ul>
              <p className="mb-0 mt-2 text-xs text-sb-muted">
                Source and course metadata only; these takeaways do not verify individual ISL signs or instruction.
              </p>
            </div>
          )}

          {selectedLesson.completionChecklist?.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-sb-soft">Completion checklist</h4>
              <ul className="m-0 list-none space-y-2 p-0 text-sm leading-relaxed text-sb-body">
                {selectedLesson.completionChecklist.map((item) => (
                  <li className="flex items-start gap-2" key={item}>
                    <span className="mt-1 size-3 shrink-0 rounded-full border border-sb-signal" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
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
    <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <ApiError>{pageError}</ApiError>
      <section className="relative flex items-center justify-between gap-6 overflow-hidden rounded-3xl border border-[rgba(92,225,214,0.25)] bg-linear-to-br from-[#102738] via-sb-slate to-[#1e3f59] p-6 text-sb-soft shadow-2xl sm:p-9 max-sm:flex-col max-sm:items-start">
        <div className="relative z-10">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back, {profile?.name || 'learner'}! 👋</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-sb-body">
            Your learning overview reflects published lessons and completions saved to your account.
            No recognition metrics or unverified learning totals are shown.
          </p>
        </div>
        <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-linear-to-br from-sb-signal to-[#4de4d8] px-6 py-3.5 text-sm font-extrabold text-sb-midnight shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => setActiveNav('lessons')}>
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
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => navigate('/practitioners')}>
            <span className="mb-4 grid size-13 place-items-center rounded-2xl border border-sb-signal bg-[rgba(92,225,214,0.15)] text-sb-signal transition group-hover:scale-105"><Users size={24} /></span>
            <span className="mb-1 text-base font-extrabold text-sb-soft">Human Practice</span>
            <span className="mb-4 flex-1 text-sm leading-relaxed text-sb-muted">Explore illustrative practitioner profiles and save demo practice requests.</span>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-sb-signal">Explore demo directory <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="group relative flex flex-col rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 text-left text-sb-body shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal" onClick={() => navigate('/credentials')}>
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
                  <div className="sb-stat-number">{progress?.inProgressCount ?? 0}</div>
                  <div className="sb-stat-label">In progress</div>
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
            <p className="sb-integration-state" role="status">Loading lesson activity…</p>
          ) : (progress?.recentActivity || []).length === 0 ? (
            <p className="sb-integration-empty-copy">No lesson activity recorded yet. Choose a published lesson to start learning.</p>
          ) : (
            <div className="sb-lessons-list">
              {progress.recentActivity.slice(0, 5).map((activity, index) => {
                const lesson = lessons.find((item) => String(item._id) === String(activity.lessonId));
                if (!lesson) return null;
                return (
                <button className="sb-lesson-item" type="button" key={`${activity.lessonId}-${activity.activity}-${activity.occurredAt}-${index}`} onClick={() => openLesson(lesson)}>
                  <span className="sb-lesson-meta">
                    <span className="sb-lesson-thumb"><BookOpen size={20} /></span>
                    <span>
                      <span className="sb-lesson-title">{lesson.title}</span>
                      <span className="sb-lesson-sub">
                        {activity.activity === 'completed' ? 'Completed' : activity.activity === 'resumed' ? 'Resumed' : 'Started'}
                        {activity.occurredAt ? ` · ${new Date(activity.occurredAt).toLocaleDateString()}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className={`sb-lesson-badge ${completedLessonIds.has(String(lesson._id)) ? 'badge-completed' : 'badge-active'}`}>
                    {completedLessonIds.has(String(lesson._id))
                      ? 'Revisit'
                      : inProgressLessonIds.has(String(lesson._id)) ? 'Resume' : 'Start'}
                  </span>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Learning recommendations">
        <article className={`${cardSurface} space-y-3 p-6`}>
          <p className="sb-integration-eyebrow">Next in your path</p>
          {pageLoading ? (
            <p className="sb-integration-state" role="status">Finding the next available lesson…</p>
          ) : progress?.nextLesson ? (
            <>
              <h2 className="m-0 text-lg font-extrabold text-sb-soft">{progress.nextLesson.title}</h2>
              <p className="m-0 text-sm text-sb-muted">
                {progress.nextLesson.moduleTitle || progress.nextLesson.category} · {progress.nextLesson.level}
              </p>
              <button
                type="button"
                className={primaryButton}
                onClick={() => {
                  const nextLesson = lessons.find(item => String(item._id) === String(progress.nextLesson._id));
                  if (nextLesson) openLesson(nextLesson);
                  else setActiveNav('lessons');
                }}
              >
                {inProgressLessonIds.has(String(progress.nextLesson._id)) ? 'Resume lesson' : 'Start lesson'}
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <p className="m-0 text-sm text-sb-muted">
              No eligible next lesson is available. You can revisit any published lesson from the catalogue.
            </p>
          )}
        </article>
        <article className={`${cardSurface} space-y-3 p-6`}>
          <p className="sb-integration-eyebrow">Review suggestions</p>
          {pageLoading ? (
            <p className="sb-integration-state" role="status">Checking reviewed assessment results…</p>
          ) : (progress?.reviewSuggestions || []).length === 0 ? (
            <p className="m-0 text-sm text-sb-muted">
              No review suggestions from qualified-review ISL learning questions yet. Resource checks do not infer language weaknesses.
            </p>
          ) : (
            <ul className="m-0 space-y-3 p-0">
              {progress.reviewSuggestions.map(suggestion => {
                const lesson = lessons.find(item => String(item._id) === String(suggestion.lessonId));
                return (
                  <li className="flex flex-wrap items-center justify-between gap-3" key={`${suggestion.lessonId}-${suggestion.topic || 'lesson'}`}>
                    <span className="text-sm text-sb-body">
                      Revisit <strong className="text-sb-soft">{suggestion.topic || suggestion.lessonTitle}</strong>
                      {suggestion.topic ? ` · ${suggestion.lessonTitle}` : ''}
                      {' '}({suggestion.missedQuestions} missed)
                    </span>
                    {lesson && (
                      <button type="button" className={outlineButton} onClick={() => openLesson(lesson)}>
                        Review lesson
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-6 shadow-sm backdrop-blur-xl">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold text-sb-soft">
          <ClipboardCheck size={18} className="text-sb-signal" />Latest quiz results
        </h2>
        {pageLoading ? (
          <p className="sb-integration-state" role="status">Loading quiz results…</p>
        ) : (progress?.latestQuizResults || []).length === 0 ? (
          <p className="sb-integration-empty-copy">No quiz attempts have been recorded yet. Quiz attempts do not mark lessons complete.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {progress.latestQuizResults.map((result) => (
              <article className={`${cardSurface} space-y-2 p-4`} key={result.attemptId}>
                <h3 className="m-0 font-bold text-sb-soft">{result.quizTitle}</h3>
                {result.lessonTitle && <p className="m-0 text-sm text-sb-muted">{result.lessonTitle}</p>}
                <p className="m-0 text-sm text-sb-body">
                  Score: {result.score}% · {result.total} questions
                  {typeof result.passed === 'boolean' ? ` · ${result.passed ? 'Passed' : 'Not passed'}` : ''}
                </p>
                {result.assessmentFocus === 'course-metadata' && (
                  <p className="m-0 text-xs text-amber-200">Course-resource check only; not an ISL proficiency assessment.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderLessons = () => (
    <div className="sb-curriculum-container mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
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
          {lessonModules.length === 0 ? (
            <p className="sb-integration-empty-copy">No lessons match your search.</p>
          ) : (
            <div className="space-y-6">
              {lessonModules.map((module, moduleIndex) => (
                <section key={module.title} className={`${cardSurface} space-y-4 p-5`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="m-0 text-lg font-extrabold text-sb-soft">{module.title}</h2>
                    <span className="text-xs text-sb-muted">
                      Module {moduleIndex + 1} · {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                  <ol className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const completed = completedLessonIds.has(String(lesson._id));
                      const inProgress = inProgressLessonIds.has(String(lesson._id));
                      const isNext = String(progress?.nextLesson?._id) === String(lesson._id);
                      const unmetPrerequisites = (lesson.prerequisites || []).filter(prerequisite => (
                        !completedLessonIds.has(String(prerequisite?._id || prerequisite))
                      ));
                      const prerequisiteTitles = unmetPrerequisites.map(prerequisite => (
                        lessons.find(item => String(item._id) === String(prerequisite?._id || prerequisite))?.title
                      )).filter(Boolean);
                      return (
                        <li key={lesson._id}>
                          <button
                            type="button"
                            disabled={unmetPrerequisites.length > 0}
                            className={`${cardSurface} flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:border-sb-signal focus-visible:outline-2 focus-visible:outline-sb-signal`}
                            onClick={() => openLesson(lesson)}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[rgba(92,225,214,0.2)] text-xs font-bold text-sb-signal">
                                {completed ? <CheckCircle2 size={16} /> : lessonIndex + 1}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-bold text-sb-soft">{lesson.title}</span>
                                {lesson.learningObjectives?.length > 0 && (
                                  <span className="mt-1 block text-xs text-sb-muted">
                                    {lesson.learningObjectives.length} learning objectives
                                  </span>
                                )}
                                {prerequisiteTitles.length > 0 && (
                                  <span className="mt-1 block text-xs text-amber-200">
                                    Complete first: {prerequisiteTitles.join(', ')}
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              {isNext && <span className="sb-lesson-badge badge-active">Next</span>}
                              {unmetPrerequisites.length > 0 && <span className="sb-lesson-badge">Locked</span>}
                              <span className={`sb-lesson-badge ${completed ? 'badge-completed' : 'badge-active'}`}>
                                {completed ? 'Completed' : inProgress ? 'In progress' : 'Not started'}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
          {renderLessonDetail()}
        </>
      )}
    </div>
  );

  const renderStudio = () => (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <div className="sb-integration-section-heading">
          <h1 className="sb-integration-page-title">ISL Recognition Studio</h1>
          <span className="sb-lesson-badge badge-active">Hosted recognition · experimental</span>
        </div>
        <p className="sb-integration-muted">
          MediaPipe processes camera frames locally. Jestally mode sends only a 30-frame landmark sequence.
          The separate experimental ISL Bridge mode sends JPEG stills only after your explicit consent.
        </p>
      </header>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Recognition provider">
        <button
          type="button"
          className={recognitionProviderMode === 'isl-bridge' ? primaryButton : outlineButton}
          aria-pressed={recognitionProviderMode === 'isl-bridge'}
          onClick={() => selectRecognitionProvider('isl-bridge')}
        >
          ISL Bridge · experimental
        </button>
        <button
          type="button"
          className={recognitionProviderMode === 'jestally' ? primaryButton : outlineButton}
          aria-pressed={recognitionProviderMode === 'jestally'}
          onClick={() => selectRecognitionProvider('jestally')}
        >
          Jestally · landmarks
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className={columnCard}>
          <div className="sb-integration-section-heading">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-sb-soft"><Camera size={18} className="text-sb-signal" />Camera & hand landmarks</h2>
            <span className="sb-integration-eyebrow">Processed in browser</span>
          </div>
          <div className="sb-demo-viewport relative overflow-hidden">
            <video
              ref={cameraVideoRef}
              className={`h-full w-full object-contain ${cameraStatus === 'active' ? 'scale-x-[-1]' : 'hidden'}`}
              autoPlay
              muted
              playsInline
              aria-label="Local webcam preview"
            />
            {cameraStatus !== 'active' && <div className="sb-integration-empty">
              <Video size={32} />
              <h3>{cameraStatus === 'starting' ? 'Starting camera…' : 'Camera preview is off'}</h3>
              <p>{cameraStatus === 'starting' ? 'Waiting for browser camera permission.' : 'Your camera starts only after you select Start camera.'}</p>
            </div>}
          </div>
          {cameraError && <ApiError>{cameraError}</ApiError>}
          {landmarkerStatus === 'loading' && (
            <p className="sb-integration-muted flex items-center gap-2" role="status"><Loader2 size={16} className="animate-spin" />Loading the local MediaPipe hand-landmark model…</p>
          )}
          {landmarkerError && <ApiError>{landmarkerError}</ApiError>}
          <div className="sb-prediction-hud">
            <p><strong>Detected hands:</strong> {landmarkerStatus === 'ready' ? detectedHandCount : 'Not available'}</p>
            <p><strong>Landmarks:</strong> {detectedHandCount > 0 ? `${detectedHandCount} hand${detectedHandCount === 1 ? '' : 's'} · 21 points each · x, y, z` : 'No hand detected'}</p>
            {recognitionProviderMode === 'jestally' && (
              <p><strong>Recognition sequence:</strong> {recognitionFrameCount}/{RECOGNITION_FRAME_COUNT} frames</p>
            )}
            {cameraStatus === 'active' ? (
              <button type="button" className={outlineButton} onClick={stopRecognitionCamera}>
                <Video size={15} /> Stop camera
              </button>
            ) : (
              <button type="button" className={primaryButton} onClick={startRecognitionCamera} disabled={cameraStatus === 'starting'}>
                {cameraStatus === 'starting' ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                {cameraStatus === 'starting' ? 'Starting…' : 'Start camera'}
              </button>
            )}
          </div>
          {recognitionProviderMode === 'jestally' && (
            <>
              <label className="sb-integration-muted flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={landmarkConsent}
                  disabled={landmarkerStatus !== 'ready'}
                  onChange={(event) => setLandmarkConsent(event.target.checked)}
                />
                <span>I agree to send this 30-frame landmark sequence to SignBridge and the hosted Jestally recognition service. Camera frames remain on this device.</span>
              </label>
              <button
                type="button"
                className={primaryButton}
                onClick={recognizeCurrentSign}
                disabled={!landmarkConsent || recognitionFrameCount !== RECOGNITION_FRAME_COUNT || landmarkerStatus !== 'ready' || recognitionRequestStatus === 'loading'}
              >
                {recognitionRequestStatus === 'loading' && <Loader2 size={15} className="animate-spin" />}
                {recognitionRequestStatus === 'loading' ? 'Recognizing with Jestally…' : 'Recognize with Jestally'}
              </button>
              {recognitionRequestStatus === 'loading' && (
                <p className="sb-integration-muted flex items-center gap-2" role="status"><Loader2 size={16} className="animate-spin" />Sending landmark sequence to Jestally…</p>
              )}
              {recognitionMessage && recognitionRequestStatus === 'error' && (
                <ApiError>{recognitionMessage}</ApiError>
              )}
              {recognitionMessage && recognitionRequestStatus === 'abstained' && (
                <p className="sb-integration-muted" role="status">{recognitionMessage}</p>
              )}
              {recognitionPrediction && (
                <div className="sb-prediction-hud" aria-live="polite">
                  <p><strong>Recognized sign:</strong> {recognitionPrediction.sign.replaceAll('_', ' ')}</p>
                  <p><strong>Provider confidence:</strong> {(recognitionPrediction.confidence * 100).toFixed(1)}%</p>
                  {recognitionPrediction.top3?.length > 0 && (
                    <div>
                      <p><strong>Top alternatives:</strong></p>
                      <ol className="list-inside list-decimal">
                        {recognitionPrediction.top3.map((alternative, index) => (
                          <li key={`${alternative.sign}-${index}`}>
                            {alternative.sign.replaceAll('_', ' ')} · {(alternative.confidence * 100).toFixed(1)}%
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <p className="sb-integration-muted">Experimental provider output; confidence is not a guarantee of correctness.</p>
                </div>
              )}
              <p className="sb-integration-muted">
                The MediaPipe runtime is downloaded from jsDelivr and its hand-landmark model from Google-hosted
                storage. They process frames in this browser; only normalized hand coordinates go to Jestally
                after consent.
              </p>
            </>
          )}
          {recognitionProviderMode === 'isl-bridge' && (
            <section className="rounded-2xl border border-[rgba(92,225,214,0.22)] bg-[rgba(10,25,38,0.5)] p-5">
            <div className="sb-integration-section-heading">
              <h3 className="text-base font-extrabold text-sb-soft">Experimental ISL Bridge · live recognition</h3>
              <span className="sb-integration-eyebrow" role="status">
                {islBridgeIsRunning ? '● Live recognition' : 'Stopped'}
              </span>
            </div>
            <p className="sb-integration-muted">
              Start the camera and grant consent before recognition can begin. While active, one
              resized JPEG frame is sampled every 700 ms and sent through SignBridge to the public
              demo. If a request is still in flight, that sampling cycle is skipped.
            </p>
            <label className="sb-integration-muted flex items-start gap-2">
              <input
                type="checkbox"
                checked={islBridgeConsent}
                disabled={cameraStatus !== 'active'}
                onChange={(event) => setIslBridgeConsent(event.target.checked)}
              />
              <span>I agree to send camera frames to the experimental ISL Bridge demo for recognition. The provider's processing and retention are outside SignBridge's control.</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {!islBridgeIsRunning ? (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={startContinuousIslBridgeRecognition}
                  disabled={!islBridgeConsent || cameraStatus !== 'active'}
                >
                  <Radio size={15} /> Start recognition
                </button>
              ) : (
                <button
                  type="button"
                  className={outlineButton}
                  onClick={stopContinuousIslBridgeRecognition}
                >
                  Stop recognition
                </button>
              )}
            </div>
            {islBridgeStatus === 'loading' && islBridgeIsRunning && (
              <p className="sb-integration-muted flex items-center gap-2" role="status">
                <Loader2 size={16} className="animate-spin" />
                Sending the latest camera frame for recognition…
              </p>
            )}
            {islBridgeStatus === 'running' && islBridgeIsRunning && (
              <p className="sb-integration-muted" role="status">Recognition is active. Waiting for the next sample.</p>
            )}
            {islBridgeStatus === 'error' && <ApiError>{islBridgeError}</ApiError>}
            {islBridgeStatus === 'empty' && (
              <p className="sb-integration-muted" role="status">
                ISL Bridge returned no sign, word, or sentence for the latest frame. Try holding a supported sign steadily.
              </p>
            )}
            {islBridgeResult && (
              <div className="sb-prediction-hud" aria-live="polite">
                <p><strong>Sign:</strong> {islBridgeResult.sign || 'No sign returned'}</p>
                <p><strong>Word:</strong> {islBridgeResult.word || 'No word returned'}</p>
                <p><strong>Sentence:</strong> {islBridgeResult.sentence || 'No sentence returned'}</p>
                <p className="sb-integration-muted">Latest meaningful provider result. The provider sentence is shown as returned; this is experimental, not continuous ISL translation.</p>
              </div>
            )}
            {islBridgeLatencyMs !== null && (
              <p className="sb-integration-muted" aria-live="polite">Latest request latency: {islBridgeLatencyMs} ms</p>
            )}
            <p className="sb-integration-muted">
              The JPEG frames are uploaded to the third-party demo after your action. Do not capture sensitive
              scenes. This provider may have shared in-memory state between visitors; results can be delayed
              or affected by concurrent use.
            </p>
            </section>
          )}
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
    <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
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
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[rgba(92,225,214,0.14)] p-8 text-center text-sb-muted">
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
    <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
      <header>
        <div className="sb-integration-section-heading">
          <h1 className="sb-integration-page-title">Milestones</h1>
          <span className="sb-lesson-badge badge-active">Credential details</span>
        </div>
        <p className="sb-integration-muted">
          Your published lesson completions are available below. View testnet credential eligibility and proofs on the Credentials page.
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
          <span className="break-all text-2xl font-extrabold text-sb-signal">View credentials</span>
          <span className="text-xs font-semibold text-sb-muted">MST Coral testnet</span>
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
          <h3>Credential issuance is available from the Credentials page</h3>
          <p>Check eligibility, request a testnet credential, view transaction status, and share a public verification link.</p>
          <button type="button" className={outlineButton} onClick={() => navigate('/credentials')}>
            <Shield size={14} /> Open credentials
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
        <span>Credential hashes only are stored on-chain. Private information and conversations remain off-chain.</span>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-8 p-5 sm:p-8 lg:px-9">
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
                ? 'border-transparent bg-linear-to-br from-sb-violet to-sb-signal font-extrabold text-sb-midnight shadow-md'
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
    <div className="flex min-h-screen overflow-x-hidden bg-sb-midnight bg-[radial-gradient(at_0%_0%,rgba(146,117,255,0.12)_0px,transparent_45%),radial-gradient(at_100%_100%,rgba(92,225,214,0.1)_0px,transparent_45%)] text-sb-body">
      <AppSidebar
        activeNav={activeNav}
        user={profile}
        onNavigate={handleSidebarNavigate}
        onLogout={onLogout}
      />

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-transparent">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.85)] px-5 py-4 backdrop-blur-xl max-sm:flex-wrap sm:px-8">
          <label className="sb-nav-search w-full! max-w-85 max-md:max-w-45">
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
