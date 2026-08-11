import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestBody: any = {};
  try {
    requestBody = await req.json().catch(() => ({}));
  } catch (_) {
    requestBody = {};
  }

  const { video_id, auto_topic } = requestBody || {};

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables missing on server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user with token
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: "Missing required video_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Video Record & Series
    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("*, series(*)")
      .eq("id", video_id)
      .maybeSingle();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: "Video record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate Ownership (Security Check)
    if (video.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not own this video record" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (video.series && video.series.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not own the series associated with this video" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status = generating, progress = 10
    await supabaseAdmin
      .from("videos")
      .update({ status: "generating", progress: 10, error_message: null })
      .eq("id", video_id);

    // 3. Prepare Context from Series
    const series = video.series || {};
    const seriesName = series.name || "General Series";
    const niche = series.niche || "General";
    const description = series.description || "";
    const language = series.language || "English";
    const durationSec = series.duration || 60;
    const platforms = Array.isArray(series.platforms)
      ? series.platforms.join(", ")
      : (series.platforms || "TikTok, Shorts, Reels");
    const contentStyle = series.content_style || "Documentary";
    const tone = series.tone || "Informative";
    const visualStyle = series.visual_style || "Cinematic";

    let specifiedTopic = video.topic || "";

    // Progress = 25: Preparing Gemini prompt
    await supabaseAdmin
      .from("videos")
      .update({ progress: 25 })
      .eq("id", video_id);

    // 4. Initialize Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      await supabaseAdmin
        .from("videos")
        .update({
          status: "failed",
          progress: 0,
          error_message: "GEMINI_API_KEY environment variable is not configured on the server."
        })
        .eq("id", video_id);

      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is not set in Edge Function environment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

function sanitizeModelName(val: string | undefined, defaultModel: string): string {
  if (!val || typeof val !== 'string') return defaultModel;
  let trimmed = val.trim();
  const apiKey = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  if (trimmed.startsWith("AIza") || (apiKey && trimmed === apiKey)) return defaultModel;
  if (trimmed.includes(" ")) {
    const candidate = trimmed.split(/\s+/).pop();
    if (candidate && (candidate.startsWith("gemini-") || candidate.startsWith("imagen-"))) return candidate;
    return defaultModel;
  }
  if (!trimmed.startsWith("gemini-") && !trimmed.startsWith("imagen-")) return defaultModel;
  return trimmed;
}

    const rawModel = Deno.env.get("GEMINI_TEXT_MODEL") || Deno.env.get("GEMINI_MODEL");
    const modelName = sanitizeModelName(rawModel, "gemini-3.6-flash");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const topicDirective = auto_topic || !specifiedTopic.trim()
      ? "Choose a compelling, fresh, highly engaging topic tailored to this series."
      : `Use or refine this topic requested by the user: "${specifiedTopic}"`;

    const prompt = `You are an expert short-form video producer creating viral content for TikTok, Instagram Reels, and YouTube Shorts.

SERIES CONTEXT:
- Series Name: ${seriesName}
- Niche/Category: ${niche}
- Description: ${description}
- Language: ${language}
- Target Duration: ${durationSec} seconds
- Target Platforms: ${platforms}
- Content Style: ${contentStyle}
- Tone: ${tone}
- Visual Style: ${visualStyle}

TOPIC INSTRUCTION:
${topicDirective}

OUTPUT REQUIREMENTS:
1. "topic": Specific, intriguing, non-clickbait topic title in language "${language}".
2. "title": Short, catchy video title for social media in language "${language}".
3. "script": Full voiceover narration ONLY in "${language}".
   - Strictly NO scene markers ("Scene 1:"), NO speaker labels ("Narrator:"), NO visual cues, NO camera notes.
   - Natural narrative structure (Hook -> Development -> Payoff) without literal section headers.
   - Word count target for ${durationSec}s duration:
     ~30s: 65-80 words
     ~45s: 95-115 words
     ~60s: 130-160 words
     ~90s: 195-230 words
4. "scenes": Break the narration script into sequentially ordered scene objects matching ${durationSec}s.
   - Number of scenes: ~30s (6-8 scenes), ~45s (8-11 scenes), ~60s (10-14 scenes), ~90s (14-20 scenes).
   - "scene_order": Integer starting at 1.
   - "text": The EXACT narration text spoken during this scene. Concatenating all scene texts MUST form the exact script.
   - "visual_prompt": Detailed visual description in English for AI image/video generation. Must strictly follow the "${visualStyle}" aesthetic and maintain consistent subject/period tone. Do NOT include text overlays, captions, scene labels, or audio instructions.
   - "duration": Scene duration in seconds (number > 0). The sum of scene durations MUST be close to ${durationSec} seconds.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            title: { type: Type.STRING },
            script: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scene_order: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                },
                required: ["scene_order", "text", "visual_prompt", "duration"],
              },
            },
          },
          required: ["topic", "title", "script", "scenes"],
        },
      },
    });

    // Progress = 60: Gemini response received
    await supabaseAdmin
      .from("videos")
      .update({ progress: 60 })
      .eq("id", video_id);

    const rawText = response.text || "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error("Failed to parse structured JSON from Gemini response.");
    }

    // 5. Validation
    if (
      !parsed ||
      !parsed.topic ||
      !parsed.title ||
      !parsed.script ||
      !Array.isArray(parsed.scenes) ||
      parsed.scenes.length === 0
    ) {
      throw new Error("Invalid output payload from Gemini API.");
    }

    for (const scene of parsed.scenes) {
      if (
        typeof scene.scene_order !== "number" ||
        !scene.text ||
        !scene.visual_prompt ||
        typeof scene.duration !== "number" ||
        scene.duration <= 0
      ) {
        throw new Error("Invalid scene format detected in generated output.");
      }
    }

    // Progress = 75: Response validated
    await supabaseAdmin
      .from("videos")
      .update({ progress: 75 })
      .eq("id", video_id);

    // Progress = 90: Saving to database
    await supabaseAdmin
      .from("videos")
      .update({ progress: 90 })
      .eq("id", video_id);

    // 6. Update Video Record
    const calculatedDuration = Math.round(
      parsed.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)
    ) || durationSec;

    const { error: updateError } = await supabaseAdmin
      .from("videos")
      .update({
        topic: parsed.topic,
        title: parsed.title,
        script: parsed.script,
        duration: calculatedDuration,
        status: "draft",
        progress: 100,
        error_message: null,
      })
      .eq("id", video_id);

    if (updateError) {
      throw updateError;
    }

    // Replace scenes: delete old, insert new
    await supabaseAdmin
      .from("video_scenes")
      .delete()
      .eq("video_id", video_id);

    const sceneRows = parsed.scenes.map((s: any) => ({
      video_id,
      user_id: user.id,
      scene_order: s.scene_order,
      text: s.text,
      visual_prompt: s.visual_prompt,
      duration: s.duration,
    }));

    const { error: scenesError } = await supabaseAdmin
      .from("video_scenes")
      .insert(sceneRows);

    if (scenesError) {
      console.error("Error inserting video_scenes:", scenesError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        video_id,
        topic: parsed.topic,
        title: parsed.title,
        script: parsed.script,
        scenes_count: parsed.scenes.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in generate-video-script:", err);

    if (video_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin
            .from("videos")
            .update({
              status: "failed",
              progress: 0,
              error_message: err.message || "Script generation failed.",
            })
            .eq("id", video_id);
        }
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ error: err.message || "An error occurred during script generation." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
