import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import healthHandler from './api/health';
import scriptHandler from './api/generate-video-script';
import scenesHandler from './api/generate-scenes';
import sceneImageHandler from './api/generate-scene-image';
import videoVisualsHandler from './api/generate-video-visuals';
import narrationHandler from './api/generate-narration';
import previewVoiceHandler from './api/preview-voice';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get('/api/health', healthHandler);
  app.post('/api/generate-video-script', scriptHandler);
  app.post('/api/generate-scenes', scenesHandler);
  app.post('/api/generate-scene-image', sceneImageHandler);
  app.post('/api/generate-video-visuals', videoVisualsHandler);
  app.post('/api/generate-narration', narrationHandler);
  app.post('/api/preview-voice', previewVoiceHandler);

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Klyvora Studio running on http://localhost:${PORT}`);
  });
}

startServer();
