import { useState, useCallback, useEffect, useRef } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import Header from './components/Header'
import Toolbar from './components/Toolbar'
import VideoPanel from './components/VideoPanel'
import SubtitleEditor from './components/SubtitleEditor'
import StylingPanel from './components/StylingPanel'
import ExportModal from './components/ExportModal'
import { useSubtitles } from './hooks/useSubtitles'
import { useVideo } from './hooks/useVideo'
import { useStyling } from './hooks/useStyling'

function App() {
  const [showExport, setShowExport] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeProgress, setTranscribeProgress] = useState(0)
  const [transcribeSettings, setTranscribeSettings] = useState({
    whisperModel: 'tiny',
    maxWordsPerLine: 5,
    autoRomanize: false,
    romanizationScheme: 'iast'
  })

  const {
    subtitles,
    selectedSubtitle,
    setSelectedSubtitle,
    updateSubtitle,
    addSubtitle,
    deleteSubtitle,
    importSubtitles,
    exportSRT,
    setSubtitles
  } = useSubtitles()

  const {
    videoInfo,
    videoRef,
    currentTime,
    isPlaying,
    isLoading,
    loadVideo,
    play,
    pause,
    seek,
    setVolume
  } = useVideo()

  const {
    style,
    updateStyle,
    resetStyle,
    previewStyle
  } = useStyling()

  const handleImportVideo = useCallback(async () => {
    const result = await open({
      multiple: false,
      filters: [{
        name: 'Video',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm']
      }]
    })
    if (result) {
      loadVideo(result)
    }
  }, [loadVideo])

  const handleImportSubtitle = useCallback(async () => {
    const result = await open({
      multiple: false,
      filters: [{
        name: 'Subtitle',
        extensions: ['srt', 'vtt', 'ass', 'ssa', 'txt']
      }]
    })
    if (result) {
      importSubtitles(result)
    }
  }, [importSubtitles])

  const handleTranscribe = useCallback(async (settings) => {
    if (!videoInfo?.path) return
    
    setTranscribing(true)
    setTranscribeProgress(0)
    
    try {
      const result = await invoke('transcribe_audio', { 
        videoPath: videoInfo.path,
        settings: settings || transcribeSettings
      })
      setSubtitles(result.subtitles)
    } catch (e) {
      console.error('Transcription error:', e)
    }
    
    setTranscribing(false)
  }, [videoInfo, setSubtitles, transcribeSettings])

  const handleExport = useCallback(async () => {
    if (!videoInfo?.path || subtitles.length === 0) return
    setShowExport(true)
  }, [videoInfo, subtitles])

  return (
    <div className="app">
      <Header />
      <Toolbar
        onImportVideo={handleImportVideo}
        onImportSubtitle={handleImportSubtitle}
        onTranscribe={handleTranscribe}
        onExport={handleExport}
        transcribeSettings={transcribeSettings}
        onTranscribeSettingsChange={setTranscribeSettings}
        hasVideo={!!videoInfo?.path}
        hasSubtitles={subtitles.length > 0}
        transcribing={transcribing}
      />
      
      <div className="main-content">
        <VideoPanel
          videoRef={videoRef}
          videoInfo={videoInfo}
          currentTime={currentTime}
          isPlaying={isPlaying}
          subtitles={subtitles}
          style={previewStyle}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onVolumeChange={setVolume}
        />
        
        <SubtitleEditor
          subtitles={subtitles}
          selectedSubtitle={selectedSubtitle}
          onSelect={setSelectedSubtitle}
          onUpdate={updateSubtitle}
          onAdd={addSubtitle}
          onDelete={deleteSubtitle}
          onExportSRT={exportSRT}
          onSeek={seek}
          currentTime={currentTime}
        />
      </div>

      <StylingPanel
        style={style}
        onUpdate={updateStyle}
        onReset={resetStyle}
      />

      {showExport && (
        <ExportModal
          videoPath={videoInfo?.path || ''}
          subtitles={subtitles}
          style={style}
          transcribeSettings={transcribeSettings}
          onClose={() => setShowExport(false)}
        />
      )}

      {transcribing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Transcribing...</h3>
            </div>
            <div className="modal-body">
              <div className="progress-indicator">
                <div className="progress-bar-container">
                  <div className="progress" style={{ width: `${transcribeProgress}%` }} />
                </div>
                <span className="progress-text">Processing audio with Whisper...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App