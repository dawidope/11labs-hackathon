# 🏰 Storylandia LIVE

> **Interactive AI Story Companion for Children**  
> Built for the [ElevenLabs Worldwide Hackathon](https://elevenlabs.io/hackathon)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Site-violet?style=for-the-badge)](https://11labs-hackathon.vercel.app/)
[![Built with ElevenLabs](https://img.shields.io/badge/Built_with-ElevenLabs-blue?style=for-the-badge)](https://elevenlabs.io)
[![Powered by deAPI.ai](https://img.shields.io/badge/Powered_by-deAPI.ai-orange?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDZWMTJDNCAxNi40MTgzIDcuNTgxNzIgMjAgMTIgMjBDMTYuNDE4MyAyMCAyMCAxNi40MTgzIDIwIDEyVjZMMTIgMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+)](https://deapi.ai)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![YouTube Demo](https://img.shields.io/badge/📹_Demo_Video-Watch_on_YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=rH1NHpelgL4)

---

## 🌟 What is Storylandia LIVE?

**Storylandia LIVE** is an interactive voice-powered AI agent designed for children that **co-creates personalized stories in real-time**. 

Children talk to the agent, answer playful questions, choose their heroes, settings, and story mood. The system then generates:

- 📝 **Custom story text** (OpenAI)
- 🎨 **Unique illustration** (deAPI.ai (Z-Image Turbo))
- 🎬 **Short animation** from the illustration (deAPI.ai (LTX Video))
- 🔊 **High-quality narration** (ElevenLabs Voice V3)

After generation, the story appears as a beautiful multimedia experience. Once finished, the agent continues the conversation, encouraging more adventures!

---

## 🎥 Demo

🔗 **Live Demo:** [https://11labs-hackathon.vercel.app/](https://11labs-hackathon.vercel.app/)

### 📹 Demo Video

https://github.com/user-attachments/assets/f7a801f5-c121-40a1-88da-c6739d38cd58

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎤 **Voice Conversation** | Real-time dialogue with ElevenLabs Conversational Agent |
| 👶 **Child-Friendly** | Age-appropriate content, warm and engaging personality |
| 🎭 **Story Co-Creation** | Child chooses hero, location, mood — becomes a co-author |
| ⚡ **Background Generation** | Story generates while agent keeps child entertained with quizzes |
| 🖼️ **Multimodal Output** | Illustration + Animation + Audio narration |
| 🔄 **Seamless Loop** | Conversation → Story → Conversation → New Story |

---

## 🎬 How It Works

### 1️⃣ Start Adventure
Child clicks "Start Adventure" and the AI agent greets them warmly:
> *"Hi there! I'm your magical story companion. Today we can create an amazing tale together!"*

### 2️⃣ Gathering Context
Agent asks 3-4 fun questions:
- "How old are you?"
- "Who should be the hero?"
- "Where should the adventure happen?"
- "Should it be funny, magical, or sleepy?"

### 3️⃣ Story Generation Begins
Agent calls the `GENERATE_STORY` tool and says:
> *"Great! I'm preparing your story! And before I begin, I have a quiz for you!"*

### 4️⃣ Quiz Time
While the story generates in the background, agent keeps engagement:
- "What color should the dragon be?"
- "Does the puppy have a name?"
- "Do you like space adventures?"

### 5️⃣ Story Presentation
When ready, the UI displays:
- 🎨 Custom illustration
- 🎬 3-second animation
- 🔊 ElevenLabs V3 narrated audio

Agent announces:
> *"Oh! The story is ready! Listen carefully…"*

### 6️⃣ Continue the Adventure
After listening, the conversation resumes:
> *"Did you like the story? Want to create another one?"*

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│   Next.js 14 • React 18 • TypeScript • Tailwind CSS         │
│   @elevenlabs/react • Glassmorphism UI                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               ELEVENLABS CONVERSATIONAL AGENT                │
│   • Voice-to-Voice dialogue                                  │
│   • Tool calling (GENERATE_STORY)                           │
│   • Real-time conversation management                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (n8n Flow)                        │
│                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│   │  OpenAI  │   │ deAPI.ai │   │ElevenLabs│               │
│   │  Story   │──▶│  Image   │──▶│  Voice   │               │
│   │Generator │   │ + Video  │   │   V3     │               │
│   └──────────┘   └──────────┘   └──────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- ElevenLabs API Key
- n8n instance (for backend flow)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/storylandia-live.git
cd storylandia-live

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

---

## 📱 User Interface

The UI features a modern **glassmorphism design** with:

- ✨ Animated gradient background with floating orbs
- 🪄 "Start Adventure" / "End Adventure" buttons
- 🎵 Audio visualizer during conversation
- 📚 Story history gallery
- 🎬 Fullscreen story player with image/video toggle

---

## 🎯 Why This Project?

| Aspect | Value |
|--------|-------|
| **Innovation** | Storytelling as real-time co-creation with AI |
| **Technical Complexity** | Multi-agent orchestration + voice + multimodal generation |
| **Impact** | Supports imagination, education, and emotional development |
| **Theme Alignment** | Perfect fit for ElevenLabs Conversational Agents |
| **Demo Clarity** | Easy to demonstrate — "wow" effect in under 2 minutes |

---

## 📋 Hackathon Submission

### 🏆 ElevenLabs Worldwide Hackathon

> *"Build the future of conversational agents with ElevenLabs by turning browsers, voices, clouds and tools into smart agents that act on real user intent. Harness LLMs, tool-use APIs, and multimodal perception to create agents that navigate, speak, and orchestrate services on the fly."*

**Built in 3 hours** ⏱️

---

### 📝 Project Description

#### The Problem
Children today are surrounded by passive entertainment — videos, games, and apps that require no imagination. Parents struggle to find interactive, creative experiences that engage their children meaningfully while developing storytelling skills and emotional intelligence.

#### The Solution
**Storylandia LIVE** is an interactive, voice-powered AI agent designed for children that co-creates personalized stories in real-time. 

The child engages in a natural voice conversation with the agent, answering playful questions to choose their hero, adventure location, and story mood. Behind the scenes, the system orchestrates multiple AI services to generate a complete multimedia story: custom text (OpenAI), unique illustration (deapi.ai - Z-Image Turbo), short animation (deapi.ai - LTX Video), and high-quality narration (ElevenLabs Voice V3).

#### Core Flow (End-to-End)
1. **Start** — Child clicks "Start Adventure" button, microphone permission granted
2. **Conversation** — ElevenLabs Conversational Agent greets child, asks 3-4 questions about hero, location, mood
3. **Tool Call** — Agent triggers `GENERATE_STORY` client tool with collected parameters
4. **Quiz Mode** — While n8n workflow generates content (~60s), agent keeps child engaged with quiz questions
5. **Generation** — n8n orchestrates: OpenAI (text) → deAPI.ai (image) → deAPI.ai (video) → ElevenLabs V3 (audio)
6. **Signal** — Frontend receives `[STORY_READY]`, displays fullscreen player with image/video toggle + audio
7. **Playback** — Child listens to narrated story, agent is muted during playback
8. **Resume** — Audio ends → `[STORY_FINISHED]` signal → Agent resumes: "Did you like it? Want another story?"
9. **Loop** — Child can create unlimited stories or replay from history gallery

#### Key Demo Moments
- Voice-to-voice natural conversation with a child
- Real-time tool calling triggering multimodal generation
- Seamless quiz engagement during background processing
- Beautiful story presentation with AI-generated visuals and narration
- Continuous conversation loop after story ends

---

#### Judging Criteria

| Criterion | How We Address It |
|-----------|-------------------|
| **Working Prototype** | Fully functional live demo at [11labs-hackathon.vercel.app](https://11labs-hackathon.vercel.app). End-to-end flow works: voice conversation → story generation → playback → conversation resume |
| **Technical Complexity & Integration** | Multi-service orchestration via n8n: OpenAI + deAPI.ai (image & video) + ElevenLabs V3. Client-side tool calling from Conversational Agent. Real-time state management with signals (`[STORY_READY]`, `[STORY_FINISHED]`). Audio/video sync with agent muting |
| **Innovation & Creativity** | Story co-creation where child is the author, not passive consumer. Quiz-based engagement during generation wait time. Multimodal output (text + image + video + voice) from single conversation |
| **Real-World Impact** | Supports children's imagination, creativity, and emotional development. Educational potential for language learning and storytelling skills. Accessible via any browser with microphone |
| **Theme Alignment** | Perfect demonstration of ElevenLabs Conversational Agents with tool-use APIs, voice integration, and real-time orchestration. Agent acts on user intent to create personalized content |

---

#### Technologies & Integrations

**Voice & Agent:**
- ElevenLabs Conversational Agent (voice dialogue, tool calling)
- ElevenLabs Voice V3 (story narration)
- @elevenlabs/react SDK

**AI Services:**
- OpenAI GPT-4 (story text generation)
- deAPI.ai Z-Image Turbo (illustration)
- deAPI.ai LTX Video (image-to-video animation)

**Backend & Orchestration:**
- n8n (workflow automation, webhook handling)
- Next.js API Routes (frontend-to-n8n bridge)

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

**Deployment:**
- Vercel (frontend hosting)
- n8n Cloud (workflow hosting)

---

#### Setup & Demo Steps

1. Visit [https://11labs-hackathon.vercel.app/](https://11labs-hackathon.vercel.app/)
2. Click **"Start Adventure"**
3. Allow microphone access when prompted
4. Talk to the agent — answer questions about your story preferences
5. Wait for story generation (agent will ask quiz questions)
6. Watch and listen to your personalized story
7. Continue conversation or create another story

---

###  Team Contributions

#### Dawid Wenderski
**Role:** Developer / Technical Lead

- 💼 CTO at Storylandia, Developer at GamerHash AI & deAPI.ai
- 🛠️ Tech stack expertise: C#, Flutter, Python
- 👨‍💻 **Contributions:**
  - Full technical implementation
  - Frontend development (Next.js, React, TypeScript)
  - ElevenLabs Conversational Agent integration
  - n8n workflow design for multimodal generation pipeline
  - API integrations: OpenAI, ElevenLabs, deAPI.ai
- 🤖 Extensive use of GitHub Copilot for rapid development

#### Tomasz Sabiniewicz
**Role:** Product Owner / PM

- 💼 CEO at Storylandia
- 📋 **Contributions:**
  - Project planning and vision
  - Concept development and ideation
  - User experience design
  - Documentation and descriptions
  - Video preparation and pitch
  - Submission materials

---

### 🔬 Prior Work (Before Hackathon)

The following work was done **before** the hackathon started:

- 💡 Brainstorming sessions and idea validation
- 🧪 Simple n8n workflow blocks for learning the platform
- 📐 Technological architecture outline

---

### 🔄 Signal Flow

```
User speaks → Agent collects data → GENERATE_STORY tool called
                                            │
                                            ▼
                                    n8n workflow starts
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
               OpenAI GPT            deAPI.ai Image          deAPI.ai Video
              (story text)          (illustration)           (animation)
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            │
                                            ▼
                                   ElevenLabs Voice V3
                                      (narration)
                                            │
                                            ▼
                              n8n returns all assets to frontend
                                            │
                                            ▼
                              Frontend displays story player
                              (image/video + audio narration)
                                            │
                                            ▼
                              Audio ends → [STORY_FINISHED] signal
                                            │
                                            ▼
                              Agent resumes conversation
                              "Did you like the story?"
```

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io) for the amazing Conversational Agent platform
- [deAPI.ai](https://deapi.ai) for image and video generation
- [OpenAI](https://openai.com) for story generation
- [n8n](https://n8n.io) for workflow automation

---

<div align="center">

**Made with ❤️ for the ElevenLabs Worldwide Hackathon**

🏰 *Where every child becomes a storyteller* 🏰

</div>