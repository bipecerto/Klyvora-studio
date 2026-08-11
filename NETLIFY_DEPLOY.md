# Guia de Deploy Real do Klyvora no Netlify

Este documento descreve o passo a passo completo para publicar a aplicação **Klyvora** em produção no Netlify com suporte a **Netlify Functions** e **Background Function** para renderização de vídeos via FFmpeg.

---

## 1. Conectar ao GitHub e Importar no Netlify

1. Faça **push** de todo o código atual do projeto Klyvora para o seu repositório no GitHub.
2. Acesse a sua conta no [Netlify](https://app.netlify.com/).
3. Clique em **Add new site** > **Import an existing project**.
4. Selecione **GitHub** como provedor Git e autorize o acesso ao seu repositório `Klyvora`.

---

## 2. Configuração de Build e Diretórios

Durante a importação do projeto, o Netlify identificará automaticamente o arquivo `netlify.toml`. Confirme as seguintes configurações:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Functions directory:** `netlify/functions`

---

## 3. Variáveis de Ambiente no Netlify

Acesse **Site settings** > **Environment variables** no Netlify e cadastre as seguintes variáveis:

### Variáveis Públicas do Frontend (Vite)
- `VITE_SUPABASE_URL`: URL do seu projeto no Supabase (ex: `https://xxxx.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Chave pública/anon do Supabase.

### Secrets do Server-side (Netlify Functions)
- `GEMINI_API_KEY`: Sua chave de API do Google Gemini.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave Service Role (admin) do Supabase para upload no Storage e atualização de status em background.
- `GEMINI_TEXT_MODEL`: (Opcional) Modelo de texto/script (padrão: `gemini-3.6-flash`).
- `GEMINI_TTS_MODEL`: (Opcional) Modelo de narração/voz (padrão: `gemini-3.1-flash-tts-preview`).
- `GEMINI_IMAGE_MODEL`: (Opcional) Modelo de geração de imagens (padrão: `gemini-3.1-flash-image`).
- `GEMINI_MODEL`: (Deprecated / Fallback) Usado apenas como fallback legados para geração de texto.

> **ATENÇÃO:** NUNCA exponha a `GEMINI_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` com o prefixo `VITE_`. Elas devem permanecer exclusivamente como secrets do server-side para serem acessadas via `process.env` nas Netlify Functions.

---

## 4. Arquitetura das Netlify Functions

O backend da aplicação foi desacoplado para execução serverless no Netlify:

| Endpoint | Netlify Function | Tipo |
|---|---|---|
| `GET /api/health` | `health.ts` | Standard Function |
| `POST /api/generate-video-script` | `generate-video-script.ts` | Standard Function |
| `POST /api/preview-voice` | `preview-voice.ts` | Standard Function |
| `POST /api/generate-narration` | `generate-narration.ts` | Standard Function |
| `POST /api/generate-scene-image` | `generate-scene-image.ts` | Standard Function |
| `POST /api/generate-video-visuals` | `generate-video-visuals.ts` | Standard Function |
| `POST /api/generate-captions` | `generate-captions.ts` | Standard Function |
| `GET /api/video-status/:id` | `video-status.ts` | Standard Function |
| `POST /api/render-video` | `render-video-background.ts` | **Background Function** |

---

## 5. Funcionamento do Renderizador de Vídeo em Background

- O endpoint `POST /api/render-video` redireciona para a Background Function `render-video-background.ts`.
- O navegador recebe uma resposta imediata enquanto o Netlify processa o vídeo de fundo (com limite estendido de até 15 minutos).
- O binário do **FFmpeg** é provido pelo pacote estático `ffmpeg-static`, garantindo total compatibilidade com o ambiente Lambda do Netlify.
- O progresso (`render_progress`) e o status (`render_status`) são atualizados diretamente na tabela `videos` do Supabase e acompanhados em tempo real pelo frontend.
