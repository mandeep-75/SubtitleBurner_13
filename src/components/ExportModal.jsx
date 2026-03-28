import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'

function ExportModal({ videoPath, videoWidth, videoHeight, subtitles, style, onClose }) {
  const [format, setFormat] = useState('mp4')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    try {
      const outputPath = await save({
        defaultPath: `output.${format}`,
        filters: [{
          name: 'Video',
          extensions: [format]
        }]
      })

      if (!outputPath) return

      setExporting(true)
      setError(null)
      setProgress(10)

      await invoke('export_video', {
        videoPath,
        subtitlePath: '',
        outputPath,
        reencode: true,
        subtitles,
        settings: null,
        style
      })

      setProgress(100)

      setTimeout(() => {
        setExporting(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Export failed:', error)
      setError(error.toString())
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Export Video</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Export video with burned-in subtitles. This will create a new video file with your subtitles rendered directly on the video.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label className="label">Format</label>
            <select
              className="select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={exporting}
            >
              <option value="mp4">MP4</option>
              <option value="mkv">MKV (recommended for subtitles)</option>
            </select>
          </div>

          {error && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: '16px'
            }}>
              Error: {error}
            </div>
          )}

          {exporting && (
            <div className="progress-indicator">
              <div className="progress-bar-container">
                <div className="progress" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">
                {progress < 30 ? 'Preparing...' :
                  progress < 80 ? 'Burning subtitles into video...' :
                    progress < 100 ? 'Finalizing...' :
                      'Complete!'}
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export Video'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
