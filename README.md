# EduAR — Educational AR Interactive Projection Platform
> 🎓 Project 3D AI-powered characters into real classrooms, auditoriums & museums

## Quick Start (15 minutes)

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Chrome or Edge browser (for camera + voice recognition)
- HDMI projector (optional)

### Installation

```bash
# 1. Clone / open project folder
cd "AR project"

# 2. Install dependencies
npm install

# 3. Copy environment file
copy .env.local.example .env.local

# 4. Start development server
npm run dev

# 5. Open in browser
# → http://localhost:3000
```

---

## What's Built (MVP)

| Feature | Status |
|---|---|
| Landing page | ✅ |
| Teacher dashboard | ✅ |
| Character library (10 characters) | ✅ |
| Live AR session with Three.js | ✅ |
| Camera background overlay | ✅ |
| Script Q&A player | ✅ |
| Browser Text-to-Speech (TTS) | ✅ |
| Web Speech API voice input | ✅ |
| Keyword-matched auto-responses | ✅ |
| Session recording (MP4 download) | ✅ |
| Projector mode (HDMI extended display) | ✅ |
| Script editor (Q&A builder) | ✅ |

---

## 10 Pre-Built Characters

| Character | Category | Subject |
|---|---|---|
| 🧪 Albert Einstein | Scientist | Physics & Relativity |
| 🕊️ Mahatma Gandhi | Leader | History & Non-Violence |
| 🦕 T-Rex | Extinct | Prehistoric Life |
| 🦁 African Lion | Animal | Wildlife & Ecosystems |
| 🦅 Bald Eagle | Bird | Birds & Migration |
| 🔬 Marie Curie | Scientist | Chemistry & Radioactivity |
| 🚀 APJ Abdul Kalam | Leader | Science & Leadership |
| 🦣 Woolly Mammoth | Extinct | Ice Age & Evolution |
| 🎨 Leonardo da Vinci | Historical | Art, Science & Invention |
| 👑 Cleopatra | Historical | Ancient Egypt & Leadership |

---

## Classroom Setup Guide

### Basic Setup ($300 budget)
1. Laptop with Chrome or Edge
2. Webcam (720p+) or built-in camera
3. HDMI projector
4. USB speaker + microphone

### Running a Session
1. Open http://localhost:3000
2. Go to **Characters** → pick a character
3. Click **Launch AR Session**
4. Allow camera access
5. Use **Script** panel to navigate Q&A
6. Plug in HDMI → click **Projector Mode**
7. Move new window to projector → press F for fullscreen
8. Click **Record** to capture the session

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── dashboard/page.tsx       # Teacher dashboard
│   ├── characters/page.tsx      # Character library
│   ├── session/[id]/page.tsx    # Live AR session ← Main feature
│   ├── scripts/page.tsx         # Script editor
│   └── projector/[id]/page.tsx  # Projector fullscreen mode
├── components/
│   ├── ar/
│   │   ├── ARScene.tsx          # Three.js canvas + camera background
│   │   └── VoiceOverlay.tsx     # Subtitles + speak button
│   ├── session/
│   │   ├── ScriptPlayer.tsx     # Q&A navigation controls
│   │   ├── VoiceInput.tsx       # Mic input + keyword matching
│   │   └── RecordingPanel.tsx   # Session recording controls
│   └── layout/
│       └── DashboardLayout.tsx  # Sidebar navigation
├── lib/
│   ├── characters/characterData.ts  # 10 character definitions + scripts
│   ├── tts/speechEngine.ts          # Browser TTS wrapper
│   └── recording/sessionRecorder.ts # MediaRecorder module
└── stores/
    └── sessionStore.ts              # Zustand global state
```

---

## Adding 3D Models

The AR scene works with a placeholder character by default.
To add real 3D models:

1. Go to [Mixamo.com](https://mixamo.com) → pick a character
2. Download as **GLB** format
3. Place in `/public/models/<characterId>.glb`
4. Update `modelFile` in `characterData.ts` for that character

Example animation packs to download from Mixamo:
- Idle breathing
- Talking (head bob)
- Wave hello
- Point
- Bow

---

## Technology Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Next.js 14 | Free |
| 3D/AR | Three.js | Free |
| TTS | Browser SpeechSynthesis API | Free |
| STT | Web Speech API | Free |
| Recording | MediaRecorder API | Free |
| Database | localStorage / Supabase | Free tier |
| Hosting | Vercel | Free tier |
| **Total** | | **$0/month** |

---

## Deployment to Vercel (Free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts → get live URL in 2 minutes
```

---

## Future Roadmap

- [ ] Real GLTF 3D model integration (Mixamo characters)
- [ ] Rhubarb lip-sync from audio
- [ ] Supabase database for session history
- [ ] Multi-language TTS support
- [ ] More characters (Newton, Ashoka, Darwin...)
- [ ] AI mode (OpenAI GPT-4o for unlimited questions)
- [ ] Mobile student companion app

---

## License

Open source — free for educational use.
Built for schools, museums, and classrooms. 🎓
