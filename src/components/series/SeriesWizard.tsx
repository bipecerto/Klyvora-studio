import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { VoicePicker } from './VoicePicker';
import {
  SeriesPlatform,
  VideoDuration,
  ContentStyle,
  VoiceGender,
  VoiceStyle,
  VisualSource,
  VisualStyle,
  CaptionStyle,
} from '../../types';
import { useData } from '../../contexts/DataContext';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Tv,
  FileText,
  Mic,
  Video,
  Subtitles,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface SeriesWizardProps {
  onComplete: (seriesId: string) => void;
  onCancel: () => void;
}

export const SeriesWizard: React.FC<SeriesWizardProps> = ({ onComplete, onCancel }) => {
  const { createSeries } = useData();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    niche: 'Automotive',
    language: 'English',
    duration: '30s' as VideoDuration,
    platform: 'TikTok' as SeriesPlatform,
    description: '',
    content_style: 'Documentary' as ContentStyle,
    voice_gender: 'Male' as VoiceGender,
    voice_style: 'Documentary' as VoiceStyle,
    voice_id: 'Charon',
    visual_source: 'AI Video' as VisualSource,
    visual_style: 'Cinematic' as VisualStyle,
    captions_enabled: true,
    caption_style: 'Hormozi' as CaptionStyle,
  });

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const created = await createSeries({
        ...formData,
        status: 'Active',
        thumbnail_url:
          formData.niche === 'Automotive'
            ? 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80'
            : formData.niche === 'Horror'
            ? 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      });
      setLoading(false);
      onComplete(created.id);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: 'Detalhes', icon: Tv },
    { num: 2, label: 'Conteúdo', icon: FileText },
    { num: 3, label: 'Voz', icon: Mic },
    { num: 4, label: 'Visuais', icon: Video },
    { num: 5, label: 'Legendas', icon: Subtitles },
    { num: 6, label: 'Revisão', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Wizard Progress Steps Header */}
      <div className="bg-[#111116] border border-[#27272F] p-4 rounded-2xl">
        <div className="grid grid-cols-6 gap-1">
          {stepsHeader.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num);
                }}
                disabled={s.num > currentStep}
                className={`
                  flex flex-col items-center justify-center py-2 rounded-xl transition-all text-xs font-medium text-center
                  ${
                    isCurrent
                      ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40 font-bold'
                      : isCompleted
                      ? 'text-emerald-400 hover:bg-[#18181F]'
                      : 'text-[#A1A1AA]/50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center gap-1 mb-1">
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Etapa {s.num}</span>
                </div>
                <span className="truncate max-w-[70px]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <Card className="bg-[#111116] border-[#27272F] p-6 sm:p-8 space-y-6">
        {/* STEP 1: Series Details */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 1: Detalhes da Série</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Configure os metadados básicos e a plataforma alvo para sua série de IA.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome da Série"
                placeholder="ex: Carros Esportivos Clássicos Revelados"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Nicho"
                  value={formData.niche}
                  onChange={(e) => updateField('niche', e.target.value)}
                  options={[
                    { value: 'Automotive', label: 'Automotivo & Carros' },
                    { value: 'Horror', label: 'Terror & Crimes Reais' },
                    { value: 'Science', label: 'Ciência & Cosmos' },
                    { value: 'History', label: 'História & Curiosidades' },
                    { value: 'Business', label: 'Negócios & Finanças' },
                    { value: 'Fitness', label: 'Saúde & Fitness' },
                  ]}
                />

                <Select
                  label="Idioma"
                  value={formData.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  options={[
                    { value: 'Portuguese', label: 'Português (BR)' },
                    { value: 'English', label: 'Inglês (US)' },
                    { value: 'Spanish', label: 'Espanhol' },
                    { value: 'German', label: 'Alemão' },
                    { value: 'French', label: 'Francês' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Plataforma Alvo
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['TikTok', 'Instagram Reels', 'YouTube Shorts'] as SeriesPlatform[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => updateField('platform', p)}
                      className={`
                        p-3 rounded-xl border text-xs font-semibold transition-all text-center
                        ${
                          formData.platform === p
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8] shadow-md'
                            : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA] hover:border-[#373743]'
                        }
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Duração do Vídeo
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['15s', '30s', '60s', '90s'] as VideoDuration[]).map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => updateField('duration', d)}
                      className={`
                        py-2.5 rounded-xl border text-xs font-semibold transition-all text-center
                        ${
                          formData.duration === d
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                            : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA]'
                        }
                      `}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Content Style */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 2: Conceito de Conteúdo</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Descreva o tema central e a abordagem narrativa que o Klyvora deve utilizar.
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                label="Descreva sobre o que é sua série"
                rows={4}
                placeholder="ex: Foco em narrativas profundas sobre carros clássicos de 1950 a 1990, destacando inovações de engenharia e citações históricas de pilotos."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Estilo de Conteúdo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['Educational', 'Storytelling', 'Documentary', 'Listicle', 'Mystery', 'Facts'] as ContentStyle[]).map((style) => (
                    <button
                      type="button"
                      key={style}
                      onClick={() => updateField('content_style', style)}
                      className={`
                        p-3 rounded-xl border text-xs font-medium transition-all text-left space-y-1
                        ${
                          formData.content_style === style
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                            : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA]'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm">
                        {style === 'Educational' ? 'Educativo' : style === 'Storytelling' ? 'Storytelling' : style === 'Documentary' ? 'Documentário' : style === 'Listicle' ? 'Lista' : style === 'Mystery' ? 'Mistério' : 'Fatos'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Voice Settings */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 3: Seleção de Voz Neural</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Escolha o narrador Gemini TTS e a entonação narrativa da sua série.
              </p>
            </div>

            <VoicePicker
              selectedVoiceId={formData.voice_id}
              onSelectVoice={(vid) => updateField('voice_id', vid)}
              selectedVoiceStyle={formData.voice_style}
              onSelectVoiceStyle={(vst) => updateField('voice_style', vst as VoiceStyle)}
              language={formData.language}
            />
          </div>
        )}

        {/* STEP 4: Visuals */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 4: Fonte de Cenas & Visuais</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Escolha o motor de renderização visual e a estética das cenas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Fonte Visual
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['AI Images', 'AI Video', 'Stock Footage', 'Mixed'] as VisualSource[]).map((src) => (
                    <button
                      type="button"
                      key={src}
                      onClick={() => updateField('visual_source', src)}
                      className={`
                        p-3.5 rounded-xl border text-xs font-semibold transition-all text-center
                        ${
                          formData.visual_source === src
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                            : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA]'
                        }
                      `}
                    >
                      {src === 'AI Images' ? 'Imagens de IA' : src === 'AI Video' ? 'Vídeo de IA' : src === 'Stock Footage' ? 'Vídeos de Arquivo' : 'Misto'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Estética Visual
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['Cinematic', 'Realistic', 'Documentary', 'Dark', 'Vintage', 'Modern'] as VisualStyle[]).map((vStyle) => (
                    <button
                      type="button"
                      key={vStyle}
                      onClick={() => updateField('visual_style', vStyle)}
                      className={`
                        p-3 rounded-xl border text-xs font-medium transition-all text-center
                        ${
                          formData.visual_style === vStyle
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                            : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA]'
                        }
                      `}
                    >
                      {vStyle === 'Cinematic' ? 'Cinematográfico' : vStyle === 'Realistic' ? 'Realista' : vStyle === 'Documentary' ? 'Documentário' : vStyle === 'Dark' ? 'Sombrio' : vStyle === 'Vintage' ? 'Retrô/Vintage' : 'Moderno'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Captions */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 5: Legendas Dinâmicas</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Selecione o estilo tipográfico e as cores para legendas animadas palavra por palavra.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-3.5 bg-[#18181F] rounded-xl border border-[#27272F]">
                <div>
                  <p className="text-sm font-semibold text-[#F7F7F8]">Ativar Legendas Dinâmicas</p>
                  <p className="text-xs text-[#A1A1AA]">Recomendado para até 80%+ a mais de retenção nos vídeos</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.captions_enabled}
                  onChange={(e) => updateField('captions_enabled', e.target.checked)}
                  className="w-5 h-5 accent-[#7C3AED] rounded cursor-pointer"
                />
              </div>

              {formData.captions_enabled && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Estilo de Legenda
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(['Minimal', 'Bold', 'Dynamic', 'Hormozi', 'Classic'] as CaptionStyle[]).map((cs) => (
                        <button
                          type="button"
                          key={cs}
                          onClick={() => updateField('caption_style', cs)}
                          className={`
                            p-3 rounded-xl border text-xs font-semibold transition-all text-center
                            ${
                              formData.caption_style === cs
                                ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                                : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA]'
                            }
                          `}
                        >
                          {cs}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption Live Preview Box */}
                  <div className="p-6 bg-[#0D0D12] rounded-2xl border border-[#27272F] text-center space-y-2">
                    <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Pré-visualização do Estilo</p>
                    <div className="py-4">
                      {formData.caption_style === 'Hormozi' && (
                        <span className="text-2xl font-black uppercase text-yellow-300 tracking-wider bg-black/80 px-3 py-1 rounded shadow-lg border border-yellow-400/30">
                          ISSO É <span className="text-emerald-400">INCRÍVEL!</span>
                        </span>
                      )}
                      {formData.caption_style === 'Bold' && (
                        <span className="text-2xl font-extrabold uppercase text-white bg-purple-600 px-3 py-1 rounded">
                          REVELAÇÃO FANTÁSTICA
                        </span>
                      )}
                      {formData.caption_style === 'Minimal' && (
                        <span className="text-lg font-medium text-[#F7F7F8] tracking-wide">
                          texto de legenda fluido e discreto
                        </span>
                      )}
                      {formData.caption_style === 'Dynamic' && (
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse">
                          CRESCIMENTO EXPLOSIVO
                        </span>
                      )}
                      {formData.caption_style === 'Classic' && (
                        <span className="text-lg font-mono text-white bg-black/90 px-2 py-0.5">
                          Exibição de legenda padrão
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Confirmation */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-[#F7F7F8]">Etapa 6: Revisão da Configuração</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Confira os detalhes antes de criar sua nova série de IA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#18181F] rounded-xl border border-[#27272F] space-y-1">
                <span className="text-[#A1A1AA]">Nome da Série</span>
                <p className="font-semibold text-sm text-[#F7F7F8]">{formData.name || 'Série Sem Título'}</p>
              </div>

              <div className="p-4 bg-[#18181F] rounded-xl border border-[#27272F] space-y-1">
                <span className="text-[#A1A1AA]">Nicho & Plataforma</span>
                <p className="font-semibold text-sm text-[#F7F7F8]">
                  {formData.niche} • {formData.platform} ({formData.duration})
                </p>
              </div>

              <div className="p-4 bg-[#18181F] rounded-xl border border-[#27272F] space-y-1">
                <span className="text-[#A1A1AA]">Conteúdo & Voz</span>
                <p className="font-semibold text-sm text-[#F7F7F8]">
                  {formData.content_style} • {formData.voice_gender} ({formData.voice_style})
                </p>
              </div>

              <div className="p-4 bg-[#18181F] rounded-xl border border-[#27272F] space-y-1">
                <span className="text-[#A1A1AA]">Visuais & Legendas</span>
                <p className="font-semibold text-sm text-[#F7F7F8]">
                  {formData.visual_source} • Legendas {formData.caption_style}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#27272F]">
          {currentStep === 1 ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleBack}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Voltar
            </Button>
          )}

          {currentStep < 6 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={currentStep === 1 && !formData.name}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Continuar
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={loading}
              rightIcon={<Sparkles className="w-4 h-4 text-[#A78BFA]" />}
            >
              Criar Série
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
