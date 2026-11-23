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

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      // Bilingual / Indian English & Tamil support
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
      callbacks.onError('Speech recognition is not supported in this environment.');
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
          callbacks.onError('Microphone permission denied. Please allow microphone access.');
        } else {
          callbacks.onError(`Recognition issue: ${event.error}`);
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
      callbacks.onError(err?.message || 'Failed to start microphone');
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

    // Clean text of emojis or special markdown before speaking
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

    const voices = window.speechSynthesis.getVoices();

    if (gender === 'female') {
      // Maya: Female voice, cute, lively
      const femaleVoice = voices.find(
        v =>
          (v.name.includes('Female') ||
            v.name.includes('Zira') ||
            v.name.includes('Heera') ||
            v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Jenny')) &&
          (v.lang.startsWith('en') || v.lang.startsWith('ta'))
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.2;
      utterance.rate = 1.05;
    } else {
      // Vikram: Male voice, friendly, energetic
      const maleVoice = voices.find(
        v =>
          (v.name.includes('Male') ||
            v.name.includes('David') ||
            v.name.includes('Ravi') ||
            v.name.includes('Guy') ||
            v.name.includes('George')) &&
          (v.lang.startsWith('en') || v.lang.startsWith('ta'))
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.95;
      utterance.rate = 1.0;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      onStart();

      // Start reactive mouth viseme oscillation
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
    if (this.mouthAnimInterval) {
      clearInterval(this.mouthAnimInterval);
      this.mouthAnimInterval = null;
    }
    onMouthViseme(false);
    onEnd();
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.mouthAnimInterval) {
      clearInterval(this.mouthAnimInterval);
      this.mouthAnimInterval = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }
}
