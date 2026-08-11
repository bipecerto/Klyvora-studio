import React, { useState } from 'react';
import { X, Sparkles, Check, Loader2, Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createVideo, getVideoById } from '../../services/videoService';
import { generateVideoScript } from '../../services/generationService';
import { generateNarration } from '../../services/narrationService';
import { generateVideoVisuals } from '../../services/visualService';

interface GenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId?: string;
  seriesName?: string;
  onVideoCreated?: () => void;
}

const SAMPLE_TOPICS = [
  'The Forgotten Supercar That Beat Ferrari in 1966',
  '3 Historical Vault Secrets Hidden Under London',
  'Why Roman Concrete Self-Heals After 2000 Years',
  'The Compound Interest Trick That Makes Millionaires',
];

export const GenerateVideoModal: React.FC<GenerateVideoModalProps> = ({
  isOpen,
  onClose,
  seriesId,
  seriesName = 'General Series',
  onVideoCreated,
}) => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [autoTopic, setAutoTopic] = useState(false);
  const [useSeriesSettings, setUseSeriesSettings] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('Preparing project');
  const [progressPercent, setProgressPercent] = useState<number>(10);
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAutoTopicSelect = () => {
    setAutoTopic(true);
    setTopic('');
  };

  const handleManualTopicChange = (val: string) => {
    setTopic(val);
    if (val.trim()) {
      setAutoTopic(false);
    }
  };

  const getStageName = (pct: number, status?: string): string => {
    if (status === 'failed') return 'Failed';
    if (pct >= 85 || status === 'draft') return 'Visuals & Narration ready';
    if (pct >= 65) return 'Generating scene visuals...';
    if (pct >= 50) return 'Generating voice narration...';
    if (pct >= 35) return 'Creating scenes';
    if (pct >= 25) return 'Writing script';
    return 'Preparing project';
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStage('Preparing project');

    const isAuto = autoTopic || !topic.trim();
    const initialTopicText = isAuto ? 'Auto Topic' : topic.trim();

    try {
      // 1. Create Video Draft Record
      const newVideo = await createVideo({
        series_id: seriesId,
        topic: isAuto ? null : initialTopicText,
        title: initialTopicText,
        status: 'generating',
        progress: 10,
        duration: 60,
      });

      const videoId = newVideo.id;

      // Start polling status
      const pollInterval = setInterval(async () => {
        try {
          const updated = await getVideoById(videoId);
          if (updated) {
            const pct = updated.progress ?? 10;
            setProgressPercent(pct);
            setProgressStage(getStageName(pct, updated.status));
            if (updated.status === 'failed' && updated.error_message) {
              setErrorMessage(updated.error_message);
            }
          }
        } catch (_) {}
      }, 1500);

      // 2. Call Edge Function / API for script generation
      await generateVideoScript(videoId, isAuto);

      // 3. Generate Neural TTS Narration
      setProgressPercent(50);
      setProgressStage('Generating voice narration...');
      try {
        await generateNarration(videoId);
      } catch (narrErr: any) {
        console.warn('Narration auto-generation error (video script still available):', narrErr);
      }

      // 4. Generate Real Scene Visuals (Gemini Image API)
      setProgressPercent(65);
      setProgressStage('Generating scene visuals...');
      try {
        await generateVideoVisuals(videoId);
      } catch (visErr: any) {
        console.warn('Scene visuals auto-generation error:', visErr);
      }

      clearInterval(pollInterval);
      setProgressPercent(85);
      setProgressStage('Visuals & Narration ready');
      setCreatedVideoId(videoId);

      if (onVideoCreated) {
        onVideoCreated();
      }
    } catch (err: any) {
      console.error('Failed video generation:', err);
      setErrorMessage(err.message || 'Script generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#141416] border border-[rgba(255,255,255,0.12)] rounded-[20px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[rgba(91,63,214,0.2)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center text-[#8B5CF6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white">Generate Video Script</h3>
              <p className="text-[12px] text-[rgba(255,255,255,0.45)]">
                Series: {seriesName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-[rgba(255,255,255,0.5)] hover:text-white p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isGenerating ? (
            /* REAL PROGRESS STAGE VIEW */
            <div className="py-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h4 className="text-[18px] font-bold text-white">Generating Video Script</h4>
                <p className="text-xs text-[#8B5CF6] font-semibold animate-pulse">{progressStage}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="w-full h-2 bg-[#1C1C1F] rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-mono text-right">{progressPercent}%</p>
              </div>

              {/* Steps Checklist */}
              <div className="text-left max-w-xs mx-auto space-y-2 text-xs">
                {[
                  { name: 'Preparing project', pct: 10 },
                  { name: 'Writing script', pct: 25 },
                  { name: 'Creating scenes', pct: 35 },
                  { name: 'Generating narration', pct: 50 },
                  { name: 'Generating visuals', pct: 65 },
                  { name: 'Visuals & Narration ready', pct: 85 },
                ].map((step, idx) => {
                  const isDone = progressPercent >= step.pct;
                  const isCurrent = progressPercent < step.pct && (idx === 0 || progressPercent >= [10, 25, 35, 50, 65, 85][idx - 1]);
                  return (
                    <div key={step.name} className="flex items-center justify-between">
                      <span className={isDone ? 'text-white font-medium' : isCurrent ? 'text-[#8B5CF6] font-semibold' : 'text-[rgba(255,255,255,0.3)]'}>
                        {step.name}
                      </span>
                      {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      {isCurrent && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !createdVideoId ? (
            <>
              {/* Topic Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-white">
                    Video Topic or Angle
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoTopicSelect}
                    className={`text-[12px] font-medium transition-colors flex items-center gap-1 ${
                      autoTopic ? 'text-emerald-400 font-bold' : 'text-[#8B5CF6] hover:text-[#9F7AEA]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {autoTopic ? 'Auto topic selected' : 'Generate topic automatically'}
                  </button>
                </div>
                <textarea
                  value={autoTopic ? '' : topic}
                  onChange={(e) => handleManualTopicChange(e.target.value)}
                  placeholder={
                    autoTopic
                      ? 'Gemini will automatically generate an engaging topic based on this series...'
                      : 'Enter a specific topic (e.g. The Mysterious 1961 Jaguar E-Type) or click "Generate topic automatically"...'
                  }
                  rows={3}
                  disabled={autoTopic}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl p-3 text-[14px] text-white placeholder-[rgba(255,255,255,0.3)] outline-none resize-none transition-colors disabled:opacity-60"
                />
                {autoTopic && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ Klyvora AI will choose a viral topic matching the series niche.
                  </p>
                )}
              </div>

              {/* Sample Topic Chips */}
              {!autoTopic && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-[rgba(255,255,255,0.4)]">Sample ideas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_TOPICS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleManualTopicChange(s)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1C1C1F] hover:bg-white/10 text-[rgba(255,255,255,0.7)] hover:text-white transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Use Series Settings Toggle */}
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors">
                <input
                  type="checkbox"
                  checked={useSeriesSettings}
                  onChange={(e) => setUseSeriesSettings(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#7C3AED]"
                />
                <div className="text-xs">
                  <p className="font-semibold text-white">Use series default settings</p>
                  <p className="text-[rgba(255,255,255,0.45)]">
                    Niche, tone, language & visual style from {seriesName}
                  </p>
                </div>
              </label>
            </>
          ) : (
            /* Created Success View */
            <div className="space-y-6 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-[18px] font-bold text-white">
                  Script & Scenes Generated!
                </h4>
                <p className="text-[13px] text-[rgba(255,255,255,0.55)] max-w-sm mx-auto leading-relaxed">
                  The script, title, topic and scene prompts have been created by Gemini and saved to Supabase.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#101012] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-end gap-3">
          {!createdVideoId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[#1C1C1F] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={isGenerating}
                className="klyvora-btn-gradient text-white text-[13px] font-semibold px-5 h-[38px] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Script
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/videos/${createdVideoId}`);
              }}
              className="klyvora-btn-gradient text-white text-[13px] font-semibold px-6 h-[40px] rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all w-full justify-center"
            >
              <Play className="w-4 h-4 fill-white" />
              View Video Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

