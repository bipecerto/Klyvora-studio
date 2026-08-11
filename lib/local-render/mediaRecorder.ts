import { checkLocalRenderSupport, getSupportedRecordingMimeType } from './browserSupport';

export interface StartMediaRecorderOptions {
  canvasStream: MediaStream;
  audioDestination: MediaStreamAudioDestinationNode;
  mimeType?: string;
  videoBitsPerSecond?: number;
}

export interface LocalRecorderResult {
  mediaRecorder: MediaRecorder;
  stopRecording: () => Promise<Blob>;
}

export function createLocalMediaRecorder(options: StartMediaRecorderOptions): LocalRecorderResult {
  const { canvasStream, audioDestination, videoBitsPerSecond = 8_000_000 } = options;

  const mimeType = options.mimeType || getSupportedRecordingMimeType();

  // Combine Canvas Video Tracks and Web Audio Audio Tracks
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ]);

  const chunks: Blob[] = [];

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond,
  });

  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.start(250); // Slice data every 250ms

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve(finalBlob);
      };

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve(finalBlob);
      }
    });
  };

  return {
    mediaRecorder,
    stopRecording,
  };
}
