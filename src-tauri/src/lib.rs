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
#[serde(default)]
pub struct SubtitleStyle {
    pub font_family: String,
    pub font_size: u32,
    pub font_color: String,
    pub background_color: Option<String>,
    pub border_color: Option<String>,
    pub border_width: Option<u32>,
    pub border_radius: Option<u32>,
    pub shadow_color: Option<String>,
    pub shadow_offset_x: Option<i32>,
    pub shadow_offset_y: Option<i32>,
    pub shadow_blur: Option<u32>,
    pub position: String,
    pub y_offset: i32,
    pub line_spacing: Option<u32>,
    pub alignment: Option<String>,
    pub bold: Option<bool>,
    pub italic: Option<bool>,
    pub underline: Option<bool>,
}

impl Default for SubtitleStyle {
    fn default() -> Self {
        Self {
            font_family: "Arial".to_string(),
            font_size: 48,
            font_color: "#FFFFFF".to_string(),
            background_color: Some("#00000080".to_string()),
            border_color: Some("#000000".to_string()),
            border_width: Some(2),
            border_radius: Some(4),
            shadow_color: Some("#000000".to_string()),
            shadow_offset_x: Some(2),
            shadow_offset_y: Some(2),
            shadow_blur: Some(4),
            position: "bottom".to_string(),
            y_offset: 50,
            line_spacing: Some(10),
            alignment: Some("center".to_string()),
            bold: Some(false),
            italic: Some(false),
            underline: Some(false),
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

/// Native video dimensions (even width/height for H.264-friendly frames).
fn even_video_dimensions(width: u32, height: u32) -> (u32, u32) {
    let w = width.saturating_sub(width % 2).max(2);
    let h = height.saturating_sub(height % 2).max(2);
    (w, h)
}

async fn ffprobe_video_dimensions(path: &str) -> Result<(u32, u32), String> {
    let output = tokio::process::Command::new("ffprobe")
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let video_stream = json["streams"].as_array().and_then(|streams| {
        streams.iter().find(|s| s["codec_type"] == "video")
    });

    let (w, h) = if let Some(stream) = video_stream {
        (
            stream["width"].as_u64().unwrap_or(0) as u32,
            stream["height"].as_u64().unwrap_or(0) as u32,
        )
    } else {
        (0, 0)
    };

    if w == 0 || h == 0 {
        return Err("Could not read video width/height".to_string());
    }

    Ok(even_video_dimensions(w, h))
}

#[tauri::command]
async fn generate_subtitle_file(
    subtitles: Vec<Subtitle>,
    style: SubtitleStyle,
    output_path: String,
    settings: Option<TranscribeSettings>,
    video_width: Option<u32>,
    video_height: Option<u32>,
) -> Result<String, String> {
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

    let (pw, ph) = match (video_width, video_height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => even_video_dimensions(w, h),
        _ => (1920, 1080),
    };

    let ass_content = build_ass_content(&processed_subtitles, &style, pw, ph)?;
    
    tokio::fs::write(&output_path, ass_content)
        .await
        .map_err(|e| format!("Failed to write subtitle file: {}", e))?;
    
    log::info!(
        "Generated ASS file at: {} (font={}, size={}, position={})",
        output_path,
        style.font_family,
        style.font_size,
        style.position
    );
    
    Ok(output_path)
}

fn calculate_margin_v(position: &str, y_offset: i32, play_res_y: i32) -> i32 {
    let offset = y_offset.max(10);
    match position {
        "top" => offset,
        "center" => play_res_y / 2,
        _ => offset, // bottom: margin_v in ASS is distance from bottom
    }
}

/// Style in the UI is relative to a 1080p-tall reference; scale into native PlayRes.
fn scale_style_for_play_res(style: &SubtitleStyle, play_res_y: u32) -> SubtitleStyle {
    let scale = play_res_y as f64 / 1080.0;
    let scale_u32 = |n: u32| ((n as f64) * scale).round().max(0.0) as u32;
    let scale_i32 = |n: i32| ((n as f64) * scale).round() as i32;

    SubtitleStyle {
        font_size: ((style.font_size as f64) * scale).round().max(1.0) as u32,
        y_offset: scale_i32(style.y_offset),
        border_width: style.border_width.map(scale_u32),
        border_radius: style.border_radius.map(scale_u32),
        shadow_offset_x: style.shadow_offset_x.map(scale_i32),
        shadow_offset_y: style.shadow_offset_y.map(scale_i32),
        shadow_blur: style.shadow_blur.map(scale_u32),
        line_spacing: style.line_spacing.map(scale_u32),
        ..style.clone()
    }
}

fn calculate_ass_alignment(position: &str, alignment: &str) -> i32 {
    let text_align = match alignment {
        "left" => 0,
        "right" => 2,
        _ => 1, // center
    };
    
    match position {
        "top" => 7 + text_align,  // 7=left, 8=center, 9=right - positions from top
        "center" => 4 + text_align, // 4=left, 5=center, 6=right - center vertically
        _ => 1 + text_align, // 1=left, 2=center, 3=right (bottom) - positions from bottom
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

/// ASS/SSA uses H:MM:SS.cs with **centiseconds** (2 digits). Milliseconds break parsing and
/// stretch or merge cues so old lines never clear in libass/ffmpeg.
fn format_ass_time(seconds: f64) -> String {
    let total_cs = (seconds * 100.0).round().max(0.0) as u64;
    let cs = (total_cs % 100) as u32;
    let mut t = total_cs / 100;
    let s = (t % 60) as u32;
    t /= 60;
    let m = (t % 60) as u32;
    let h = (t / 60) as u32;
    format!("{}:{:02}:{:02}.{:02}", h, m, s, cs)
}

/// Commas and backslashes in the Text field must be escaped or libass mis-parses Dialogue lines.
fn escape_ass_user_text(s: &str) -> String {
    s.replace('\\', "\\\\").replace(',', "\\,")
}

/// Clamp overlapping cues so only one line is active at a time (fixes stacked / "stuck" subtitles in libass).
fn normalize_subtitles_nonoverlap(subs: &[Subtitle]) -> Vec<Subtitle> {
    if subs.is_empty() {
        return vec![];
    }
    let mut sorted: Vec<Subtitle> = subs.to_vec();
    sorted.sort_by(|a, b| {
        a.start_time
            .partial_cmp(&b.start_time)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    // Slightly larger gap so rounding to ASS centiseconds never leaves overlapping active cues.
    const GAP: f64 = 0.05;
    for i in 0..sorted.len() {
        if i + 1 < sorted.len() {
            let next_start = sorted[i + 1].start_time;
            if sorted[i].end_time > next_start - GAP {
                sorted[i].end_time = (next_start - GAP).max(sorted[i].start_time + GAP);
            }
        }
        if sorted[i].end_time <= sorted[i].start_time {
            sorted[i].end_time = sorted[i].start_time + GAP;
        }
    }
    sorted
}

fn apply_ass_inline_styles(positioned_text: &str, style: &SubtitleStyle) -> String {
    let mut result = positioned_text.to_string();
    if style.italic.unwrap_or(false) {
        result = format!("{{\\i1}}{}{{|\\i0}}", result);
    }
    if style.bold.unwrap_or(false) {
        result = format!("{{\\b1}}{}{{|\\b0}}", result);
    }
    if style.underline.unwrap_or(false) {
        result = format!("{{\\u1}}{}{{|\\u0}}", result);
    }
    result
}

fn wrap_text_for_ass(text: &str, max_chars_per_line: usize) -> String {
    if text.contains("\\N") || text.contains('\n') {
        return text.replace("\n", "\\N");
    }
    
    let mut result = String::new();
    let mut current_line = String::new();
    
    for word in text.split_whitespace() {
        if current_line.is_empty() {
            current_line.push_str(word);
        } else if current_line.len() + 1 + word.len() <= max_chars_per_line {
            current_line.push(' ');
            current_line.push_str(word);
        } else {
            if !result.is_empty() {
                result.push_str("\\N");
            }
            result.push_str(&current_line);
            current_line = word.to_string();
        }
    }
    
    if !current_line.is_empty() {
        if !result.is_empty() {
            result.push_str("\\N");
        }
        result.push_str(&current_line);
    }
    
    result
}

#[tauri::command]
async fn export_video(
    video_path: String,
    subtitle_path: String,
    output_path: String,
    reencode: bool,
    subtitles: Vec<Subtitle>,
    settings: Option<TranscribeSettings>,
    style: SubtitleStyle,
) -> Result<String, String> {
    log::info!("Exporting video with subtitles from: {}", subtitle_path);
    
    // Check video file exists
    if !std::path::Path::new(&video_path).exists() {
        return Err(format!("Video file not found: {}", video_path));
    }
    
    // Find bundled ffmpeg or use system ffmpeg
    let ffmpeg_path = find_ffmpeg();
    log::info!("Using ffmpeg at: {}", ffmpeg_path);

    let (out_w, out_h) = ffprobe_video_dimensions(&video_path).await?;
    log::info!("Export at native resolution {}x{} (even dimensions for encoder)", out_w, out_h);
    
    let audio_codec = if reencode { "-c:a aac -b:a 192k" } else { "-c:a copy" };
    
    // Generate ASS file for burning with styling
    let settings = settings.unwrap_or_default();
    let max_words = settings.max_words_per_line;
    
    let processed_subtitles = if max_words > 1 {
        let mut result = Vec::new();
        for sub in subtitles {
            result.extend(split_subtitle_by_words(&sub, max_words));
        }
        result
    } else {
        subtitles
    };

    // Generate ASS content with styling for subtitle burning
    let ass_content = build_ass_content(&processed_subtitles, &style, out_w, out_h)?;
    
    // Use app's temp directory for temporary ASS file
    let ass_filename = format!("subtitle_burner_{}.ass", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0));
    let ass_path = std::env::temp_dir().join(ass_filename);
    let ass_path_str = ass_path.to_string_lossy().to_string();
    tokio::fs::write(&ass_path, &ass_content)
        .await
        .map_err(|e| format!("Failed to write ASS file: {}", e))?;
    
    log::info!("Generated ASS file at: {}", ass_path_str);
    
    // Use ASS filter for styled subtitles
    let filter = format!(
        "crop=trunc(iw/2)*2:trunc(ih/2)*2,ass='{}'",
        ass_path_str.replace('\'', "'\\''")
    );
    
    log::info!("Filter chain: {}", filter);
    
    log::info!(
        "FFmpeg command: ffmpeg -i {} -vf {} -c:v libx264 -preset medium -crf 23 {} {}",
        video_path, filter, audio_codec, output_path
    );
    
    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        video_path.clone(),
        "-vf".to_string(),
        filter,
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        "medium".to_string(),
        "-crf".to_string(),
        "23".to_string(),
        "-pix_fmt".to_string(),
        "yuv420p".to_string(),
    ];
    
    let mut cmd = tokio::process::Command::new(&ffmpeg_path);
    cmd.args(&args).args(audio_codec.split_whitespace());
    cmd.arg(&output_path);
    
    let output = cmd.output().await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("FFmpeg error: {}", stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }
    
    // Clean up temp subtitle files
    if !subtitle_path.is_empty() {
        let _ = tokio::fs::remove_file(&subtitle_path).await;
    }
    let _ = tokio::fs::remove_file(&ass_path).await;
    
    log::info!("Video exported successfully to: {}", output_path);
    
    Ok(output_path)
}

fn find_ffmpeg() -> String {
    log::info!("Searching for bundled ffmpeg...");
    
    // 1. Use current working directory as project root
    let project_root = std::env::current_dir().unwrap_or_default();
    log::info!("Project root: {:?}", project_root);
    
    let paths_to_try = vec![
        project_root.join("ffmpeg").join("ffmpeg"),
        project_root.join("ffmpeg"),
    ];
    
    for p in &paths_to_try {
        log::info!("Checking: {:?}", p);
        if p.exists() {
            log::info!("Found bundled ffmpeg at: {:?}", p);
            return p.to_string_lossy().to_string();
        }
    }
    
    // 2. Check in Resources folder (for macOS .app bundle)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(dir) = exe_path.parent() {
            if let Some(parent) = dir.parent() {
                let resources_ffmpeg = parent.join("Resources").join("ffmpeg").join("ffmpeg");
                log::info!("Checking Resources: {:?}", resources_ffmpeg);
                if resources_ffmpeg.exists() {
                    return resources_ffmpeg.to_string_lossy().to_string();
                }
            }
        }
    }
    
    // 3. Try system ffmpeg in PATH
    if let Ok(output) = std::process::Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                log::info!("Using system ffmpeg: {}", path);
                return path;
            }
        }
    }
    
