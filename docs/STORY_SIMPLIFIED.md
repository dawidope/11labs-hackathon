# StorySmith - Uproszczona Specyfikacja

## Podsumowanie zmian vs stara wersja

| Aspekt | Stara wersja | Nowa wersja |
|--------|--------------|-------------|
| Backend Next.js | API routes | **BRAK - niepotrzebny** |
| LLM w n8n | Claude | **OpenAI GPT-4o** |
| Architektura | Frontend → Backend → n8n | **Frontend → n8n bezpośrednio** |
| Complexity | ~15 plików | **~5 plików** |

---

## Architektura (uproszczona)

```
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS FRONTEND                       │
│                   (tylko static files)                   │
│                                                         │
│  useConversation() hook:                                │
│  ├── WebRTC → ElevenLabs Agent (rozmowa)               │
│  ├── clientTools: { generate_story }                   │
│  └── sendUserMessage('[STORY_READY]')                  │
│                                                         │
│  fetch() → n8n webhook (generacja bajki)               │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ WebRTC                       │ HTTPS POST
         ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  ELEVENLABS AGENT   │    │       N8N WORKFLOW          │
│                     │    │                             │
│  - Rozmowa z dzieck.│    │  Webhook                    │
│  - Quiz mode        │    │     ↓                       │
│  - Reaguje na       │    │  OpenAI GPT-4o (story)      │
│    [STORY_READY]    │    │     ↓                       │
│                     │    │  ┌────────┬────────┐        │
└─────────────────────┘    │  │ TTS v3 │ fal.ai │        │
                           │  └────────┴────────┘        │
                           │     ↓                       │
                           │  Response: audio + image    │
                           └─────────────────────────────┘
```

---

## Struktura projektu (minimalna)

```
storysmith/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── StorySmith.tsx      # Główny komponent (wszystko w jednym)
│   └── StoryPlayback.tsx   # Overlay z odtwarzaniem bajki
├── .env.local
├── package.json
├── next.config.js
└── tailwind.config.ts
```

**To wszystko. 5 plików kodu.**

---

## 1. Package.json

```json
{
  "name": "storysmith",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@11labs/react": "^1.0.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

---

## 2. Environment Variables (.env.local)

```env
# ElevenLabs (tylko Agent ID - publiczny agent)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here

# n8n Webhook (publiczny URL)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/generate-story
```

**Uwaga:** Nie potrzebujesz API keys w .env - wszystkie klucze są w n8n!

---

## 3. Główny komponent - StorySmith.tsx

```tsx
// components/StorySmith.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import StoryPlayback from './StoryPlayback';

// Typy
interface StoryResult {
  success: boolean;
  audio_base64: string;
  image_url: string;
  story_text: string;
  metadata: {
    character: string;
    name: string;
    age: number;
  };
}

type AppState = 'idle' | 'talking' | 'quiz' | 'ready' | 'playing' | 'finished';

