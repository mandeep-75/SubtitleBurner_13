import { useState, useCallback } from 'react'

function StylingPanel({ style, onUpdate, onReset }) {
  const [openSections, setOpenSections] = useState({
    font: true,
    colors: true,
    border: false,
    shadow: false,
    position: false,
    alignment: false,
    style: false
  })

  const getOpacityPercent = () => {
    if (style.background_color.length === 9) {
      const opacity = parseInt(style.background_color.slice(7), 16)
      return Math.round((opacity / 255) * 100)
    }
    return 50 // Default 50% for 8-char hex
  }

  const toggleSection = useCallback((section) => {
    setOpenSections(prev => {
      const newState = { ...prev, [section]: !prev[section] }
      
      // Link related sections
      if (section === 'font') newState.colors = newState.font
      if (section === 'colors') newState.font = newState.colors
      if (section === 'border') newState.shadow = newState.border
      if (section === 'shadow') newState.border = newState.shadow
      if (section === 'position') newState.alignment = newState.position
      if (section === 'alignment') newState.position = newState.alignment
      
      return newState
    })
  }, [])

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

  const positions = [
    { value: 'top', label: 'Top' },
    { value: 'center', label: 'Center' },
    { value: 'bottom', label: 'Bottom' }
  ]

  const alignments = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
  ]

  const Section = ({ id, title, children }) => {
    const isOpen = openSections[id]
    return (
      <div className={`styling-section ${isOpen ? 'open' : 'closed'}`}>
        <div 
          className="styling-section-title" 
          onClick={() => toggleSection(id)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', fontSize: 8 }}>
            ▶
          </span>
          {title}
        </div>
        {isOpen && (
          <div className="styling-section-content">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="styling-panel">
      <div className="panel-header" style={{ padding: '0 0 8px 0', border: 'none' }}>
        <span className="panel-title">Subtitle Styling</span>
        <button className="btn btn-secondary" onClick={onReset} style={{ padding: '4px 8px', fontSize: 11 }}>
          Reset
        </button>
      </div>
      
      <div className="styling-panel-content">
        <Section id="font" title="Font">
          <div className="styling-grid">
            <div>
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
            <div>
              <label className="label">Size: {style.font_size}px</label>
              <input
                type="range"
                min="8"
                max="200"
                value={style.font_size}
                onChange={(e) => onUpdate('font_size', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section id="colors" title="Colors">
          <div className="styling-grid three-col">
            <div>
              <label className="label">Text</label>
              <div className="color-input">
                <input
                  type="color"
                  value={style.font_color}
                  onChange={(e) => onUpdate('font_color', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">BG Color</label>
              <div className="color-input">
                <input
                  type="color"
                  value={style.background_color.slice(0, 7)}
                  onChange={(e) => {
                    const opacity = style.background_color.length === 9 
                      ? style.background_color.slice(7) 
                      : '80'
                    onUpdate('background_color', e.target.value + opacity)
                  }}
                />
              </div>
            </div>
            <div>
              <label className="label">BG Opacity: {getOpacityPercent()}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={getOpacityPercent()}
                onChange={(e) => {
                  const opacityHex = Math.round((parseInt(e.target.value) / 100) * 255).toString(16).padStart(2, '0')
                  onUpdate('background_color', style.background_color.slice(0, 7) + opacityHex)
                }}
              />
            </div>
            <div>
              <label className="label">Border</label>
              <div className="color-input">
                <input
                  type="color"
                  value={style.border_color}
                  onChange={(e) => onUpdate('border_color', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section id="border" title="Border">
          <div className="styling-grid">
            <div>
              <label className="label">Width: {style.border_width}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={style.border_width}
                onChange={(e) => onUpdate('border_width', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Radius: {style.border_radius}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={style.border_radius}
                onChange={(e) => onUpdate('border_radius', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section id="shadow" title="Shadow">
          <div className="styling-grid">
            <div>
              <label className="label">Blur: {style.shadow_blur}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={style.shadow_blur}
                onChange={(e) => onUpdate('shadow_blur', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="color-input">
                <input
                  type="color"
                  value={style.shadow_color}
                  onChange={(e) => onUpdate('shadow_color', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section id="position" title="Position">
          <div className="styling-grid">
            <div>
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
            <div>
              <label className="label">Y Offset: {style.y_offset}px</label>
              <input
                type="range"
                min="0"
                max="200"
                value={style.y_offset}
                onChange={(e) => onUpdate('y_offset', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section id="alignment" title="Alignment">
          <div className="styling-grid">
            <div>
              <label className="label">Alignment</label>
              <select
                className="select"
                value={style.alignment}
                onChange={(e) => onUpdate('alignment', e.target.value)}
              >
                {alignments.map(align => (
                  <option key={align.value} value={align.value}>{align.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Line Space: {style.line_spacing}px</label>
              <input
                type="range"
                min="0"
                max="30"
                value={style.line_spacing}
                onChange={(e) => onUpdate('line_spacing', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section id="style" title="Style">
          <div style={{ display: 'flex', gap: '12px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={style.bold}
                onChange={(e) => onUpdate('bold', e.target.checked)}
              />
              Bold
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={style.italic}
                onChange={(e) => onUpdate('italic', e.target.checked)}
              />
              Italic
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={style.underline}
                onChange={(e) => onUpdate('underline', e.target.checked)}
              />
              Underline
            </label>
          </div>
        </Section>
      </div>
    </div>
  )
}

export default StylingPanel
