import { useState, useCallback } from 'react'
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
  const [whisperModel, setWhisperModel] = useState('tiny')

  const {
    subtitles,
    setSubtitles,
    selectedSubtitle,
    setSelectedSubtitle,
    updateSubtitle,
    addSubtitle,
    deleteSubtitle,
    importSubtitles,
    exportSRT
  } = useSubtitles()

  const {
    videoInfo,
    videoRef,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    loadVideo,
    play,
    pause,
    seek
  } = useVideo()

  const {
    style,
    updateStyle,
    resetStyle
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
        extensions: ['srt']
      }]
    })
    if (result) {
      importSubtitles(result)
    }
  }, [importSubtitles])

  const handleTranscribe = useCallback(async () => {
    if (!videoInfo?.path || transcribing) return
    
    setTranscribing(true)
    try {
      const result = await invoke('transcribe_audio', {
        videoPath: videoInfo.path,
        settings: { 
          whisperModel,
          maxWordsPerLine: 1,
          autoRomanize: false,
          romanizationScheme: 'iast'
        }
      })
      setSubtitles(result.subtitles)
    } catch (e) {
      console.error('Transcription error:', e)
    } finally {
      setTranscribing(false)
    }
  }, [videoInfo, whisperModel, setSubtitles, transcribing])

  const handleExport = useCallback(async () => {
    if (!videoInfo?.path || subtitles.length === 0) return
    setShowExport(true)
  }, [videoInfo, subtitles])

  const handleGenerateSRT = useCallback(async () => {
    if (!videoInfo?.path || subtitles.length === 0) return
    exportSRT(videoInfo.path.replace(/\.[^/.]+$/, '') + '.srt')
  }, [videoInfo, subtitles, exportSRT])

  return (
    <div className="app">
      <Header />
      <Toolbar
        onImportVideo={handleImportVideo}
        onImportSubtitle={handleImportSubtitle}
        onTranscribe={handleTranscribe}
        onExport={handleExport}
        whisperModel={whisperModel}
        onWhisperModelChange={setWhisperModel}
        hasVideo={!!videoInfo?.path}
        hasSubtitles={subtitles.length > 0}
        transcribing={transcribing}
      />
      
      <div className="main-content">
        <VideoPanel
          videoInfo={videoInfo}
          videoRef={videoRef}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isLoading={isLoading}
          play={play}
          pause={pause}
          seek={seek}
          subtitles={subtitles}
          style={style}
          onGenerateSRT={handleGenerateSRT}
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
          videoWidth={videoInfo?.width}
          videoHeight={videoInfo?.height}
          subtitles={subtitles}
          style={style}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

export default App