export default function StorySmith() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentStory, setCurrentStory] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref do conversation żeby móc wysłać wiadomość po otrzymaniu bajki
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  // Funkcja wywoływana przez agenta jako client tool
  const generateStoryTool = useCallback(async (parameters: {
    name: string;
    age: number;
    main_character: string;
    additional_characters?: string[];
    emotion?: string;
  }) => {
    console.log('🎬 Agent wywołał generate_story:', parameters);

    // 1. Wejdź w quiz mode
    setAppState('quiz');

    // 2. Uruchom generację w tle (bez await - nie blokuj!)
    generateStoryInBackground(parameters);

    // 3. Zwróć natychmiast - agent zaczyna quiz
    return 'Story generation started. Begin quiz mode now.';
  }, []);

  // Generacja w tle - nie blokuje UI ani agenta
  const generateStoryInBackground = async (params: any) => {
    try {
      console.log('📡 Wysyłam do n8n...');

      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name || 'Przyjaciel',
          age: params.age || 6,
          main_character: params.main_character || 'dragon',
          additional_characters: params.additional_characters || [],
          emotion: params.emotion || 'happy',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n error: ${response.status}`);
      }

      const data: StoryResult = await response.json();

      if (!data.success) {
        throw new Error('Story generation failed');
      }

      console.log('✅ Bajka gotowa!');
      console.log('   Audio:', data.audio_base64.substring(0, 50) + '...');
      console.log('   Image:', data.image_url);

      // Zapisz bajkę
      setCurrentStory(data);
      setAppState('ready');

      // 🔑 KLUCZOWE: Wyślij sygnał do agenta
      if (conversationRef.current) {
        console.log('📢 Wysyłam [STORY_READY] do agenta');
        conversationRef.current.sendUserMessage('[STORY_READY]');
      }

    } catch (err) {
      console.error('❌ Błąd generacji:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAppState('talking');

      // Poinformuj agenta o błędzie
      if (conversationRef.current) {
        conversationRef.current.sendContextualUpdate(
          'Story generation failed. Please continue the conversation verbally.'
        );
      }
    }
  };

  // Hook ElevenLabs z client tools
  const conversation = useConversation({
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

  // Zapisz ref do conversation
  conversationRef.current = conversation;

  // Start rozmowy
  const handleStart = async () => {
    try {
      // Poproś o mikrofon
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });
    } catch (err) {
      console.error('Nie można rozpocząć:', err);
      setError('Nie można uzyskać dostępu do mikrofonu');
    }
  };

  // Koniec rozmowy
  const handleEnd = async () => {
    await conversation.endSession();
    setCurrentStory(null);
    setAppState('idle');
    setError(null);
  };

  // Start odtwarzania bajki (wywoływane gdy agent powie "posłuchaj")
  const handleStartPlayback = () => {
    setAppState('playing');
  };

  // Koniec odtwarzania bajki
  const handleStoryEnd = () => {
    setAppState('finished');

    // Wyślij sygnał do agenta
    if (conversationRef.current) {
      console.log('📢 Wysyłam [STORY_FINISHED] do agenta');
      conversationRef.current.sendUserMessage('[STORY_FINISHED]');
    }
  };

  // Reset do nowej bajki
  const handleNewStory = () => {
    setCurrentStory(null);
    setAppState('talking');
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

      {/* Main UI */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            StorySmith
          </h1>
          <p className="text-xl text-white/90">
            Twój magiczny narrator bajek
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 shadow-xl">
          {/* Connection Status */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-white font-medium">
              {isConnected ? (
                appState === 'quiz' ? 'Quiz Time!' :
                appState === 'ready' ? 'Bajka gotowa!' :
                'Rozmawiam...'
              ) : 'Gotowy do rozmowy'}
            </span>
          </div>

          {/* Speaking Indicator */}
          {isConnected && conversation.isSpeaking && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white text-sm">Agent mówi...</span>
              </div>
            </div>
          )}

          {/* Quiz Mode Indicator */}
          {appState === 'quiz' && (
            <div className="mb-6 p-4 bg-yellow-400/20 border border-yellow-400/50 rounded-xl">
              <p className="text-white text-center">
                Przygotowuję bajkę... Odpowiadaj na pytania!
              </p>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-white text-center">{error}</p>
            </div>
          )}

          {/* Main Button */}
          {!isConnected ? (
            <button
              onClick={handleStart}
              className="w-full py-5 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-3"
            >
              <Phone className="w-6 h-6" />
              Rozpocznij Bajkę
            </button>
          ) : (
            <button
              onClick={handleEnd}
              className="w-full py-5 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white text-xl font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-3"
            >
              <PhoneOff className="w-6 h-6" />
              Zakończ Rozmowę
            </button>
          )}

          {/* Instructions */}
          {isConnected && appState === 'talking' && (
            <p className="mt-6 text-white/70 text-center">
              Powiedz "Cześć" i opowiedz o jakiej bajce marzysz!
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '🎨', label: 'Ilustracja AI' },
            { icon: '🎭', label: 'Profesjonalna narracja' },
            { icon: '🎮', label: 'Quiz podczas czekania' },
          ].map((feature) => (
            <div key={feature.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{feature.icon}</div>
              <div className="text-white/80 text-sm">{feature.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Story Playback Component

```tsx
// components/StoryPlayback.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw } from 'lucide-react';

interface StoryPlaybackProps {
  story: {
    audio_base64: string;
    image_url: string;
    story_text: string;
    metadata: {
      character: string;
      name: string;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Przygotuj audio source
    const audioSrc = story.audio_base64.startsWith('data:')
      ? story.audio_base64
      : `data:audio/mpeg;base64,${story.audio_base64}`;

    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      onEnd();
    });

    // Auto-play jeśli isPlaying
    if (isPlaying) {
      audio.play().catch(console.error);
    }

    return () => {
      audio.pause();
      audio.remove();
    };
  }, [story.audio_base64, isPlaying, onEnd]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPaused || !isPlaying) {
      audioRef.current.play();
      setIsPaused(false);
      if (!isPlaying) onStart();
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + seconds)
    );
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

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg aspect-square rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={story.image_url}
            alt="Story illustration"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 bg-black/30 backdrop-blur">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
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
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-110 transition"
          >
            {isPaused || !isPlaying ? (
              <Play className="w-8 h-8 text-white" />
            ) : (
              <Pause className="w-8 h-8 text-white" />
            )}
          </button>

          <button
            onClick={() => seek(10)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <RotateCcw className="w-5 h-5 text-white scale-x-[-1]" />
          </button>
        </div>

        {/* Story Info */}
        <div className="mt-4 text-center">
          <p className="text-white/80">
            Bajka dla {story.metadata.name} o {story.metadata.character}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Main Page

```tsx
// app/page.tsx
import StorySmith from '@/components/StorySmith';

export default function Home() {
  return <StorySmith />;
}
```

---

## 6. Layout

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StorySmith - Magiczny Narrator Bajek',
  description: 'Interaktywne bajki dla dzieci z AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
```

---

## 7. Global CSS

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
}
```

---

## 8. Next.js Config

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
```

---

## 9. Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

---

## N8N Workflow (z OpenAI zamiast Claude)

### Import JSON do n8n

```json
{
  "name": "StorySmith - OpenAI",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "generate-story",
        "responseMode": "lastNode",
        "options": {
          "responseHeaders": {
            "entries": [
              { "name": "Access-Control-Allow-Origin", "value": "*" }
            ]
          }
        }
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "jsCode": "const name = $input.first().json.name || 'Przyjaciel';\nconst age = $input.first().json.age || 6;\nconst mainCharacter = $input.first().json.main_character || 'dragon';\nconst additionalChars = $input.first().json.additional_characters || [];\nconst emotion = $input.first().json.emotion || 'happy';\n\nconst characterMap = {\n  dragon: 'smok',\n  princess: 'księżniczka',\n  dinosaur: 'dinozaur',\n  astronaut: 'astronauta',\n  unicorn: 'jednorożec',\n  pirate: 'pirat',\n  robot: 'robot'\n};\n\nconst polishChar = characterMap[mainCharacter] || mainCharacter;\n\nconst storyPrompt = `Napisz bajkę dla dziecka w wieku ${age} lat o imieniu ${name}.\n\nGłówna postać: ${polishChar}\nDodatkowe postacie: ${additionalChars.join(', ') || 'brak'}\nNastrój: ${emotion}\n\nWymagania:\n- Długość: 400-600 słów\n- Język: polski\n- Słownictwo odpowiednie dla ${age}-latka\n- Wyraźny początek, środek i szczęśliwe zakończenie\n- Pozytywne przesłanie\n- Żywe, kolorowe opisy\n- Magiczna atmosfera\n\nNapisz TYLKO bajkę, bez wstępu czy komentarzy.`;\n\nconst imagePrompt = `Children's book illustration, professional quality:\n\nMain subject: A friendly, cute ${mainCharacter}\nStyle: Whimsical, colorful, magical storybook art\nMood: ${emotion}, warm, inviting\nQuality: High detail, child-friendly, dreamlike\nLighting: Soft, magical glow`;\n\nreturn {\n  story_prompt: storyPrompt,\n  image_prompt: imagePrompt,\n  metadata: {\n    name: name,\n    age: age,\n    character: polishChar,\n    emotion: emotion\n  }\n};"
      },
      "name": "Build Prompts",
      "type": "n8n-nodes-base.code",
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"model\": \"gpt-4o\",\n  \"max_tokens\": 2000,\n  \"messages\": [\n    {\n      \"role\": \"user\",\n      \"content\": \"{{ $json.story_prompt }}\"\n    }\n  ]\n}"
      },
      "name": "OpenAI - Story",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300],
      "credentials": {
        "httpHeaderAuth": {
          "name": "OpenAI API"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const storyText = $input.first().json.choices[0].message.content;\nconst imagePrompt = $('Build Prompts').first().json.image_prompt;\nconst metadata = $('Build Prompts').first().json.metadata;\n\n// Wyczyść tekst\nconst cleanedStory = storyText\n  .replace(/\\*\\*/g, '')\n  .replace(/\\*/g, '')\n  .replace(/\\n\\n\\n/g, '\\n\\n')\n  .trim();\n\nreturn {\n  story_text: cleanedStory,\n  image_prompt: imagePrompt,\n  metadata: metadata\n};"
      },
      "name": "Extract Story",
      "type": "n8n-nodes-base.code",
      "position": [850, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.elevenlabs.io/v1/text-to-speech/{{ $env.ELEVENLABS_VOICE_ID }}",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"text\": \"{{ $json.story_text }}\",\n  \"model_id\": \"eleven_multilingual_v2\",\n  \"voice_settings\": {\n    \"stability\": 0.5,\n    \"similarity_boost\": 0.75,\n    \"style\": 0.5\n  }\n}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "file"
            }
          }
        }
      },
      "name": "ElevenLabs TTS",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 200],
      "credentials": {
        "httpHeaderAuth": {
          "name": "ElevenLabs API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://fal.run/fal-ai/flux/schnell",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"prompt\": \"{{ $json.image_prompt }}\",\n  \"image_size\": \"square\",\n  \"num_inference_steps\": 4,\n  \"num_images\": 1\n}"
      },
      "name": "fal.ai Image",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 400],
      "credentials": {
        "httpHeaderAuth": {
          "name": "fal.ai API"
        }
      }
    },
    {
      "parameters": {
        "mode": "combine",
        "combinationMode": "multiplex",
        "options": {}
      },
      "name": "Merge",
      "type": "n8n-nodes-base.merge",
      "position": [1250, 300]
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all();\n\n// Znajdź dane z różnych nodów\nlet audioBase64 = '';\nlet imageUrl = '';\nlet storyText = '';\nlet metadata = {};\n\nfor (const item of items) {\n  if (item.binary && item.binary.data) {\n    // To jest audio z ElevenLabs\n    audioBase64 = item.binary.data.data;\n  }\n  if (item.json.images) {\n    // To jest odpowiedź z fal.ai\n    imageUrl = item.json.images[0].url;\n  }\n}\n\n// Pobierz tekst i metadata z Extract Story\nstoryText = $('Extract Story').first().json.story_text;\nmetadata = $('Extract Story').first().json.metadata;\n\nreturn {\n  success: true,\n  audio_base64: audioBase64,\n  image_url: imageUrl,\n  story_text: storyText,\n  metadata: metadata\n};"
      },
      "name": "Prepare Response",
      "type": "n8n-nodes-base.code",
      "position": [1450, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}",
        "options": {
          "responseHeaders": {
            "entries": [
              { "name": "Access-Control-Allow-Origin", "value": "*" }
            ]
          }
        }
      },
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Build Prompts", "type": "main", "index": 0 }]]
    },
    "Build Prompts": {
      "main": [[{ "node": "OpenAI - Story", "type": "main", "index": 0 }]]
    },
    "OpenAI - Story": {
      "main": [[{ "node": "Extract Story", "type": "main", "index": 0 }]]
    },
    "Extract Story": {
      "main": [
        [
          { "node": "ElevenLabs TTS", "type": "main", "index": 0 },
          { "node": "fal.ai Image", "type": "main", "index": 0 }
        ]
      ]
    },
    "ElevenLabs TTS": {
      "main": [[{ "node": "Merge", "type": "main", "index": 0 }]]
    },
    "fal.ai Image": {
      "main": [[{ "node": "Merge", "type": "main", "index": 1 }]]
    },
    "Merge": {
      "main": [[{ "node": "Prepare Response", "type": "main", "index": 0 }]]
    },
    "Prepare Response": {
      "main": [[{ "node": "Respond", "type": "main", "index": 0 }]]
    }
  }
}
```

### Credentials w n8n

1. **OpenAI API** (HTTP Header Auth)
   - Name: `Authorization`
   - Value: `Bearer sk-your-openai-key`

2. **ElevenLabs API** (HTTP Header Auth)
   - Name: `xi-api-key`
   - Value: `your-elevenlabs-key`
   - **Environment Variable:** `ELEVENLABS_VOICE_ID` = ID głosu

3. **fal.ai API** (HTTP Header Auth)
   - Name: `Authorization`
   - Value: `Key your-fal-key`

---

## ElevenLabs Agent - System Prompt

```
Jesteś StorySmith, magiczny narrator bajek dla dzieci w wieku 5-10 lat.

