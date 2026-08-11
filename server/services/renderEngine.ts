import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { buildVideoTimeline } from './timelineBuilder';
import { generateAndSaveVideoCaptions } from './captionGenerator';
import { buildAssSubtitleContent } from './assSubtitleBuilder';

/**
 * Resolves binary command executable path (supports ffmpeg-static in serverless).
 */
function getExecutablePath(command: string): string {
  if (command === 'ffmpeg') {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
    if (ffmpegStatic) return ffmpegStatic;
  }
  return command;
}

/**
 * Executes a process using spawn safely (without shell injection).
 */
function runProcess(command: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const binary = getExecutablePath(command);
    const proc = spawn(binary, args, { cwd });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        console.error(`Process ${command} failed. Stderr:`, stderr);
        reject(new Error(`Command ${command} failed with code ${code}.\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Downloads a URL or Base64 Data URL to a destination file path.
 */
async function downloadToFile(urlOrData: string, destPath: string): Promise<void> {
  if (urlOrData.startsWith('data:')) {
    const base64Data = urlOrData.split(',')[1] || '';
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(destPath, buffer);
    return;
  }

  const response = await fetch(urlOrData);
  if (!response.ok) {
    throw new Error(`Failed to download resource from ${urlOrData}: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.promises.writeFile(destPath, Buffer.from(arrayBuffer));
}

/**
 * Gets exact duration of an audio file using ffprobe.
 */
async function getAudioDuration(audioPath: string, cwd: string): Promise<number> {
  try {
    const output = await runProcess(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ],
      cwd
    );
    const duration = parseFloat(output);
    if (!isNaN(duration) && duration > 0) {
      return duration;
    }
  } catch (err) {
    console.warn('ffprobe duration detection notice:', err);
  }
  return 0;
}

/**
 * Main video render pipeline engine.
 */
export async function renderVideoPipeline(
  videoId: string,
  userId: string,
  supabaseAdmin: any
): Promise<{ videoUrl: string; storagePath: string; duration: number }> {
  let tmpDir = '';

  try {
    // 1. Fetch video record & series details
    const { data: video, error: videoErr } = await supabaseAdmin
      .from('videos')
      .select('*, series(*)')
      .eq('id', videoId)
      .single();

    if (videoErr || !video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    if (video.user_id !== userId) {
      throw new Error('Forbidden: Video ownership mismatch.');
    }

    // Lock check: check if already rendering
    if (video.render_status === 'processing') {
      throw new Error('Video is already rendering.');
    }

    // Check narration requirement
    if (!video.narration_url) {
      throw new Error('Video narration audio is missing. Generate narration first.');
    }

    // Update status to processing (10%)
    await supabaseAdmin
      .from('videos')
      .update({
        render_status: 'processing',
        render_progress: 10,
        render_error: null,
      })
      .eq('id', videoId);

    // 2. Fetch scenes
    const { data: scenes, error: scenesErr } = await supabaseAdmin
      .from('video_scenes')
      .select('*')
      .eq('video_id', videoId)
      .order('scene_order', { ascending: true });

    if (scenesErr || !scenes || scenes.length === 0) {
      throw new Error('No scenes found for video.');
    }

    // Check if any scene visual is missing
    const missingScenes = scenes.filter((s: any) => !s.visual_url && !s.visual_storage_path);
    if (missingScenes.length > 0) {
      throw new Error(`Some scene visuals are not ready. (${missingScenes.length} missing)`);
    }

    // 3. Create temp directory
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `klyvora-render-${videoId}-`));

    // 4. Download narration audio
    const narrationPath = path.join(tmpDir, 'narration.wav');
    await downloadToFile(video.narration_url, narrationPath);

    // 5. Measure exact narration audio duration
    let exactNarrationDuration = await getAudioDuration('narration.wav', tmpDir);
    if (!exactNarrationDuration || exactNarrationDuration <= 0) {
      exactNarrationDuration = Number(video.narration_duration) || Number(video.duration) || 60;
    }

    // Update narration duration in DB if updated
    await supabaseAdmin
      .from('videos')
      .update({
        narration_duration: exactNarrationDuration,
        render_progress: 20,
      })
      .eq('id', videoId);

    // 6. Build timeline
    const timeline = buildVideoTimeline(videoId, exactNarrationDuration, scenes);

    // 7. Generate captions
    const captionStyle = video.series?.caption_style || 'Hormozi';
    const captions = await generateAndSaveVideoCaptions(videoId, userId, supabaseAdmin, exactNarrationDuration);

    // 8. Build ASS subtitle file
    const assContent = buildAssSubtitleContent(captions, captionStyle);
    const assPath = path.join(tmpDir, 'captions.ass');
    await fs.promises.writeFile(assPath, assContent, 'utf-8');

    await supabaseAdmin
      .from('videos')
      .update({ render_progress: 30 })
      .eq('id', videoId);

    // 9. Process scene images & render individual scene video clips
    const sceneClipNames: string[] = [];
    const totalScenes = timeline.scenes.length;

    for (let i = 0; i < totalScenes; i++) {
      const scene = timeline.scenes[i];
      const imgFileName = `scene_${i + 1}.png`;
      const clipFileName = `scene_${i + 1}.mp4`;
      const imgPath = path.join(tmpDir, imgFileName);

      await downloadToFile(scene.visualUrl, imgPath);

      const frames = Math.max(30, Math.ceil(scene.duration * 30));
      const durStr = scene.duration.toFixed(3);

      // Alternate Ken Burns camera motion per scene
      let zoomFilter = `zoompan=z='min(zoom+0.0015,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
      const motionType = i % 4;

      if (motionType === 1) {
        zoomFilter = `zoompan=z=1.10:x='if(lte(on,1),0,min((iw-iw/zoom),x+1))':y='ih/2-(iw/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
      } else if (motionType === 2) {
        zoomFilter = `zoompan=z='if(lte(zoom,1.0),1.15,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
      } else if (motionType === 3) {
        zoomFilter = `zoompan=z=1.10:x='if(lte(on,1),(iw-iw/zoom)/2,max(0,x-1))':y='ih/2-(iw/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
      }

      const vfPipeline = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoomFilter}`;

      await runProcess(
        'ffmpeg',
        [
          '-y',
          '-loop',
          '1',
          '-i',
          imgFileName,
          '-vf',
          vfPipeline,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-t',
          durStr,
          '-r',
          '30',
          clipFileName,
        ],
        tmpDir
      );

      sceneClipNames.push(clipFileName);

      const sceneProgress = Math.round(30 + ((i + 1) / totalScenes) * 35);
      await supabaseAdmin
        .from('videos')
        .update({ render_progress: sceneProgress })
        .eq('id', videoId);
    }

    // 10. Create concat list file
    const concatPath = path.join(tmpDir, 'concat.txt');
    const concatContent = sceneClipNames.map((name) => `file '${name}'`).join('\n');
    await fs.promises.writeFile(concatPath, concatContent, 'utf-8');

    await supabaseAdmin
      .from('videos')
      .update({ render_progress: 70 })
      .eq('id', videoId);

    // 11. Final FFmpeg assembly pass (Concat clips + audio + burn subtitles)
    const outputMp4 = 'final_output.mp4';
    await runProcess(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        'concat.txt',
        '-i',
        'narration.wav',
        '-vf',
        'subtitles=captions.ass',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'medium',
        '-crf',
        '22',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        outputMp4,
      ],
      tmpDir
    );

    await supabaseAdmin
      .from('videos')
      .update({ render_progress: 85 })
      .eq('id', videoId);

    // 12. Upload rendered MP4 to Supabase Storage
    const outputMp4Path = path.join(tmpDir, outputMp4);
    const mp4Buffer = await fs.promises.readFile(outputMp4Path);
    const storagePath = `${userId}/videos/${videoId}/final.mp4`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('media')
      .upload(storagePath, mp4Buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Failed to upload rendered video to Supabase Storage: ${uploadErr.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(storagePath);

    const finalVideoUrl = urlData?.publicUrl || '';

    // 13. Update video record in database as ready
    await supabaseAdmin
      .from('videos')
      .update({
        video_url: finalVideoUrl,
        video_storage_path: storagePath,
        render_status: 'ready',
        render_progress: 100,
        render_error: null,
        rendered_at: new Date().toISOString(),
        duration: Math.round(exactNarrationDuration),
        status: 'ready',
      })
      .eq('id', videoId);

    return {
      videoUrl: finalVideoUrl,
      storagePath,
      duration: exactNarrationDuration,
    };

  } catch (err: any) {
    console.error(`Render pipeline failed for video ${videoId}:`, err);

    // Update video record as failed in database
    try {
      await supabaseAdmin
        .from('videos')
        .update({
          render_status: 'failed',
          render_error: err.message || 'Render failed.',
        })
        .eq('id', videoId);
    } catch (_) {}

    throw err;
  } finally {
    // Clean up temp directory safely
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('Failed to clean up render temp directory:', cleanupErr);
      }
    }
  }
}
