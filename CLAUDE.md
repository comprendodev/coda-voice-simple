# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebRTC implementation for conducting verbal autopsy interviews using OpenAI's Realtime API. The application consists of a TypeScript/Vite frontend and a Python FastAPI backend for secure token generation.

## Development Commands

```bash
# Frontend development
npm install          # Install dependencies
npm run dev          # Start development server on http://localhost:5173
npm run build        # Build for production (runs TypeScript check first)
npm run preview      # Preview production build

# Backend development (for token generation)
pip install fastapi uvicorn httpx python-dotenv  # Install Python dependencies
python backend.py    # Start backend server on http://localhost:8001
```

## Architecture

### Key Components

1. **Frontend WebRTC Manager** (`src/webrtc-manager.ts`): Handles all WebRTC operations
   - Creates and manages RTCPeerConnection
   - Manages data channel "oai-events" for bidirectional communication
   - Handles SDP offer/answer exchange with OpenAI
   - Processes incoming audio streams and server events

2. **Main Application** (`src/main.ts`): UI orchestration
   - Manages interview session lifecycle
   - Handles microphone permissions
   - Displays transcript and status updates
   - Coordinates with WebRTC manager

3. **Backend Token Service** (`backend.py`): Security layer
   - Generates ephemeral tokens via OpenAI's `/v1/realtime/client_secrets` endpoint
   - Configures session with Mariam persona instructions
   - Handles CORS for local development

### WebRTC Flow

1. Frontend requests ephemeral token from backend
2. Backend generates token with preconfigured session (persona, voice)
3. Frontend creates RTCPeerConnection and data channel
4. SDP offer sent to OpenAI's `/v1/realtime/calls` endpoint
5. Answer SDP establishes WebRTC connection
6. Audio streams bidirectionally via WebRTC
7. Events flow through data channel

### Key Server Events Handled

- `session.created`: Connection established
- `conversation.item.created`: User/assistant messages
- `response.audio_transcript.done`: Complete assistant responses
- `error`: Error handling

## Environment Setup

Required `.env` file:
```
OPENAI_API_KEY=sk-proj-...
```

## TypeScript Configuration

Strict mode enabled with ES2022 target. Uses Vite's bundler resolution with no emit for type checking only.

## Important Notes

- The backend must run on port 8001 for CORS to work correctly
- Frontend expects backend at `http://localhost:8001/api/token`
- Microphone permissions are requested before establishing connection
- Escape key provides quick disconnect during active sessions
- No test framework currently configured
- No linting tools configured beyond TypeScript strict mode