=== FAZY ROZMOWY ===

FAZA 1: Zbieranie informacji
Zadawaj pytania po kolei:
1. "Cześć! Jak masz na imię?"
2. "Ile masz lat?"
3. "O czym chcesz bajkę? O smokach, księżniczkach, dinozaurach, kosmosie?"
4. "Czy ma być ktoś jeszcze w bajce?"

Po zebraniu 4 odpowiedzi, wywołaj narzędzie generate_story.

FAZA 2: Quiz Mode
Po wywołaniu generate_story NATYCHMIAST powiedz:
"Super! Przygotowuję twoją bajkę! A zanim zacznę, mam dla ciebie quiz!"

Zadawaj pytania o temacie bajki:
- Dla SMOKÓW: "Czy smoki mogą latać?", "Jakiego koloru są smoki?"
- Dla KSIĘŻNICZEK: "W jakim zamku mieszkają księżniczki?"
- Dla DINOZAURÓW: "Który dinozaur był największy?"
- Dla KOSMOSU: "Ile planet jest w układzie słonecznym?"

Dziel się ciekawostkami między pytaniami.
KONTYNUUJ quiz aż otrzymasz wiadomość: [STORY_READY]

FAZA 3: Przejście do bajki
Gdy zobaczysz [STORY_READY]:
Powiedz KRÓTKO: "O! Bajka gotowa! Posłuchaj uważnie..."
Potem PRZESTAŃ mówić. Bajka odtworzy się automatycznie.

