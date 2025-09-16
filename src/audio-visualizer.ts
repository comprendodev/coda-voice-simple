export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private remoteSource: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;
  private localDataArray: Uint8Array | null = null;
  private remoteDataArray: Uint8Array | null = null;
  private isActive: boolean = false;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;

    this.setupCanvas();
    window.addEventListener('resize', () => this.setupCanvas());
  }

  private setupCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = 120;
    }
  }

  async connectLocalStream(stream: MediaStream): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.localSource) {
      this.localSource.disconnect();
    }

    this.localSource = this.audioContext.createMediaStreamSource(stream);
    this.localAnalyser = this.audioContext.createAnalyser();
    this.localAnalyser.fftSize = 256;
    this.localAnalyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.localAnalyser.frequencyBinCount;
    this.localDataArray = new Uint8Array(bufferLength);

    this.localSource.connect(this.localAnalyser);

    if (!this.isActive) {
      this.start();
    }
  }

  connectRemoteStream(stream: MediaStream): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.remoteSource) {
      this.remoteSource.disconnect();
    }

    this.remoteSource = this.audioContext.createMediaStreamSource(stream);
    this.remoteAnalyser = this.audioContext.createAnalyser();
    this.remoteAnalyser.fftSize = 256;
    this.remoteAnalyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.remoteAnalyser.frequencyBinCount;
    this.remoteDataArray = new Uint8Array(bufferLength);

    this.remoteSource.connect(this.remoteAnalyser);

    if (!this.isActive) {
      this.start();
    }
  }

  private start(): void {
    this.isActive = true;
    this.draw();
  }

  private draw = (): void => {
    if (!this.isActive) return;

    this.animationId = requestAnimationFrame(this.draw);

    const { width, height } = this.canvas;

    this.ctx.fillStyle = 'rgba(248, 249, 250, 0.95)';
    this.ctx.fillRect(0, 0, width, height);

    const halfHeight = height / 2;

    if (this.localAnalyser && this.localDataArray) {
      this.localAnalyser.getByteFrequencyData(this.localDataArray);
      this.drawWaveform(this.localDataArray, halfHeight, 0, '#3b82f6', 'Interviewer');
    }

    if (this.remoteAnalyser && this.remoteDataArray) {
      this.remoteAnalyser.getByteFrequencyData(this.remoteDataArray);
      this.drawWaveform(this.remoteDataArray, halfHeight, halfHeight, '#8b5cf6', 'Mariam');
    }

    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, halfHeight);
    this.ctx.lineTo(width, halfHeight);
    this.ctx.stroke();
  };

  private drawWaveform(
    dataArray: Uint8Array,
    maxHeight: number,
    yOffset: number,
    color: string,
    label: string
  ): void {
    const { width } = this.canvas;
    const barWidth = width / dataArray.length * 2.5;
    let x = 0;

    const gradient = this.ctx.createLinearGradient(0, yOffset, 0, yOffset + maxHeight);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + 'cc');

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * maxHeight * 0.8;

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, yOffset + (maxHeight - barHeight) / 2, barWidth - 2, barHeight);

      x += barWidth;
    }

    const avgVolume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const isActive = avgVolume > 10;

    this.ctx.fillStyle = isActive ? color : '#9ca3af';
    this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(label, 10, yOffset + 15);

    if (isActive) {
      this.ctx.fillStyle = '#10b981';
      this.ctx.beginPath();
      this.ctx.arc(width - 20, yOffset + 12, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  stop(): void {
    this.isActive = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.localSource) {
      this.localSource.disconnect();
      this.localSource = null;
    }

    if (this.remoteSource) {
      this.remoteSource.disconnect();
      this.remoteSource = null;
    }

    if (this.localAnalyser) {
      this.localAnalyser.disconnect();
      this.localAnalyser = null;
    }

    if (this.remoteAnalyser) {
      this.remoteAnalyser.disconnect();
      this.remoteAnalyser = null;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.localDataArray = null;
    this.remoteDataArray = null;
  }
}