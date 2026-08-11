# Klyvora Local Render Engine

The Klyvora Local Render Engine provides a **100% Client-Side / Browser-Based Rendering Engine** designed to eliminate cloud rendering server costs by rendering 9:16 Shorts/Reels/TikTok videos directly on the user's device.

---

## How It Works

1. **Asset Loading**: Before rendering, scene images (`visual_url`) and narration audio (`narration_url`) are downloaded into local browser memory (`Blob` & `HTMLImageElement`).
2. **Canvas Composite (1080x1920 @ 30 FPS)**: An offscreen HTML5 canvas composites 9:16 vertical images with `object-fit: cover` calculations, dynamic Ken Burns motion transforms (`zoom-in`, `zoom-out`, `pan-left`, `pan-right`, `slow-push`), and 0.25s scene crossfade transitions.
3. **Web Audio API Mixing**: An `AudioContext` decodes the narration audio buffer and mixes it with optional background music into a `MediaStreamAudioDestinationNode`.
4. **MediaRecorder Stream Capture**: The Canvas video stream (`canvas.captureStream(30)`) and Web Audio track are combined into a `MediaStream` recorded by `MediaRecorder`.
5. **Real-Time Synthesis**: Rendering occurs in real-time synchronized against `AudioContext.currentTime`.
6. **Direct Download**: Once recording completes, a video `Blob` (WebM or MP4 depending on browser capabilities) is generated for instant local download without uploading to server storage.

---

## Requirements & Tab Active Notice

- **Browser Capabilities**: Requires HTML5 Canvas `captureStream()`, Web Audio API (`AudioContext`), and `MediaRecorder`.
- **Real-Time Execution**: A 60-second video takes approximately 60 seconds to render locally.
- **Active Tab Requirement**: Users must keep the browser tab open while local rendering is in progress.

---

## Output Formats & Comparison

| Feature | Render Local (Free) | Render Cloud |
|---|---|---|
| **Cost** | 100% Free (Zero server compute) | Requires Cloud Server / FFmpeg |
| **Output Format** | WebM or MP4 (Browser Native) | H.264 MP4 (Universal) |
| **Resolution** | 1080x1920 (9:16) | 1080x1920 (9:16) |
| **Subtitles** | Canvas Dynamic Subtitles | FFmpeg Burned-in ASS Subtitles |
| **Storage** | Device Only (Instant Download) | Supabase Cloud Bucket |
