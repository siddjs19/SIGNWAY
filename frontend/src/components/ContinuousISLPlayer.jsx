import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react'

/** Plays a sequence of existing ISL assets through one persistent video element. */
export default function ContinuousISLPlayer ({ segments = [] }) {
  const videoRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [playError, setPlayError] = useState('')
  const current = segments[index]
  const next = segments[index + 1]

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
    setPlayError('')
  }, [segments])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !current) return
    video.playbackRate = speed
    if (playing) {
      const result = video.play()
      if (result?.catch)
        result.catch(() => {
          setPlaying(false)
          setPlayError(
            'Playback was blocked. Press Play to start the ISL sequence.'
          )
        })
    }
  }, [index, current?.url, playing, speed])

  const start = async () => {
    const video = videoRef.current
    if (!video) return
    setPlayError('')
    try {
      await video.play()
      setPlaying(true)
    } catch {
      setPlayError(
        'Could not play this video. Check that the asset is available, then try again.'
      )
      setPlaying(false)
    }
  }
  const pause = () => {
    videoRef.current?.pause()
    setPlaying(false)
  }
  const replay = () => {
    setIndex(0)
    setPlayError('')
    if (videoRef.current) videoRef.current.currentTime = 0
    setPlaying(true)
  }
  const ended = () => {
    if (index < segments.length - 1) {
      setIndex(i => i + 1)
      setPlaying(true)
    } else setPlaying(false)
  }
  const changeSpeed = () =>
    setSpeed(s => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : s === 1.5 ? 0.75 : 1))
  if (!segments.length)
    return (
      <small className='muted'>
        No matching video assets were found for this response.
      </small>
    )

  return (
    <div className='continuous-isl-player'>
      <div className='continuous-video-wrap'>
        <video
          ref={videoRef}
          src={current.url}
          controls
          playsInline
          preload='auto'
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={ended}
          onError={() => {
            setPlaying(false)
            setPlayError(
              `Unable to load the sign video: ${current.displayName}`
            )
          }}
        />
        {next?.url && (
          <video
            className='video-preloader'
            src={next.url}
            preload='auto'
            muted
            aria-hidden='true'
          />
        )}
        <div className='current-sign-label'>{current.displayName}</div>
      </div>
      <div className='sequence-controls'>
        <div className='sequence-progress'>
          <div style={{ width: `${((index + 1) / segments.length) * 100}%` }} />
        </div>
        <div className='sequence-control-row'>
          <div className='sequence-position'>
            Sign {index + 1} of {segments.length}
          </div>
          <div className='sequence-buttons'>
            <button
              type='button'
              onClick={playing ? pause : start}
              aria-label={playing ? 'Pause sequence' : 'Play sequence'}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}{' '}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type='button' onClick={replay} aria-label='Replay sequence'>
              <RotateCcw size={14} /> Replay
            </button>
            <button
              type='button'
              onClick={changeSpeed}
              aria-label='Change playback speed'
            >
              <FastForward size={14} /> {speed}×
            </button>
          </div>
        </div>
        {playError && <small className='sequence-error'>{playError}</small>}
        <div className='sequence-caption'>
          {segments.map((s, i) => (
            <span
              key={`${s.assetId}-${i}`}
              className={i === index ? 'active' : ''}
            >
              {s.displayName}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
