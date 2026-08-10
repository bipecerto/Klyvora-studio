import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { createSeries } from '../services/seriesService';
import { VoicePicker } from '../components/series/VoicePicker';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Play,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Subtitles,
  Layers,
  FileText,
  Sliders,
} from 'lucide-react';

export const NewSeriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: 'Classic British Cars',
    niche: 'Automotive',
    language: 'English',
    duration: '60 sec',
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    about:
      'Short documentary-style videos about forgotten British cars, their history and engineering secrets.',
    contentStyle: 'Documentary',
    tone: 'Dramatic',
    voiceGender: 'Male',
    voiceStyle: 'Documentary',
    voiceId: 'Charon',
    visualSource: 'AI Images',
    visualStyle: 'Cinematic',
    imageFrequency: 'Every 3 seconds',
    enableCaptions: true,
    captionStyle: 'Hormozi',
    fontSize: 'Medium',
    captionPosition: 'Center',
    highlightKeywords: true,
  });

  const togglePlatform = (p: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((item) => item !== p)
        : [...prev.platforms, p],
    }));
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const durationSeconds = parseInt(formData.duration) || 60;
      const created = await createSeries({
        name: formData.name,
        niche: formData.niche,
        description: formData.about,
        language: formData.language,
        duration: durationSeconds,
        platforms: formData.platforms,
        content_style: formData.contentStyle,
        tone: formData.tone,
        voice_gender: formData.voiceGender,
        voice_style: formData.voiceStyle,
        voice_id: formData.voiceId,
        visual_source: formData.visualSource,
        visual_style: formData.visualStyle,
        image_frequency: formData.imageFrequency,
        captions_enabled: formData.enableCaptions,
        caption_style: formData.captionStyle,
        caption_position: formData.captionPosition,
        highlight_keywords: formData.highlightKeywords,
      });

      navigate(`/series/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create series:', err);
      setErrorMessage(err.message || 'Failed to create series in Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, name: 'Details' },
    { num: 2, name: 'Content' },
    { num: 3, name: 'Voice' },
    { num: 4, name: 'Visuals' },
    { num: 5, name: 'Captions' },
    { num: 6, name: 'Review' },
  ];

  return (
    <AppLayout title="Create Series">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/series')}
            className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Series
          </button>
          <span className="text-xs text-[rgba(255,255,255,0.4)] font-mono md:hidden">
            Step {currentStep} of 6
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create a new series
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)]">
            Create once. Let Klyvora keep producing videos on autopilot.
          </p>
        </div>

        {/* Wizard Steps Bar (Desktop) */}
        <div className="hidden md:grid grid-cols-6 gap-2 pt-2">
          {stepsList.map((step) => {
            const isDone = step.num < currentStep;
            const isCurrent = step.num === currentStep;

            return (
              <button
                key={step.num}
                onClick={() => {
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-[rgba(91,63,214,0.15)] border-[#8B5CF6] text-white'
                    : isDone
                    ? 'bg-[#141416] border-[rgba(255,255,255,0.12)] text-white'
                    : 'bg-[#101012] border-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span>0{step.num}</span>
                  {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[12px] font-semibold truncate">{step.name}</p>
              </button>
            );
          })}
        </div>

        {/* Step Container Card */}
        <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-8 shadow-xl min-h-[420px] flex flex-col justify-between">
          {/* STEP 1: DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#8B5CF6]" /> Step 1: Series Details
              </h3>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Series Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Classic British Cars"
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-4 h-[44px] text-[14px] text-white placeholder-[rgba(255,255,255,0.3)] outline-none transition-colors"
                />
              </div>

              {/* Niche */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Niche</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {[
                    'Automotive',
                    'History',
                    'Mystery',
                    'Facts',
                    'Finance',
                    'Technology',
                    'Travel',
                    'Motivation',
                  ].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({ ...formData, niche: n })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        formData.niche === n
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                          : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-3 h-[44px] text-[14px] text-white outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Português">Português (Brasil)</option>
                    <option value="Español">Español</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white">Target Duration</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['30 sec', '45 sec', '60 sec', '90 sec'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration: d })}
                        className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          formData.duration === d
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                            : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Platforms */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Target Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map((plat) => {
                    const selected = formData.platforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => togglePlatform(plat)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                          selected
                            ? 'bg-[rgba(91,63,214,0.2)] border-[#8B5CF6] text-white'
                            : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)]'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            selected ? 'bg-[#8B5CF6] border-[#8B5CF6]' : 'border-white/30'
                          }`}
                        >
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTENT */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8B5CF6]" /> Step 2: Content Angle & Tone
              </h3>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">
                  What is your series about?
                </label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Tell Klyvora what kind of videos you want to create..."
                  rows={4}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl p-3.5 text-[14px] text-white placeholder-[rgba(255,255,255,0.3)] outline-none resize-none transition-colors"
                />
              </div>

              {/* Content Style Cards */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Content Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    'Storytelling',
                    'Documentary',
                    'Educational',
                    'Listicle',
                    'Facts',
                    'Mystery',
                  ].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData({ ...formData, contentStyle: style })}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        formData.contentStyle === style
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white font-bold'
                          : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                      }`}
                    >
                      <p className="text-xs">{style}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Narrative Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {['Professional', 'Casual', 'Dramatic', 'Calm', 'Energetic'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, tone: t })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        formData.tone === t
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                          : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VOICE */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#8B5CF6]" /> Step 3: Voice Selection
              </h3>

              <VoicePicker
                selectedVoiceId={formData.voiceId}
                onSelectVoice={(vid) => setFormData((prev) => ({ ...prev, voiceId: vid }))}
                selectedVoiceStyle={formData.voiceStyle}
                onSelectVoiceStyle={(vst) => setFormData((prev) => ({ ...prev, voiceStyle: vst }))}
                language={formData.language}
              />
            </div>
          )}

          {/* STEP 4: VISUALS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#8B5CF6]" /> Step 4: Visuals & Style
              </h3>

              {/* Source */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Visual Source</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['AI Images', 'AI Video', 'Stock Footage', 'Mixed'].map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setFormData({ ...formData, visualSource: src })}
                      className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        formData.visualSource === src
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                          : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style Cards */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Visual Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Cinematic', 'Realistic', 'Documentary', 'Vintage', 'Dark', 'Modern'].map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormData({ ...formData, visualStyle: st })}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          formData.visualStyle === st
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white font-bold'
                            : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                        }`}
                      >
                        <p className="text-xs">{st}</p>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Image Change Frequency */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">
                  Scene Change Frequency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {['Every 2 seconds', 'Every 3 seconds', 'Every 5 seconds', 'Auto'].map(
                    (freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageFrequency: freq })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          formData.imageFrequency === freq
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                            : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                        }`}
                      >
                        {freq}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CAPTIONS */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-[#8B5CF6]" /> Step 5: Dynamic Captions & Live Preview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Options Left */}
                <div className="space-y-5">
                  {/* Toggle */}
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                    <span className="text-xs font-semibold text-white">Enable captions</span>
                    <input
                      type="checkbox"
                      checked={formData.enableCaptions}
                      onChange={(e) =>
                        setFormData({ ...formData, enableCaptions: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-[#7C3AED]"
                    />
                  </label>

                  {/* Caption Styles */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-white">Caption Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Hormozi', 'Dynamic', 'Minimal', 'Classic', 'Bold'].map((cStyle) => (
                        <button
                          key={cStyle}
                          type="button"
                          onClick={() => setFormData({ ...formData, captionStyle: cStyle })}
                          className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                            formData.captionStyle === cStyle
                              ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                              : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                          }`}
                        >
                          {cStyle}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-white">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Top', 'Center', 'Bottom'].map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setFormData({ ...formData, captionPosition: pos })}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            formData.captionPosition === pos
                              ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                              : 'bg-[#1C1C1F] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)]'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 9:16 Real Live Caption Preview Frame */}
                <div className="flex justify-center">
                  <div className="w-[180px] aspect-[9/16] rounded-[20px] bg-black border border-[rgba(255,255,255,0.15)] relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80"
                      alt="Preview frame"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />

                    <div className="relative z-10 text-[9px] font-mono text-white/50 text-right">
                      9:16 Preview
                    </div>

                    {/* Dynamic Caption Text Render */}
                    <div
                      className={`relative z-10 px-2 text-center transition-all duration-300 ${
                        formData.captionPosition === 'Top'
                          ? 'mb-auto mt-6'
                          : formData.captionPosition === 'Bottom'
                          ? 'mt-auto mb-6'
                          : 'my-auto'
                      }`}
                    >
                      {formData.captionStyle === 'Hormozi' && (
                        <p className="text-[13px] font-black uppercase text-amber-300 bg-black/80 px-2 py-1 rounded tracking-wide leading-tight drop-shadow-md">
                          "SOME CARS WERE <span className="text-white bg-red-600 px-1">SIMPLY</span> BUILT DIFFERENTLY"
                        </p>
                      )}
                      {formData.captionStyle === 'Dynamic' && (
                        <p className="text-[12px] font-extrabold text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">
                          "Some cars were <span className="text-purple-400 font-black underline">simply built</span> differently."
                        </p>
                      )}
                      {formData.captionStyle === 'Minimal' && (
                        <p className="text-[11px] font-medium text-white/90 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                          "Some cars were simply built differently."
                        </p>
                      )}
                      {formData.captionStyle === 'Classic' && (
                        <p className="text-[11px] font-serif italic text-yellow-100 bg-black/50 p-1">
                          "Some cars were simply built differently."
                        </p>
                      )}
                      {formData.captionStyle === 'Bold' && (
                        <p className="text-[12px] font-bold text-white uppercase tracking-wider bg-purple-900/90 p-1.5 rounded">
                          "SOME CARS WERE SIMPLY BUILT DIFFERENTLY"
                        </p>
                      )}
                    </div>

                    <div className="relative z-10 text-[8px] text-emerald-400 font-mono text-center">
                      Auto Synchronized
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h3 className="text-[18px] font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#8B5CF6]" /> Step 6: Review & Launch Series
              </h3>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <div className="flex justify-between font-bold text-white">
                    <span>Series Details</span>
                    <button onClick={() => setCurrentStep(1)} className="text-[#8B5CF6]">Edit</button>
                  </div>
                  <p className="text-[rgba(255,255,255,0.6)]">Name: {formData.name}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Niche: {formData.niche}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Language: {formData.language}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Platforms: {formData.platforms.join(', ')}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <div className="flex justify-between font-bold text-white">
                    <span>Content & Voice</span>
                    <button onClick={() => setCurrentStep(2)} className="text-[#8B5CF6]">Edit</button>
                  </div>
                  <p className="text-[rgba(255,255,255,0.6)]">Style: {formData.contentStyle}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Tone: {formData.tone}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Voice: George (Male · Deep British)</p>
                </div>

                <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <div className="flex justify-between font-bold text-white">
                    <span>Visuals</span>
                    <button onClick={() => setCurrentStep(4)} className="text-[#8B5CF6]">Edit</button>
                  </div>
                  <p className="text-[rgba(255,255,255,0.6)]">Source: {formData.visualSource}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Style: {formData.visualStyle}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Frequency: {formData.imageFrequency}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <div className="flex justify-between font-bold text-white">
                    <span>Captions</span>
                    <button onClick={() => setCurrentStep(5)} className="text-[#8B5CF6]">Edit</button>
                  </div>
                  <p className="text-[rgba(255,255,255,0.6)]">Style: {formData.captionStyle}</p>
                  <p className="text-[rgba(255,255,255,0.6)]">Position: {formData.captionPosition}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons Footer */}
          <div className="pt-6 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 h-[40px] rounded-xl text-xs font-semibold text-[rgba(255,255,255,0.7)] hover:text-white bg-[#1C1C1F] hover:bg-[#242428] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-6 h-[40px] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-8 h-[42px] rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'Creating Series...' : 'Create Series'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
