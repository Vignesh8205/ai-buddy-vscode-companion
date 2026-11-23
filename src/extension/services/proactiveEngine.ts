import * as vscode from 'vscode';
import { CharacterState, ProactiveEventType, ProactiveFrequency, ProjectSummary, VoiceGender } from '../../shared/types';
import { PersonalityEngine } from './personalityEngine';
import { GeminiService } from './geminiService';
import { ContextEngine } from './contextEngine';

export interface ProactiveEngineCallbacks {
  onProactiveSpeech: (text: string, emotion: CharacterState, voiceGender: VoiceGender, category: string) => void;
}

export class ProactiveDecisionEngine {
  private lastProactiveTimestamp = 0;
  private codingActivityStart = Date.now();
  private lastUserActivityTime = Date.now();
  private checkIntervalTimer: any = null;
  private recentMessagesHistory = new Set<string>();

  constructor(
    private readonly personalityEngine: PersonalityEngine,
    private readonly contextEngine: ContextEngine,
    private readonly geminiService: GeminiService,
    private readonly callbacks: ProactiveEngineCallbacks
  ) {}

  public activate(): void {
    // Check periodic conditions every 45 seconds (idle check-in, coding streak)
    this.checkIntervalTimer = setInterval(() => {
      this.evaluatePeriodicTriggers();
    }, 45000);
  }

  public recordUserActivity(): void {
    this.lastUserActivityTime = Date.now();
  }

  public async evaluateEvent(eventType: ProactiveEventType): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('aiBuddy');
    const frequency = config.get<ProactiveFrequency>('conversationFrequency', 'medium');
    const quietMode = config.get<boolean>('quietMode', false);
    const voiceGender = config.get<VoiceGender>('voiceGender', 'female');

    if (frequency === 'off') {
      return false;
    }

    const cooldownMs = this.getCooldownDuration(frequency);
    const now = Date.now();
    const timeSinceLast = now - this.lastProactiveTimestamp;

    // High priority events (TEST_PASSED, BUG_FIXED) can bypass 50% of the normal cooldown
    const isHighPriority = eventType === 'TEST_PASSED' || eventType === 'BUG_FIXED';
    const effectiveCooldown = isHighPriority ? cooldownMs * 0.4 : cooldownMs;

    if (timeSinceLast < effectiveCooldown) {
      return false; // Still in cooldown period
    }

    const summary = this.contextEngine.getCurrentSummary() || (await this.contextEngine.analyzeWorkspace());

    const message = await this.personalityEngine.generateProactiveMessage(
      eventType,
      voiceGender,
      summary,
      this.geminiService
    );

    // Prevent duplicate consecutive utterances
    const normalized = message.text.toLowerCase().trim();
    if (this.recentMessagesHistory.has(normalized)) {
      return false;
    }

    this.recentMessagesHistory.add(normalized);
    if (this.recentMessagesHistory.size > 20) {
      this.recentMessagesHistory.clear();
    }

    this.lastProactiveTimestamp = now;

    // Dispatch to callbacks
    this.callbacks.onProactiveSpeech(message.text, message.emotion, voiceGender, eventType);
    return true;
  }

  private async evaluatePeriodicTriggers(): Promise<void> {
    const now = Date.now();
    const idleDuration = now - this.lastUserActivityTime;
    const codingDuration = now - this.codingActivityStart;

    // 1. Long continuous coding burst (25+ minutes of activity)
    if (codingDuration > 25 * 60 * 1000 && idleDuration < 2 * 60 * 1000) {
      const triggered = await this.evaluateEvent('LONG_CODING_BURST');
      if (triggered) {
        this.codingActivityStart = now; // Reset coding burst timer
      }
      return;
    }

    // 2. Idle check-in (idle between 6 and 12 minutes)
    if (idleDuration > 6 * 60 * 1000 && idleDuration < 12 * 60 * 1000) {
      await this.evaluateEvent('IDLE_CHECKIN');
    }
  }

  public getCooldownDuration(frequency: ProactiveFrequency): number {
    switch (frequency) {
      case 'high':
        return 120000; // 2 minutes
      case 'low':
        return 480000; // 8 minutes
      case 'off':
        return Infinity;
      case 'medium':
      default:
        return 240000; // 4 minutes
    }
  }

  public dispose(): void {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }
}
