import { VideoRecord, VideoSceneRecord, VideoCaptionRecord } from '../../services/videoService';
import { checkLocalRenderSupport } from './browserSupport';
import { setupAudioMixer } from './audioMixer';
import { createLocalMediaRecorder } from './mediaRecorder';
import { drawImageCover } from './canvasRenderer';
import { getMotionForScene, calculateMotionTransform } from './motionRenderer';
import { renderCaptionOnCanvas } from './captionRenderer';
import { estimateWordTimings, getCurrentCaption } from './sceneTimeline';

export interface LocalRenderProgress {
  elapsedSeconds: number;
  totalSeconds: number;
  percentage: number;
  currentSceneIndex: number;
}

export interface LocalRenderOutput {
  blob: Blob;
  objectUrl: string;
  filename: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
}

export interface RenderLocallyParams {
  video: VideoRecord;
  scenes: VideoSceneRecord[];
  captions?: VideoCaptionRecord[];
  onProgress?: (progress: LocalRenderProgress) => void;
}

export async function renderVideoLocally(params: RenderLocallyParams): Promise<LocalRenderOutput> {
  const { video, scenes, captions = [], onProgress } = params;

  // 1. Verify Support
  const support = checkLocalRenderSupport();
  if (!support.supported) {
    throw new Error(`Render Local não suportado neste navegador: ${support.reasons.join(', ')}`);
  }

  // 2. Validate prerequisites
  if (!video.narration_url) {
    throw new Error('Narração ausente. Gere a narração antes de realizar o render local.');
  }
  if (!scenes || scenes.length === 0) {
    throw new Error('Cenas ausentes. Crie cenas antes de realizar o render local.');
  }
  const missingVisuals = scenes.filter((s) => !s.visual_url);
  if (missingVisuals.length > 0) {
    throw new Error(`Cenas sem imagem: ${missingVisuals.length} de ${scenes.length} cenas não possuem visual_url.`);
  }

  // 3. Preload Images into ImageBitmap / HTMLImageElement
  const loadedImages: Map<string, HTMLImageElement> = new Map();
  await Promise.all(
    scenes.map(async (scene) => {
      if (!scene.visual_url) return;
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedImages.set(scene.id, img);
          resolve();
        };
        img.onerror = () => {
          // If CORS fails or broken image URL
          reject(new Error(`Falha ao carregar imagem da cena ${scene.scene_order || scene.id}`));
        };
        img.src = scene.visual_url!;
      });
    })
  );

  // 4. Setup Audio Mixer
  const audioMixer = await setupAudioMixer(video.narration_url, video.music_url || null);
  const totalDuration = audioMixer.narrationDuration || scenes.reduce((sum, s) => sum + (s.duration || 4), 0);

  // 5. Build Scene Timeline with start/end bounds
  let accumulatedTime = 0;
  const sceneTimeline = scenes.map((s, idx) => {
    // If scene.duration exists, use it, else distribute evenly across totalDuration
    const rawDur = s.duration && s.duration > 0 ? s.duration : totalDuration / scenes.length;
    const startTime = accumulatedTime;
    const endTime = startTime + rawDur;
    accumulatedTime = endTime;
    return {
      scene: s,
      index: idx,
      startTime,
      endTime,
      duration: rawDur,
      image: loadedImages.get(s.id)!,
      motionType: getMotionForScene(idx),
    };
  });

  // Adjust last scene end time to match exact narration duration
  if (sceneTimeline.length > 0) {
    sceneTimeline[sceneTimeline.length - 1].endTime = totalDuration;
    sceneTimeline[sceneTimeline.length - 1].duration =
      totalDuration - sceneTimeline[sceneTimeline.length - 1].startTime;
  }

  // 6. Build Captions Timeline (Real captions or estimated fallback)
  const effectiveCaptions =
    captions && captions.length > 0
      ? captions.map((c) => ({
          start_time: Number(c.start_time),
          end_time: Number(c.end_time),
          text: c.text,
        }))
      : estimateWordTimings(video.script || '', totalDuration);

  // 7. Setup Offscreen/DOM Canvas (9:16 = 1080x1920 or 16:9 = 1920x1080)
  const is169 = video.aspect_ratio === '16:9' || video.video_format === 'long_form';
  const canvasWidth = is169 ? 1920 : 1080;
  const canvasHeight = is169 ? 1080 : 1920;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // 8. Capture Stream & Start MediaRecorder
  const canvasStream = (canvas as any).captureStream(30); // 30 FPS
  const recorder = createLocalMediaRecorder({
    canvasStream,
    audioDestination: audioMixer.destinationNode,
    mimeType: support.supportedMimeType!,
    videoBitsPerSecond: 8_000_000,
  });

  // 9. Master Animation Loop synchronized with AudioContext.currentTime
  const audioStartTime = audioMixer.audioContext.currentTime;

  return new Promise<LocalRenderOutput>((resolve, reject) => {
    let animFrameId: number;

    const renderLoop = () => {
      const audioCurrentTime = audioMixer.audioContext.currentTime - audioStartTime;
      const elapsedTime = Math.min(audioCurrentTime, totalDuration);

      // Report progress callback
      if (onProgress) {
        const percentage = Math.min(100, Math.floor((elapsedTime / totalDuration) * 100));
        const currentSceneIdx = sceneTimeline.findIndex(
          (st) => elapsedTime >= st.startTime && elapsedTime <= st.endTime
        );
        onProgress({
          elapsedSeconds: Math.floor(elapsedTime),
          totalSeconds: Math.floor(totalDuration),
          percentage,
          currentSceneIndex: Math.max(0, currentSceneIdx),
        });
      }

      // Find active scene entry
      let activeSceneEntry = sceneTimeline.find(
        (st) => elapsedTime >= st.startTime && elapsedTime < st.endTime
      );
      if (!activeSceneEntry) {
        activeSceneEntry = sceneTimeline[sceneTimeline.length - 1];
      }

      // Clear Canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      if (activeSceneEntry && activeSceneEntry.image) {
        const sceneElapsed = elapsedTime - activeSceneEntry.startTime;
        const sceneProgress = Math.max(0, Math.min(1, sceneElapsed / activeSceneEntry.duration));

        const transform = calculateMotionTransform(activeSceneEntry.motionType, sceneProgress);

        // Check for 0.25s crossfade with next scene
        const crossfadeWindow = 0.25;
        const timeUntilSceneEnd = activeSceneEntry.endTime - elapsedTime;
        const nextSceneEntry = sceneTimeline[activeSceneEntry.index + 1];

        if (timeUntilSceneEnd <= crossfadeWindow && nextSceneEntry && nextSceneEntry.image) {
          // Draw base current scene
          drawImageCover(
            ctx,
            activeSceneEntry.image,
            0,
            0,
            canvasWidth,
            canvasHeight,
            transform.scale,
            transform.translateX,
            transform.translateY
          );

          // Blend next scene over top with globalAlpha
          const fadeAlpha = 1 - timeUntilSceneEnd / crossfadeWindow;
          const nextTransform = calculateMotionTransform(nextSceneEntry.motionType, 0);

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, fadeAlpha));
          drawImageCover(
            ctx,
            nextSceneEntry.image,
            0,
            0,
            canvasWidth,
            canvasHeight,
            nextTransform.scale,
            nextTransform.translateX,
            nextTransform.translateY
          );
          ctx.restore();
        } else {
          // Standard single scene render
          drawImageCover(
            ctx,
            activeSceneEntry.image,
            0,
            0,
            canvasWidth,
            canvasHeight,
            transform.scale,
            transform.translateX,
            transform.translateY
          );
        }
      }

      // Draw Captions
      const currentCap = getCurrentCaption(effectiveCaptions, elapsedTime);
      if (currentCap) {
        renderCaptionOnCanvas(
          ctx,
          currentCap.text,
          video.caption_style || 'Minimal',
          canvasWidth,
          canvasHeight
        );
      }

      // Check if finished
      if (elapsedTime >= totalDuration) {
        // Allow 250ms padding for last frame to flush into recorder
        setTimeout(async () => {
          cancelAnimationFrame(animFrameId);
          audioMixer.stopAudio();

          try {
            const recordedBlob = await recorder.stopRecording();

            // Cleanup Web Audio & Canvas
            if (audioMixer.audioContext.state !== 'closed') {
              await audioMixer.audioContext.close();
            }

            const sanitizedTitle = (video.title || 'klyvora_video')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_');
            const ext = support.formatLabel === 'MP4' ? 'mp4' : 'webm';
            const filename = `klyvora-${sanitizedTitle}-local.${ext}`;
            const objectUrl = URL.createObjectURL(recordedBlob);

            resolve({
              blob: recordedBlob,
              objectUrl,
              filename,
              mimeType: recordedBlob.type || support.supportedMimeType!,
              durationSeconds: Math.round(totalDuration),
              sizeBytes: recordedBlob.size,
            });
          } catch (err) {
            reject(err);
          }
        }, 250);
        return;
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    // Kick off animation loop
    renderLoop();
  });
}
