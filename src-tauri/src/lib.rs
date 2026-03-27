use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscribeSettings {
    #[serde(rename = "whisperModel")]
    pub whisper_model: String,
    #[serde(rename = "maxWordsPerLine")]
    pub max_words_per_line: u32,
    #[serde(rename = "autoRomanize")]
    pub auto_romanize: bool,
    #[serde(rename = "romanizationScheme")]
    pub romanization_scheme: String,
}

impl Default for TranscribeSettings {
    fn default() -> Self {
        Self {
            whisper_model: "tiny".to_string(),
            max_words_per_line: 5,
            auto_romanize: false,
            romanization_scheme: "iast".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub path: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subtitle {
    pub id: String,
    pub start_time: f64,
    pub end_time: f64,
    pub text: String,
    pub romanized: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubtitleStyle {
    pub font_family: String,
    pub font_size: u32,
    pub font_color: String,
    pub background_color: String,
    pub border_color: String,
    pub border_width: u32,
    pub border_radius: u32,
    pub shadow_color: String,
    pub shadow_offset_x: i32,
    pub shadow_offset_y: i32,
    pub shadow_blur: u32,
    pub position: String,
    pub y_offset: i32,
    pub line_spacing: u32,
    pub alignment: String,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
}

impl Default for SubtitleStyle {
    fn default() -> Self {
        Self {
            font_family: "Arial".to_string(),
            font_size: 48,
            font_color: "#FFFFFF".to_string(),
            background_color: "#00000080".to_string(),
            border_color: "#000000".to_string(),
            border_width: 2,
            border_radius: 4,
            shadow_color: "#000000".to_string(),
            shadow_offset_x: 2,
            shadow_offset_y: 2,
            shadow_blur: 4,
            position: "bottom".to_string(),
            y_offset: 50,
            line_spacing: 10,
            alignment: "center".to_string(),
            bold: false,
            italic: false,
            underline: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportOptions {
    pub quality: String,
    pub format: String,
    pub output_path: String,
    pub reencode_audio: bool,
}

#[tauri::command]
async fn get_video_info(path: String) -> Result<VideoInfo, String> {
    log::info!("Getting video info for: {}", path);
    
    let output = tokio::process::Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &path
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        });

    let (width, height, fps, codec) = if let Some(stream) = video_stream {
        let w = stream["width"].as_u64().unwrap_or(0) as u32;
        let h = stream["height"].as_u64().unwrap_or(0) as u32;
        
        let fps_str = stream["r_frame_rate"].as_str().unwrap_or("30/1");
        let fps_parts: Vec<&str> = fps_str.split('/').collect();
        let fps = if fps_parts.len() == 2 {
            let num: f64 = fps_parts[0].parse().unwrap_or(30.0);
            let den: f64 = fps_parts[1].parse().unwrap_or(1.0);
            if den > 0.0 { num / den } else { 30.0 }
        } else {
            fps_str.parse().unwrap_or(30.0)
        };

        let c = stream["codec_name"].as_str().unwrap_or("unknown").to_string();
        (w, h, fps, c)
    } else {
        (0, 0, 30.0, "unknown".to_string())
    };

    Ok(VideoInfo {
        path,
        duration,
        width,
        height,
        fps,
        codec,
    })
}

#[tauri::command]
async fn generate_subtitle_file(subtitles: Vec<Subtitle>, style: SubtitleStyle, output_path: String, settings: Option<TranscribeSettings>) -> Result<String, String> {
    let settings = settings.unwrap_or_default();
    let max_words = settings.max_words_per_line;
    
    // If max_words > 1, split subtitles into multiple entries with equal time
    let processed_subtitles = if max_words > 1 {
        let mut result = Vec::new();
        for sub in subtitles {
            result.extend(split_subtitle_by_words(&sub, max_words));
        }
        result
    } else {
        subtitles
    };
    
    let mut ass_content = String::new();
    
    ass_content.push_str("[Script Info]\n");
    ass_content.push_str("ScriptType: v4.00+\n");
    ass_content.push_str("PlayResX: 1920\n");
    ass_content.push_str("PlayResY: 1080\n");
    ass_content.push_str(&format!("Title: SubtitleBurner Export\n"));
    ass_content.push_str(&format!("ScaledBorderAndShadow: yes\n\n"));
    
    ass_content.push_str("[V4+ Styles]\n");
    ass_content.push_str("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n");
    
    let primary_color = color_to_ass(&style.font_color);
    let outline_color = color_to_ass(&style.border_color);
    let back_color = color_to_ass_with_alpha(&style.background_color);
    
    // Calculate marginV based on position
    let margin_v = calculate_margin_v(&style.position, style.y_offset);
    
    // Alignment: convert text alignment to ASS alignment
    // ASS uses: 1=left, 2=center, 3=right for bottom-aligned
    // For top: 7=left, 8=center, 9=right
    // For center: 4=left, 5=center, 6=right
    let alignment = calculate_ass_alignment(&style.position, &style.alignment);
    
    // For box styling, we use BorderStyle=3 (opaque box)
    let border_style = if style.background_color.len() >= 7 && style.background_color != "#00000000" {
        3 // Opaque box
    } else {
        1 // Outline only
    };
    
    // Use the larger of border_width or shadow_blur for outline
    let outline = if style.border_width > 0 { style.border_width } else { 1 };
    let shadow = style.shadow_blur;
    
    ass_content.push_str(&format!(
        "Style: Default,{},{},&H{},&H000000,&H{},&H{},{},{},{},0,100,100,0,0,{},{},{},{},10,10,{},1\n\n",
        style.font_family,
        style.font_size,
        primary_color,
        outline_color,
        back_color,
        if style.bold { -1 } else { 0 },
        if style.italic { -1 } else { 0 },
        if style.underline { -1 } else { 0 },
        border_style,
        outline,
        shadow,
        alignment,
        margin_v
    ));
    
    ass_content.push_str("[Events]\n");
    ass_content.push_str("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n");
    
    for sub in &processed_subtitles {
        let start = format_time(sub.start_time);
        let end = format_time(sub.end_time);
        // Text is already split during transcription, just replace newlines for ASS format
        let text = sub.text.replace("\n", "\\N");
        
        // Add italic/bold/underline tags if needed
        let mut styled_text = text;
        if style.italic {
            styled_text = format!("{{\\i1}}{}{{//i1}}", styled_text);
        }
        if style.bold {
            styled_text = format!("{{\\b1}}{}{{//b1}}", styled_text);
        }
        if style.underline {
            styled_text = format!("{{\\u1}}{}{{//u1}}", styled_text);
        }
        
        ass_content.push_str(&format!("Dialogue: 0,{},{},Default,,0,0,{},,{}\n", start, end, margin_v, styled_text));
    }
    
    tokio::fs::write(&output_path, ass_content)
        .await
        .map_err(|e| format!("Failed to write subtitle file: {}", e))?;
    
    log::info!("Generated ASS file at: {} with style: font={}, size={}, color={}, bg={}, position={}, marginV={}", 
        output_path, style.font_family, style.font_size, primary_color, back_color, style.position, margin_v);
    
    Ok(output_path)
}

fn calculate_margin_v(position: &str, y_offset: i32) -> i32 {
    match position {
        "top" => y_offset, // Distance from top edge
        "center" => 0,    // Centered vertically
        _ => y_offset,    // Bottom - distance from bottom edge
    }
}

fn calculate_ass_alignment(position: &str, alignment: &str) -> i32 {
    let text_align = match alignment {
        "left" => 0,
        "right" => 2,
        _ => 1, // center
    };
    
    match position {
        "top" => 7 + text_align,  // 7=left, 8=center, 9=right
        "center" => 4 + text_align, // 4=left, 5=center, 6=right
        _ => 1 + text_align, // 1=left, 2=center, 3=right (bottom)
    }
}

fn color_to_ass_with_alpha(hex: &str) -> String {
    let hex = hex.trim_start_matches('#');
    if hex.len() >= 6 {
        // Check if we have alpha (8 or 9 chars)
        let alpha = if hex.len() >= 8 {
            u8::from_str_radix(&hex[6..8], 16).unwrap_or(128)
        } else {
            128 // Default 50% opacity
        };
        
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
        
        // ASS format: &HAABBGGRR
        format!("{:02X}{:02X}{:02X}{:02X}", b, g, r, alpha)
    } else {
        "80000000".to_string() // Default black with 50% opacity
    }
}

fn color_to_ass(hex: &str) -> String {
    let hex = hex.trim_start_matches('#');
    if hex.len() >= 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
        format!("{:02X}{:02X}{:02X}", b, g, r)
    } else {
        "FFFFFF".to_string()
    }
}

fn format_time(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let millis = ((seconds % 1.0) * 1000.0).round() as u32;
    format!("{}:{:02}:{:02}.{:03}", hours, minutes, secs, millis)
}

#[tauri::command]
async fn export_video(
    video_path: String,
    subtitle_path: String,
    output_path: String,
    quality: String,
    reencode: bool,
) -> Result<String, String> {
    log::info!("Exporting video with subtitles from: {}", subtitle_path);
    
    // Check subtitle file exists
    if !std::path::Path::new(&subtitle_path).exists() {
        return Err(format!("Subtitle file not found: {}", subtitle_path));
    }
    
    let (width, height) = match quality.as_str() {
        "720p" => ("1280", "720"),
        "4k" => ("3840", "2160"),
        _ => ("1920", "1080"),
    };
    
    let audio_codec = if reencode { "-c:a aac -b:a 192k" } else { "-c:a copy" };
    
    // Properly escape subtitle path for ffmpeg subtitles filter
    // Need to escape : as \: and \ as \\
    let escaped_sub_path = subtitle_path
        .replace('\\', "\\\\")
        .replace(':', "\\:");
    
    log::info!("Escaped subtitle path: {}", escaped_sub_path);
    
    let filter = format!(
        "scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2,subtitles='{}'",
        width, height, width, height, escaped_sub_path
    );
    
    // Log the full command for debugging (before args are constructed)
    let audio_arg = if reencode { "-c:a aac -b:a 192k" } else { "-c:a copy" };
    log::info!("FFmpeg command: ffmpeg -i {} -vf {} -c:v libx264 -preset medium -crf 23 {} -o {}",
        video_path, filter, audio_arg, output_path);
    
    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        video_path,
        "-vf".to_string(),
        filter,
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        "medium".to_string(),
        "-crf".to_string(),
        "23".to_string(),
    ];
    
    let mut cmd = tokio::process::Command::new("ffmpeg");
    cmd.args(&args).args(audio_codec.split_whitespace());
    cmd.arg("-o").arg(&output_path);
    
    let output = cmd.output().await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("FFmpeg error: {}", stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }
    
    // Clean up temp subtitle file
    let _ = tokio::fs::remove_file(&subtitle_path).await;
    
    log::info!("Video exported successfully to: {}", output_path);
    
    Ok(output_path)
}

#[tauri::command]
fn parse_srt(content: String) -> Vec<Subtitle> {
    let mut subtitles = Vec::new();
    let blocks: Vec<&str> = content.split("\n\n").collect();
    
    for block in blocks {
        let lines: Vec<&str> = block.trim().lines().collect();
        if lines.len() < 3 {
            continue;
        }
        
        let time_line = lines.get(1).unwrap_or(&"");
        let times: Vec<&str> = time_line.split(" --> ").collect();
        if times.len() != 2 {
            continue;
        }
        
        let start_time = parse_srt_time(times[0]);
        let end_time = parse_srt_time(times[1]);
        let text = lines[2..].join("\n");
        
        subtitles.push(Subtitle {
            id: format!("{}", subtitles.len() + 1),
            start_time,
            end_time,
            text,
            romanized: None,
        });
    }
    
    subtitles
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub subtitles: Vec<Subtitle>,
}

fn get_model_path() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/Library/Application Support", h)))
        .unwrap_or_else(|_| std::env::temp_dir().to_string_lossy().to_string());
    let model_dir = PathBuf::from(&app_data).join("SubtitleBurner").join("models");
    std::fs::create_dir_all(&model_dir).ok();
    model_dir
}

async fn download_model_if_needed(model_path: &PathBuf) -> Result<(), String> {
    if model_path.exists() {
        return Ok(());
    }
    
    let model_url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
    
    log::info!("Downloading whisper model...");
    
    let client = reqwest::Client::new();
    let response = client.get(model_url).send().await.map_err(|e| format!("Download failed: {}", e))?;
    
    let bytes = response.bytes().await.map_err(|e| format!("Failed to read response: {}", e))?;
    
    std::fs::write(model_path, bytes).map_err(|e| format!("Failed to write model: {}", e))?;
    
    log::info!("Model downloaded successfully");
    Ok(())
}

// Helper function to split text into subtitle entries with equal time distribution
fn split_subtitle_by_words(sub: &Subtitle, max_words: u32) -> Vec<Subtitle> {
    if max_words == 0 || sub.text.trim().is_empty() {
        return vec![sub.clone()];
    }
    
    let words: Vec<&str> = sub.text.split_whitespace().collect();
    if words.is_empty() {
        return vec![sub.clone()];
    }
    
    let total_words = words.len() as f64;
    let total_duration = sub.end_time - sub.start_time;
    let words_per_entry = max_words as usize;
    
    let mut result = Vec::new();
    let mut word_index = 0;
    let mut entry_num = 0;
    
    while word_index < words.len() {
        let entry_words: Vec<&str> = words[word_index..].iter().take(words_per_entry).cloned().collect();
        let _word_count = entry_words.len() as f64;
        
        // Calculate time for this entry - divide proportionally
        let start_fraction = word_index as f64 / total_words;
        let end_fraction = (word_index + entry_words.len()) as f64 / total_words;
        
        let entry_start = sub.start_time + (total_duration * start_fraction);
        let entry_end = sub.start_time + (total_duration * end_fraction);
        
        result.push(Subtitle {
            id: format!("{}.{}", sub.id, entry_num + 1),
            start_time: entry_start,
            end_time: entry_end,
            text: entry_words.join(" "),
            romanized: None,
        });
        
        word_index += entry_words.len();
        entry_num += 1;
    }
    
    result
}

#[tauri::command]
async fn transcribe_audio(video_path: String, settings: Option<TranscribeSettings>) -> Result<TranscriptionResult, String> {
    let settings = settings.unwrap_or_default();
    log::info!("Starting transcription for: {} with settings: {:?}", video_path, settings);
    
    let temp_dir = std::env::temp_dir();
    let audio_path = temp_dir.join("subtitle_burner_audio.wav");
    
    let extract_output = tokio::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i", &video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            audio_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !extract_output.status.success() {
        let stderr = String::from_utf8_lossy(&extract_output.stderr);
        return Err(format!("Failed to extract audio: {}", stderr));
    }
    
    let model_dir = get_model_path();
    let model_filename = match settings.whisper_model.as_str() {
        "base" => "ggml-base.bin",
        "small" => "ggml-small.bin",
        "medium" => "ggml-medium.bin",
        "large" => "ggml-large.bin",
        _ => "ggml-tiny.bin",
    };
    let model_path = model_dir.join(model_filename);
    
    download_model_if_needed(&model_path).await.map_err(|e| format!("Model download failed: {}", e))?;
    
    let ctx = WhisperContext::new_with_params(model_path.to_str().unwrap(), Default::default())
        .map_err(|e| format!("Failed to load whisper model: {}", e))?;
    
    let mut state = ctx.create_state().map_err(|e| format!("Failed to create whisper state: {}", e))?;
    
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    
    let audio_data = std::fs::read(&audio_path).map_err(|e| format!("Failed to read audio: {}", e))?;
    let sample_count = audio_data.len() / 2;
    let even_sample_count = sample_count * 2;
    let audio_data = &audio_data[..even_sample_count];
    
    let samples_i16: Vec<i16> = audio_data.chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    
    let mut samples_f32: Vec<f32> = vec![0.0; samples_i16.len()];
    whisper_rs::convert_integer_to_float_audio(&samples_i16, &mut samples_f32).map_err(|e| format!("Convert error: {}", e))?;
    
    // Check if audio is mono or stereo, convert if needed
    let samples = if samples_f32.len() % 2 == 0 {
        // Try as stereo, fallback to mono
        whisper_rs::convert_stereo_to_mono_audio(&samples_f32).unwrap_or(samples_f32)
    } else {
        samples_f32
    };
    
    state.full(params, &samples).map_err(|e| format!("Transcription failed: {}", e))?;
    
    let num_segments = state.full_n_segments().map_err(|e| format!("Failed to get segments: {}", e))?;
    let mut subtitles = Vec::new();
    for i in 0..num_segments {
        let text = state.full_get_segment_text(i).map_err(|e| format!("Failed to get text: {}", e))?;
        let start = state.full_get_segment_t0(i).map_err(|e| format!("Failed to get start: {}", e))?;
        let end = state.full_get_segment_t1(i).map_err(|e| format!("Failed to get end: {}", e))?;
        
        // Split subtitle into multiple entries with equal time
        let split_subs = split_subtitle_by_words(&Subtitle {
            id: format!("{}", i + 1),
            start_time: start as f64 / 100.0,
            end_time: end as f64 / 100.0,
            text,
            romanized: None,
        }, settings.max_words_per_line);
        
        subtitles.extend(split_subs);
    }
    
    let _ = tokio::fs::remove_file(&audio_path).await;
    
    if subtitles.is_empty() {
        return Ok(TranscriptionResult {
            subtitles: vec![Subtitle {
                id: "1".to_string(),
                start_time: 0.0,
                end_time: 5.0,
                text: "No speech detected in audio".to_string(),
                romanized: None,
            }],
        });
    }
    
    Ok(TranscriptionResult { subtitles })
}

fn parse_srt_time(time_str: &str) -> f64 {
    let time_str = time_str.trim().replace(",", ".");
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() == 3 {
        let hours: f64 = parts[0].parse().unwrap_or(0.0);
        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
        hours * 3600.0 + minutes * 60.0 + seconds
    } else {
        0.0
    }
}

#[tauri::command]
fn generate_srt(subtitles: Vec<Subtitle>, settings: Option<TranscribeSettings>) -> String {
    let settings = settings.unwrap_or_default();
    let max_words = settings.max_words_per_line;
    log::info!("generate_srt called with max_words: {}", max_words);
    
    // If max_words > 1, split subtitles into multiple entries with equal time
    let processed_subtitles = if max_words > 1 {
        let mut result = Vec::new();
        for sub in subtitles {
            result.extend(split_subtitle_by_words(&sub, max_words));
        }
        result
    } else {
        subtitles
    };
    
    let mut output = String::new();
    
    for (i, sub) in processed_subtitles.iter().enumerate() {
        output.push_str(&format!("{}\n", i + 1));
        output.push_str(&format!("{} --> {}\n", format_srt_time(sub.start_time), format_srt_time(sub.end_time)));
        output.push_str(&format!("{}\n\n", sub.text));
    }
    
    output
}

fn format_srt_time(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let millis = ((seconds % 1.0) * 1000.0).round() as u32;
    format!("{:02}:{:02}:{:02},{:03}", hours, minutes, secs, millis)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();
    
    log::info!("Starting SubtitleBurner application");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_video_info,
            generate_subtitle_file,
            export_video,
            parse_srt,
            generate_srt,
            transcribe_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}