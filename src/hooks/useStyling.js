import { useState, useCallback } from 'react'

export function useStyling() {
  const [style, setStyle] = useState({
    font_family: 'Arial',
    font_size: 48,
    font_color: '#FFFFFF',
    background_color: '#00000080',
    border_color: '#000000',
    border_width: 2,
    border_radius: 4,
    shadow_color: '#000000',
    shadow_offset_x: 2,
    shadow_offset_y: 2,
    shadow_blur: 4,
    position: 'bottom',
    y_offset: 50,
    line_spacing: 10,
    alignment: 'center',
    bold: false,
    italic: false,
    underline: false
  })

  const updateStyle = useCallback((key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetStyle = useCallback(() => {
    setStyle({
      font_family: 'Arial',
      font_size: 48,
      font_color: '#FFFFFF',
      background_color: '#00000080',
      border_color: '#000000',
      border_width: 2,
      border_radius: 4,
      shadow_color: '#000000',
      shadow_offset_x: 2,
      shadow_offset_y: 2,
      shadow_blur: 4,
      position: 'bottom',
      y_offset: 50,
      line_spacing: 10,
      alignment: 'center',
      bold: false,
      italic: false,
      underline: false
    })
  }, [])

  const previewTextStyle = useCallback(() => ({
    fontFamily: style.font_family,
    fontSize: `${style.font_size}px`,
    color: style.font_color,
    backgroundColor: style.background_color,
    textShadow: style.shadow_blur > 0
      ? `${style.shadow_offset_x}px ${style.shadow_offset_y}px ${style.shadow_blur}px ${style.shadow_color}`
      : 'none',
    border: style.border_width > 0
      ? `${style.border_width}px solid ${style.border_color}`
      : 'none',
    borderRadius: `${style.border_radius}px`,
    padding: `${style.line_spacing}px`,
    textAlign: style.alignment,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none'
  }), [style])

  const previewStyle = useCallback(() => {
    const pos = style.position === 'bottom'
      ? { bottom: style.y_offset, left: '50%', transform: 'translateX(-50%)' }
      : style.position === 'top'
        ? { top: style.y_offset, left: '50%', transform: 'translateX(-50%)' }
        : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

    return { ...previewTextStyle(), ...pos }
  }, [style, previewTextStyle])

  return { style, updateStyle, resetStyle, previewStyle, previewTextStyle }
}