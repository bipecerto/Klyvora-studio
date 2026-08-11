import { buildEnrichedVisualPrompt, generateGeminiSceneImage } from './apiHelpers';
import { buildStockSearchQuery, searchStockImages, StockAsset } from './stockService';

export interface ProcessSceneVisualParams {
  sceneRecord: any;
  seriesRecord: any;
  videoRecord: any;
  supabaseAdmin: any;
  userId: string;
  videoId: string;
}

export async function processSceneVisual(params: ProcessSceneVisualParams): Promise<any> {
  const { sceneRecord, seriesRecord, videoRecord, supabaseAdmin, userId, videoId } = params;

  const rawSource = (seriesRecord?.visual_source || 'mixed').toLowerCase();
  let visualSource = 'mixed';
  if (rawSource.includes('ai') || rawSource === 'ai_image') {
    visualSource = 'ai_image';
  } else if (rawSource.includes('stock')) {
    visualSource = 'stock';
  } else if (rawSource.includes('upload')) {
    visualSource = 'upload';
  } else {
    visualSource = 'mixed';
  }

  const isSupabaseMode = Boolean(supabaseAdmin);
  const sceneId = sceneRecord.id;

  // 1. UPLOAD MODE
  if (visualSource === 'upload') {
    if (isSupabaseMode) {
      const { data: updatedScene } = await supabaseAdmin
        .from('video_scenes')
        .update({
          visual_status: 'needs_upload',
          visual_error: null,
          visual_source_used: 'upload',
        })
        .eq('id', sceneId)
        .select('*')
        .single();
      return updatedScene || { ...sceneRecord, visual_status: 'needs_upload', visual_source_used: 'upload' };
    }
    return { ...sceneRecord, visual_status: 'needs_upload', visual_source_used: 'upload' };
  }

  // 2. STOCK DIRECT MODE
  const isLongForm = videoRecord?.video_format === 'long_form' || seriesRecord?.video_format === 'long_form' || (videoRecord?.target_duration && videoRecord.target_duration >= 300);
  const orientation = isLongForm ? 'landscape' : 'portrait';
  const aspectRatio = isLongForm ? '16:9' : '9:16';

  if (visualSource === 'stock') {
    const query = buildStockSearchQuery(sceneRecord, seriesRecord);
    const stockAssets = await searchStockImages(query, 6, orientation);

    if (stockAssets.length > 0) {
      const topAsset = stockAssets[0];
      const visualUrl = topAsset.url;

      if (isSupabaseMode) {
        const { data: updatedScene } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url: visualUrl,
            visual_status: 'ready',
            visual_source_used: 'stock_image',
            stock_provider: topAsset.provider,
            stock_asset_id: topAsset.id,
            stock_attribution: topAsset.attribution,
            visual_error: null,
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', sceneId)
          .select('*')
          .single();

        if (videoRecord && (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0)) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: visualUrl })
            .eq('id', videoId);
        }

        return updatedScene || {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
        };
      } else {
        return {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
        };
      }
    } else {
      // Stock search returned empty
      if (isSupabaseMode) {
        const { data: updatedScene } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_status: 'needs_upload',
            visual_error: 'No stock media found for query',
          })
          .eq('id', sceneId)
          .select('*')
          .single();
        return updatedScene || { ...sceneRecord, visual_status: 'needs_upload' };
      }
      return { ...sceneRecord, visual_status: 'needs_upload' };
    }
  }

  // 3. AI IMAGE or MIXED MODE
  // In Long Form Mixed mode: STOCK FIRST unless scene is marked as is_key_visual
  if (isLongForm && visualSource === 'mixed' && !sceneRecord.is_key_visual) {
    console.log(`[VisualEngine] Long Form Mixed Mode - Stock First for scene ${sceneId} (is_key_visual=false)...`);
    const query = buildStockSearchQuery(sceneRecord, seriesRecord);
    const stockAssets = await searchStockImages(query, 6, orientation);

    if (stockAssets.length > 0) {
      const topAsset = stockAssets[0];
      const visualUrl = topAsset.url;

      if (isSupabaseMode) {
        const { data: updatedScene } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url: visualUrl,
            visual_status: 'ready',
            visual_source_used: 'stock_image',
            stock_provider: topAsset.provider,
            stock_asset_id: topAsset.id,
            stock_attribution: topAsset.attribution,
            visual_error: null,
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', sceneId)
          .select('*')
          .single();

        if (videoRecord && (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0)) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: visualUrl })
            .eq('id', videoId);
        }

        return updatedScene || {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
        };
      } else {
        return {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
        };
      }
    }
  }

  // Generate AI Image (used for short_form mixed, key_visuals, or AI mode)
  const finalPrompt = buildEnrichedVisualPrompt(sceneRecord.visual_prompt, seriesRecord, isLongForm);

  try {
    const { base64: imageBase64, mimeType } = await generateGeminiSceneImage(finalPrompt, 3, aspectRatio);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    let visualUrl = `data:${mimeType};base64,${imageBase64}`;
    let storagePath = null;

    if (isSupabaseMode) {
      storagePath = `${userId}/videos/${videoId}/scenes/${sceneId}.png`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('media')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabaseAdmin.storage
          .from('media')
          .getPublicUrl(storagePath);

        if (urlData?.publicUrl) {
          visualUrl = urlData.publicUrl;
        }
      }

      const { data: updatedScene } = await supabaseAdmin
        .from('video_scenes')
        .update({
          visual_url: visualUrl,
          visual_storage_path: storagePath,
          visual_status: 'ready',
          visual_source_used: 'ai_image',
          visual_error: null,
          visual_generated_at: new Date().toISOString(),
        })
        .eq('id', sceneId)
        .select('*')
        .single();

      if (videoRecord && (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0)) {
        await supabaseAdmin
          .from('videos')
          .update({ thumbnail_url: visualUrl })
          .eq('id', videoId);
      }

      return updatedScene || {
        ...sceneRecord,
        visual_url: visualUrl,
        visual_status: 'ready',
        visual_source_used: 'ai_image',
      };
    } else {
      return {
        ...sceneRecord,
        visual_url: visualUrl,
        visual_status: 'ready',
        visual_source_used: 'ai_image',
      };
    }
  } catch (aiErr: any) {
    const noticeMessage = typeof aiErr?.message === 'string' && !aiErr.message.includes('{') ? aiErr.message : 'AI image generation limit reached';
    console.log(`[VisualEngine] Notice for scene ${sceneId}: ${noticeMessage}. Seamlessly using stock visual fallback.`);

    // Fallback to stock media for ALL cases when AI generation fails!
    console.log(`[VisualEngine] Performing Stock Fallback for scene ${sceneId}...`);
    const query = buildStockSearchQuery(sceneRecord, seriesRecord);
    const stockAssets = await searchStockImages(query, 6, orientation);

    if (stockAssets.length > 0) {
      const topAsset = stockAssets[0];
      const visualUrl = topAsset.url;

      if (isSupabaseMode) {
        const { data: updatedScene } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url: visualUrl,
            visual_status: 'ready',
            visual_source_used: 'stock_image',
            stock_provider: topAsset.provider,
            stock_asset_id: topAsset.id,
            stock_attribution: topAsset.attribution,
            visual_error: 'ai_quota_fallback',
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', sceneId)
          .select('*')
          .single();

        if (videoRecord && (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0)) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: visualUrl })
            .eq('id', videoId);
        }

        return updatedScene || {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
          visual_error: 'ai_quota_fallback',
        };
      } else {
        return {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_source_used: 'stock_image',
          visual_error: 'ai_quota_fallback',
        };
      }
    } else {
      // Emergency curated fallback image URL so scene is never blank
      const width = isLongForm ? 1920 : 1080;
      const height = isLongForm ? 1080 : 1920;
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(sceneId)}/${width}/${height}`;

      if (isSupabaseMode) {
        const { data: updatedScene } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url: fallbackUrl,
            visual_status: 'ready',
            visual_source_used: 'stock_image',
            visual_error: 'quota_exceeded_fallback',
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', sceneId)
          .select('*')
          .single();
        return updatedScene || { ...sceneRecord, visual_url: fallbackUrl, visual_status: 'ready', visual_source_used: 'stock_image' };
      }
      return { ...sceneRecord, visual_url: fallbackUrl, visual_status: 'ready', visual_source_used: 'stock_image' };
    }
  }
}
