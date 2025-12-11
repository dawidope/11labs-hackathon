// components/StoryPlayback.tsx
'use client';

import { Film, Image as ImageIcon, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StoryPlaybackProps {
  story: {
    title: string;
    story: string;
    audio: string;       // data:audio/mpeg;base64,...
    image: string;       // data:image/png;base64,...
    video: string;       // URL do video
    metadata: {
      generated_at: string;
      word_count: number;
      has_image: boolean;
      has_audio: boolean;
      has_video: boolean;
    };
  };
  isPlaying: boolean;
  onStart: () => void;
  onEnd: () => void;
  onClose: () => void;
}

export default function StoryPlayback({
  story,
  isPlaying,
  onStart,
  onEnd,
  onClose
}: StoryPlaybackProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioInitialized = useRef(false);
  const onEndRef = useRef(onEnd);

  // Aktualizuj ref gdy callback się zmieni
  onEndRef.current = onEnd;

  // Sprawdź czy mamy video
  const hasVideo = story.video && story.video.length > 0;

  useEffect(() => {
    // Zapobiegaj ponownemu tworzeniu audio jeśli już istnieje
    if (audioInitialized.current && audioRef.current) {
      console.log('🔒 Audio już zainicjalizowane, pomijam');
      return;
    }

    console.log('🎵 Inicjalizuję audio...');

    // Przygotuj audio source
    const audioSrc = story.audio.startsWith('data:')
      ? story.audio
      : `data:audio/mpeg;base64,${story.audio}`;

    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    audioInitialized.current = true;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      console.log('🏁 Audio zakończone');
      onEndRef.current();
    });

    // Auto-play
    console.log('▶️ Auto-play audio');
    audio.play().catch(console.error);

    return () => {
      console.log('🧹 Cleanup audio');
      audio.pause();
      audio.remove();
      audioInitialized.current = false;
    };
  }, [story.audio]); // Tylko story.audio - NIE isPlaying ani onEnd!

  // Synchronizuj video z audio (jeśli oba odtwarzane)
  useEffect(() => {
    if (showVideo && videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime;
    }
  }, [showVideo]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPaused || !isPlaying) {
      audioRef.current.play();
      if (showVideo && videoRef.current) {
        videoRef.current.play();
      }
      setIsPaused(false);
      if (!isPlaying) onStart();
    } else {
      audioRef.current.pause();
      if (showVideo && videoRef.current) {
        videoRef.current.pause();
      }
      setIsPaused(true);
    }
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    if (showVideo && videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex flex-col">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Title */}
      <div className="pt-6 pb-2 text-center">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
          {story.title}
        </h2>
      </div>

      {/* Media Toggle (jeśli jest video) */}
      {hasVideo && (
        <div className="flex justify-center gap-2 pb-4">
          <button
            onClick={() => setShowVideo(false)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 transition ${!showVideo
              ? 'bg-white/30 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            <ImageIcon className="w-4 h-4" />
            Ilustracja
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 transition ${showVideo
              ? 'bg-white/30 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            <Film className="w-4 h-4" />
            Video
          </button>
        </div>
      )}

      {/* Media Container */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg aspect-square rounded-3xl overflow-hidden shadow-2xl relative bg-black/20">
          {/* Image */}
          {!showVideo && story.image && (
            <img
              src={story.image}
              alt="Story illustration"
              className="w-full h-full object-cover"
            />
          )}

          {/* Video */}
          {showVideo && hasVideo && (
            <>
              {!isVideoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full mx-auto mb-2" />
                    <p className="text-sm text-white/70">Ładowanie video...</p>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                src={story.video}
                className={`w-full h-full object-cover ${isVideoLoaded ? '' : 'opacity-0'}`}
                loop
                muted
                playsInline
                onLoadedData={() => setIsVideoLoaded(true)}
                autoPlay={isPlaying && !isPaused}
              />
            </>
          )}

          {/* Placeholder jeśli brak media */}
          {!story.image && !showVideo && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-8xl">📖</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 md:p-8 bg-black/30 backdrop-blur">
        {/* Progress Bar */}
        <div className="mb-4">
          <div
            className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const newTime = percent * duration;
              audioRef.current.currentTime = newTime;
              if (showVideo && videoRef.current) {
                videoRef.current.currentTime = newTime;
              }
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-white/60 text-sm">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => seek(-10)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
            title="Cofnij 10s"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-110 transition"
          >
            {isPaused || !isPlaying ? (
              <Play className="w-8 h-8 text-white ml-1" />
            ) : (
              <Pause className="w-8 h-8 text-white" />
            )}
          </button>

          <button
            onClick={() => seek(10)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
            title="Przewiń 10s"
          >
            <RotateCcw className="w-5 h-5 text-white scale-x-[-1]" />
          </button>
        </div>

        {/* Story Info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <Volume2 className="w-4 h-4" />
            <span>Słów: {story.metadata.word_count}</span>
            {story.metadata.has_video && (
              <>
                <span>•</span>
                <Film className="w-4 h-4" />
                <span>Video AI</span>
              </>
            )}
          </div>
        </div>

        {/* Story Text Preview (collapsible) */}
        <details className="mt-4">
          <summary className="text-white/60 text-sm cursor-pointer hover:text-white/80 transition text-center">
            📜 Pokaż tekst bajki
          </summary>
          <div className="mt-3 p-4 bg-white/10 rounded-xl max-h-40 overflow-y-auto">
            <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
              {story.story}
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
