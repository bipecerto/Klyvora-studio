export interface AudioMixerResult {
  audioContext: AudioContext;
  destinationNode: MediaStreamAudioDestinationNode;
  narrationDuration: number;
  stopAudio: () => void;
}

export async function setupAudioMixer(
  narrationUrl: string,
  musicUrl?: string | null
): Promise<AudioMixerResult> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const destinationNode = audioContext.createMediaStreamDestination();

  // Fetch Narration Audio
  const narrationRes = await fetch(narrationUrl);
  if (!narrationRes.ok) {
    throw new Error(`Failed to fetch narration audio: HTTP ${narrationRes.status}`);
  }
  const narrationBlob = await narrationRes.blob();
  const narrationArrayBuffer = await narrationBlob.arrayBuffer();
  const narrationAudioBuffer = await audioContext.decodeAudioData(narrationArrayBuffer);

  const narrationSource = audioContext.createBufferSource();
  narrationSource.buffer = narrationAudioBuffer;

  const narrationGain = audioContext.createGain();
  narrationGain.gain.value = 1.0;

  narrationSource.connect(narrationGain);
  narrationGain.connect(destinationNode);

  // Optional background music setup
  let musicSource: AudioBufferSourceNode | null = null;
  if (musicUrl) {
    try {
      const musicRes = await fetch(musicUrl);
      if (musicRes.ok) {
        const musicBlob = await musicRes.blob();
        const musicArrayBuffer = await musicBlob.arrayBuffer();
        const musicBuffer = await audioContext.decodeAudioData(musicArrayBuffer);

        musicSource = audioContext.createBufferSource();
        musicSource.buffer = musicBuffer;
        musicSource.loop = true;

        const musicGain = audioContext.createGain();
        musicGain.gain.value = 0.12; // Standard background ducking level

        musicSource.connect(musicGain);
        musicGain.connect(destinationNode);
        musicSource.start(0);
      }
    } catch (err) {
      console.warn('[AudioMixer] Optional background music failed to load:', err);
    }
  }

  // Start narration playback synchronized with master clock
  narrationSource.start(0);

  const stopAudio = () => {
    try {
      narrationSource.stop();
      narrationSource.disconnect();
      if (musicSource) {
        musicSource.stop();
        musicSource.disconnect();
      }
    } catch (_) {}
  };

  return {
    audioContext,
    destinationNode,
    narrationDuration: narrationAudioBuffer.duration,
    stopAudio,
  };
}
