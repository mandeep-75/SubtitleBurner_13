import { useState, useRef, useEffect } from 'react'

function Toolbar({ 
  onImportVideo, 
  onImportSubtitle, 
  onTranscribe, 
  onExport,
  transcribeSettings,
  onTranscribeSettingsChange,
  hasVideo,
  hasSubtitles,
  transcribing 
}) {
  const [showTranscribeMenu, setShowTranscribeMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowTranscribeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleTranscribeClick = () => {
    if (!hasVideo || transcribing) return
    onTranscribe(transcribeSettings)
    setShowTranscribeMenu(false)
  }

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
          Import Subtitle
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleTranscribeClick}
          disabled={!hasVideo || transcribing}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          {transcribing ? 'Transcribing...' : 'Transcribe'}
        </button>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowTranscribeMenu(!showTranscribeMenu)}
          disabled={!hasVideo || transcribing}
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '6px 8px', marginLeft: 1 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        
        {showTranscribeMenu && (
          <div className="dropdown-menu" ref={menuRef} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100 }}>
            <div className="dropdown-section">
              <div className="dropdown-label">Model</div>
              <select 
                className="dropdown-select"
                value={transcribeSettings?.whisperModel || 'tiny'}
                onChange={(e) => onTranscribeSettingsChange({ ...transcribeSettings, whisperModel: e.target.value })}
              >
                <option value="tiny">Tiny (fastest)</option>
                <option value="base">Base</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large (most accurate)</option>
              </select>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-label">Words per Line</div>
              <input
                type="range"
                min="1"
                max="10"
                value={transcribeSettings?.maxWordsPerLine || 5}
                onChange={(e) => onTranscribeSettingsChange({ ...transcribeSettings, maxWordsPerLine: parseInt(e.target.value) })}
                style={{ width: '100%', margin: '4px 0' }}
              />
              <div className="dropdown-value">{transcribeSettings?.maxWordsPerLine || 5} words</div>
            </div>
            <div className="dropdown-section">
              <label className="dropdown-checkbox">
                <input
                  type="checkbox"
                  checked={transcribeSettings?.autoRomanize || false}
                  onChange={(e) => onTranscribeSettingsChange({ ...transcribeSettings, autoRomanize: e.target.checked })}
                />
                Auto-romanize (Hindi/Punjabi)
              </label>
              {transcribeSettings?.autoRomanize && (
                <select 
                  className="dropdown-select"
                  value={transcribeSettings?.romanizationScheme || 'iast'}
                  onChange={(e) => onTranscribeSettingsChange({ ...transcribeSettings, romanizationScheme: e.target.value })}
                  style={{ marginTop: 8 }}
                >
                  <option value="iast">IAST</option>
                  <option value="itrans">ITRANS</option>
                  <option value="hk">Harvard-Kyoto</option>
                </select>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="toolbar-divider" />
      
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
      
      <div style={{ flex: 1 }} />
    </div>
  )
}

export default Toolbar