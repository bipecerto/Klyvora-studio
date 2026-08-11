/**
 * Browser support detection for client-side local rendering using Canvas,
 * Web Audio API, and MediaRecorder.
 */

export interface LocalRenderSupportResult {
  supported: boolean;
  hasCanvasCaptureStream: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  supportedMimeType: string | null;
  formatLabel: 'MP4' | 'WebM' | 'Unsupported';
  reasons: string[];
}

export function checkLocalRenderSupport(): LocalRenderSupportResult {
  const reasons: string[] = [];

  if (typeof window === 'undefined') {
    return {
      supported: false,
      hasCanvasCaptureStream: false,
      hasMediaRecorder: false,
      hasAudioContext: false,
      supportedMimeType: null,
      formatLabel: 'Unsupported',
      reasons: ['Server-side rendering environment'],
    };
  }

  // 1. Canvas captureStream
  const testCanvas = document.createElement('canvas');
  const hasCanvasCaptureStream = typeof (testCanvas as any).captureStream === 'function';
  if (!hasCanvasCaptureStream) {
    reasons.push('Browser does not support canvas.captureStream()');
  }

  // 2. AudioContext
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const hasAudioContext = !!AudioContextClass;
  if (!hasAudioContext) {
    reasons.push('Browser does not support Web Audio API (AudioContext)');
  }

  // 3. MediaRecorder
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined';
  if (!hasMediaRecorder) {
    reasons.push('Browser does not support MediaRecorder');
  }

  // 4. MimeTypes
  let supportedMimeType: string | null = null;
  let formatLabel: 'MP4' | 'WebM' | 'Unsupported' = 'Unsupported';

  if (hasMediaRecorder) {
    const candidateTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of candidateTypes) {
      if (window.MediaRecorder.isTypeSupported(type)) {
        supportedMimeType = type;
        break;
      }
    }

    if (!supportedMimeType) {
      reasons.push('No compatible video MIME type supported for MediaRecorder');
    } else {
      formatLabel = supportedMimeType.includes('mp4') ? 'MP4' : 'WebM';
    }
  }

  const supported = hasCanvasCaptureStream && hasAudioContext && hasMediaRecorder && !!supportedMimeType;

  return {
    supported,
    hasCanvasCaptureStream,
    hasMediaRecorder,
    hasAudioContext,
    supportedMimeType,
    formatLabel,
    reasons,
  };
}

export function getSupportedRecordingMimeType(): string {
  const support = checkLocalRenderSupport();
  return support.supportedMimeType || 'video/webm';
}
