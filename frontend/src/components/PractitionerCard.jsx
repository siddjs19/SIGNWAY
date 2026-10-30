import { ArrowRight, CalendarDays, Languages, MapPin } from 'lucide-react';

export default function PractitionerCard({ practitioner, onViewProfile, onRequestSession }) {
  const initials = practitioner.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="flex h-full flex-col gap-4 rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[rgba(92,225,214,0.36)]">
      <div className="flex items-start gap-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sb-violet to-sb-signal text-lg font-extrabold text-sb-midnight"
          aria-label={`Neutral placeholder avatar for ${practitioner.name}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-sb-soft">{practitioner.name}</h2>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-100">
              Demo profile
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-sb-signal">{practitioner.specialization}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm text-sb-muted">
        <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-sb-signal" />{practitioner.location}</p>
        <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-sb-signal" />{practitioner.availability} <span className="text-xs">(illustrative)</span></p>
        <p className="flex items-start gap-2"><Languages size={16} className="mt-0.5 shrink-0 text-sb-signal" />{practitioner.languages.join(', ')}</p>
      </div>
      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-sb-body">{practitioner.bio}</p>
      <div className="flex flex-wrap gap-2 border-t border-[rgba(92,225,214,0.12)] pt-4">
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[rgba(92,225,214,0.2)] px-3 py-2 text-sm font-bold text-sb-signal hover:border-sb-signal" onClick={onViewProfile}>
          View profile <ArrowRight size={14} />
        </button>
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-3 py-2 text-sm font-extrabold text-sb-midnight hover:opacity-95" onClick={onRequestSession}>
          Request practice
        </button>
      </div>
    </article>
  );
}
