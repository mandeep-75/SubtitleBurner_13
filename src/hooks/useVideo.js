import { useState, useCallback, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readFile } from '@tauri-apps/plugin-fs'

let videoElementRef = null
let videoBlobUrl = null
let pendingVideoPath = null

export function useVideo() {
  const [videoInfo, setVideoInfo] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  
  // Store video ref globally
  useEffect(() => {
    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl)
      }
    }
  }, [])

  const loadVideoInternal = useCallback(async (path) => {
    if (!videoElementRef) {
      pendingVideoPath = path
      console.log('>>> Waiting for video element, queuing path...')
      return
    }

    try {
      console.log('>>> Reading file...')
      const fileData = await readFile(path)
      console.log('>>> File size:', fileData.length)
      
      const uint8Array = new Uint8Array(fileData)
      const blob = new Blob([uint8Array.buffer], { type: 'video/mp4' })
      console.log('>>> Blob size:', blob.size)
      
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl)
      }
      
      videoBlobUrl = URL.createObjectURL(blob)
      console.log('>>> Blob URL created')
      
      videoElementRef.src = videoBlobUrl
      console.log('>>> Src set')
      
      videoElementRef.load()
      console.log('>>> load() called')
    } catch (err) {
      console.error('>>> Error:', err)
      setIsLoading(false)
    }
  }, [])

  const setVideoRef = useCallback((el) => {
    console.log('>>> Video ref set:', !!el)
    videoElementRef = el
    
    if (el) {
      console.log('>>> Setting up video events')
      
      el.addEventListener('loadstart', () => {
        console.log('>>> loadstart')
        setIsLoading(true)
      })
      
      el.addEventListener('loadeddata', () => {
        console.log('>>> loadeddata, readyState:', el.readyState)
      })
      
      el.addEventListener('canplay', () => {
        console.log('>>> canplay')
      })
      
      el.addEventListener('loadedmetadata', () => {
        console.log('>>> metadata loaded! duration:', el.duration, 'width:', el.videoWidth)
        setDuration(el.duration)
        setIsLoading(false)
        setVideoReady(true)
      })
      
      el.addEventListener('timeupdate', () => {
        setCurrentTime(el.currentTime)
      })
      
      el.addEventListener('play', () => {
        console.log('>>> play event')
        setIsPlaying(true)
      })
      
      el.addEventListener('pause', () => {
        console.log('>>> pause event')
        setIsPlaying(false)
      })
      
      el.addEventListener('error', (e) => {
        console.error('>>> video error:', el.error, el.networkState)
        setIsLoading(false)
      })

      // If there's a pending video path, load it now
      if (pendingVideoPath) {
        console.log('>>> Loading pending video...')
        const path = pendingVideoPath
        pendingVideoPath = null
        loadVideoInternal(path)
      }
    }
  }, [loadVideoInternal])

  const loadVideo = useCallback(async (path) => {
    console.log('>>> loadVideo:', path)
    setIsLoading(true)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setVideoReady(false)
    
    // Get video info
    try {
      const info = await invoke('get_video_info', { path })
      console.log('>>> Video info:', info)
      setVideoInfo(info)
    } catch (e) {
      console.error('>>> FFprobe error:', e)
    }
    
    loadVideoInternal(path)
  }, [loadVideoInternal])

  const play = useCallback(() => {
    console.log('>>> play, ready:', videoReady, 'src:', !!videoElementRef?.src, 'state:', videoElementRef?.readyState)
    
    if (!videoElementRef || !videoElementRef.src) {
      console.log('>>> No src')
      return
    }
    
    if (videoElementRef.readyState < 2) {
      console.log('>>> Not ready, state:', videoElementRef.readyState)
      return
    }
    
    videoElementRef.play()
      .then(() => console.log('>>> Playing'))
      .catch(e => console.error('>>> Play error:', e))
  }, [videoReady])

  const pause = useCallback(() => {
    videoElementRef?.pause()
    setIsPlaying(false)
  }, [])

  const seek = useCallback((time) => {
    if (videoElementRef?.src) {
      videoElementRef.currentTime = time
      setCurrentTime(time)
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