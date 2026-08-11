'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface VideoPlayer916Props {
  src?: string;
  poster?: string;
  captionText?: string;
  className?: string;
}

export const VideoPlayer916: React.FC<VideoPlayer916Props> = ({
  src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  poster = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
  captionText = 'QUANDO ENZO FERRARI VIU ESTE CARRO... ELE O CHAMOU DE OBRA-PRIMA!',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      className={`relative aspect-[9/16] w-full max-w-[320px] mx-auto rounded-2xl bg-black border border-[#27272F] overflow-hidden shadow-2xl group ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        playsInline
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Play/Pause Center Overlay Button */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity"
        >
          <div className="w-14 h-14 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-xl transform scale-100 hover:scale-110 transition-transform">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Hormozi Subtitles Simulated Overlay */}
      <div className="absolute bottom-16 left-4 right-4 pointer-events-none text-center">
        <span className="inline-block text-lg font-black uppercase text-yellow-300 tracking-wider bg-black/80 px-3 py-1.5 rounded-lg border border-yellow-400/30 shadow-2xl backdrop-blur-md">
          {captionText}
        </span>
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white opacity-80 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-md p-2 rounded-xl border border-white/10">
        <button onClick={togglePlay} className="p-1 hover:text-[#A78BFA]">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button onClick={toggleMute} className="p-1 hover:text-[#A78BFA]">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
