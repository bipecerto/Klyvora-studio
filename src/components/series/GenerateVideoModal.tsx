import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Progress } from '../ui/Progress';
import { Series } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Wand2, Sparkles, CheckCircle, Film, AlertCircle } from 'lucide-react';

interface GenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  series?: Series;
  onSuccess?: (videoId: string) => void;
}

const SAMPLE_TOPICS: Record<string, string[]> = {
  Automotivo: [
    '5 Segredos por Trás do Lendário Jaguar E-Type de 1961',
    'Por que o McLaren F1 Continua Sendo o Supercarro Definitivo',
    'Como a Bugatti Criou o Motor Chiron de 480 km/h',
  ],
  Terror: [
    'O Mistério Não Solucionado do Quarto 1046',
    '5 Encontros Reais em Manicômios Abandonados',
    'A Verdadeira História dos Guardiões do Farol Desaparecidos',
  ],
  Ciência: [
    'O Que Acontece Dentro de um Buraco Negro Supermassivo',
    'Estrelas de Nêutrons: 1 Colher de Chá Pesa 6 Bilhões de Toneladas',
    'A Viagem no Tempo é Matematicamente Possível?',
  ],
  Default: [
    '5 Fatos Impressionantes Que Você Precisa Saber Hoje',
    'A História Não Contada por Trás do Maior Milagre da História',
    '3 Hábitos Que Transformaram Bilionários Modernos',
  ],
};

export const GenerateVideoModal: React.FC<GenerateVideoModalProps> = ({
  isOpen,
  onClose,
  series,
  onSuccess,
}) => {
  const { generateVideo } = useData();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

  const handleAutoSuggest = () => {
    const nicheKey = series?.niche || 'Default';
    const suggestions = SAMPLE_TOPICS[nicheKey] || SAMPLE_TOPICS['Default'];
    const randomTopic = suggestions[Math.floor(Math.random() * suggestions.length)];
    setTopic(randomTopic);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!series || !topic) return;

    setIsGenerating(true);
    setProgress(5);
    setCurrentStep('Iniciando pipeline de vídeo...');

    try {
      const createdVideo = await generateVideo(series.id, topic, (step, prog) => {
        setCurrentStep(step);
        setProgress(prog);
      });

      setIsGenerating(false);
      onClose();
      if (onSuccess) onSuccess(createdVideo.id);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isGenerating ? () => {} : onClose} title="Gerar Vídeo com IA" maxWidth="lg">
      <div className="space-y-6">
        {series && (
          <div className="p-3.5 rounded-xl bg-[#18181F] border border-[#27272F] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-medium">Série Alvo</p>
              <p className="text-sm font-semibold text-[#F7F7F8] mt-0.5">{series.name}</p>
            </div>
            <span className="text-xs text-[#A78BFA] px-2.5 py-1 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30">
              {series.platform} • {series.duration}
            </span>
          </div>
        )}

        {isGenerating ? (
          <div className="py-8 space-y-6 text-center">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
              <Film className="w-7 h-7 text-[#A78BFA] animate-pulse" />
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-bold text-[#F7F7F8]">{currentStep}</h4>
              <p className="text-xs text-[#A1A1AA]">
                Simulando roteiro, voz neural, geração visual e renderização dinâmica...
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <Progress value={progress} showLabel subtext={currentStep} size="lg" />
            </div>

            {/* Pipeline Stage Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 text-[10px] text-[#A1A1AA]">
              <div className={`p-2 rounded-lg border ${progress >= 20 ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30' : 'bg-[#18181F] border-[#27272F]'}`}>
                1. Roteiro
              </div>
              <div className={`p-2 rounded-lg border ${progress >= 45 ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30' : 'bg-[#18181F] border-[#27272F]'}`}>
                2. Voz
              </div>
              <div className={`p-2 rounded-lg border ${progress >= 70 ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30' : 'bg-[#18181F] border-[#27272F]'}`}>
                3. Visuais
              </div>
              <div className={`p-2 rounded-lg border ${progress >= 88 ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30' : 'bg-[#18181F] border-[#27272F]'}`}>
                4. Legendas
              </div>
              <div className={`p-2 rounded-lg border ${progress >= 100 ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30' : 'bg-[#18181F] border-[#27272F]'}`}>
                5. Render
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
                  Tópico ou Conceito do Vídeo
                </label>
                <button
                  type="button"
                  onClick={handleAutoSuggest}
                  className="flex items-center gap-1 text-xs text-[#A78BFA] hover:underline"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Gerar automaticamente</span>
                </button>
              </div>

              <Input
                placeholder="Ex: A História Secreta do Jaguar E-Type..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D0D12] border border-[#27272F] text-xs text-[#A1A1AA] space-y-1.5">
              <p className="font-semibold text-[#F7F7F8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                Configurações da Pipeline Klyvora:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                <li>Voz: {series?.voice_gender === 'Male' ? 'Masculina' : 'Feminina'} ({series?.voice_style})</li>
                <li>Fonte Visual: {series?.visual_source} ({series?.visual_style})</li>
                <li>Legendas: {series?.captions_enabled ? `Estilo ${series.caption_style}` : 'Desativadas'}</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#27272F]">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!topic}
                rightIcon={<Sparkles className="w-4 h-4 text-[#A78BFA]" />}
              >
                Criar Vídeo
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
