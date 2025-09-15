import './style.css'
import { WebRTCManager } from './webrtc-manager';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <h1>🎙️ CODA Voice Interview</h1>
    <p class="subtitle">Verbal Autopsy Interview - WebRTC Implementation</p>

    <div id="status" class="status disconnected">
      <span class="status-dot"></span>
      <span id="status-text">Disconnected</span>
    </div>

    <div class="controls">
      <button id="connect-btn" class="btn btn-primary">
        Start Interview
      </button>
      <button id="disconnect-btn" class="btn btn-danger" disabled>
        End Interview
      </button>
    </div>

    <div class="transcript">
      <h3>Interview Transcript</h3>
      <div id="messages"></div>
    </div>

    <div class="info">
      <h4>Sample Questions:</h4>
      <ul>
        <li>"Can you tell me what happened?"</li>
        <li>"When did the illness begin?"</li>
        <li>"What symptoms did you notice?"</li>
        <li>"Did you seek medical help?"</li>
      </ul>
    </div>
  </div>
`

// UI Elements
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const messagesEl = document.getElementById('messages') as HTMLDivElement;

// WebRTC Manager instance
let webrtcManager: WebRTCManager | null = null;

function updateStatus(text: string, className: string) {
  statusText.textContent = text;
  statusEl.className = `status ${className}`;
}

function addMessage(speaker: string, text: string) {
  const message = document.createElement('div');
  message.className = `message ${speaker.toLowerCase().replace(/\s+/g, '-')}`;
  message.innerHTML = `<strong>${speaker}:</strong> ${text}`;
  messagesEl.appendChild(message);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function startInterview() {
  try {
    updateStatus('Connecting...', 'connecting');
    addMessage('System', 'Requesting microphone access...');

    // Request microphone permission early
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      addMessage('System', 'Microphone access granted');
    } catch (error) {
      throw new Error('Microphone access denied. Please allow microphone access to continue.');
    }

    addMessage('System', 'Getting authorization token...');

    // Get ephemeral token from backend
    const response = await fetch('http://localhost:8001/api/token', {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get token');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const token = data.token;
    if (!token) {
      throw new Error('No token received from server');
    }

    addMessage('System', 'Got ephemeral token. Establishing WebRTC connection...');

    // Create WebRTC manager with callbacks
    webrtcManager = new WebRTCManager({
      onStatusChange: updateStatus,
      onMessage: addMessage,
      onError: (error) => {
        console.error('WebRTC error:', error);
        addMessage('System', `Error: ${error}`);
        updateStatus('Error', 'error');
      }
    });

    // Connect via WebRTC
    await webrtcManager.connect(token);

    updateStatus('Connected', 'connected');
    addMessage('System', 'Interview ready. Please speak your questions.');

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;

  } catch (error) {
    console.error('Failed to start interview:', error);
    updateStatus('Error', 'error');
    addMessage('System', `Failed to connect: ${error}`);

    // Re-enable connect button on error
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }
}

function endInterview() {
  if (webrtcManager) {
    webrtcManager.disconnect();
    webrtcManager = null;
  }

  updateStatus('Disconnected', 'disconnected');
  addMessage('System', 'Interview ended.');

  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
}

// Event listeners
connectBtn.addEventListener('click', startInterview);
disconnectBtn.addEventListener('click', endInterview);

// Add keyboard shortcut for quick disconnect (Escape key)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && webrtcManager && webrtcManager.isConnected()) {
    endInterview();
  }
});

// Add initial message
addMessage('System', 'Click "Start Interview" to begin.');

// Handle page unload to clean up connections
window.addEventListener('beforeunload', () => {
  if (webrtcManager) {
    webrtcManager.disconnect();
  }
});