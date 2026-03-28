/**
 * Matches lib.rs ASS export: PlayRes = native video size, scaled from 1080p reference.
 */

const REF_PLAY_Y = 1080

/** Same rules as `calculate_margin_v` in src-tauri/src/lib.rs (with PlayRes height). */
export function calculateMarginV(position, yOffset, playResY) {
  const y = Number(yOffset) || 0
  const scaledOff = Math.round((y * playResY) / REF_PLAY_Y)
  if (position === 'top') return Math.max(10, scaledOff)
  if (position === 'center') return Math.floor(playResY / 2)
  return Math.max(10, scaledOff)
}

/**
 * Largest rectangle with the video's aspect ratio that fits in the panel.
 */
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

/**
 * Typography scaled from 1080p reference to preview frame (same as Rust scaling chain).
 */
export function getAssPreviewTextStyle(style, scale) {
  if (scale <= 0) return {}
  const fs = style.font_size * scale
  const pad = style.line_spacing * scale
  const bw = style.border_width * scale
  const br = style.border_radius * scale
  const sx = style.shadow_offset_x * scale
  const sy = style.shadow_offset_y * scale
  const sb = style.shadow_blur * scale

  return {
    fontFamily: style.font_family,
    fontSize: `${fs}px`,
    lineHeight: 1.2,
    color: style.font_color,
    backgroundColor: style.background_color,
    textShadow:
      sb > 0 || sx !== 0 || sy !== 0
        ? `${sx}px ${sy}px ${sb}px ${style.shadow_color}`
        : 'none',
    border: bw > 0 ? `${bw}px solid ${style.border_color}` : 'none',
    borderRadius: `${br}px`,
    padding: `${pad}px`,
    textAlign: style.alignment,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    boxSizing: 'border-box'
  }
}
