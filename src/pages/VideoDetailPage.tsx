import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/common/StatusBadge';
import { AudioPlayer } from '../components/videos/AudioPlayer';
import { VoicePicker } from '../components/series/VoicePicker';
import { getVideoById, deleteVideo, updateVideo, updateVideoScene, VideoRecord, VideoSceneRecord } from '../services/videoService';
import { generateVideoScript } from '../services/generationService';
import { generateNarration } from '../services/narrationService';
import { generateSceneImage, generateVideoVisuals, regenerateSceneImage } from '../services/visualService';
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
} from 'lucide-react';

export const VideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [scenes, setScenes] = useState<VideoSceneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'script' | 'scenes' | 'narration' | 'captions' | 'settings'>('script');

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

  // Individual Scene Actions
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Record<string, boolean>>({});
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [savingPromptIds, setSavingPromptIds] = useState<Record<string, boolean>>({});

  // Image Preview Modal
  const [selectedImageModalUrl, setSelectedImageModalUrl] = useState<string | null>(null);

  // Edit Script State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editScript, setEditScript] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Slideshow auto-advance effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSlideshowPlaying && scenes.length > 0) {
      const currentScene = scenes[activeSceneIndex];
      const durationMs = Math.max(3000, ((currentScene?.duration || 4) * 1000));
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
      navigate('/videos');
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
            onClick={() => navigate('/videos')}
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

  return (
    <AppLayout title={`Video / ${video.title}`}>
      {/* Back button */}
      <button
        onClick={() => navigate('/videos')}
        className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Videos
      </button>

      {/* Main Split Layout: Left Player, Right Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: 9:16 Vertical Video Player / Slideshow Preview */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          <div className="w-full max-w-[340px] aspect-[9/16] rounded-[24px] bg-[#0F0F12] border border-[rgba(255,255,255,0.12)] shadow-2xl relative overflow-hidden flex flex-col justify-between p-5 group">
            {video.video_url ? (
              <video
                src={video.video_url}
                poster={defaultThumbnail}
                controls
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : hasAnySceneVisuals ? (
              /* REAL 9:16 VISUAL SLIDESHOW PREVIEW */
              <>
                {/* Active Scene Image */}
                <img
                  src={currentSceneVisualUrl || defaultThumbnail}
                  alt={`Scene ${currentScene?.scene_order || 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                />

                {/* Top Overlay Badge & Controls */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Preview (Slideshow)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-black/80 px-2 py-1 rounded text-white/80 border border-white/10">
                    Scene {activeSceneIndex + 1}/{scenes.length}
                  </span>
                </div>

                {/* Center Play/Pause Trigger */}
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

                {/* Bottom Overlay: Caption Text & Navigation Controls */}
                <div className="relative z-10 space-y-3">
                  {/* Scene Narration Caption */}
                  <div className="bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-center shadow-lg">
                    <p className="text-[11px] font-bold text-amber-300 leading-snug line-clamp-3">
                      "{currentScene?.text || video.title}"
                    </p>
                  </div>

                  {/* Navigation Stepper Controls */}
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
                    1080x1920 9:16
                  </span>
                  <StatusBadge status={video.status} />
                </div>

                <div className="relative z-10 p-4 rounded-2xl bg-[#141418]/90 border border-[#27272F] backdrop-blur-md space-y-3.5 my-auto text-left shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <h4 className="text-xs font-bold text-white tracking-wide">Geração de Imagens Pronta</h4>
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Gere as imagens 9:16 para cada cena utilizando a Gemini Image API.
                  </p>

                  <button
                    onClick={handleGenerateAllVisuals}
                    disabled={isGeneratingVisuals}
                    className="w-full klyvora-btn-gradient text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isGeneratingVisuals ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando Imagens 9:16...
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

        {/* RIGHT COLUMN: Video Metadata & Primary Actions */}
        <div className="lg:col-span-7 space-y-6">
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

            {/* Metadata Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[rgba(255,255,255,0.06)] text-xs">
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Duration</p>
                <p className="font-semibold text-white mt-0.5">{video.duration || 60}s</p>
              </div>
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Created</p>
                <p className="font-semibold text-white mt-0.5">
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[rgba(255,255,255,0.45)]">Status</p>
                <p className="font-semibold text-white mt-0.5 capitalize">{video.status}</p>
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
              <Subtitles className="w-4 h-4" /> Captions
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
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#8B5CF6]" /> Cenas do Vídeo ({scenes.length})
                </h3>
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

              {scenes.length > 0 ? (
                scenes.map((scene) => {
                  const isSceneGenerating = generatingSceneIds[scene.id] || scene.visual_status === 'generating';
                  const isSceneFailed = scene.visual_status === 'failed';
                  const isSavingPrompt = savingPromptIds[scene.id];

                  return (
                    <div
                      key={scene.id || scene.scene_order}
                      className="p-5 rounded-2xl bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4 shadow-md hover:border-[#8B5CF6]/30 transition-all"
                    >
                      {/* Scene Card Header */}
                      <div className="flex items-center justify-between font-bold text-white text-xs border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center font-mono text-xs font-bold">
                            {String(scene.scene_order).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-semibold">Scene {scene.scene_order}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-white/60">
                            {scene.visual_status || 'pending'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[rgba(255,255,255,0.4)]">
                          Duration: {scene.duration || 4.3}s
                        </span>
                      </div>

                      {/* Main Card Grid: Image 9:16 + Prompt & Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        {/* LEFT: REAL 9:16 IMAGE THUMBNAIL */}
                        <div className="sm:col-span-4 flex flex-col items-center gap-2">
                          <div className="w-full aspect-[9/16] max-w-[140px] rounded-xl bg-[#0F0F12] border border-white/10 shadow-lg relative overflow-hidden group/img flex items-center justify-center">
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
                                  Retry
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
                                <span className="text-[10px]">No image generated</span>
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

                        {/* RIGHT: NARRATION TEXT & EDITABLE VISUAL PROMPT */}
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
                              rows={3}
                              className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white/90 font-mono text-[11px] leading-relaxed outline-none focus:border-[#8B5CF6] resize-y"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleRegenerateSingleScene(scene.id)}
                              disabled={isSceneGenerating}
                              className="px-3.5 py-2 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25 text-[#8B5CF6] text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              {isSceneGenerating ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando Imagem...
                                </>
                              ) : (
                                <>
                                  <RotateCw className="w-3.5 h-3.5" /> Regenerate Image
                                </>
                              )}
                            </button>
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

          {activeTab === 'captions' && (
            <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white">Caption Synchronization</h3>
              <p className="text-[rgba(255,255,255,0.55)]">
                Style: <span className="text-white font-semibold">Hormozi (Yellow/Red highlight)</span>
              </p>
              <p className="text-[rgba(255,255,255,0.55)]">
                Position: <span className="text-white font-semibold">Center</span>
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">Render Settings</h3>
              <p className="text-[rgba(255,255,255,0.55)]">Resolution: 1080x1920 (9:16)</p>
              <p className="text-[rgba(255,255,255,0.55)]">FPS: 60 FPS</p>
              <p className="text-[rgba(255,255,255,0.55)]">Format: MP4 H.264</p>
            </div>
          )}
        </div>
      </div>

      {/* FULLSIZE ENLARGED IMAGE MODAL */}
      {selectedImageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-sm w-full bg-[#141416] border border-white/20 rounded-[24px] overflow-hidden p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-white">Scene Image Preview (9:16)</span>
              <button
                onClick={() => setSelectedImageModalUrl(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-[9/16] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
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
              This will replace all generated scene images for this video using Gemini Image API. Are you sure you want to proceed?
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
    </AppLayout>
  );
};
