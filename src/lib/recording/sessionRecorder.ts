// ─────────────────────────────────────────────────────────────
// Session Recorder
// Uses the MediaRecorder API (browser-native) to capture
// the full AR session as video + audio — no server needed.
// ─────────────────────────────────────────────────────────────

export interface RecordingChunk {
  blob: Blob;
  timestamp: number;
}

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;   // seconds
  chunks: RecordingChunk[];
}

export class SessionRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private _duration = 0;

  public onDurationChange?: (seconds: number) => void;
  public onStateChange?: (state: 'recording' | 'paused' | 'stopped') => void;

  /** Capture the entire screen + system audio */
  async startScreenRecording(): Promise<boolean> {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });

      // Also capture microphone for student questions
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        console.warn('Microphone not available for recording');
      }

      // Mix display audio + mic audio if both available
      if (micStream) {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();

        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          const displaySource = ctx.createMediaStreamSource(new MediaStream(displayAudioTracks));
          displaySource.connect(dest);
        }

        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(dest);

        this.stream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } else {
        this.stream = displayStream;
      }

      return this.initRecorder();
    } catch (err) {
      console.error('Failed to start screen recording:', err);
      return false;
    }
  }

  /** Fallback: record only the AR canvas element */
  async startCanvasRecording(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      const canvasStream = canvas.captureStream(30);
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch { /* no mic */ }

      const tracks = [...canvasStream.getVideoTracks()];
      if (micStream) tracks.push(...micStream.getAudioTracks());

      this.stream = new MediaStream(tracks);
      return this.initRecorder();
    } catch (err) {
      console.error('Canvas recording failed:', err);
      return false;
    }
  }

  private initRecorder(): boolean {
    if (!this.stream) return false;

    // Pick best supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 2_500_000,
    });

    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstart = () => {
      this.startTime = Date.now();
      this._duration = 0;
      this.durationTimer = setInterval(() => {
        this._duration = Math.floor((Date.now() - this.startTime) / 1000);
        this.onDurationChange?.(this._duration);
      }, 1000);
      this.onStateChange?.('recording');
    };

    this.mediaRecorder.onstop = () => {
      if (this.durationTimer) clearInterval(this.durationTimer);
      this.onStateChange?.('stopped');
    };

    this.mediaRecorder.start(1000); // collect chunks every second
    return true;
  }

  pause(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
      if (this.durationTimer) clearInterval(this.durationTimer);
      this.onStateChange?.('paused');
    }
  }

  resume(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
      this.durationTimer = setInterval(() => {
        this._duration = Math.floor((Date.now() - this.startTime) / 1000);
        this.onDurationChange?.(this._duration);
      }, 1000);
      this.onStateChange?.('recording');
    }
  }

  /** Stop recording and return downloadable Blob */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.durationTimer) clearInterval(this.durationTimer);
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder?.mimeType ?? 'video/webm',
        });
        this.stream?.getTracks().forEach((t) => t.stop());
        this.onStateChange?.('stopped');
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /** Download the recording as a file */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused';
  }

  get duration(): number {
    return this._duration;
  }

  /** Format duration as MM:SS */
  static formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}

export const sessionRecorder = new SessionRecorder();
