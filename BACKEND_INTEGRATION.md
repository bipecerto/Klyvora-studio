# Klyvora Studio — Backend integrado

Esta versão mantém o frontend do Klyvora Studio (Google AI Studio) e incorpora o backend funcional do antigo Klyvora-YT.

## Arquitetura

- Frontend: React + Vite (Klyvora Studio)
- Roteiros: Gemini Interactions API (`gemini-3.6-flash` por padrão)
- Narração beta gratuita: TTS usado pelo antigo Klyvora-YT
- Imagens: Cloudflare Workers AI + `@cf/black-forest-labs/flux-1-schnell`
- Persistência opcional: Supabase
- Deploy: Vercel Functions em `/api`

## Variáveis de ambiente obrigatórias no Vercel

```env
GEMINI_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

## Variáveis opcionais

```env
GEMINI_MODEL=gemini-3.6-flash
CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Endpoints

- `POST /api/generate-video-script`
- `POST /api/preview-voice`
- `POST /api/generate-narration`
- `POST /api/generate-scene-image`
- `POST /api/generate-video-visuals`

O `server.ts` continua expondo os mesmos endpoints no ambiente de desenvolvimento do Google AI Studio. No Vercel, os arquivos em `/api` funcionam como Vercel Functions.

## Observação da beta

O frontend visual do Studio foi preservado. A exportação/renderização final do vídeo continua sendo a etapa seguinte; esta atualização prioriza roteiro, cenas, narração e geração de imagens por IA sem substituir o frontend do Google AI Studio.
