function VideoPanel({ 
  videoRef, 
  videoInfo, 
  currentTime, 
  isPlaying, 
  subtitles, 
  style,
  onPlay, 
  onPause, 
  onSeek, 
  onVolumeChange 
}) {
  const currentSubtitle = subtitles.find(
    sub => currentTime >= sub.start_time && currentTime <= sub.end_time
  )

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const dur = videoRef.current?.duration || 0
    onSeek(percent * dur)
  }

  const handleVideoError = (e) => {
    console.error('Video error:', e.target.error)
  }

  const progress = (videoRef.current?.duration > 0) 
    ? (currentTime / videoRef.current.duration) * 100 
    : 0

  return (
    <div className="video-panel">
      <div className="video-container">
        {videoInfo ? (
          <>
            <video 
              ref={videoRef} 
              onClick={isPlaying ? onPause : onPlay}
              onError={handleVideoError}
              crossOrigin="anonymous"
              playsInline
            />
            {currentSubtitle && (
              <div className="subtitle-overlay">
                <span 
                  className="subtitle-preview"
                  style={style()}
                >
                  {currentSubtitle.text}
                </span>
              </div>
            )}
          </>
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
      
      <div className="video-controls">
        <button 
          className="btn btn-icon" 
          onClick={isPlaying ? onPause : onPlay}
          disabled={!videoInfo}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>
        
        <div className="progress-bar" onClick={handleProgressClick}>
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(videoRef.current?.duration)}
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1"
          value={1}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: 60 }}
        />
      </div>
      
      {videoInfo && (
        <div className="file-info">
          <span className="file-info-item">
            <strong>{videoInfo.width}x{videoInfo.height}</strong>
          </span>
          <span className="file-info-item">
            {formatTime(videoInfo.duration)}
          </span>
          <span className="file-info-item">
            {videoInfo.codec}
          </span>
        </div>
      )}
    </div>
  )
}

export default VideoPanel