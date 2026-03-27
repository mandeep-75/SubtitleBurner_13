import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

function ExportModal({ videoPath, subtitles, style, transcribeSettings, onClose }) {
  const [quality, setQuality] = useState('1080p')
  const [format, setFormat] = useState('mp4')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

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
      setProgress(10)

      const tempSubPath = outputPath + '.ass'
      
      await invoke('generate_subtitle_file', {
        subtitles,
        style,
        outputPath: tempSubPath,
        settings: transcribeSettings
      })

      setProgress(40)

      await invoke('export_video', {
        videoPath,
        subtitlePath: tempSubPath,
        outputPath,
        quality,
        reencode: true
      })

      setProgress(100)
      
      setTimeout(() => {
        setExporting(false)
        onClose()
      }, 500)

    } catch (error) {
      console.error('Export failed:', error)
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
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Quality</label>
            <select
              className="select"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={exporting}
            >
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="4k">4K (Ultra HD)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="label">Format</label>
            <select
              className="select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={exporting}
            >
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
            </select>
          </div>

          {exporting && (
            <div className="progress-indicator">
              <div className="progress-bar-container">
                <div className="progress" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">
                {progress < 40 ? 'Generating subtitles...' : 
                 progress < 100 ? 'Burning subtitles into video...' : 
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
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal