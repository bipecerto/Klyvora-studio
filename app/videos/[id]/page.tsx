'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AudioPlayer } from '@/components/videos/AudioPlayer';
import { VoicePicker } from '@/components/series/VoicePicker';
import {
  getVideoById,
  deleteVideo,
  updateVideo,
  updateVideoScene,
  getVideoCaptions,
  getVideoChapters,
  generateCaptions,
  updateVideoCaption,
  renderVideo,
  pollVideoStatus,
  VideoRecord,
  VideoSceneRecord,
  VideoCaptionRecord,
  VideoChapterRecord,
} from '@/services/videoService';
import { generateVideoScript } from '@/services/generationService';
import { generateNarration } from '@/services/narrationService';
import {
  generateVideoVisuals,
  regenerateSceneImage,
  retryMissingVisuals,
  searchStockAssets,
  updateSceneVisual,
} from '@/services/visualService';
import { renderVideoLocally, LocalRenderProgress, LocalRenderOutput } from '@/lib/local-render/localRenderer';
import { checkLocalRenderSupport } from '@/lib/local-render/browserSupport';
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  RefreshCw,
  Edit2,
  FileText,
  Film,
  Subtitles,
  Settings as SettingsIcon,
  Loader2,
  Trash2,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Volume2,
  Maximize2,
  Save,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  XCircle,
  Laptop,
  Cloud,
  Upload,
  Search,
  Copy,
  ListTree,
  BookOpen,
  Layers,
} from 'lucide-react';

const VideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [scenes, setScenes] = useState<VideoSceneRecord[]>([]);
  const [captions, setCaptions] = useState<VideoCaptionRecord[]>([]);
  const [chapters, setChapters] = useState<VideoChapterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'script' | 'chapters' | 'scenes' | 'narration' | 'captions' | 'settings'>('script');

  // Player Slideshow state
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Narration state
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceId, setVoiceId] = useState('Charon');
  const [voiceStyle, setVoiceStyle] = useState('Documentary');

  // Regenerate Script Modal
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Regenerate All Visuals Modal
  const [showRegenerateVisualsModal, setShowRegenerateVisualsModal] = useState(false);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);

  // Render & Captions State
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [editingCaptionsMap, setEditingCaptionsMap] = useState<Record<string, string>>({});
  const [savingCaptionIds, setSavingCaptionIds] = useState<Record<string, boolean>>({});

  // Individual Scene Actions
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Record<string, boolean>>({});
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [savingPromptIds, setSavingPromptIds] = useState<Record<string, boolean>>({});

  // Stock Search & Manual Upload State
  const [stockModalScene, setStockModalScene] = useState<VideoSceneRecord | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockAssets, setStockAssets] = useState<any[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [isRetryingMissing, setIsRetryingMissing] = useState(false);

  // Handlers for Stock & Upload
  const handleOpenStockModal = async (scene: VideoSceneRecord) => {
    setStockModalScene(scene);
    setStockSearchQuery(scene.visual_prompt || video?.topic || 'cinematic portrait');
    setIsSearchingStock(true);
    try {
      const res = await searchStockAssets(scene.visual_prompt || '', scene.id, video?.topic);
      setStockAssets(res.assets || []);
    } catch (err) {
      console.error('Stock search error:', err);
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleSearchStockQuery = async () => {
    if (!stockSearchQuery.trim()) return;
    setIsSearchingStock(true);
    try {
      const res = await searchStockAssets(stockSearchQuery, stockModalScene?.id, video?.topic);
      setStockAssets(res.assets || []);
    } catch (err) {
      console.error('Stock search error:', err);
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleSelectStockAsset = async (asset: any) => {
    if (!stockModalScene) return;
    try {
      const updated = await updateSceneVisual({
        scene_id: stockModalScene.id,
        video_id: video?.id,
        visual_url: asset.url,
        visual_source_used: 'stock',
        stock_provider: asset.provider,
        stock_asset_id: asset.id,
        stock_attribution: asset.photographer,
      });

      setScenes((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      setStockModalScene(null);
    } catch (err) {
      console.error('Failed to select stock asset:', err);
      alert('Falha ao aplicar imagem de stock.');
    }
  };

  const handleManualFileUpload = async (sceneId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      try {
        const updated = await updateSceneVisual({
          scene_id: sceneId,
          video_id: video?.id,
          visual_url: dataUrl,
          visual_source_used: 'upload',
        });

        setScenes((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      } catch (err) {
        console.error('Manual upload error:', err);
        alert('Falha no upload da imagem.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetryMissing = async () => {
    if (!video?.id) return;
    setIsRetryingMissing(true);
    try {
      const res = await retryMissingVisuals(video.id);
      if (res.scenes) {
        setScenes(res.scenes);
      }
    } catch (err) {
      console.error('Error retrying missing visuals:', err);
    } finally {
      setIsRetryingMissing(false);
    }
  };

  // Image Preview Modal
  const [selectedImageModalUrl, setSelectedImageModalUrl] = useState<string | null>(null);

  // Edit Script State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editScript, setEditScript] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Local Render State
  const [localRenderStatus, setLocalRenderStatus] = useState<'idle' | 'preparing' | 'rendering' | 'finished' | 'failed'>('idle');
  const [localRenderProgress, setLocalRenderProgress] = useState<LocalRenderProgress | null>(null);
  const [localRenderError, setLocalRenderError] = useState<string | null>(null);
  const [localRenderResult, setLocalRenderResult] = useState<LocalRenderOutput | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getVideoById(id);
      if (data) {
        setVideo(data);
        const sceneList = data.video_scenes || [];
        setScenes(sceneList);
        setEditTitle(data.title || '');
        setEditTopic(data.topic || '');
        setEditScript(data.script || '');
        if (data.narration_voice) {
          setVoiceId(data.narration_voice);
        }

        // Initialize prompt edit map
        const promptMap: Record<string, string> = {};
        sceneList.forEach((s) => {
          promptMap[s.id] = s.visual_prompt || '';
        });
        setEditingPrompts(promptMap);

        // Load Captions
        const capList = await getVideoCaptions(id);
        setCaptions(capList);
        const capMap: Record<string, string> = {};
        capList.forEach((c) => {
          capMap[c.id] = c.text;
        });
        setEditingCaptionsMap(capMap);

        // Load Chapters (for Long Form)
        const chList = await getVideoChapters(id);
        setChapters(chList);
      }
    } catch (err) {
      console.error('Failed to load video detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Polling effect for background render status
  useEffect(() => {
    if (video?.render_status === 'processing') {
      setIsRendering(true);
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (!id) return;
          const statusData = await pollVideoStatus(id);
          if (statusData) {
            setVideo((prev) => (prev ? { ...prev, ...statusData } : prev));
            if (statusData.render_status === 'ready') {
              setIsRendering(false);
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              loadData();
            } else if (statusData.render_status === 'failed') {
              setIsRendering(false);
              setRenderError(statusData.render_error || 'Rendering failed.');
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            }
          }
        } catch (err) {
          console.warn('Status polling notice:', err);
        }
      }, 2000);
    } else {
      setIsRendering(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [video?.render_status, id]);

  // Slideshow auto-advance effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSlideshowPlaying && scenes.length > 0) {
      const currentScene = scenes[activeSceneIndex];
      const durationMs = Math.max(3000, (currentScene?.duration || 4) * 1000);
      timer = setTimeout(() => {
        setActiveSceneIndex((prev) => (prev + 1) % scenes.length);
      }, durationMs);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSlideshowPlaying, activeSceneIndex, scenes]);

  const toggleSlideshow = () => {
    if (isSlideshowPlaying) {
      setIsSlideshowPlaying(false);
      if (audioElement) {
        audioElement.pause();
      }
    } else {
      setIsSlideshowPlaying(true);
      if (video?.narration_url) {
        if (!audioElement) {
          const audio = new Audio(video.narration_url);
          audio.onended = () => setIsSlideshowPlaying(false);
          setAudioElement(audio);
          audio.play().catch((e) => console.warn('Audio playback error:', e));
        } else {
          audioElement.play().catch((e) => console.warn('Audio playback error:', e));
        }
      }
    }
  };

  const handleStartRender = async () => {
    if (!video) return;
    setIsRendering(true);
    setRenderError(null);
    try {
      await renderVideo(video.id);
      setVideo((prev) => (prev ? { ...prev, render_status: 'processing', render_progress: 5 } : prev));
    } catch (err: any) {
      console.error('Failed to start render:', err);
      setIsRendering(false);
      setRenderError(err.message || 'Failed to start video rendering.');
    }
  };

  const handleStartLocalRender = async () => {
    if (!video) return;
    setLocalRenderStatus('preparing');
    setLocalRenderError(null);
    setLocalRenderProgress(null);
    setLocalRenderResult(null);

    try {
      setLocalRenderStatus('rendering');
      const output = await renderVideoLocally({
        video,
        scenes,
        captions,
        onProgress: (p) => setLocalRenderProgress(p),
      });
      setLocalRenderResult(output);
      setLocalRenderStatus('finished');
    } catch (err: any) {
      console.error('Local render failed:', err);
      setLocalRenderError(err.message || 'Local render failed.');
      setLocalRenderStatus('failed');
    }
  };

  const handleDownloadLocalRender = () => {
    if (!localRenderResult) return;
    const a = document.createElement('a');
    a.href = localRenderResult.objectUrl;
    a.download = localRenderResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateCaptions = async () => {
    if (!video) return;
    setIsGeneratingCaptions(true);
    try {
      const capList = await generateCaptions(video.id);
      setCaptions(capList);
      const capMap: Record<string, string> = {};
      capList.forEach((c) => {
        capMap[c.id] = c.text;
      });
      setEditingCaptionsMap(capMap);
    } catch (err: any) {
      console.error('Failed to generate captions:', err);
      alert(err.message || 'Falha ao gerar legendas.');
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleSaveCaptionText = async (captionId: string) => {
    const text = editingCaptionsMap[captionId];
    if (text === undefined) return;
    setSavingCaptionIds((prev) => ({ ...prev, [captionId]: true }));
    try {
      const updated = await updateVideoCaption(captionId, { text });
      setCaptions((prev) => prev.map((c) => (c.id === captionId ? updated : c)));
    } catch (err: any) {
      console.error('Failed to save caption:', err);
      alert('Falha ao salvar legenda.');
    } finally {
      setSavingCaptionIds((prev) => ({ ...prev, [captionId]: false }));
    }
  };

  const handleGenerateNarration = async (targetVoice?: string, targetStyle?: string) => {
    if (!video) return;
    setIsGeneratingNarration(true);
    try {
      await generateNarration(video.id, targetVoice || voiceId, targetStyle || voiceStyle);
      await loadData();
      setShowVoiceModal(false);
    } catch (err: any) {
      console.error('Failed to generate narration:', err);
      alert(err.message || 'Falha ao gerar narração. Tente novamente.');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const handleGenerateAllVisuals = async () => {
    if (!video) return;
    setIsGeneratingVisuals(true);
    try {
      await generateVideoVisuals(video.id);
      await loadData();
      setShowRegenerateVisualsModal(false);
    } catch (err: any) {
      console.error('Failed to generate all visuals:', err);
      alert(err.message || 'Falha ao gerar imagens de todas as cenas.');
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const handleRegenerateSingleScene = async (sceneId: string) => {
    if (!video) return;
    setGeneratingSceneIds((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const updated = await regenerateSceneImage(video.id, sceneId);
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? updated : s)));
      await loadData();
    } catch (err: any) {
      console.error('Failed to regenerate scene visual:', err);
      alert(err.message || 'Falha ao regenerar imagem da cena.');
    } finally {
      setGeneratingSceneIds((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleSavePrompt = async (sceneId: string) => {
    const newPrompt = editingPrompts[sceneId];
    if (newPrompt === undefined) return;
    setSavingPromptIds((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const updated = await updateVideoScene(sceneId, { visual_prompt: newPrompt });
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, visual_prompt: updated.visual_prompt } : s)));
    } catch (err: any) {
      console.error('Failed to save scene prompt:', err);
      alert('Falha ao salvar o prompt visual.');
    } finally {
      setSavingPromptIds((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleDelete = async () => {
    if (!video) return;
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await deleteVideo(video.id);
      router.push('/videos');
    } catch (err) {
      console.error('Failed to delete video:', err);
      alert('Failed to delete video.');
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!video) return;
    setIsRegenerating(true);
    setRegenerateError(null);
    try {
      await generateVideoScript(video.id, false);
      setShowRegenerateModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to regenerate video script:', err);
      setRegenerateError(err.message || 'Failed to regenerate script.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!video) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateVideo(video.id, {
        title: editTitle.trim() || video.title,
        topic: editTopic.trim() || video.topic,
        script: editScript.trim() || video.script,
      });
      setVideo((prev) => (prev ? { ...prev, ...updated } : prev));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update script:', err);
      alert('Failed to save manual edits.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadMp4 = () => {
    if (!video?.video_url) return;
    const sanitizedTitle = (video.title || 'klyvora_video')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const filename = `klyvora_${sanitizedTitle}.mp4`;

    const a = document.createElement('a');
    a.href = video.video_url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <AppLayout title="Video Detail">
        <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!video) {
    return (
      <AppLayout title="Video Not Found">
        <div className="p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Video Not Found</h3>
          <p className="text-xs text-[rgba(255,255,255,0.5)]">
            The requested video does not exist or was deleted.
          </p>
          <button
            onClick={() => router.push('/videos')}
            className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Back to Videos
          </button>
        </div>
      </AppLayout>
    );
  }

  const defaultThumbnail =
    video.thumbnail_url ||
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80';

  const currentScene = scenes[activeSceneIndex] || scenes[0];
  const currentSceneVisualUrl = currentScene?.visual_url;
  const hasAnySceneVisuals = scenes.some((s) => !!s.visual_url);

  // Readiness calculation for Render Video button
  const isScriptReady = !!(video.script && video.script.trim());
  const isNarrationReady = !!video.narration_url;
  const readyScenesCount = scenes.filter((s) => !!s.visual_url).length;
  const isVisualsReady = scenes.length > 0 && readyScenesCount === scenes.length;
  const isCanRender = isScriptReady && isNarrationReady && isVisualsReady;

  const isLongForm = video.video_format === 'long_form' || video.aspect_ratio === '16:9' || (chapters && chapters.length > 0);

  return (
    <AppLayout title={`Video / ${video.title}`}>
      {/* Back button */}
      <button
        onClick={() => router.push('/videos')}
        className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Videos
      </button>

      {/* Main Split Layout: Left Player, Right Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Video Player / Slideshow / Rendering State */}
        <div className={`${isLongForm ? 'lg:col-span-6' : 'lg:col-span-5'} flex flex-col items-center gap-4`}>
          <div className={`w-full ${isLongForm ? 'max-w-[620px] aspect-[16/9]' : 'max-w-[340px] aspect-video'} rounded-[24px] bg-[#0F0F12] border border-[rgba(255,255,255,0.12)] shadow-2xl relative overflow-hidden flex flex-col justify-between p-5 group`}>
            {video.render_status === 'ready' && video.video_url ? (
              /* REAL RENDERED MP4 VIDEO PLAYER */
              <>
                <video
                  src={video.video_url}
                  poster={defaultThumbnail}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-mono font-semibold bg-emerald-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> MP4 Rendered (1080x1920)
                  </span>
                </div>
              </>
            ) : video.render_status === 'processing' || isRendering ? (
              /* RENDERING IN PROGRESS OVERLAY */
              <div className="absolute inset-0 bg-[#0F0F12] flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Renderizando Vídeo Real</h4>
                  <p className="text-[11px] text-[rgba(255,255,255,0.5)]">
                    FFmpeg & Legendas ASS
                  </p>
                </div>

                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono font-semibold text-white/80">
                    <span>Progresso</span>
                    <span>{video.render_progress || 10}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${video.render_progress || 10}%` }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-amber-300/80 italic font-mono">
                  Isso leva ~15-30 segundos...
                </p>
              </div>
            ) : video.render_status === 'failed' ? (
              /* RENDER FAILED OVERLAY */
              <div className="absolute inset-0 bg-[#0F0F12] flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Falha ao Renderizar Vídeo</h4>
                  <p className="text-[11px] text-rose-300 leading-tight">
                    {renderError || video.render_error || 'Erro desconhecido durante o FFmpeg.'}
                  </p>
                </div>
                <button
                  onClick={handleStartRender}
                  className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Tentar Novamente
                </button>
              </div>
            ) : hasAnySceneVisuals ? (
              /* REAL 16:9 VISUAL SLIDESHOW PREVIEW */
              <>
                <img
                  src={currentSceneVisualUrl || defaultThumbnail}
                  alt={`Scene ${currentScene?.scene_order || 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Preview (Slideshow)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-black/80 px-2 py-1 rounded text-white/80 border border-white/10">
                    Scene {activeSceneIndex + 1}/{scenes.length}
                  </span>
                </div>

                <div className="relative z-10 my-auto flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={toggleSlideshow}
                    className="w-14 h-14 rounded-full bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform"
                  >
                    {isSlideshowPlaying ? (
                      <Pause className="w-6 h-6 text-amber-400" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-1" />
                    )}
                  </button>
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-center shadow-lg">
                    <p className="text-[11px] font-bold text-amber-300 leading-snug line-clamp-3">
                      "{currentScene?.text || video.title}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-white font-medium">
                    <button
                      onClick={() => setActiveSceneIndex((prev) => (prev > 0 ? prev - 1 : scenes.length - 1))}
                      className="p-1 hover:text-amber-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-[10px] text-white/70">
                      {currentScene?.duration || 4}s per scene
                    </span>
                    <button
                      onClick={() => setActiveSceneIndex((prev) => (prev < scenes.length - 1 ? prev + 1 : 0))}
                      className="p-1 hover:text-amber-400 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* NO VISUALS YET PLACEHOLDER */
              <>
                <img
                  src={defaultThumbnail}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold bg-black/80 px-2 py-1 rounded text-white/80 border border-white/10">
                    1920x1080 16:9
                  </span>
                  <StatusBadge status={video.status} />
                </div>

                <div className="relative z-10 p-4 rounded-2xl bg-[#141418]/90 border border-[#27272F] backdrop-blur-md space-y-3.5 my-auto text-left shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <h4 className="text-xs font-bold text-white tracking-wide">Geração de Imagens Pronta</h4>
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Gere as imagens 16:9 para cada cena utilizando a Cloudflare Workers AI (FLUX).
                  </p>

                  <button
                    onClick={handleGenerateAllVisuals}
                    disabled={isGeneratingVisuals}
                    className="w-full klyvora-btn-gradient text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isGeneratingVisuals ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando Imagens 16:9...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Gerar Imagens das Cenas
                      </>
                    )}
                  </button>
                </div>

                <div className="relative z-10 space-y-2 text-center">
                  <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 inline-block">
                    <p className="text-[11px] font-bold text-amber-300 tracking-wide line-clamp-2">
                      "{scenes[0]?.text || video.title}"
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Video Metadata, Pipeline Readiness & Actions */}
        <div className={`${isLongForm ? 'lg:col-span-6' : 'lg:col-span-7'} space-y-6`}>
          <div className="p-6 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-5 shadow-xl">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">
                Series: {video.series_name || video.series?.name || 'General'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {video.title}
              </h1>
              {video.topic && (
                <p className="text-xs text-[rgba(255,255,255,0.5)] italic">
                  Topic: {video.topic}
                </p>
              )}
            </div>

            {/* RENDER VIDEO SECTION (LOCAL vs CLOUD) */}
            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-[#8B5CF6]" /> Render Video Mode
                </span>
                {video.render_status === 'ready' ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Cloud MP4 Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-semibold text-amber-400">
                    {readyScenesCount}/{scenes.length} Scenes Ready
                  </span>
                )}
              </div>

              {/* Checklist Badges */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${isScriptReady ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                  {isScriptReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className="font-semibold truncate">1. Script</span>
                </div>

                <div className={`p-2 rounded-lg border flex items-center gap-2 ${isNarrationReady ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                  {isNarrationReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className="font-semibold truncate">2. Narração</span>
                </div>

                <div className={`p-2 rounded-lg border flex items-center gap-2 ${isVisualsReady ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                  {isVisualsReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className="font-semibold truncate">3. Visuals 16:9</span>
                </div>
              </div>

              {/* RENDER: LOCAL NO NAVEGADOR (o render em nuvem foi descontinuado) */}
              <div className="pt-1">
                <div className="p-3.5 rounded-xl bg-[#141416] border border-emerald-500/30 flex flex-col justify-between space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      FREE
                    </span>
                    <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-emerald-400" /> Browser Device
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Render Local — Grátis
                    </h4>
                    <p className="text-[11px] text-[rgba(255,255,255,0.6)] leading-tight">
                      Uses your browser to render in real-time. No server cost. Formato: {checkLocalRenderSupport().formatLabel}.
                    </p>
                  </div>

                  {localRenderStatus === 'rendering' && (
                    <div className="space-y-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 font-bold">
                        <span>Rendering locally...</span>
                        <span>{localRenderProgress?.percentage || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-emerald-950 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-200"
                          style={{ width: `${localRenderProgress?.percentage || 0}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-amber-300 italic font-mono">
                        Keep this tab open until rendering completes ({localRenderProgress?.elapsedSeconds || 0}s / {localRenderProgress?.totalSeconds || 60}s).
                      </p>
                    </div>
                  )}

                  {localRenderError && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{localRenderError}</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={handleStartLocalRender}
                      disabled={!isCanRender || localRenderStatus === 'rendering'}
                      className={`w-full h-[36px] rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        isCanRender && localRenderStatus !== 'rendering'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-md cursor-pointer active:scale-95'
                          : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {localRenderStatus === 'rendering' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering Local...
                        </>
                      ) : (
                        <>
                          <Laptop className="w-3.5 h-3.5" /> Render Locally
                        </>
                      )}
                    </button>

                    {localRenderResult && (
                      <button
                        onClick={handleDownloadLocalRender}
                        className="h-[36px] px-3 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                        title="Download Local Render"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[rgba(255,255,255,0.06)] text-xs">
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Duration</p>
                <p className="font-semibold text-white mt-0.5">{video.narration_duration || video.duration || 60}s</p>
              </div>
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Created</p>
                <p className="font-semibold text-white mt-0.5">
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Render Status</p>
                <p className="font-semibold text-emerald-400 mt-0.5 capitalize">{video.render_status || 'pending'}</p>
              </div>
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Scenes</p>
                <p className="font-semibold text-emerald-400 mt-0.5">{scenes.length}</p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowRegenerateModal(true)}
                className="px-4 h-[40px] rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25 text-[#8B5CF6] text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate Script
              </button>

              <button
                onClick={() => setShowRegenerateVisualsModal(true)}
                className="px-4 h-[40px] rounded-xl bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Regenerate All Visuals
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 h-[40px] rounded-xl bg-[#1C1C1F] border border-white/10 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-white/70" />
                {isEditing ? 'Cancel Edit' : 'Edit Script'}
              </button>

              <button
                onClick={handleDelete}
                className="px-3 h-[40px] rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {/* EDIT SCRIPT FORM */}
          {isEditing && (
            <div className="p-6 rounded-[16px] bg-[#141416] border border-[#8B5CF6]/40 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#8B5CF6]" /> Edit Title, Topic & Script
              </h3>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[rgba(255,255,255,0.6)]">Video Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.1)] rounded-xl p-2.5 text-white font-medium outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[rgba(255,255,255,0.6)]">Topic / Angle</label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.1)] rounded-xl p-2.5 text-white outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[rgba(255,255,255,0.6)]">Full Narration Script</label>
                <textarea
                  value={editScript}
                  onChange={(e) => setEditScript(e.target.value)}
                  rows={6}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 text-white leading-relaxed outline-none focus:border-[#8B5CF6] resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[rgba(255,255,255,0.6)] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="klyvora-btn-gradient text-white text-xs font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TABS Navigation */}
          <div className="border-b border-[rgba(255,255,255,0.08)] flex gap-4 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('script')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'script'
                  ? 'border-[#8B5CF6] text-white'
                  : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" /> Script
            </button>
            {(isLongForm || chapters.length > 0) && (
              <button
                onClick={() => setActiveTab('chapters')}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'chapters'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-red-400" /> Capítulos ({chapters.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('narration')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'narration'
                  ? 'border-[#8B5CF6] text-white'
                  : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              <Volume2 className="w-4 h-4 text-[#8B5CF6]" /> Narração & Voz
              {video.narration_url && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('scenes')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'scenes'
                  ? 'border-[#8B5CF6] text-white'
                  : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              <Film className="w-4 h-4" /> Scenes ({scenes.length})
              {hasAnySceneVisuals && (
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('captions')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'captions'
                  ? 'border-[#8B5CF6] text-white'
                  : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              <Subtitles className="w-4 h-4" /> Captions ({captions.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-[#8B5CF6] text-white'
                  : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> Settings
            </button>
          </div>

          {/* TAB CONTENTS */}
          {activeTab === 'script' && (
            <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-3">
              <h3 className="text-sm font-bold text-white">Full Narration Script</h3>
              <div className="text-xs text-[rgba(255,255,255,0.85)] leading-relaxed font-sans bg-[#1C1C1F] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] whitespace-pre-wrap">
                {video.script ||
                  video.topic ||
                  'No narration script generated yet. Click "Regenerate Script" above.'}
              </div>
            </div>
          )}

          {activeTab === 'chapters' && (
            <div className="space-y-6">
              {/* YOUTUBE SEO METADATA BLOCK */}
              <div className="p-5 rounded-[16px] bg-[#141416] border border-red-500/30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-red-500" /> YouTube SEO Metadata
                  </span>
                  <span className="text-[10px] font-mono text-white/50">Long Form 16:9</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* YouTube Title */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-white/70">YouTube Video Title</label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(video.youtube_title || video.title);
                          alert('Título copiado!');
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar Título
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#1C1C1F] border border-white/10 text-white font-semibold">
                      {video.youtube_title || video.title}
                    </div>
                  </div>

                  {/* YouTube Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-white/70">YouTube Description</label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(video.youtube_description || '');
                          alert('Descrição copiada!');
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar Descrição
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1C1C1F] border border-white/10 text-white/90 leading-relaxed font-sans whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {video.youtube_description || 'Nenhuma descrição SEO gerada ainda.'}
                    </div>
                  </div>

                  {/* YouTube Tags */}
                  {video.youtube_tags && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-white/70">Tags SEO</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(video.youtube_tags || '');
                            alert('Tags copiadas!');
                          }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copiar Tags
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#1C1C1F] border border-white/10">
                        {video.youtube_tags.split(',').map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-purple-300 font-mono">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CHAPTERS ACCORDION / TIMELINE LIST */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListTree className="w-4 h-4 text-purple-400" /> Estrutura de Capítulos ({chapters.length})
                  </h3>
                  <button
                    onClick={handleRetryMissing}
                    disabled={isRetryingMissing}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                  >
                    {isRetryingMissing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Recuperar Imagens Ausentes
                  </button>
                </div>

                {chapters.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#141416] border border-white/10 text-white/50 text-xs space-y-2">
                    <p>Nenhum capítulo detalhado encontrado para este vídeo.</p>
                  </div>
                ) : (
                  chapters.map((ch, idx) => {
                    const chapterScenes = scenes.filter((s: any) => s.chapter_id === ch.id || (s.chapter_order === ch.chapter_order));

                    return (
                      <div key={ch.id || idx} className="p-5 rounded-[16px] bg-[#141416] border border-[#27272F] space-y-4">
                        {/* Chapter Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center">
                              #{ch.chapter_order || idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white">{ch.title}</h4>
                              <p className="text-[11px] text-white/50">{ch.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded bg-black/50 border border-white/10 text-white/80 font-mono text-[10px]">
                              ~{ch.target_duration || 120}s
                            </span>
                            <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              {ch.status || 'Ready'}
                            </span>
                          </div>
                        </div>

                        {/* Chapter Script */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Roteiro do Capítulo</label>
                          <div className="p-3.5 rounded-xl bg-[#1C1C1F] border border-white/5 text-xs text-white/90 leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {ch.script || 'Carregando roteiro do capítulo...'}
                          </div>
                        </div>

                        {/* Chapter Scenes Grid */}
                        {chapterScenes.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                              Cenas do Capítulo ({chapterScenes.length})
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {chapterScenes.map((sc) => (
                                <div key={sc.id} className="relative aspect-[16/9] rounded-lg bg-[#18181F] border border-white/10 overflow-hidden group">
                                  {sc.visual_url ? (
                                    <img src={sc.visual_url} alt={`Scene ${sc.scene_order}`} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-amber-400 bg-amber-500/10">
                                      <AlertCircle className="w-4 h-4 mb-1" />
                                      <span className="text-[9px] font-bold">Imagem pendente</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                    <p className="text-[10px] text-white line-clamp-2">{sc.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'narration' && (
            <div className="space-y-6">
              {video.narration_url ? (
                <AudioPlayer
                  audioUrl={video.narration_url}
                  voiceName={video.narration_voice || voiceId}
                  voiceStyle={voiceStyle}
                  onRegenerate={() => handleGenerateNarration()}
                  isRegenerating={isGeneratingNarration}
                  onOpenVoicePicker={() => setShowVoiceModal(true)}
                />
              ) : (
                <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mx-auto">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Narração em Áudio</h3>
                    <p className="text-xs text-[rgba(255,255,255,0.5)] max-w-md mx-auto">
                      Gere a locução completa do roteiro usando vozes neurais e expressivas do Gemini TTS.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => handleGenerateNarration()}
                      disabled={isGeneratingNarration}
                      className="klyvora-btn-gradient text-white text-xs font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg"
                    >
                      {isGeneratingNarration ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Gerando Narração...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Gerar Narração Agora
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowVoiceModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#1C1C1F] border border-white/10 hover:bg-white/10 text-white text-xs font-semibold"
                    >
                      Trocar Narrador
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REAL SCENES TAB */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#8B5CF6]" /> Cenas do Vídeo ({scenes.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetryMissing}
                    disabled={isRetryingMissing || isGeneratingVisuals}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {isRetryingMissing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reprocessando...
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                        Retry Missing Visuals
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateAllVisuals}
                    disabled={isGeneratingVisuals}
                    className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all"
                  >
                    {isGeneratingVisuals ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando Cenas...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {hasAnySceneVisuals ? 'Regenerar Todas as Imagens' : 'Gerar Imagens das Cenas'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {scenes.length > 0 ? (
                scenes.map((scene) => {
                  const isSceneGenerating = generatingSceneIds[scene.id] || scene.visual_status === 'generating';
                  const isSceneFailed = scene.visual_status === 'failed';
                  const isNeedsUpload = scene.visual_status === 'needs_upload';
                  const isSavingPrompt = savingPromptIds[scene.id];

                  const usedSource = (scene as any).visual_source_used || (scene as any).visual_type || 'ai_image';

                  return (
                    <div
                      key={scene.id || scene.scene_order}
                      className="p-5 rounded-2xl bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4 shadow-md hover:border-[#8B5CF6]/30 transition-all"
                    >
                      {/* Scene Card Header */}
                      <div className="flex flex-wrap items-center justify-between font-bold text-white text-xs border-b border-white/5 pb-3 gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center font-mono text-xs font-bold">
                            {String(scene.scene_order).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-semibold">Scene {scene.scene_order}</span>

                          {/* Visual Source Badges */}
                          {isNeedsUpload ? (
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> NEEDS UPLOAD
                            </span>
                          ) : usedSource === 'stock' ? (
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-emerald-400" /> STOCK
                            </span>
                          ) : usedSource === 'upload' ? (
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Upload className="w-3 h-3 text-blue-400" /> UPLOAD
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-400" /> AI IMAGE
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-[11px] text-[rgba(255,255,255,0.4)]">
                          Duration: {scene.duration || 4.3}s
                        </span>
                      </div>

                      {/* Main Card Grid: Image 16:9 + Prompt & Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        {/* LEFT: REAL 16:9 IMAGE THUMBNAIL */}
                        <div className="sm:col-span-4 flex flex-col items-center gap-2">
                          <div className="w-full aspect-video max-w-[140px] rounded-xl bg-[#0F0F12] border border-white/10 shadow-lg relative overflow-hidden group/img flex items-center justify-center">
                            {isSceneGenerating ? (
                              <div className="flex flex-col items-center gap-2 text-[#8B5CF6] p-2 text-center">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[10px] font-semibold">Gerando Imagem...</span>
                              </div>
                            ) : isSceneFailed ? (
                              <div className="flex flex-col items-center gap-1.5 text-rose-400 p-2 text-center">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-[10px] font-semibold">Image generation failed</span>
                                <button
                                  onClick={() => handleRegenerateSingleScene(scene.id)}
                                  className="text-[10px] underline text-white hover:text-amber-300 mt-1"
                                >
                                  Retry AI
                                </button>
                              </div>
                            ) : scene.visual_url ? (
                              <>
                                <img
                                  src={scene.visual_url}
                                  alt={`Scene ${scene.scene_order}`}
                                  className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105"
                                />
                                <button
                                  onClick={() => setSelectedImageModalUrl(scene.visual_url!)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-[11px] font-semibold backdrop-blur-xs"
                                >
                                  <Maximize2 className="w-4 h-4" /> Expand
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-white/30 p-2 text-center">
                                <ImageIcon className="w-6 h-6" />
                                <span className="text-[10px]">No image set</span>
                              </div>
                            )}
                          </div>

                          {scene.visual_url && (
                            <button
                              onClick={() => handleDownloadImage(scene.visual_url!, `scene_${scene.scene_order}.png`)}
                              className="text-[10px] font-semibold text-white/60 hover:text-white flex items-center gap-1 py-1"
                            >
                              <Download className="w-3 h-3" /> Download Image
                            </button>
                          )}
                        </div>

                        {/* RIGHT: NARRATION TEXT & CHANGE VISUAL CONTROLS */}
                        <div className="sm:col-span-8 space-y-3.5">
                          {/* Narration Text */}
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">
                              Narration Text
                            </span>
                            <p className="text-white/90 leading-relaxed bg-[#1C1C1F] p-3 rounded-xl border border-white/5 font-medium italic">
                              "{scene.text}"
                            </p>
                          </div>

                          {/* Editable Visual Prompt */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Visual Prompt
                              </span>
                              {editingPrompts[scene.id] !== scene.visual_prompt && (
                                <button
                                  onClick={() => handleSavePrompt(scene.id)}
                                  disabled={isSavingPrompt}
                                  className="text-[11px] text-amber-400 font-semibold hover:underline flex items-center gap-1"
                                >
                                  {isSavingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  Save Prompt
                                </button>
                              )}
                            </div>
                            <textarea
                              value={editingPrompts[scene.id] ?? (scene.visual_prompt || '')}
                              onChange={(e) => setEditingPrompts((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                              rows={2}
                              className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white/90 font-mono text-[11px] leading-relaxed outline-none focus:border-[#8B5CF6] resize-y"
                            />
                          </div>

                          {/* CHANGE VISUAL ACTIONS (AI, STOCK, UPLOAD) */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                              Trocar Visual da Cena:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* 1. Generate with AI */}
                              <button
                                onClick={() => handleRegenerateSingleScene(scene.id)}
                                disabled={isSceneGenerating}
                                className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25 text-[#8B5CF6] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                {isSceneGenerating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                AI Image
                              </button>

                              {/* 2. Search Stock */}
                              <button
                                onClick={() => handleOpenStockModal(scene)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Search className="w-3 h-3 text-emerald-400" />
                                Stock Media
                              </button>

                              {/* 3. Manual Upload */}
                              <label className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer">
                                <Upload className="w-3 h-3 text-blue-400" />
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleManualFileUpload(scene.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 rounded-xl bg-[#141416] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(255,255,255,0.5)] text-center space-y-3">
                  <p>No breakdown scenes recorded for this video yet.</p>
                  <button
                    onClick={() => setShowRegenerateModal(true)}
                    className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    Generate Script & Scenes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* REAL CAPTIONS TAB */}
          {activeTab === 'captions' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Subtitles className="w-4 h-4 text-[#8B5CF6]" /> Synchronized Video Captions ({captions.length})
                  </h3>
                  <p className="text-[11px] text-[rgba(255,255,255,0.5)] mt-0.5">
                    Legendas sincronizadas automaticamente a partir do áudio e texto das cenas.
                  </p>
                </div>

                <button
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions}
                  className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  {isGeneratingCaptions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando Legendas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {captions.length > 0 ? 'Regenerar Legendas' : 'Gerar Legendas Sincronizadas'}
                    </>
                  )}
                </button>
              </div>

              {captions.length > 0 ? (
                <div className="space-y-3">
                  {captions.map((cap) => {
                    const isSaving = savingCaptionIds[cap.id];
                    const startTimeFormatted = `${Math.floor(cap.start_time / 60)}:${String(Math.floor(cap.start_time % 60)).padStart(2, '0')}.${String(Math.floor((cap.start_time % 1) * 100)).padStart(2, '0')}`;
                    const endTimeFormatted = `${Math.floor(cap.end_time / 60)}:${String(Math.floor(cap.end_time % 60)).padStart(2, '0')}.${String(Math.floor((cap.end_time % 1) * 100)).padStart(2, '0')}`;

                    return (
                      <div
                        key={cap.id || cap.caption_order}
                        className="p-4 rounded-xl bg-[#141416] border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                            {cap.caption_order}
                          </span>
                          <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                            {startTimeFormatted} → {endTimeFormatted}
                          </span>
                        </div>

                        <div className="flex-1 w-full flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCaptionsMap[cap.id] ?? cap.text}
                            onChange={(e) => setEditingCaptionsMap((prev) => ({ ...prev, [cap.id]: e.target.value }))}
                            className="w-full bg-[#1C1C1F] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-[#8B5CF6]"
                          />

                          {editingCaptionsMap[cap.id] !== cap.text && (
                            <button
                              onClick={() => handleSaveCaptionText(cap.id)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-[#141416] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(255,255,255,0.5)] text-center space-y-3">
                  <p>Nenhuma legenda gerada ainda. Clique no botão acima para sincronizar automaticamente.</p>
                  <button
                    onClick={handleGenerateCaptions}
                    disabled={isGeneratingCaptions}
                    className="klyvora-btn-gradient text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto"
                  >
                    {isGeneratingCaptions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Gerar Legendas do Vídeo
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white">Configurações do Renderizador FFmpeg</h3>
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div className="p-3 bg-[#1C1C1F] rounded-xl border border-white/5 space-y-1">
                  <p className="text-[rgba(255,255,255,0.5)]">Resolução Vertical</p>
                  <p className="font-bold text-white">1920 x 1080 (16:9 Landscape)</p>
                </div>
                <div className="p-3 bg-[#1C1C1F] rounded-xl border border-white/5 space-y-1">
                  <p className="text-[rgba(255,255,255,0.5)]">Taxa de Quadros (FPS)</p>
                  <p className="font-bold text-white">30 FPS Smooth Motion</p>
                </div>
                <div className="p-3 bg-[#1C1C1F] rounded-xl border border-white/5 space-y-1">
                  <p className="text-[rgba(255,255,255,0.5)]">Formato de Legendas</p>
                  <p className="font-bold text-white">ASS Burned-in Subtitles</p>
                </div>
                <div className="p-3 bg-[#1C1C1F] rounded-xl border border-white/5 space-y-1">
                  <p className="text-[rgba(255,255,255,0.5)]">Codec de Vídeo</p>
                  <p className="font-bold text-white">libx264 (H.264 MP4)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSIZE ENLARGED IMAGE MODAL */}
      {selectedImageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-sm w-full bg-[#141416] border border-white/20 rounded-[24px] overflow-hidden p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-white">Scene Image Preview (16:9)</span>
              <button
                onClick={() => setSelectedImageModalUrl(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src={selectedImageModalUrl}
                alt="Enlarged Preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => handleDownloadImage(selectedImageModalUrl, 'scene_image_9_16.png')}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>
              <button
                onClick={() => setSelectedImageModalUrl(null)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGENERATE ALL VISUALS CONFIRMATION MODAL */}
      {showRegenerateVisualsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141416] border border-[rgba(255,255,255,0.12)] rounded-[20px] shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Regenerate All Scene Images</h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">Gemini Image Generation</p>
              </div>
            </div>

            <p className="text-xs text-[rgba(255,255,255,0.7)] leading-relaxed bg-[#1C1C1F] p-3.5 rounded-xl border border-white/5">
              This will replace all generated scene images for this video using Cloudflare Workers AI (FLUX). Are you sure you want to proceed?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateVisualsModal(false)}
                disabled={isGeneratingVisuals}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAllVisuals}
                disabled={isGeneratingVisuals}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-5 h-[38px] rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {isGeneratingVisuals ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Regenerate Visuals
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGENERATE SCRIPT CONFIRMATION MODAL */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141416] border border-[rgba(255,255,255,0.12)] rounded-[20px] shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Regenerate Script & Scenes</h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">AI Content Regeneration</p>
              </div>
            </div>

            {regenerateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regenerateError}</span>
              </div>
            )}

            <p className="text-xs text-[rgba(255,255,255,0.7)] leading-relaxed bg-[#1C1C1F] p-3.5 rounded-xl border border-white/5">
              This will replace the current script and scenes with new AI-generated content from Gemini.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateModal(false)}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-5 h-[38px] rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Regenerate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE VOICE MODAL */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#141416] border border-[rgba(255,255,255,0.12)] rounded-[20px] shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Volume2 className="w-5 h-5 text-[#8B5CF6]" /> Escolher Voz e Narrador
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-[rgba(255,255,255,0.5)] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <VoicePicker
              selectedVoiceId={voiceId}
              onSelectVoice={(vid) => setVoiceId(vid)}
              selectedVoiceStyle={voiceStyle}
              onSelectVoiceStyle={(vst) => setVoiceStyle(vst)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={() => setShowVoiceModal(false)}
                disabled={isGeneratingNarration}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[rgba(255,255,255,0.6)] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleGenerateNarration(voiceId, voiceStyle)}
                disabled={isGeneratingNarration}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg"
              >
                {isGeneratingNarration ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Gerando Narração...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Gerar Narração com Esta Voz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK SEARCH MODAL */}
      {stockModalScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#141416] border border-[rgba(255,255,255,0.12)] rounded-[20px] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" /> Stock Media Search (Scene {stockModalScene.scene_order})
                </h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  Pesquise e selecione imagens de alta qualidade (Pexels / Unsplash)
                </p>
              </div>
              <button
                onClick={() => setStockModalScene(null)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchStockQuery()}
                placeholder="Palavra-chave ou prompt de busca..."
                className="flex-1 bg-[#1C1C1F] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSearchStockQuery}
                disabled={isSearchingStock}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
              >
                {isSearchingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
              </button>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto min-h-[250px] pr-1">
              {isSearchingStock ? (
                <div className="flex flex-col items-center justify-center h-48 text-emerald-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">Buscando imagens de stock...</span>
                </div>
              ) : stockAssets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {stockAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelectStockAsset(asset)}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-emerald-500 transition-all text-left bg-[#0F0F12]"
                    >
                      <img src={asset.url} alt={asset.photographer || 'Stock'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">{asset.provider}</span>
                        <span className="text-[10px] text-white truncate">{asset.photographer || 'Libre'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-white/50 py-12">
                  Nenhuma imagem encontrada. Tente termos em inglês (ex: "cyberpunk", "nature", "business").
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default VideoDetailPage;
