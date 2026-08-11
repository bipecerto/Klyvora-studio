# Setting Up GEMINI_API_KEY for Supabase Edge Functions

This document outlines how to deploy and configure the `generate-video-script` Supabase Edge Function with your Gemini API key.

## 1. Prerequisites
- A Supabase project connected to your Klyvora app.
- Supabase CLI installed (`npm i -g supabase` or via package manager).
- A valid Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Setting the Edge Function Secret in Supabase

The Gemini API key **must never** be exposed in client-side code (`VITE_GEMINI_API_KEY`). It is securely stored as a secret in your Supabase Edge Function environment.

Run the following command using the Supabase CLI:

```bash
supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Optionally set custom model variables if needed:

```bash
supabase secrets set GEMINI_TEXT_MODEL=gemini-3.6-flash
supabase secrets set GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
supabase secrets set GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

---

## 3. Deploying the Edge Function

Deploy the function to your Supabase project:

```bash
supabase functions deploy generate-video-script
```

---

## 4. How the Function Works

1. **Authentication & Ownership Check**:
   - The function extracts the Bearer token from the `Authorization` header.
   - Validates that the request comes from an authenticated user (`auth.users`).
   - Fetches the video record by `video_id` and verifies that `video.user_id` matches the caller's `user.id`.
   - Also verifies that `series.user_id` belongs to the user.

2. **Gemini AI Call**:
   - Uses the official `@google/genai` TypeScript SDK.
   - Reads series settings (Niche, Tone, Language, Platforms, Duration, Content & Visual Styles).
   - Calls `gemini-3.6-flash` using `responseMimeType: "application/json"` and strict `responseSchema`.
   - Returns structured JSON containing:
     - `topic`
     - `title`
     - `script` (Voiceover narration in series language)
     - `scenes` (Array of objects containing `scene_order`, `text`, `visual_prompt`, `duration`)

3. **Database Transaction**:
   - Updates `videos` status (`draft`), progress (`100%`), title, topic, script, and calculated total duration.
   - Deletes prior scenes for the video ID and inserts the new rows into `video_scenes`.

---

## 5. Testing the Edge Function

You can test the function directly from your terminal or Postman:

```bash
curl -i --location --request POST 'https://<your-supabase-project-ref>.supabase.co/functions/v1/generate-video-script' \
  --header 'Authorization: Bearer <user_jwt_access_token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "video_id": "<your-video-uuid>",
    "auto_topic": false
  }'
```

---

## 6. Local Development with Supabase CLI

To run and test Edge Functions locally:

```bash
supabase start
supabase functions serve generate-video-script --no-verify-jwt --env-file .env
```

Ensure `.env` contains:
```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```
