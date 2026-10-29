import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import AppSidebar from '../components/AppSidebar';

const card = 'rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] shadow-sm backdrop-blur-xl';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-5 py-2.5 text-sm font-extrabold text-sb-midnight transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.6)] px-4 py-2.5 text-sm font-bold text-sb-signal transition hover:border-sb-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback;
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

export default function QuizPage({ user, onLogout }) {
  const { lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const submissionInFlight = useRef(false);
  const isFullCourse = location.pathname === '/quiz/full-course';
  const isLessonQuiz = Boolean(lessonId);
  const isDiscovery = !isFullCourse && !isLessonQuiz;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lesson, setLesson] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [courseOverview, setCourseOverview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [phase, setPhase] = useState('overview');
  const [result, setResult] = useState(null);

  const currentQuestionData = assessment?.questions?.[currentQuestion];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progressPercent = assessment?.questions?.length
    ? Math.round((answeredCount / assessment.questions.length) * 100)
    : 0;

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setError('');
      setAssessment(null);
      setResult(null);
      setAnswers({});
      setCurrentQuestion(0);
      setPhase('overview');
      try {
        if (isDiscovery) {
          const [lessonResponse, quizResponse] = await Promise.all([
            api.get('/lessons'),
            api.get('/quizzes'),
          ]);
          if (!active) return;
          setLessons(lessonResponse.data.data || []);
          setQuizzes(quizResponse.data.data || []);
        } else if (isFullCourse) {
          const response = await api.get('/quizzes/full-course');
          if (!active) return;
          setCourseOverview(response.data.data);
        } else {
          const [lessonResponse, quizResponse] = await Promise.all([
            api.get(`/lessons/${lessonId}`),
            api.get('/quizzes', { params: { lessonId } }),
          ]);
          if (!active) return;
          setLesson(lessonResponse.data.data);
          const nextQuizzes = quizResponse.data.data || [];
          setQuizzes(nextQuizzes);
          if (nextQuizzes.length > 0) {
            setSelectedQuizId(String(nextQuizzes[0]._id));
            const quizResponseDetail = await api.get(`/quizzes/${nextQuizzes[0]._id}`);
            if (!active) return;
            setAssessment({
              ...quizResponseDetail.data.data,
              quizId: quizResponseDetail.data.data._id,
            });
            setPhase('answering');
          }
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError.response?.status === 401) {
          onLogout();
          return;
        }
        setError(messageFrom(requestError, 'Unable to load quiz information.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();
    return () => {
      active = false;
    };
  }, [isDiscovery, isFullCourse, isLessonQuiz, lessonId, onLogout]);

  const chooseLessonQuiz = async (quizId) => {
    setSelectedQuizId(String(quizId));
    setLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    setPhase('answering');
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      setAssessment({ ...response.data.data, quizId: response.data.data._id });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError(messageFrom(requestError, 'Unable to load this lesson quiz.'));
      setPhase('overview');
    } finally {
      setLoading(false);
    }
  };

  const startCourseTest = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/quizzes/full-course/questions');
      setAssessment(response.data.data);
      setAnswers({});
      setCurrentQuestion(0);
      setResult(null);
      setPhase('answering');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError(messageFrom(requestError, 'Unable to start the full-course test.'));
    } finally {
      setLoading(false);
    }
  };

  const submitAssessment = async () => {
    if (!assessment || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError('');
    const submittedAnswers = assessment.questions.map(question => ({
      questionId: question._id,
      selectedAnswer: answers[question._id] || '',
    }));

    try {
      const response = isFullCourse
        ? await api.post('/quizzes/full-course/attempts', { answers: submittedAnswers })
        : await api.post(`/quizzes/${assessment.quizId}/attempts`, { answers: submittedAnswers });
      setResult(response.data.data);
      setPhase('result');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError(messageFrom(requestError, 'Unable to submit your answers. Your attempt has not been confirmed.'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  const retryAssessment = () => {
    setAnswers({});
    setResult(null);
    setCurrentQuestion(0);
    setPhase('answering');
    setError('');
  };

  const handleSidebarNavigate = (id) => {
    if (id === 'quizzes') {
      navigate('/quiz');
      return;
    }
    navigate('/', { state: { activeNav: id } });
  };

  const renderDiscovery = () => {
    const quizCounts = new Map();
    for (const quiz of quizzes) {
      const key = String(quiz.lesson);
      quizCounts.set(key, (quizCounts.get(key) || 0) + 1);
    }

    return (
      <div className="space-y-7">
        <section className={`${card} p-6 sm:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sb-signal">Assessment center</p>
              <h1 className="mt-2 text-2xl font-extrabold text-sb-soft sm:text-3xl">Quizzes & tests</h1>
              <p className="mt-3 max-w-2xl leading-relaxed text-sb-body">
                Choose an available quiz for a published lesson, or check whether the published curriculum has enough questions for a full-course test.
              </p>
            </div>
            <ClipboardCheck size={34} className="text-sb-signal" />
          </div>
        </section>

        <section className={`${card} flex flex-wrap items-center justify-between gap-5 p-6`}>
          <div>
            <h2 className="text-xl font-extrabold text-sb-soft">Full-course test</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sb-muted">
              One assessment assembled from published quiz questions across the available course.
            </p>
          </div>
          <button type="button" className={button} onClick={() => navigate('/quiz/full-course')}>
            View test availability <ArrowRight size={16} />
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-sb-soft">Lesson quizzes</h2>
          {lessons.length === 0 ? (
            <div className={`${card} p-6 text-sm text-sb-muted`}>No published lessons are available yet.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {lessons.map(item => {
                const count = quizCounts.get(String(item._id)) || 0;
                return (
                  <article key={item._id} className={`${card} flex flex-col gap-4 p-5`}>
                    <div className="flex items-start gap-3">
                      <BookOpen size={20} className="mt-1 shrink-0 text-sb-signal" />
                      <div>
                        <h3 className="font-bold text-sb-soft">{item.title}</h3>
                        <p className="mt-1 text-sm text-sb-muted">{item.category} · {item.level}</p>
                      </div>
                    </div>
                    <p className="text-sm text-sb-body">
                      {count ? `${count} published ${count === 1 ? 'quiz' : 'quizzes'} available` : 'No published quiz available yet.'}
                    </p>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={count === 0}
                      onClick={() => navigate(`/quiz/lesson/${item._id}`)}
                    >
                      {count ? 'Choose lesson quiz' : 'Quiz unavailable'}
                      {count > 0 && <ArrowRight size={15} />}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderCourseOverview = () => (
    <section className={`${card} space-y-6 p-6 sm:p-8`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sb-signal">Comprehensive assessment</p>
        <h1 className="mt-2 text-2xl font-extrabold text-sb-soft sm:text-3xl">
          {courseOverview?.title || 'Full-course test'}
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-sb-body">
          Scope: {courseOverview?.scope || 'Reviewed ISL-learning questions from published lessons'}.
          {' '}Eligible questions are selected across the published course and graded by the backend.
        </p>
      </div>
      {courseOverview?.available ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[rgba(7,20,33,0.55)] p-4">
              <dt className="text-sm text-sb-muted">Available questions</dt>
              <dd className="mt-1 text-2xl font-extrabold text-sb-signal">{courseOverview.questionCount}</dd>
            </div>
            <div className="rounded-2xl bg-[rgba(7,20,33,0.55)] p-4">
              <dt className="text-sm text-sb-muted">Lessons covered</dt>
              <dd className="mt-1 text-2xl font-extrabold text-sb-signal">{courseOverview.lessonCount}</dd>
            </div>
            <div className="rounded-2xl bg-[rgba(7,20,33,0.55)] p-4">
              <dt className="text-sm text-sb-muted">Passing score</dt>
              <dd className="mt-1 text-2xl font-extrabold text-sb-signal">
                {Number.isFinite(courseOverview.passingScore) ? `${courseOverview.passingScore}%` : 'Not set'}
              </dd>
            </div>
          </dl>
          <div>
            <h2 className="font-bold text-sb-soft">Lessons included</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-sb-body">
              {courseOverview.lessons.map(item => <li key={item._id}>{item.title}</li>)}
            </ul>
          </div>
          {courseOverview.assessmentFocus === 'course-metadata' ? (
            <p className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100">
              This is a course-resource check using verified titles and course facts, not an ISL language or proficiency assessment. The SignBridge question bank is pending qualified review. A reviewed ISL-learning full-course assessment is not yet available.
            </p>
          ) : (
            <p className="rounded-xl border border-[rgba(92,225,214,0.14)] p-4 text-sm text-sb-muted">
              This is a learning check, not a proficiency certification. Course-metadata checks and learning questions awaiting review are excluded. No time limit or attempt restriction is configured; you can review and change answers before submission.
            </p>
          )}
          {(courseOverview.excludedMetadataQuestionCount > 0
            || courseOverview.excludedReviewPendingQuestionCount > 0) && (
            <p className="text-sm text-sb-muted">
              Excluded from this test: {courseOverview.excludedMetadataQuestionCount} course-metadata questions and{' '}
              {courseOverview.excludedReviewPendingQuestionCount} learning questions awaiting review.
            </p>
          )}
          <button type="button" className={button} onClick={startCourseTest} disabled={loading}>
            {loading
              ? 'Loading assessment…'
              : courseOverview.assessmentFocus === 'course-metadata'
                ? 'Start course-resource check'
                : 'Start full-course test'}
            {' '}<ArrowRight size={16} />
          </button>
        </>
      ) : (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5">
          <h2 className="font-bold text-amber-100">Full-course test unavailable</h2>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-sb-body">
            {courseOverview?.reason || 'There are not enough published quiz questions across the available lessons yet.'}
          </p>
          <p className="mb-0 mt-2 text-xs text-sb-muted">
            Draft quizzes and questions attached to unpublished lessons are excluded.
          </p>
        </div>
      )}
    </section>
  );

  const renderQuestion = () => {
    if (!currentQuestionData) return null;
    return (
      <section className={`${card} space-y-6 p-5 sm:p-8`} aria-labelledby="question-title">
        {isLessonQuiz && assessment.contentReviewStatus !== 'reviewed' && (
          <p className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100">
            This quiz is awaiting qualified content review. Treat its SignBridge-authored questions as unverified learning material.
          </p>
        )}
        {isLessonQuiz && assessment.assessmentFocus === 'course-metadata' && (
          <p className="rounded-xl border border-[rgba(92,225,214,0.14)] p-4 text-sm leading-relaxed text-sb-muted">
            This quiz checks course and resource information; it is not an assessment of ISL language skills.
          </p>
        )}
        {isLessonQuiz && quizzes.length > 1 && (
          <div className="flex flex-wrap gap-2" aria-label="Available quizzes for this lesson">
            {quizzes.map(quiz => (
              <button
                type="button"
                key={quiz._id}
                className={String(quiz._id) === selectedQuizId ? button : secondaryButton}
                aria-pressed={String(quiz._id) === selectedQuizId}
                onClick={() => chooseLessonQuiz(quiz._id)}
              >
                {quiz.title}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sb-signal">
              {isFullCourse ? `${currentQuestionData.lessonTitle} · ` : ''}Question {currentQuestion + 1} of {assessment.questions.length}
            </p>
            <h1 id="question-title" className="mt-2 text-xl font-extrabold leading-snug text-sb-soft sm:text-2xl">
              {currentQuestionData.prompt}
            </h1>
          </div>
          <span className="rounded-full border border-[rgba(92,225,214,0.2)] px-3 py-1 text-sm font-bold text-sb-signal">
            {answeredCount}/{assessment.questions.length} answered
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[rgba(7,20,33,0.8)]"
          role="progressbar"
          aria-label="Quiz answer progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div className="h-full rounded-full bg-sb-signal transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        {currentQuestionData.mediaUrl && currentQuestionData.mediaType === 'video' && (
          <video
            className="max-h-96 w-full rounded-xl bg-[#040d16]"
            controls
            preload="metadata"
            src={currentQuestionData.mediaUrl}
          >
            Your browser does not support embedded video.
          </video>
        )}
        {currentQuestionData.mediaUrl && currentQuestionData.mediaType !== 'video' && (
          <img className="max-h-80 max-w-full rounded-xl object-contain" src={currentQuestionData.mediaUrl} alt="Question reference" />
        )}
        <fieldset className="space-y-3">
          <legend className="sr-only">
            {currentQuestionData.questionType === 'multiple-choice' ? 'Choose all that apply' : 'Choose one answer'}
          </legend>
          {currentQuestionData.options.map(option => {
            const multiple = currentQuestionData.questionType === 'multiple-choice';
            const selection = answers[currentQuestionData._id];
            const checked = multiple
              ? Array.isArray(selection) && selection.includes(option)
              : selection === option;
            return (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sb-signal ${
                checked
                  ? 'border-sb-signal bg-[rgba(92,225,214,0.1)] text-sb-soft'
                  : 'border-[rgba(92,225,214,0.14)] text-sb-body hover:border-[rgba(92,225,214,0.4)]'
              }`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`question-${currentQuestionData._id}`}
                value={option}
                checked={checked}
                onChange={() => setAnswers(previous => {
                  if (!multiple) return { ...previous, [currentQuestionData._id]: option };
                  const selected = Array.isArray(previous[currentQuestionData._id])
                    ? previous[currentQuestionData._id]
                    : [];
                  const next = selected.includes(option)
                    ? selected.filter(value => value !== option)
                    : [...selected, option];
                  if (next.length === 0) {
                    const remaining = { ...previous };
                    delete remaining[currentQuestionData._id];
                    return remaining;
                  }
                  return { ...previous, [currentQuestionData._id]: next };
                })}
                className="mt-0.5 accent-[#5ce1d6]"
              />
              <span>{option}</span>
            </label>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            className={secondaryButton}
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion(index => index - 1)}
          >
            <ArrowLeft size={15} /> Previous
          </button>
          {currentQuestion < assessment.questions.length - 1 ? (
            <button type="button" className={button} onClick={() => setCurrentQuestion(index => index + 1)}>
              Next question <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" className={button} onClick={() => setPhase('review')}>
              Review answers <ClipboardCheck size={16} />
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderReview = () => (
    <section className={`${card} space-y-5 p-5 sm:p-8`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sb-signal">Before you submit</p>
        <h1 className="mt-2 text-2xl font-extrabold text-sb-soft">Review your answers</h1>
        <p className="mt-2 text-sm text-sb-muted">
          {answeredCount} of {assessment.questions.length} questions answered. You can revisit any question and change your selection.
        </p>
      </div>
      <ol className="space-y-3">
        {assessment.questions.map((question, index) => (
          <li key={question._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(92,225,214,0.14)] p-4">
            <div>
              <p className="text-xs font-bold text-sb-signal">
                Question {index + 1}{isFullCourse ? ` · ${question.lessonTitle}` : ''}
              </p>
              <p className="mt-1 text-sm text-sb-soft">{question.prompt}</p>
              <p className="mt-1 text-sm text-sb-muted">
                {answers[question._id]
                  ? `Your answer: ${Array.isArray(answers[question._id]) ? answers[question._id].join(', ') : answers[question._id]}`
                  : 'Not answered'}
              </p>
            </div>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setCurrentQuestion(index);
                setPhase('answering');
              }}
            >
              Edit answer
            </button>
          </li>
        ))}
      </ol>
      <PageError>{answeredCount < assessment.questions.length ? 'Answer every question before submitting.' : error}</PageError>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className={secondaryButton} onClick={() => setPhase('answering')}>
          <ArrowLeft size={15} /> Continue test
        </button>
        <button
          type="button"
          className={button}
          disabled={submitting || answeredCount !== assessment.questions.length}
          onClick={submitAssessment}
        >
          {submitting ? 'Submitting…' : 'Submit test'} <CheckCircle2 size={16} />
        </button>
      </div>
    </section>
  );

  const renderResult = () => {
    const resultAnswers = new Map((result?.answers || []).map(answer => [String(answer.questionId), answer]));
    const passLabel = result.assessmentFocus === 'course-metadata'
      ? result.passed ? 'Resource check passed' : 'Resource check below threshold'
      : result.passed ? 'Passed' : 'Keep practicing';
    return (
      <div className="space-y-5">
        <section className={`${card} p-6 text-center sm:p-8`} role="status">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sb-signal">
            {result.assessmentFocus === 'course-metadata'
              ? 'Backend-graded resource-check result · not ISL proficiency'
              : 'Backend-graded result'}
          </p>
          <p className="mt-3 text-5xl font-extrabold text-sb-soft">{result.score}%</p>
          <p className="mt-2 text-sb-body">
            {result.total} questions · {result.percentage ?? result.score}% overall
            {typeof result.passed === 'boolean'
              ? ` · ${passLabel}`
              : ''}
            {Number.isFinite(result.passingScore) ? ` · Passing score ${result.passingScore}%` : ''}
          </p>
          {result.attemptId && <p className="mt-2 text-xs text-sb-muted">Attempt saved</p>}
        </section>

        {isLessonQuiz && assessment.contentReviewStatus !== 'reviewed' && result.assessmentFocus !== 'course-metadata' && (
          <p className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100">
            This quiz is awaiting qualified review. Its score and stored answer key are not verified measures of ISL knowledge.
          </p>
        )}

        {result.lessonBreakdown?.length > 0 && (
          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-sb-soft">Performance by lesson</h2>
            <ul className="mt-3 space-y-2">
              {result.lessonBreakdown.map(item => (
                <li key={item.lesson} className="flex justify-between gap-4 text-sm">
                  <span>{item.lessonTitle}</span>
                  <span className="font-bold text-sb-signal">{item.correct}/{item.total} · {item.score}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-sb-soft">Answer review</h2>
          {assessment.questions.map((question, index) => {
            const answer = resultAnswers.get(String(question._id));
            return (
              <article key={question._id} className={`${card} p-5`}>
                <div className="flex items-start gap-3">
                  {answer?.isCorrect
                    ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                    : <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-200" />}
                  <div className="space-y-1">
                    <h3 className="font-bold text-sb-soft">{index + 1}. {question.prompt}</h3>
                    {isFullCourse && <p className="text-xs text-sb-muted">{question.lessonTitle}</p>}
                    <p className="text-sm text-sb-body">
                      Your answer: {Array.isArray(answer?.selectedAnswer)
                        ? answer.selectedAnswer.join(', ')
                        : answer?.selectedAnswer || 'No answer submitted'}
                    </p>
                    {!answer?.isCorrect && (question.contentReviewStatus === 'reviewed' || result.assessmentFocus === 'course-metadata') && (
                      <p className="text-sm text-amber-100">
                        {result.assessmentFocus === 'course-metadata' ? 'Expected answer' : 'Correct answer'}:{' '}
                        {Array.isArray(answer?.correctAnswer)
                          ? answer.correctAnswer.join(', ')
                          : answer?.correctAnswer}
                      </p>
                    )}
                    {!answer?.isCorrect && question.contentReviewStatus !== 'reviewed' && result.assessmentFocus !== 'course-metadata' && (
                      <p className="text-sm text-amber-100">Stored answer is awaiting qualified content review.</p>
                    )}
                    {answer?.explanation && <p className="text-sm leading-relaxed text-sb-muted">{answer.explanation}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={button} onClick={retryAssessment}>
            <RotateCcw size={16} /> Retry
          </button>
          {isLessonQuiz && lesson && (
            <button type="button" className={secondaryButton} onClick={() => navigate('/')}>
              <BookOpen size={16} /> Return to lessons
            </button>
          )}
          {isFullCourse && (
            <button type="button" className={secondaryButton} onClick={() => navigate('/')}>
              Return to dashboard
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-[#071421] bg-[radial-gradient(at_0%_0%,rgba(146,117,255,0.12)_0px,transparent_45%),radial-gradient(at_100%_100%,rgba(92,225,214,0.1)_0px,transparent_45%)] text-[#c9d9e8]">
      <AppSidebar
        activeNav="quizzes"
        user={user}
        onNavigate={handleSidebarNavigate}
        onLogout={onLogout}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-transparent px-4 py-6 sm:px-7 sm:py-9">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link className={secondaryButton} to="/">
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-sb-violet">SignBridge AI · Assessments</span>
        </header>

        <PageError>{error && phase !== 'review' ? error : ''}</PageError>
        {loading && <p className="rounded-xl bg-[rgba(24,48,65,0.7)] p-5 text-sm" role="status">Loading assessment…</p>}
        {!loading && isDiscovery && renderDiscovery()}
        {!loading && isFullCourse && phase === 'overview' && courseOverview && renderCourseOverview()}
        {!loading && isLessonQuiz && phase === 'overview' && (
          <section className={`${card} space-y-4 p-6`}>
            <h1 className="text-2xl font-extrabold text-sb-soft">{lesson?.title || 'Lesson quiz'}</h1>
            <p className="text-sm text-sb-muted">
              {error || 'No published quiz is available for this published lesson yet.'}
            </p>
            <Link className={secondaryButton} to="/">
              <ArrowLeft size={15} /> Return to lessons
            </Link>
          </section>
        )}
        {!loading && phase === 'answering' && assessment && renderQuestion()}
        {!loading && phase === 'review' && assessment && renderReview()}
        {!loading && phase === 'result' && assessment && result && renderResult()}
        </div>
      </main>
    </div>
  );
}
