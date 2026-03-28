function SubtitleEditor({
  subtitles,
  selectedSubtitle,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
  onExportSRT,
  onSeek
}) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  const handleTimeChange = (id, field, value) => {
    const time = parseFloat(value)
    if (!isNaN(time)) {
      onUpdate(id, { [field]: time })
    }
  }

  return (
    <div className="editor-panel">
      <div className="panel-header">
        <span className="panel-title">Subtitles</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onExportSRT}>
            Export SRT
          </button>
          <button className="btn btn-secondary" onClick={onAdd}>
            + Add
          </button>
        </div>
      </div>
      
      <div className="panel-content scrollbar-thin">
        {subtitles.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No subtitles yet</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Import a subtitle file or transcribe your video
            </p>
          </div>
        ) : (
          <div className="subtitle-list">
            {subtitles.map((sub, index) => (
              <div
                key={sub.id}
                className={`subtitle-item ${selectedSubtitle?.id === sub.id ? 'selected' : ''}`}
                onClick={() => onSelect(sub)}
                onDoubleClick={() => onSeek(sub.start_time)}
              >
                <span className="subtitle-index">{index + 1}</span>
                <div className="subtitle-content">
                  <div className="subtitle-time">
                    {formatTime(sub.start_time)} → {formatTime(sub.end_time)}
                  </div>
                  <div className="subtitle-text">
                    {sub.text || '(empty)'}
                  </div>
                </div>
                <button 
                  className="btn btn-icon" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(sub.id)
                  }}
                  style={{ opacity: 0.5, width: 28, height: 28 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSubtitle && (
        <div className="subtitle-editor">
          <div className="subtitle-editor-row">
            <div className="subtitle-editor-field">
              <label className="label">Start Time</label>
              <input
                type="number"
                className="input"
                value={selectedSubtitle.start_time.toFixed(3)}
                onChange={(e) => handleTimeChange(selectedSubtitle.id, 'start_time', e.target.value)}
                step="0.001"
              />
            </div>
            <div className="subtitle-editor-field">
              <label className="label">End Time</label>
              <input
                type="number"
                className="input"
                value={selectedSubtitle.end_time.toFixed(3)}
                onChange={(e) => handleTimeChange(selectedSubtitle.id, 'end_time', e.target.value)}
                step="0.001"
              />
            </div>
          </div>
          <div className="subtitle-editor-field">
            <label className="label">Text</label>
            <textarea
              className="input"
              value={selectedSubtitle.text}
              onChange={(e) => onUpdate(selectedSubtitle.id, { text: e.target.value })}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default SubtitleEditor