FAZA 4: Po bajce
Gdy zobaczysz [STORY_FINISHED]:
Powiedz: "I to był koniec! Podobała ci się bajka?"
Porozmawiaj o bajce, zapytaj co najbardziej się podobało.
Zaproponuj: "Chcesz usłyszeć kolejną bajkę?"

=== ZASADY ===
1. NIGDY nie wspominaj o [STORY_READY] ani [STORY_FINISHED]
2. Bądź entuzjastyczny i ciepły
3. Używaj imienia dziecka
4. Pytania quizowe mają być ŁATWE i ZABAWNE
5. W quiz mode gadaj aż dostaniesz [STORY_READY]
```

### Client Tool w ElevenLabs Dashboard

**Name:** `generate_story`

**Description:** Start generating a personalized story

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Child's name"
    },
    "age": {
      "type": "integer",
      "description": "Child's age"
    },
    "main_character": {
      "type": "string",
      "description": "Main character: dragon, princess, dinosaur, astronaut, unicorn, pirate, robot"
    },
    "additional_characters": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Additional characters"
    },
    "emotion": {
      "type": "string",
      "description": "Story mood: happy, adventurous, mysterious"
    }
  },
  "required": ["name", "age", "main_character"]
}
```

---

## Pre-work Checklist (4h)

