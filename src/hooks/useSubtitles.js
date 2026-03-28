import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

export function useSubtitles() {
  const [subtitles, setSubtitles] = useState([])
  const [selectedSubtitle, setSelectedSubtitle] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)

  const importSubtitles = useCallback(async (filePath) => {
    try {
      const content = await readTextFile(filePath)
      const parsed = await invoke('parse_srt', { content })
      setSubtitles(parsed)
    } catch (error) {
      console.error('Failed to import subtitles:', error)
    }
  }, [])

  const updateSubtitle = useCallback((id, updates) => {
    setSubtitles(prev => prev.map(sub => 
      sub.id === id ? { ...sub, ...updates } : sub
    ))
    setSelectedSubtitle(current => {
      if (current?.id === id) {
        return { ...current, ...updates }
      }
      return current
    })
  }, [])

  const addSubtitle = useCallback(() => {
    const newSubtitle = {
      id: Date.now().toString(),
      start_time: currentTime,
      end_time: currentTime + 3,
      text: '',
      romanized: null
    }
    setSubtitles(prev => [...prev, newSubtitle])
    setSelectedSubtitle(newSubtitle)
  }, [currentTime])

  const deleteSubtitle = useCallback((id) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== id))
    if (selectedSubtitle?.id === id) {
      setSelectedSubtitle(null)
    }
  }, [selectedSubtitle])

  const exportSRT = useCallback(async (filePath, settings) => {
    try {
      const srtContent = await invoke('generate_srt', { 
        subtitles, 
        settings: settings || undefined 
      })
      await writeTextFile(filePath, srtContent)
      return filePath
    } catch (error) {
      console.error('Failed to export SRT:', error)
      return null
    }
  }, [subtitles])

  const updateCurrentTime = useCallback((time) => {
    setCurrentTime(time)
  }, [])

  return {
    subtitles,
    selectedSubtitle,
    currentSubtitleIndex: -1,
    setSelectedSubtitle,
    setCurrentTime: updateCurrentTime,
    setSubtitles,
    updateSubtitle,
    addSubtitle,
    deleteSubtitle,
    importSubtitles,
    exportSRT
  }
}
