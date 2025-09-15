# CODA Voice Interview - WebRTC Implementation

A native WebRTC implementation for OpenAI Realtime API voice interviews, following the official WebRTC documentation.

## Architecture

This implementation uses native WebRTC APIs for real-time voice communication:
- **WebRTC Peer Connection** for audio streaming
- **Data Channel** for bidirectional event communication
- **Ephemeral tokens** for secure client-side authentication
- **SDP exchange** with OpenAI's Realtime API

## Quick Start

### 1. Set up environment

Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=sk-proj-...
```

### 2. Start the backend (for token generation):

```bash
# Install Python dependencies
pip install fastapi uvicorn httpx python-dotenv

# Run the backend
python backend.py
```

The backend server will run on http://localhost:8001

### 3. Start the frontend:

```bash
# Install dependencies
npm install

# Run the dev server
npm run dev
```

The frontend will be available at http://localhost:5173

### 4. Use the application

1. Open http://localhost:5173 in your browser
2. Click "Start Interview"
3. Allow microphone access when prompted
4. Speak your questions naturally
5. The AI persona (Mariam) will respond verbally

## How It Works

1. **Token Generation**: Backend generates ephemeral tokens using your OpenAI API key
2. **WebRTC Setup**: Frontend creates RTCPeerConnection with audio tracks
3. **SDP Exchange**: Offer/Answer negotiation with OpenAI's servers
4. **Data Channel**: Bidirectional event communication for transcripts and control
5. **Audio Streaming**: Real-time audio via WebRTC media streams

## Key Components

### Backend (`backend.py`)
- FastAPI server for ephemeral token generation
- Configures session with persona instructions
- CORS enabled for local development

### WebRTC Manager (`src/webrtc-manager.ts`)
- Handles RTCPeerConnection lifecycle
- Manages data channel for events
- Audio stream setup and teardown
- Event processing and message handling

### Frontend (`src/main.ts`)
- UI management and user interactions
- WebRTC manager integration
- Microphone permission handling
- Connection state management

## WebRTC Implementation Details

The implementation follows OpenAI's WebRTC specification:

1. **Peer Connection**: Standard RTCPeerConnection for media transport
2. **Audio Track**: Local microphone added via getUserMedia
3. **Data Channel**: Named "oai-events" for Realtime API events
4. **SDP Protocol**: Direct SDP exchange with OpenAI's endpoints

## Events Handled

- `session.created` - Connection established
- `conversation.item.created` - User/assistant messages
- `response.audio_transcript.done` - Complete transcripts
- `error` - Error handling

## Requirements

- Node.js 20+
- Python 3.8+
- Modern browser with WebRTC support
- OpenAI API key with Realtime access

## Troubleshooting

- **Microphone Access**: Ensure browser has microphone permissions
- **CORS Issues**: Backend must be running on port 8001
- **Token Errors**: Check your OpenAI API key in `.env`
- **Connection Issues**: Verify WebRTC is supported in your browser

## Keyboard Shortcuts

- `Escape` - Quick disconnect during active session