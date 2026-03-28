import { useState, useCallback } from 'react'

export function useStyling() {
  const [style, setStyle] = useState({
    font_family: 'Arial',
    font_size: 48,
    font_color: '#FFFFFF',
    position: 'bottom',
    y_offset: 50
  })

  const updateStyle = useCallback((key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetStyle = useCallback(() => {
    setStyle({
      font_family: 'Arial',
      font_size: 48,
      font_color: '#FFFFFF',
      position: 'bottom',
      y_offset: 50
    })
  }, [])

  return { style, updateStyle, resetStyle }
}
