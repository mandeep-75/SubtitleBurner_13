import { useState } from 'react'

function Toolbar({ 
  onImportVideo, 
  onImportSubtitle, 
  onTranscribe,
  onExport,
  whisperModel,
  onWhisperModelChange,
  hasVideo,
  hasSubtitles,
  transcribing
}) {
  const [showSettings, setShowSettings] = useState(false)

  const models = [
    { value: 'tiny', label: 'Tiny (fastest)' },
    { value: 'base', label: 'Base' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large (most accurate)' }
  ]

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button 
          className="btn btn-secondary" 
          onClick={onImportVideo}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import Video
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={onImportSubtitle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Import SRT
        </button>
      </div>

      <div className="toolbar-group">
        <button 
          className="btn btn-primary" 
          onClick={onTranscribe}
          disabled={!hasVideo || transcribing}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          {transcribing ? 'Transcribing...' : 'Transcribe'}
        </button>
        
        <select
          value={whisperModel}
          onChange={(e) => onWhisperModelChange(e.target.value)}
          style={{
            padding: '6px 8px',
            borderRadius: '0 4px 4px 0',
            border: '1px solid var(--color-accent-primary)',
            borderLeft: 'none',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text)',
            fontSize: 12
          }}
        >
          {models.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1 }} />
      
      <div className="toolbar-group">
        <button 
          className="btn btn-secondary" 
          onClick={onExport}
          disabled={!hasVideo || !hasSubtitles}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>
    </div>
  )
}

export default Toolbar
