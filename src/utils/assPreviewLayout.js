const REF_PLAY_Y = 1080

export function calculateMarginV(position, yOffset, playResY) {
  const y = Number(yOffset) || 0
  const scaledOff = Math.round((y * playResY) / REF_PLAY_Y)
  if (position === 'top') return Math.max(10, scaledOff)
  if (position === 'center') return Math.floor(playResY / 2)
  return Math.max(10, scaledOff)
}

export function computeAssFitFrame(containerWidth, containerHeight, playResX, playResY) {
  const rx = playResX > 0 ? playResX : 1920
  const ry = playResY > 0 ? playResY : 1080
  const targetRatio = rx / ry
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { w: 0, h: 0, scale: 0, playResX: rx, playResY: ry }
  }
  const wr = containerWidth / containerHeight
  if (wr > targetRatio) {
    const h = containerHeight
    const w = h * targetRatio
    return { w, h, scale: h / REF_PLAY_Y, playResX: rx, playResY: ry }
  }
  const w = containerWidth
  const h = w / targetRatio
  return { w, h, scale: h / REF_PLAY_Y, playResX: rx, playResY: ry }
}

export function getAssOverlayWrapperStyle(style, frame) {
  const { scale, playResX, playResY, w: fw, h: fh } = frame
  if (scale <= 0 || playResY <= 0) return { display: 'none' }

  const marginV = calculateMarginV(style.position, style.y_offset, playResY)
  const maxW = Math.max(0, ((playResX - 40) / playResX) * fw)

  const base = {
    position: 'absolute',
    pointerEvents: 'none',
    maxWidth: `${maxW}px`,
    boxSizing: 'border-box'
  }

  const vScale = fh / playResY

  if (style.position === 'bottom') {
    return {
      ...base,
      left: '50%',
      bottom: marginV * vScale,
      transform: 'translateX(-50%)'
    }
  }
  if (style.position === 'top') {
    const fontSc = Math.round((style.font_size * playResY) / REF_PLAY_Y)
    const topPx = (marginV + fontSc / 2) * vScale
    return {
      ...base,
      left: '50%',
      top: topPx,
      transform: 'translateX(-50%)'
    }
  }
  return {
    ...base,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }
}

export function getAssPreviewTextStyle(style, scale) {
  if (scale <= 0) return {}
  
  const fs = Math.round(style.font_size * scale)
  const pad = Math.round((style.line_spacing || 10) * scale)

  return {
    fontFamily: style.font_family || 'Arial',
    fontSize: `${fs}px`,
    lineHeight: 1.2,
    color: style.font_color || '#FFFFFF',
    backgroundColor: style.background_color ? `${style.background_color}99` : 'rgba(0,0,0,0.7)',
    padding: `${pad}px`,
    borderRadius: `${Math.round((style.border_radius || 4) * scale)}px`,
    textAlign: style.alignment || 'center',
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxSizing: 'border-box'
  }
}