    panic!("Bundled ffmpeg not found! Please ensure ffmpeg binary is in the ffmpeg/ folder.");
}

fn build_ass_content(
    subtitles: &[Subtitle],
    style: &SubtitleStyle,
    play_res_w: u32,
    play_res_h: u32,
) -> Result<String, String> {
    if play_res_w < 2 || play_res_h < 2 {
        return Err("Invalid PlayRes dimensions".to_string());
    }

    let subtitles = normalize_subtitles_nonoverlap(subtitles);
    let scaled = scale_style_for_play_res(style, play_res_h);
    let play_h = play_res_h as i32;
    let margin_v = calculate_margin_v(&style.position, scaled.y_offset, play_h);
    let cx = play_res_w / 2;
    
    // Horizontal margins - keep text within screen bounds
    let horizontal_margin = 40u32;
    let margin_l = horizontal_margin;
    let margin_r = horizontal_margin;
    
    // Calculate max chars per line based on video width and font size
    // Use font size to estimate: roughly font_size * 0.6 = avg char width
    let font_width_estimate = (scaled.font_size as f64) * 0.6;
    let usable_width = (play_res_w as f64) - (horizontal_margin as f64) * 2.0;
    let chars_per_line = ((usable_width / font_width_estimate) as usize).max(20).min(60);

    // Get style values with defaults
    let bg_color = style.background_color.clone().unwrap_or_else(|| "#00000080".to_string());
    let border_col = style.border_color.clone().unwrap_or_else(|| "#000000".to_string());
    let align = style.alignment.clone().unwrap_or_else(|| "center".to_string());
    let line_sp = style.line_spacing.unwrap_or(10);
    let bold_val = style.bold.unwrap_or(false);
    let italic_val = style.italic.unwrap_or(false);
    let underline_val = style.underline.unwrap_or(false);

    let mut ass_content = String::new();
    
    ass_content.push_str("[Script Info]\n");
    ass_content.push_str("ScriptType: v4.00+\n");
    ass_content.push_str(&format!("PlayResX: {}\n", play_res_w));
    ass_content.push_str(&format!("PlayResY: {}\n", play_res_h));
    ass_content.push_str("ScaledBorderAndShadow: yes\n\n");
    
    ass_content.push_str("[V4+ Styles]\n");
    ass_content.push_str("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n");
    
    let shadow_offset_x = scaled.shadow_offset_x.unwrap_or(0);
    let shadow_offset_y = scaled.shadow_offset_y.unwrap_or(0);
    let shadow_blur = scaled.shadow_blur.unwrap_or(0);
    let border_width_scaled = scaled.border_width.unwrap_or(0);
    
    let outline = border_width_scaled.max(0);
    let shadow_distance = shadow_offset_x.abs().max(shadow_offset_y.abs()) as u32;
    let shadow = if shadow_blur > 0 || shadow_distance > 0 {
        shadow_blur + shadow_distance
    } else {
        0
    };
    
    let border_style = if shadow > 0 && bg_color.len() >= 7 && bg_color != "#00000000" {
        3
    } else {
        1
    };
    
    let primary_color = color_to_ass(&style.font_color);
    let outline_color = if border_width_scaled > 0 {
        color_to_ass(&border_col)
    } else {
        "00000000".to_string()
    };
    let back_color = if shadow > 0 {
        color_to_ass_with_alpha(&bg_color)
    } else {
        "00000000".to_string()
    };
    
    // Set alignment based on position: 2=bottom center, 5=center, 8=top center
    let alignment = match style.position.as_str() {
        "top" => 8,
        "center" => 5,
        _ => 2, // bottom
    };
    
    let secondary_color = "00000000";
    ass_content.push_str(&format!(
        "Style: Default,{},{},&H{},&H{},&H{},&H{},{},{},{},0,100,100,{},0,0,{},{},{},{},{},{},{},1\n\n",
        scaled.font_family,
        scaled.font_size,
        primary_color,
        secondary_color,
        outline_color,
        back_color,
        if bold_val { -1 } else { 0 },
        if italic_val { -1 } else { 0 },
        if underline_val { -1 } else { 0 },
        line_sp,
        border_style,
        outline,
        shadow,
        alignment,
        margin_l,
        margin_r,
        margin_v
    ));
    
    ass_content.push_str("[Events]\n");
    ass_content.push_str("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n");
    
    for sub in &subtitles {
        let start = format_ass_time(sub.start_time);
        let end = format_ass_time(sub.end_time);
        let text = wrap_text_for_ass(&escape_ass_user_text(&sub.text), chars_per_line);
        
        // For \pos: top uses y_offset, bottom uses (play_h - y_offset), center uses play_h/2
        let y_pos: i32 = match style.position.as_str() {
            "top" => margin_v,
            "center" => play_h / 2,
            _ => play_h - margin_v,  // bottom: distance from bottom
        };
        
        // \an: 2=bottom center, 5=center, 8=top center
        let an_value = match style.position.as_str() {
            "top" => 8,
            "center" => 5,
            _ => 2,
        };
        
        // Use \an for alignment - let style's MarginV handle vertical position
        // \an2=bottom center, \an5=center, \an8=top center
        let ass_override = format!("{{\\an{}}}", an_value);
        let positioned_text = format!("{}{}", ass_override, text);
        let styled_text = apply_ass_inline_styles(&positioned_text, style);
        
        // Use calculated margin_v for vertical positioning based on style.position
        ass_content.push_str(&format!("Dialogue: 0,{},{},Default,,{},{},{},,{}\n", start, end, margin_l, margin_r, margin_v, styled_text));
    }
    
    Ok(ass_content)
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

async fn download_model_if_needed(model_path: &PathBuf, model_filename: &str) -> Result<(), String> {
    if model_path.exists() {
        return Ok(());
    }
    
    let model_url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
        model_filename
    );
    
    log::info!("Downloading whisper model: {} -> {}", model_filename, model_url);
    
    let client = reqwest::Client::new();
    let response = client.get(&model_url).send().await.map_err(|e| format!("Download failed: {}", e))?;
    
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
    
    download_model_if_needed(&model_path, model_filename).await.map_err(|e| format!("Model download failed: {}", e))?;
    
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

fn generate_srt_content(subtitles: &[Subtitle]) -> String {
    let mut output = String::new();
    
    for (i, sub) in subtitles.iter().enumerate() {
        output.push_str(&format!("{}\n", i + 1));
        output.push_str(&format!("{} --> {}\n", format_srt_time(sub.start_time), format_srt_time(sub.end_time)));
        output.push_str(&format!("{}\n\n", sub.text));
    }
    
    output
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

#[tauri::command]
async fn copy_file(from_path: String, to_path: String) -> Result<(), String> {
    tokio::fs::copy(&from_path, &to_path)
        .await
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn generate_frame(
    video_path: String,
    timestamp: f64,
    subtitle_text: String,
    style: SubtitleStyle,
    output_path: String,
) -> Result<String, String> {
    log::info!("Generating frame at {}s with subtitle: {}", timestamp, subtitle_text);

    if !std::path::Path::new(&video_path).exists() {
        return Err(format!("Video file not found: {}", video_path));
    }

    let ffmpeg_path = find_ffmpeg();

    let (out_w, out_h) = ffprobe_video_dimensions(&video_path).await?;

    let frame_sub = Subtitle {
        id: "preview".to_string(),
        start_time: 0.0,
        end_time: 86400.0,
        text: subtitle_text,
        romanized: None,
    };
    let ass_content = build_ass_content(&[frame_sub], &style, out_w, out_h)?;

    let uniq = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let ass_path = std::env::temp_dir().join(format!("subtitle_burner_frame_{}.ass", uniq));
    tokio::fs::write(&ass_path, &ass_content)
        .await
        .map_err(|e| format!("Failed to write ASS file: {}", e))?;

    let escaped_path = ass_path.to_string_lossy().replace('\'', "'\\''");
    let filter = format!(
        "crop=trunc(iw/2)*2:trunc(ih/2)*2,ass='{}'",
        escaped_path
    );

    // Seek after -i so the frame matches the requested timestamp (keyframe-fast seek before -i is often wrong).
    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        video_path,
        "-ss".to_string(),
        timestamp.to_string(),
        "-vf".to_string(),
        filter,
        "-vframes".to_string(),
        "1".to_string(),
        "-q:v".to_string(),
        "2".to_string(),
        output_path.clone(),
    ];

    let mut cmd = tokio::process::Command::new(&ffmpeg_path);
    cmd.args(&args);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("FFmpeg error: {}", stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }

    let _ = tokio::fs::remove_file(&ass_path).await;

    log::info!("Frame generated successfully: {}", output_path);
    Ok(output_path)
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
            transcribe_audio,
            generate_frame,
            copy_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}