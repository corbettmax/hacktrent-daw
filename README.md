# HackTrent DAW - Digital Audio Workstation

A web-based Digital Audio Workstation with drum machine, wave editor, and AI-powered sound generation.

## Features

### 🥁 Drum Machine
- 16-step sequencer with 4 tracks
- Built-in drum samples (kick, snare, hi-hat, clap)
- Adjustable tempo (40-220 BPM)
- Save and load patterns
- Real-time playback

### 🎵 Wave Editor
- Waveform synthesis (sine, square, sawtooth, triangle, noise)
- ADSR envelope control
- Virtual keyboard for real-time playing
- **AI-powered parameter generation** with Google Gemini
- Save and load custom presets
- Visual waveform display

### 🤖 AI Features
- Natural language sound generation
- Context-aware parameter suggestions
- Intelligent fallback system

## Quick Start

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- Google Cloud account (for deployment)
- Google Gemini API key (for AI features)

### Local Development

1. **Start Backend:**
```bash
cd backend
pip install -r requirements.txt
export GOOGLE_API_KEY="your-gemeni_key"  # Optional
python server.py
```

2. **Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

3. **Open Browser:**
Navigate to `http://localhost:5173`

### Cloud Deployment

See [QUICK_SETUP.md](./QUICK_SETUP.md) for complete deployment instructions.

**TL;DR:**
```bash
# Setup Secret Manager for API key
echo -n "YOUR_API_KEY" | gcloud secrets create gemeni_key --data-file=-

# Deploy
git push origin main
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React/Vite)          │
│  - Drum Machine UI                     │
│  - Wave Editor UI                      │
│  - Virtual Keyboard                    │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│        Backend (Python/Flask)          │
│  - Pattern storage endpoints           │
│  - AI parameter generation             │
│  - Google Gemini integration           │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐  ┌──────▼──────────┐
│   Secret   │  │  Google Gemini  │
│  Manager   │  │      API        │
└────────────┘  └─────────────────┘
```

## Project Structure

```
hacktrent-daw/
├── frontend/              # React/TypeScript frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Main pages
│   │   ├── lib/          # Audio engines
│   │   └── hooks/        # React hooks
│   └── package.json
├── backend/              # Python/Flask backend
│   ├── server.py        # Main server
│   ├── requirements.txt # Python dependencies
│   └── AI_SETUP.md      # AI configuration guide
├── Dockerfile           # Multi-stage Docker build
├── cloudbuild.yaml      # Cloud Build configuration
├── QUICK_SETUP.md       # Quick deployment guide
└── SECRET_MANAGER_SETUP.md  # Detailed Secret Manager guide
```

## API Endpoints

### Pattern Management
- `GET /pattern/<user>/<name>` - Load pattern
- `POST /pattern/<user>/<name>` - Save pattern
- `GET /tempo/<user>` - Get tempo
- `POST /tempo/<user>` - Set tempo
- `GET /defaultPattern` - Get default pattern

### AI Generation
- `POST /api/generate-synth-params` - Generate synth parameters
  ```json
  Request: { "prompt": "warm analog bass" }
  Response: {
    "waveform": "sine",
    "frequency": 60,
    "duration": 1.0,
    "amplitude": 0.8,
    "envelope": {
      "attack": 0.001,
      "decay": 0.2,
      "sustain": 0.3,
      "release": 0.8
    }
  }
  ```

## AI Prompt Examples

- "deep bass kick"
- "bright synth lead"
- "ambient pad"
- "snappy percussion"
- "warm analog bass"
- "aggressive sawtooth lead"
- "soft plucked string"

## Configuration

### Environment Variables

- `GOOGLE_API_KEY` - Google Gemini API key (optional, falls back to rule-based generation)
- `PORT` - Server port (default: 8080)

### Secret Manager (Production)

Store sensitive keys in Google Secret Manager:
```bash
gcloud secrets create gemeni_key --data-file=-
```

See [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md) for details.

## Development

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **Audio**: Web Audio API

### Backend Stack
- **Framework**: Flask 3.0
- **AI**: Google Gemini (generative-ai)
- **Deployment**: Docker + Cloud Run

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md) for deployment help
- Review [AI_SETUP.md](./backend/AI_SETUP.md) for AI configuration

## Acknowledgments

- Google Gemini for AI-powered sound generation
- Web Audio API for synthesis capabilities
- shadcn/ui for component library
