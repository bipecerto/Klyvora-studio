# Klyvora Studio — Next.js (App Router)

Migração completa do Klyvora (Vite + React + Express) para **Next.js 14 (App
Router)**, pronto pra rodar na Vercel, reaproveitando o motor de geração do
`faceless-web`.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

## O que mudou de verdade (não é só "trocar de pasta")

### 1. O bug real do áudio/vídeo que não gerava
O Klyvora antigo já usava o **mesmo TTS grátis** que o faceless-web (endpoint
público do Google Translate, em `lib/server/freeTts.ts`). O motor de vídeo
local no navegador (`lib/local-render/`) também já existia e já era mais
avançado que o do faceless-web (Ken Burns, crossfade, legendas reais).

O problema mais provável era outro: a rota `generate-narration` **não tinha
`maxDuration` configurado**. Na Vercel (plano Hobby), uma função serverless
morre em ~10s por padrão. Como a narração é gerada em vários pedaços
sequenciais (um fetch por chunk de texto), roteiros mais longos estouravam
esse limite e o áudio nunca terminava — e o vídeo, que depende do áudio,
travava junto.

Nesta versão, todas as rotas pesadas (`generate-narration`,
`generate-video-script`, `generate-video-visuals`) declaram
`export const maxDuration = 300;`, exatamente como o faceless-web já fazia.

### 2. Render de vídeo: 100% no navegador, igual ao faceless
O pipeline antigo de render em nuvem (FFmpeg rodando em Netlify
Function/Express) foi **removido** — não faz sentido em serverless na
Vercel. `renderVideo()` agora avisa isso explicitamente e direciona pro
**Render Local**, que já é o motor certo: canvas + Web Audio + MediaRecorder
rodando no navegador do usuário, sem depender de servidor.

### 3. Arquitetura
- Rotas: `src/pages/*.tsx` (react-router) → `app/**/page.tsx` (App Router)
- `useNavigate/useParams/NavLink/<Navigate>` → `next/navigation` +
  `next/link` (com um pequeno shim em `components/compat/NavLink.tsx` pra
  não precisar reescrever o JSX que já usava a API de render-prop do
  react-router)
- `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
- `api/*.ts` (formato antigo Vercel `req,res`) + `netlify/functions/*` +
  `server.ts`/Express → consolidados em `app/api/**/route.ts` (Route
  Handlers do Next). Pra reduzir risco de reescrever ~800 linhas de lógica
  de negócio à mão, a lógica original dos handlers foi preservada quase
  1:1 em `lib/server/handlers/*.ts` e roda através de um adaptador em
  `lib/server/legacyHandler.ts`.
- `server-lib/*` (Gemini, Cloudflare, TTS, geração de cena) → `lib/server/*`

### 4. Coisas que eu encontrei quebradas no projeto original (não foram
introduzidas por essa migração) e corrigi
`VideoDetailPage.tsx` já importava várias funções que **não existiam** em
nenhum service (`searchStockAssets`, `updateSceneVisual`,
`retryMissingVisuals`, `getVideoCaptions`, `getVideoChapters`,
`generateCaptions`, `updateVideoCaption`, `pollVideoStatus`, `renderVideo`).
Implementei todas de verdade em `services/videoService.ts` e
`services/visualService.ts`:
- **Legendas**: geradas por estimativa de tempo por palavra a partir do
  roteiro + duração real da narração — mesmo princípio do faceless-web,
  usando o utilitário que já existia em `lib/local-render/sceneTimeline.ts`.
- **Busca de imagem de stock**: portei `server/services/stockService.ts`
  (que já existia, mas não estava exposto como rota) para
  `app/api/search-stock-assets/route.ts`.
- Capítulos/legendas usam as tabelas `video_chapters`/`video_captions` que
  já existiam no schema Supabase (`supabase/migrations`), só não tinham
  código cliente.

### 5. Removido/descontinuado
- `server.ts` (Express local dev server) — Next.js já serve tudo.
- `netlify/functions/*` — consolidado em `app/api`.
- `server/services/renderEngine.ts` (pipeline FFmpeg em servidor) —
  substituído pelo render local no navegador.
- 3 arquivos órfãos que nunca eram importados por nenhuma rota real
  (`SeriesWizard.tsx`, um `GenerateVideoModal.tsx` duplicado dentro de
  `components/series/`, e `LoginForm.tsx`) e o `DataContext.tsx` (contexto
  de dados mockados que só esses órfãos usavam).

## Deploy na Vercel
1. Suba esta pasta como repositório Git.
2. Import na Vercel — ela detecta Next.js automaticamente, sem configuração
   extra.
3. Configure as env vars do `.env.example` no dashboard da Vercel
   (Settings → Environment Variables).
4. Deploy.

## O que ainda vale revisar manualmente
- `youtube_title/description/tags` foram adicionados ao tipo `VideoRecord`
  pra bater com o que `VideoDetailPage` já esperava — confirme se essas
  colunas existem na tabela `videos` do seu Supabase.
- `AudioPlayerProps.onOpenVoicePicker` foi adicionado como prop opcional
  (não tinha implementação de UI ligada a ela ainda).
