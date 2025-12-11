// components/Storylandia.tsx
'use client';

import { useConversation } from '@elevenlabs/react';
import { BookOpen, Play, Sparkles, Wand2, Square } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import StoryPlayback from './StoryPlayback';

// Typy
interface StoryResult {
  success: boolean;
  title: string;
  story: string;
  audio: string;
  image: string;
  video: string;
  metadata: {
    generated_at: string;
    word_count: number;
    has_image: boolean;
    has_audio: boolean;
    has_video: boolean;
  };
}

type AppState = 'idle' | 'talking' | 'quiz' | 'ready' | 'playing' | 'finished';

export default function Storylandia() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentStory, setCurrentStory] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Historia wygenerowanych bajek
  const [storyHistory, setStoryHistory] = useState<StoryResult[]>([]);

  // Kontrola mikrofonu i głośności
  const [micMuted, setMicMuted] = useState(false);
  const [agentVolume, setAgentVolume] = useState(1);

  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  // Client tool - wywoływany przez agenta ElevenLabs
  const generateStoryTool = useCallback(async (parameters: {
    hero_name?: string;
    age?: number;
    theme?: string;
    additional_heroes?: string[];
    location?: string;
    name?: string;
    main_character?: string;
    additional_characters?: string[];
    emotion?: string;
  }) => {
    console.log('🎬 AGENT WYWOŁAŁ TOOL: generate_story');
    console.log('📥 Parameters:', JSON.stringify(parameters, null, 2));

    const mappedParams = {
      name: parameters.hero_name || parameters.name || 'Przyjaciel',
      age: parameters.age || 6,
      main_character: parameters.theme || parameters.main_character || 'dragon',
      additional_characters: parameters.additional_heroes || parameters.additional_characters || [],
      location: parameters.location || 'magical forest',
      emotion: parameters.emotion || 'happy',
    };

    setAppState('quiz');
    setIsGenerating(true);

    // Generacja w tle
    generateStoryInBackground(mappedParams);

    return 'Story generation started. Begin quiz mode now.';
  }, []);

  const generateStoryInBackground = async (params: {
    name: string;
    age: number;
    main_character: string;
    additional_characters: string[];
    location: string;
    emotion: string;
  }) => {
    try {
      const payload = {
        hero_name: params.name,
        name: params.name,
        age: params.age,
        theme: params.main_character,
        main_character: params.main_character,
        additional_heroes: params.additional_characters,
        additional_characters: params.additional_characters,
        location: params.location,
        direction: params.emotion,
        emotion: params.emotion,
        timestamp: new Date().toISOString(),
      };

      console.log('📡 Wysyłam do API...');

      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: StoryResult = await response.json();

      if (!data.success) {
        throw new Error('Story generation failed');
      }

      console.log('✅ Bajka gotowa!', data.title);

      setCurrentStory(data);
      setStoryHistory(prev => [data, ...prev]);
      setIsGenerating(false);

      // 🔑 KLUCZOWE: Wyślij sygnał do agenta
      if (conversationRef.current) {
        console.log('📢 Wysyłam [STORY_READY] do agenta');
        conversationRef.current.sendUserMessage('[STORY_READY]');

        // Poczekaj chwilę aż agent powie "bajka gotowa" i od razu odtwórz
        setTimeout(async () => {
          console.log('🎬 Auto-start playback');
          // Wycisz agenta i uruchom bajkę
          conversationRef.current?.sendContextualUpdate(
            'STORY IS NOW PLAYING. DO NOT SPEAK. DO NOT RESPOND. WAIT SILENTLY UNTIL YOU RECEIVE [STORY_FINISHED]. Ignore all audio input until then.'
          );
          setMicMuted(true);
          setAgentVolume(0);
          setAppState('playing');
        }, 3000); // 3 sekundy na reakcję agenta
      } else {
        // Brak agenta - od razu odtwórz
        setAppState('playing');
      }

    } catch (err) {
      console.error('❌ Błąd generacji:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAppState('talking');
      setIsGenerating(false);
    }
  };

  // Hook ElevenLabs
  const conversation = useConversation({
    micMuted,
    volume: agentVolume,
    clientTools: {
      generate_story: generateStoryTool,
    },
    onConnect: () => {
      console.log('✅ Połączono z ElevenLabs');
      setAppState('talking');
    },
    onDisconnect: () => {
      console.log('👋 Rozłączono');
      setAppState('idle');
    },
    onMessage: (message) => {
      console.log('💬 Wiadomość:', message);
    },
    onError: (error) => {
      console.error('❌ Błąd:', error);
      setError(String(error));
    },
  });

  conversationRef.current = conversation;

  const handleStart = async () => {
    try {
      setError(null);
      // Upewnij się, że mikrofon i głośność są odmutowane na start
      setMicMuted(false);
      setAgentVolume(1);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });
    } catch (err) {
      console.error('Cannot start:', err);
      setError('Cannot access microphone');
    }
  };

  const handleEnd = async () => {
    await conversation.endSession();
    setCurrentStory(null);
    setAppState('idle');
    setError(null);
    setIsGenerating(false);
    // Reset mikrofonu i głośności
    setMicMuted(false);
    setAgentVolume(1);
  };

  // Start odtwarzania bajki - WYCISZ AGENTA I MIKROFON
  const handleStartPlayback = async () => {
    console.log('🔇 Wyciszam agenta na czas odtwarzania bajki');

    if (conversationRef.current) {
      conversationRef.current.sendContextualUpdate(
        'STORY IS NOW PLAYING. DO NOT SPEAK. DO NOT RESPOND. WAIT SILENTLY UNTIL YOU RECEIVE [STORY_FINISHED]. Ignore all audio input until then.'
      );
    }

    setMicMuted(true);
    setAgentVolume(0);
    setAppState('playing');
  };

  // Koniec odtwarzania bajki - PRZYWRÓĆ AGENTA
  const handleStoryEnd = useCallback(async () => {
    console.log('🔊 Przywracam agenta po zakończeniu bajki');

    setMicMuted(false);
    setAgentVolume(1);
    setAppState('finished');

    if (conversationRef.current) {
      console.log('📢 Wysyłam [STORY_FINISHED] do agenta');
      conversationRef.current.sendUserMessage('[STORY_FINISHED]');
    }
  }, []);

  // Reset do nowej bajki
  const handleNewStory = useCallback(() => {
    setCurrentStory(null);
    setAppState('talking');
    // Odmutuj agenta po zamknięciu odtwarzacza
    setMicMuted(false);
    setAgentVolume(1);
  }, []);

  // Odtwórz bajkę z historii
  const playFromHistory = async (story: StoryResult) => {
    setCurrentStory(story);

    if (conversationRef.current) {
      conversationRef.current.sendContextualUpdate(
        'STORY IS NOW PLAYING. DO NOT SPEAK. DO NOT RESPOND. WAIT SILENTLY UNTIL YOU RECEIVE [STORY_FINISHED].'
      );
    }
    setMicMuted(true);
    setAgentVolume(0);
    setAppState('playing');
  };

  const isConnected = conversation.status === 'connected';

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Animated orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Story Playback Overlay */}
      {(appState === 'playing' || appState === 'ready') && currentStory && (
        <StoryPlayback
          story={currentStory}
          isPlaying={appState === 'playing'}
          onStart={handleStartPlayback}
          onEnd={handleStoryEnd}
          onClose={handleNewStory}
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <img
                src="/logo.png"
                alt="Storylandia"
                className="h-28 md:h-36 w-auto animate-float drop-shadow-2xl"
              />
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full -z-10" />
            </div>
          </div>
          <p className="text-white/60 text-lg font-light">
            Magical stories created just for you ✨
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-strong rounded-3xl p-8 md:p-10 glow-purple">
          {/* Status */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              {isConnected && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-300' : 'text-white/50'}`}>
              {isConnected ? 'Connected to narrator' : 'Ready to talk'}
            </span>
          </div>

          {/* Generating indicator */}
          {isGenerating && (
            <div className="mb-8 p-5 glass rounded-2xl shimmer">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                <span className="text-white/90 font-medium">Creating your story...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl backdrop-blur">
              <p className="text-red-300 text-center font-medium">{error}</p>
            </div>
          )}

          {/* Story ready */}
          {currentStory && appState === 'ready' && (
            <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-center gap-3">
                <BookOpen className="w-6 h-6 text-emerald-300" />
                <span className="text-emerald-200 font-medium">Story "{currentStory.title}" is ready!</span>
              </div>
            </div>
          )}

          {/* Audio Visualizer (when talking) */}
          {isConnected && conversation.isSpeaking && (
            <div className="flex items-end justify-center gap-1.5 h-20 mb-8">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-violet-500 via-fuchsia-400 to-amber-300 rounded-full audio-bar"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}

          {/* Main Button */}
          <div className="flex justify-center">
            {!isConnected ? (
              <button
                onClick={handleStart}
                className="group relative btn-magic flex items-center gap-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-semibold py-5 px-12 rounded-2xl text-xl shadow-2xl shadow-violet-500/30 transform hover:scale-[1.03] transition-all duration-300"
              >
                <Wand2 className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                <span>Start Adventure</span>
              </button>
            ) : (
              <button
                onClick={handleEnd}
                className="group relative btn-magic flex items-center gap-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-2xl shadow-slate-500/20 transform hover:scale-[1.02] transition-all duration-300"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>End Adventure</span>
              </button>
            )}
          </div>

          {/* Story History */}
          {storyHistory.length > 0 && (
            <div className="mt-10 pt-8 border-t border-white/10">
              <h3 className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Your stories ({storyHistory.length})
                {isConnected && (
                  <span className="text-white/40 text-xs ml-2">(end adventure to play)</span>
                )}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {storyHistory.map((story, i) => (
                  <button
                    key={`${story.title}-${i}`}
                    onClick={() => !isConnected && playFromHistory(story)}
                    disabled={isConnected}
                    className={`story-card group flex-shrink-0 w-28 h-36 rounded-xl glass overflow-hidden relative ${isConnected
                      ? 'opacity-40 cursor-not-allowed grayscale'
                      : 'cursor-pointer hover:ring-2 ring-purple-400/50'
                      }`}
                  >
                    {story.image ? (
                      <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">📖</div>
                    )}
                    {/* Play overlay on hover - only when not connected */}
                    {!isConnected && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 backdrop-blur-sm">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-purple-600 ml-0.5" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-10 text-center">
          <p className="text-white/40 text-sm">
            Click the button and tell the narrator about your dream story
          </p>
          <p className="mt-2 text-white/30 text-xs">
            Choose your hero, location and type of adventure 🎭
          </p>
        </div>
      </div>
    </div>
  );
}
