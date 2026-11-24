import { VoiceGender } from '../../shared/types';

export interface SpeechRecognitionCallbacks {
  onStart: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private mouthAnimInterval: any = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initRecognition();
    this.initVoices();
  }

  private initVoices() {
    if ('speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
    }
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN';
    }
  }

  public setLanguage(lang: 'ta-IN' | 'en-IN' | 'en-US') {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public startListening(callbacks: SpeechRecognitionCallbacks): boolean {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      callbacks.onError('Microphone not supported in this environment. You can type in the chat box! 💬');
      return false;
    }

    try {
      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStart();
      };

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }
        callbacks.onResult(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          callbacks.onError('Microphone permission needed. You can also chat smoothly by typing! 👇');
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
          callbacks.onError('Voice network service not available in this VS Code build. Please type below! 💬');
        } else if (event.error === 'no-speech') {
          // No speech detected, quietly finish
        } else {
          callbacks.onError(`Mic alert: ${event.error}. You can also type!`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      this.isListening = false;
      callbacks.onError('Voice capture issue. Please type your message in the chat box below! 👇');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
      this.isListening = false;
    }
  }

  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;

  public playAudioClip(
    audioData: string,
    onStart: () => void,
    onMouthViseme: (open: boolean) => void,
    onEnd: () => void,
    onFallback?: () => void
  ): boolean {
    try {
      this.stopSpeaking();
      const src =
        audioData.startsWith('http') ||
        audioData.startsWith('vscode-webview-resource:') ||
        audioData.startsWith('data:')
          ? audioData
          : `data:audio/mp3;base64,${audioData}`;
      const audio = new Audio(src);
      this.currentAudioElement = audio;

      audio.onplay = () => {
        this.isSpeaking = true;
        onStart();
        let mouthOpen = false;
        this.mouthAnimInterval = setInterval(() => {
          mouthOpen = !mouthOpen;
          onMouthViseme(mouthOpen);
        }, 140);
      };

      audio.onended = () => {
        this.currentAudioElement = null;
        this.cleanupSpeech(onEnd, onMouthViseme);
      };

      audio.onerror = (e) => {
        console.warn('Audio clip playback failed:', e);
        this.currentAudioElement = null;
        if (onFallback) {
          onFallback();
        } else {
          this.cleanupSpeech(onEnd, onMouthViseme);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('audio.play() rejected:', err);
          this.currentAudioElement = null;
          if (onFallback) {
            onFallback();
          } else {
            this.cleanupSpeech(onEnd, onMouthViseme);
          }
        });
      }
      return true;
    } catch (e) {
      console.warn('Failed to initialize Audio element:', e);
      if (onFallback) {
        onFallback();
      } else {
        this.cleanupSpeech(onEnd, onMouthViseme);
      }
      return false;
    }
  }

  public async playPcmAudio(
    base64Data: string,
    sampleRate = 24000,
    onStart: () => void,
    onMouthViseme: (open: boolean) => void,
    onEnd: () => void
  ): Promise<boolean> {
    try {
      this.stopSpeaking();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx({ sampleRate });
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const buffer = this.audioContext.createBuffer(1, int16.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) {
        channelData[i] = int16[i] / 32768.0;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      this.currentAudioSource = source;
      this.isSpeaking = true;
      onStart();

      let mouthOpen = false;
      this.mouthAnimInterval = setInterval(() => {
        mouthOpen = !mouthOpen;
        onMouthViseme(mouthOpen);
      }, 150);

      source.onended = () => {
        this.currentAudioSource = null;
        this.cleanupSpeech(onEnd, onMouthViseme);
      };

      source.start(0);
      return true;
    } catch (e) {
      console.warn('PCM audio playback failed, falling back to local speech:', e);
      this.cleanupSpeech(onEnd, onMouthViseme);
      return false;
    }
  }

  public speak(
    text: string,
    gender: VoiceGender,
    onStart: () => void,
    onMouthViseme: (open: boolean) => void,
    onEnd: () => void
  ) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available');
      onEnd();
      return;
    }

    this.stopSpeaking();

    // Clean text of emojis or special markdown symbols before speaking
    const cleanSpeechText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[#*`_~]/g, '')
      .trim();

    if (!cleanSpeechText) {
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    this.currentUtterance = utterance;

    // Prevent Electron Garbage Collection from prematurely stopping speech
    (window as any).__aiBuddyUtterance = utterance;

    const availableVoices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();

    // Search for Indian English or Tamil voices first
    const indianVoice = availableVoices.find(
      v =>
        v.lang === 'ta-IN' ||
        v.lang === 'en-IN' ||
        v.name.includes('India') ||
        v.name.includes('Ravi') ||
        v.name.includes('Heera') ||
        v.name.includes('Kalpana') ||
        v.name.includes('Valluvar')
    );

    // Set natural human pitch with zero robotic/metallic helium distortion
    utterance.pitch = 1.0;
    utterance.rate = 1.05;

    if (indianVoice) {
      utterance.voice = indianVoice;
    } else {
      const naturalVoice = availableVoices.find(
        v =>
          (v.name.includes('Natural') ||
            v.name.includes('Neural') ||
            v.name.includes('Online') ||
            v.name.includes('Google')) &&
          (v.lang.startsWith('en') || v.lang.startsWith('ta'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      onStart();

      let mouthOpen = false;
      this.mouthAnimInterval = setInterval(() => {
        mouthOpen = !mouthOpen;
        onMouthViseme(mouthOpen);
      }, 160);
    };

    utterance.onend = () => {
      this.cleanupSpeech(onEnd, onMouthViseme);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      this.cleanupSpeech(onEnd, onMouthViseme);
    };

    window.speechSynthesis.speak(utterance);
  }

  private cleanupSpeech(onEnd: () => void, onMouthViseme: (open: boolean) => void) {
    this.isSpeaking = false;
    this.currentUtterance = null;
    (window as any).__aiBuddyUtterance = null;
    if (this.mouthAnimInterval) {
      clearInterval(this.mouthAnimInterval);
      this.mouthAnimInterval = null;
    }
    onMouthViseme(false);
    onEnd();
  }

  public stopSpeaking() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {}
      this.currentAudioSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.mouthAnimInterval) {
      clearInterval(this.mouthAnimInterval);
      this.mouthAnimInterval = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    (window as any).__aiBuddyUtterance = null;
  }
}
