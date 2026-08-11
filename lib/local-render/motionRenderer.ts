export type MotionType = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'slow-push';

export interface MotionTransform {
  scale: number;
  translateX: number; // Percentage offset (-5 to +5)
  translateY: number;
}

export function getMotionForScene(sceneIndex: number): MotionType {
  const motions: MotionType[] = ['zoom-in', 'slow-push', 'zoom-out', 'pan-left', 'pan-right'];
  return motions[sceneIndex % motions.length];
}

export function calculateMotionTransform(
  motionType: MotionType,
  progress: number // 0 to 1
): MotionTransform {
  // Clamp progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));

  // Smooth ease-in-out quadratic interpolation
  const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  const baseScale = 1.08;
  const maxScaleDelta = 0.08; // 1.08 to 1.16

  switch (motionType) {
    case 'zoom-in':
      return {
        scale: baseScale + ease * maxScaleDelta,
        translateX: 0,
        translateY: 0,
      };

    case 'zoom-out':
      return {
        scale: baseScale + maxScaleDelta - ease * maxScaleDelta,
        translateX: 0,
        translateY: 0,
      };

    case 'pan-left':
      return {
        scale: 1.12,
        translateX: 20 - ease * 40, // 20px to -20px
        translateY: 0,
      };

    case 'pan-right':
      return {
        scale: 1.12,
        translateX: -20 + ease * 40, // -20px to 20px
        translateY: 0,
      };

    case 'slow-push':
    default:
      return {
        scale: baseScale + ease * (maxScaleDelta * 0.75),
        translateX: 0,
        translateY: -10 + ease * 20, // Slight vertical drift
      };
  }
}
