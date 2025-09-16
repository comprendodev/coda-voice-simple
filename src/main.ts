import './style.css'
import { WebRTCManager } from './webrtc-manager';
import { AudioVisualizer } from './audio-visualizer';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="header">
    <div class="header-content">
      <h1 class="logo">CODA</h1>
      <span class="header-subtitle">Verbal Autopsy Interview</span>
    </div>
  </header>

  <div class="main-container">
    <div class="case-info-card">
      <div class="case-header">
        <div class="case-id">Case ID: ETH002</div>
        <div id="status" class="status-badge disconnected">
          <span id="status-text">Disconnected</span>
        </div>
      </div>
      <div class="case-subject">
        <h3>Dawit Haile</h3>
        <span class="demographics">Male • 6 months • Ethiopia</span>
      </div>
      <div class="case-details">
        <span class="location-badge">Place of Death: Home - Rural Ethiopia</span>
        <span class="date-badge">Date of Death: 2024-07-15</span>
      </div>
    </div>

    <div class="case-metrics-card">
      <h4>Physical Measurements at Death</h4>
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-label">Weight</span>
          <span class="metric-value">4.2 kg</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Height</span>
          <span class="metric-value">72 cm</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">MUAC</span>
          <span class="metric-value">8.5 cm</span>
        </div>
      </div>
    </div>

    <div class="interview-card">
      <div class="card-header">
        <h2>Interview Session</h2>
      </div>

      <div class="controls-section">
        <button id="connect-btn" class="btn btn-primary">
          <span class="btn-icon">▶</span>
          Start Interview
        </button>
        <button id="disconnect-btn" class="btn btn-secondary" disabled>
          <span class="btn-icon">■</span>
          End Interview
        </button>
      </div>

      <div class="transcript-section">
        <div class="section-header">
          <h3>Transcript</h3>
          <span class="transcript-status">Ready to record</span>
        </div>
        <div id="messages" class="messages-container"></div>
      </div>

      <div class="visualizer-section">
        <canvas id="audio-visualizer"></canvas>
      </div>
    </div>

    <div class="info-card">
      <h4>Suggested Interview Questions</h4>
      <ul class="guidelines-list">
        <li>In your own words, can you briefly tell me what happened to Dawit?</li>
        <li>Can you describe how Dawit's eating habits and appetite changed in the weeks before he became ill?</li>
        <li>Did Dawit have any episodes of coughing, difficulty feeding, or breathing problems?</li>
        <li>Was Dawit ever diagnosed with or treated for any heart-related conditions, or did he have swelling in his legs or abdomen?</li>
        <li>Did you notice Dawit losing weight or becoming weaker over time?</li>
        <li>What medical care did you seek for Dawit, and what were you told about his condition?</li>
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
let audioVisualizer: AudioVisualizer | null = null;
let interviewStarted: boolean = false;

function updateStatus(text: string, className: string) {
  statusText.textContent = text;
  statusEl.className = `status-badge ${className}`;
}

function addMessage(speaker: string, text: string) {
  // Skip certain system messages after interview has started
  if (interviewStarted && speaker === 'System') {
    const skipMessages = [
      'Session created successfully',
      'Session configuration updated',
      'Microphone access granted',
      'Getting authorization token...',
      'Got ephemeral token',
      'Establishing WebRTC connection...'
    ];
    if (skipMessages.some(msg => text.includes(msg))) {
      return;
    }
  }

  const message = document.createElement('div');
  message.className = `message ${speaker.toLowerCase().replace(/\s+/g, '-')}`;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  message.innerHTML = `
    <div class="message-header">
      <strong class="message-speaker">${speaker}</strong>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-content">${text}</div>
  `;
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
      },
      onLocalStream: (stream) => {
        if (!audioVisualizer) {
          audioVisualizer = new AudioVisualizer('audio-visualizer');
        }
        audioVisualizer.connectLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        if (!audioVisualizer) {
          audioVisualizer = new AudioVisualizer('audio-visualizer');
        }
        audioVisualizer.connectRemoteStream(stream);
      }
    });

    // Connect via WebRTC
    await webrtcManager.connect(token);

    updateStatus('Connected', 'connected');
    interviewStarted = true;
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

  if (audioVisualizer) {
    audioVisualizer.dispose();
    audioVisualizer = null;
  }

  updateStatus('Disconnected', 'disconnected');
  interviewStarted = false;
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
  if (audioVisualizer) {
    audioVisualizer.dispose();
  }
});