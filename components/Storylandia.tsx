// components/Storylandia.tsx
'use client';

import { useConversation } from '@elevenlabs/react';
import { BookOpen, Phone, PhoneOff, Play, Sparkles } from 'lucide-react';
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
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });
    } catch (err) {
      console.error('Nie można rozpocząć:', err);
      setError('Nie można uzyskać dostępu do mikrofonu');
    }
  };

  const handleEnd = async () => {
    await conversation.endSession();
    setCurrentStory(null);
    setAppState('idle');
    setError(null);
    setIsGenerating(false);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Storylandia"
              className="h-24 md:h-32 w-auto animate-float drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Storylandia
          </h1>
          <p className="text-white/80 text-lg">
            Magiczne bajki tworzone specjalnie dla Ciebie ✨
          </p>
        </div>

        {/* Main Card */}
        <div className="glass rounded-3xl p-6 md:p-8">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-white/80">
              {isConnected ? 'Połączono z narratorem' : 'Gotowy do rozmowy'}
            </span>
          </div>

          {/* Generating indicator */}
          {isGenerating && (
            <div className="mb-6 p-4 bg-white/10 rounded-2xl">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                <span className="text-white">Tworzę Twoją bajkę...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
              <p className="text-red-200 text-center">{error}</p>
            </div>
          )}

          {/* Story ready */}
          {currentStory && appState === 'ready' && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-2xl">
              <div className="flex items-center justify-center gap-3">
                <BookOpen className="w-6 h-6 text-green-300" />
                <span className="text-green-200">Bajka "{currentStory.title}" jest gotowa!</span>
              </div>
            </div>
          )}

          {/* Audio Visualizer (when talking) */}
          {isConnected && conversation.isSpeaking && (
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 bg-gradient-to-t from-pink-500 to-yellow-300 rounded-full audio-bar"
                />
              ))}
            </div>
          )}

          {/* Main Button */}
          <div className="flex justify-center">
            {!isConnected ? (
              <button
                onClick={handleStart}
                className="btn-magic flex items-center gap-3 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
              >
                <Phone className="w-6 h-6" />
                Zadzwoń do Narratora
              </button>
            ) : (
              <button
                onClick={handleEnd}
                className="btn-magic flex items-center gap-3 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
              >
                <PhoneOff className="w-6 h-6" />
                Zakończ rozmowę
              </button>
            )}
          </div>

          {/* Story History */}
          {storyHistory.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Twoje bajki ({storyHistory.length})
                {isConnected && (
                  <span className="text-white/50 text-xs ml-2">(zakończ rozmowę, aby odtworzyć)</span>
                )}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {storyHistory.map((story, i) => (
                  <button
                    key={`${story.title}-${i}`}
                    onClick={() => !isConnected && playFromHistory(story)}
                    disabled={isConnected}
                    className={`group flex-shrink-0 w-24 h-32 rounded-lg bg-white/10 overflow-hidden transition relative ${isConnected
                        ? 'opacity-50 cursor-not-allowed grayscale'
                        : 'cursor-pointer hover:ring-2 ring-yellow-400'
                      }`}
                  >
                    {story.image ? (
                      <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
                    )}
                    {/* Play overlay on hover - only when not connected */}
                    {!isConnected && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="w-5 h-5 text-purple-600 ml-0.5" />
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
        <div className="mt-8 text-center text-white/60 text-sm">
          <p>Kliknij przycisk i opowiedz narratorowi o swojej wymarzonej bajce!</p>
          <p className="mt-1">Możesz wybrać bohatera, miejsce akcji i rodzaj przygody 🎭</p>
        </div>
      </div>
    </div>
  );
}