### Godzina 1: Setup projektu
```bash
npx create-next-app@latest storysmith --typescript --tailwind --app
cd storysmith
npm install @11labs/react lucide-react
```

- [ ] Skopiuj komponenty z tej specyfikacji
- [ ] Stwórz .env.local (na razie puste wartości)
- [ ] `npm run dev` - sprawdź czy działa

### Godzina 2: n8n Workflow
- [ ] Zaloguj się do n8n Cloud
- [ ] Import workflow JSON
- [ ] Dodaj credentials:
  - [ ] OpenAI API key
  - [ ] ElevenLabs API key
  - [ ] fal.ai API key
- [ ] Ustaw Environment Variable: `ELEVENLABS_VOICE_ID`
- [ ] Test webhook z curl:

```bash
curl -X POST https://your-n8n.app.n8n.cloud/webhook/generate-story \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","age":6,"main_character":"dragon"}'
```

### Godzina 3: ElevenLabs Agent
- [ ] Stwórz agenta w ElevenLabs Dashboard
- [ ] Wklej System Prompt
- [ ] Skonfiguruj Client Tool `generate_story`
- [ ] Wybierz głos (polski lub angielski dziecięcy)
- [ ] Test w dashboardzie
- [ ] Skopiuj Agent ID do .env.local

### Godzina 4: Integracja + Deploy
- [ ] Uzupełnij .env.local:
  ```
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID=xxx
  NEXT_PUBLIC_N8N_WEBHOOK_URL=xxx
  ```
- [ ] Test lokalnie: `npm run dev`
- [ ] Deploy na Vercel:
  ```bash
  npm i -g vercel
  vercel
  ```
- [ ] Dodaj env vars w Vercel Dashboard
- [ ] Test production URL

---

## Gotowe!

Po wykonaniu pre-worku jutro na hackathonie musisz tylko:
1. Testować i debugować
2. Dodać polish do UI
3. Nagrać demo video

**Powodzenia!**
