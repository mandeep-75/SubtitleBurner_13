import { useState, useCallback, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readFile } from '@tauri-apps/plugin-fs'

export function useVideo() {
  const videoElementRef = useRef(null)
  const pendingVideoPath = useRef(null)
  const [videoInfo, setVideoInfo] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const loadVideoInternal = useCallback(async (path) => {
    const videoEl = videoElementRef.current
    if (!videoEl) {
      pendingVideoPath.current = path
      return
    }

    try {
      const fileData = await readFile(path)
      const uint8Array = new Uint8Array(fileData)
      const blob = new Blob([uint8Array.buffer], { type: 'video/mp4' })
      videoEl.src = URL.createObjectURL(blob)
      videoEl.load()
    } catch (err) {
      console.error('Error loading video:', err)
      setIsLoading(false)
    }
  }, [])

  const setVideoRef = useCallback((el) => {
    videoElementRef.current = el

    if (el) {
      el.addEventListener('loadstart', () => setIsLoading(true))
      el.addEventListener('loadedmetadata', () => {
        setDuration(el.duration)
        setIsLoading(false)
      })
      el.addEventListener('timeupdate', () => setCurrentTime(el.currentTime))
      el.addEventListener('play', () => setIsPlaying(true))
      el.addEventListener('pause', () => setIsPlaying(false))
      el.addEventListener('error', (e) => {
        console.error('Video error:', e)
        setIsLoading(false)
      })

      if (pendingVideoPath.current) {
        loadVideoInternal(pendingVideoPath.current)
        pendingVideoPath.current = null
      }
    }
  }, [loadVideoInternal])

  const loadVideo = useCallback(async (path) => {
    setIsLoading(true)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    
    try {
      const info = await invoke('get_video_info', { path })
      setVideoInfo(info)
    } catch (e) {
      console.error('FFprobe error:', e)
    }
    
    loadVideoInternal(path)
  }, [loadVideoInternal])

  const play = useCallback(() => {
    videoElementRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    videoElementRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const seek = useCallback((time) => {
    if (videoElementRef.current?.src) {
      videoElementRef.current.currentTime = time
    }
  }, [])

  return {
    videoInfo,
    videoRef: setVideoRef,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    volume,
    loadVideo,
    play,
    pause,
    seek,
    setVolume
  }
}
