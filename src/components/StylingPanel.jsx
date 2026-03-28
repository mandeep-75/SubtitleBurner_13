function StylingPanel({ style, onUpdate, onReset }) {
  const positions = [
    { value: 'top', label: 'Top' },
    { value: 'center', label: 'Center' },
    { value: 'bottom', label: 'Bottom' }
  ]

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS'
  ]

  return (
    <div className="styling-panel">
      <div className="panel-header" style={{ padding: '0 0 8px 0', border: 'none' }}>
        <span className="panel-title">Subtitle Styling</span>
        <button className="btn btn-secondary" onClick={onReset} style={{ padding: '4px 8px', fontSize: 11 }}>
          Reset
        </button>
      </div>
      
      <div className="styling-panel-content" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
          <label className="label">Font</label>
          <select
            className="select"
            value={style.font_family}
            onChange={(e) => onUpdate('font_family', e.target.value)}
          >
            {fontFamilies.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
        
        <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
          <label className="label">Size: {style.font_size}px</label>
          <input
            type="range"
            min="12"
            max="120"
            value={style.font_size}
            onChange={(e) => onUpdate('font_size', parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ flex: '0 0 auto', minWidth: '80px' }}>
          <label className="label">Color</label>
          <div className="color-input">
            <input
              type="color"
              value={style.font_color}
              onChange={(e) => onUpdate('font_color', e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
          <label className="label">Position</label>
          <select
            className="select"
            value={style.position}
            onChange={(e) => onUpdate('position', e.target.value)}
          >
            {positions.map(pos => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
          <label className="label">Y Offset: {style.y_offset}px</label>
          <input
            type="range"
            min="0"
            max="200"
            value={style.y_offset}
            onChange={(e) => onUpdate('y_offset', parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

export default StylingPanel
