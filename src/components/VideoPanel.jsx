import { useRef, useLayoutEffect, useState } from 'react'
import {
  computeAssFitFrame,
  getAssOverlayWrapperStyle,
  getAssPreviewTextStyle
} from '../utils/assPreviewLayout'

function getActiveSubtitle(subtitles, t) {
  if (!subtitles?.length) return null
  return subtitles.find((s) => t >= s.start_time && t < s.end_time) ?? null
}

function VideoPanel({
  videoInfo,
  videoRef,
  currentTime,
  duration,
  isPlaying,
  isLoading,
  play,
  pause,
  seek,
  subtitles,
  style,
  onGenerateSRT
}) {
  const containerRef = useRef(null)
  const [assFrame, setAssFrame] = useState({ w: 0, h: 0, scale: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const r = el.getBoundingClientRect()
      setAssFrame(
        computeAssFitFrame(
          r.width,
          r.height,
          videoInfo?.width || 1920,
          videoInfo?.height || 1080
        )
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [videoInfo?.path, videoInfo?.width, videoInfo?.height])

  const getVideoFileName = (path) => {
    if (!path) return ''
    return path.split(/[/\\]/).pop()
  }

  const formatTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '00:00:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const activeSubtitle = videoInfo ? getActiveSubtitle(subtitles, currentTime) : null

  const handleProgressClick = (e) => {
    if (!duration || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(duration, pct * duration)))
  }

  const overlayWrap =
    activeSubtitle && assFrame.scale > 0
      ? getAssOverlayWrapperStyle(style, assFrame)
      : null
  const textStyle =
    assFrame.scale > 0 ? getAssPreviewTextStyle(style, assFrame.scale) : {}

  return (
    <div className="video-panel">
      <div className="video-container">
        {videoInfo ? (
          <div ref={containerRef} className="preview-container">
            <div
              className="ass-preview-frame"
              style={{
                position: 'relative',
                width: assFrame.w,
                height: assFrame.h,
                flexShrink: 0,
                background: '#000'
              }}
            >
              <video
                ref={videoRef}
                controls={false}
                playsInline
                className="video-element"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              {activeSubtitle && overlayWrap && (
                <div className="subtitle-overlay" style={overlayWrap}>
                  <div className="subtitle-preview" style={textStyle}>
                    {activeSubtitle.text}
                  </div>
                </div>
              )}
              {isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)',
                    color: '#fff',
                    fontSize: 14
                  }}
                >
                  Loading video…
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="video-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/>
              <line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/>
              <line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
            <p>Import a video to get started</p>
          </div>
        )}
      </div>

      {videoInfo && (
        <>
          <div className="video-controls">
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => (isPlaying ? pause() : play())}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8,5 19,12 8,19"/>
                </svg>
              )}
            </button>
            <div
              className="progress-bar"
              role="slider"
              tabIndex={0}
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              onClick={handleProgressClick}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seek(Math.min(duration || 0, currentTime + 5))
                if (e.key === 'ArrowLeft') seek(Math.max(0, currentTime - 5))
              }}
            >
              <div
                className="progress-bar-fill"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="video-meta-row" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)'
          }}>
            <span>{getVideoFileName(videoInfo.path)}</span>
            <span>{videoInfo.width}×{videoInfo.height}</span>
            <span>{videoInfo.codec}</span>
          </div>
          <div className="video-actions">
            <button className="btn btn-secondary" onClick={onGenerateSRT}>
              Export SRT
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default VideoPanel
