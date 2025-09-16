export interface WebRTCConfig {
  onStatusChange: (status: string, type: string) => void;
  onMessage: (speaker: string, text: string) => void;
  onError: (error: string) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private config: WebRTCConfig;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  async connect(ephemeralKey: string): Promise<void> {

    // Create peer connection
    this.pc = new RTCPeerConnection();

    // Set up audio element for remote audio playback
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;

    // Handle incoming audio from the model
    this.pc.ontrack = (e) => {
      if (this.audioElement) {
        this.audioElement.srcObject = e.streams[0];
        this.remoteStream = e.streams[0];
        if (this.config.onRemoteStream) {
          this.config.onRemoteStream(e.streams[0]);
        }
      }
    };

    // Add local audio track for microphone input
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream = stream;
      const audioTrack = stream.getTracks()[0];
      this.pc.addTrack(audioTrack);
      if (this.config.onLocalStream) {
        this.config.onLocalStream(stream);
      }
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error}`);
    }

    // Set up data channel for sending and receiving events
    this.dc = this.pc.createDataChannel("oai-events");

    // Handle data channel events
    this.dc.onopen = () => {
      console.log("Data channel opened");
      this.sendInitialConfiguration();
    };

    this.dc.onmessage = (event) => {
      this.handleServerEvent(JSON.parse(event.data));
    };

    this.dc.onerror = (error) => {
      console.error("Data channel error:", error);
      this.config.onError(`Data channel error: ${error}`);
    };

    // Create and send offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Send SDP to OpenAI
    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = "gpt-realtime";

    const response = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
    }

    const answerSdp = await response.text();
    const answer = {
      type: "answer" as RTCSdpType,
      sdp: answerSdp,
    };

    await this.pc.setRemoteDescription(answer);
  }

  private sendInitialConfiguration(): void {
    // The session is already configured via the ephemeral token
    // No need to send session.update as it's already set up in backend
    console.log("Data channel ready for communication");

    // Optionally send a response.create to start the conversation
    // this.sendEvent({ type: "response.create" });
  }

  private handleServerEvent(event: any): void {
    console.log("Server event:", event);

    switch (event.type) {
      case "session.created":
        this.config.onMessage("System", "Session created successfully");
        break;

      case "session.updated":
        this.config.onMessage("System", "Session configuration updated");
        break;

      case "conversation.item.created":
        if (event.item?.role === "user" && event.item?.formatted?.transcript) {
          this.config.onMessage("Interviewer", event.item.formatted.transcript);
        } else if (event.item?.role === "assistant" && event.item?.formatted?.transcript) {
          this.config.onMessage("Mariam", event.item.formatted.transcript);
        }
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.config.onMessage("Interviewer", event.transcript);
        }
        break;

      case "response.audio_transcript.delta":
        // Log transcript deltas for debugging
        if (event.delta) {
          console.log("Transcript delta:", event.delta);
        }
        break;

      case "response.audio_transcript.done":
        // Final transcript
        console.log("Mariam finished speaking");
        if (event.transcript) {
          this.config.onMessage("Mariam", event.transcript);
        }
        break;

      case "input_audio_buffer.speech_started":
        // User started speaking - just log it
        console.log("Interviewer speaking");
        break;

      case "input_audio_buffer.speech_stopped":
        // User stopped speaking - just log it
        console.log("Interviewer stopped speaking");
        break;

      case "error":
        this.config.onError(`Server error: ${event.error?.message || "Unknown error"}`);
        break;

      default:
        // Log unhandled events for debugging
        if (event.type && !event.type.startsWith("response.content_part")) {
          console.log(`Unhandled event: ${event.type}`, event);
        }
    }
  }

  sendEvent(event: any): void {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(event));
      console.log("Sent event:", event);
    } else {
      console.error("Data channel not open, cannot send event");
    }
  }

  sendTextMessage(text: string): void {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text
          }
        ]
      }
    };

    this.sendEvent(event);

    // Also trigger a response
    this.sendEvent({ type: "response.create" });
  }

  disconnect(): void {
    if (this.pc) {
      // Close all tracks
      this.pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      this.pc.close();
      this.pc = null;
    }

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
  }

  isConnected(): boolean {
    return this.pc !== null && this.pc.connectionState === "connected";
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}