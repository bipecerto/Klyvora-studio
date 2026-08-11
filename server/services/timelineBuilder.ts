export interface TimelineScene {
  sceneId: string;
  sceneOrder: number;
  startTime: number;
  endTime: number;
  duration: number;
  visualUrl: string;
  text: string;
}

export interface VideoTimeline {
  videoId: string;
  totalDuration: number;
  scenes: TimelineScene[];
}

/**
 * Builds a timeline normalized to the narration audio duration.
 */
export function buildVideoTimeline(
  videoId: string,
  narrationDuration: number,
  scenes: any[]
): VideoTimeline {
  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes found to build timeline.');
  }

  if (!narrationDuration || narrationDuration <= 0) {
    throw new Error('Invalid narration duration provided for timeline construction.');
  }

  // Check if any scene is missing a visual image
  const missingVisuals = scenes.filter((s) => !s.visual_url && !s.visual_storage_path);
  if (missingVisuals.length > 0) {
    throw new Error(`Some scene visuals are not ready. (${missingVisuals.length} missing)`);
  }

  const rawTotalDuration = scenes.reduce((acc, s) => acc + (Number(s.duration) || 4), 0);
  const scaleFactor = rawTotalDuration > 0 ? narrationDuration / rawTotalDuration : 1;

  let currentTime = 0;
  const timelineScenes: TimelineScene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const rawDur = Number(scene.duration) || 4;
    const normalizedDur = rawDur * scaleFactor;

    const startTime = Math.round(currentTime * 100) / 100;
    const endTime = i === scenes.length - 1
      ? Math.round(narrationDuration * 100) / 100
      : Math.round((currentTime + normalizedDur) * 100) / 100;

    timelineScenes.push({
      sceneId: scene.id,
      sceneOrder: scene.scene_order || i + 1,
      startTime,
      endTime,
      duration: Math.max(0.1, Math.round((endTime - startTime) * 100) / 100),
      visualUrl: scene.visual_url || '',
      text: scene.text || '',
    });

    currentTime = endTime;
  }

  return {
    videoId,
    totalDuration: Math.round(narrationDuration * 100) / 100,
    scenes: timelineScenes,
  };
}
