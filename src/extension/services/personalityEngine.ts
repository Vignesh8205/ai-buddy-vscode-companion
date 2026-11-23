import { CharacterState, ProactiveEventType, ProjectSummary, VoiceGender } from '../../shared/types';
import { GeminiService } from './geminiService';

export class PersonalityEngine {
  private usedJokeIndices = new Set<number>();

  private readonly curatedJokes = [
    {
      text: 'Why do programmers prefer dark mode? Because light attracts bugs da! 😂 Semma logic la?',
      emotion: 'laughing' as CharacterState,
    },
    {
      text: 'Oru developer tea shop ponaan: "Oru tea kudunga, but async-ah kudunga, wait panna mudiyaadhu!" 😂',
      emotion: 'laughing' as CharacterState,
    },
    {
      text: 'Hardware na thaan thitta mudiyum, software na thaan adikka mudiyum! Namma code eppavume mass! 🔥',
      emotion: 'happy' as CharacterState,
    },
    {
      text: 'Real programmer eppavume code comment panna maataan: "Ezhudhum bodhu enakum kadavulukum therinjidhu, ippo kadavulukku mattum thaan theriyum!" 😂',
      emotion: 'laughing' as CharacterState,
    },
    {
      text: 'There are 10 types of people in the world: binary purinjavan, puriyadhavan! 😉',
      emotion: 'happy' as CharacterState,
    },
    {
      text: 'CSS center align panradhukulla oru yugame mudinjidum pola! Flexbox use panriya illa Grid ah? 😂',
      emotion: 'laughing' as CharacterState,
    },
    {
      text: 'Git commit message: "fixed minor bug" -> 50 files changed! Enna bro idhu? 😂',
      emotion: 'laughing' as CharacterState,
    },
  ];

  public getRandomJoke(): { text: string; emotion: CharacterState } {
    if (this.usedJokeIndices.size >= this.curatedJokes.length) {
      this.usedJokeIndices.clear();
    }

    let idx = Math.floor(Math.random() * this.curatedJokes.length);
    while (this.usedJokeIndices.has(idx) && this.usedJokeIndices.size < this.curatedJokes.length) {
      idx = (idx + 1) % this.curatedJokes.length;
    }

    this.usedJokeIndices.add(idx);
    return this.curatedJokes[idx];
  }

  public async generateProactiveMessage(
    eventType: ProactiveEventType,
    gender: VoiceGender,
    summary?: ProjectSummary,
    geminiService?: GeminiService
  ): Promise<{ text: string; emotion: CharacterState }> {
    const isFemale = gender === 'female';

    // If Gemini service is available, prompt for dynamic contextual response
    if (geminiService) {
      let prompt = '';
      switch (eventType) {
        case 'BUG_FIXED':
          prompt = `The developer just fixed all errors in their project! Give a super enthusiastic 1-sentence celebration in lively Tanglish.`;
          break;
        case 'TEST_PASSED':
          prompt = `All tests in ${summary?.testFramework || 'the project'} just passed! Celebrate in 1 exciting, funny Tanglish sentence!`;
          break;
        case 'TEST_FAILED':
          prompt = `Tests just failed. Give a funny, comforting 1-sentence Tanglish reaction offering to check logs.`;
          break;
        case 'REPEATED_ERROR':
          prompt = `The developer encountered the same error again: "${summary?.diagnosticsSummary?.topErrors[0]?.message || 'error'}". Give a helpful 1-sentence Tanglish suggestion.`;
          break;
        case 'LONG_CODING_BURST':
          prompt = `The developer has been coding non-stop for 25 minutes. Ask them warmly in 1-sentence Tanglish if they want a tea/coffee break.`;
          break;
        case 'IDLE_CHECKIN':
          prompt = `The developer has been inactive for a few minutes. Check in with a friendly, witty 1-sentence Tanglish question.`;
          break;
        case 'RANDOM_JOKE':
          prompt = `Tell a short, hilarious 1-sentence programmer joke in Tanglish.`;
          break;
        default:
          prompt = `Give a friendly 1-sentence Tanglish observation about coding today.`;
      }

      try {
        const reply = await geminiService.generateReply(prompt, gender, undefined, summary);
        if (reply && reply.text) {
          return reply;
        }
      } catch (e) {
        // Fall back to local template below
      }
    }

    // High quality local fallback templates
    switch (eventType) {
      case 'BUG_FIXED':
        return {
          text: isFemale
            ? 'Finally! 😂 Bug poiduchu! Semma mass da! Super coding!'
            : 'Aha! Bug clean aagiduchu bro! Vera level debugging skills!',
          emotion: 'happy',
        };

      case 'TEST_PASSED':
        return {
          text: isFemale
            ? 'Mass! 🔥 All tests passed! Innaiku unakku party thaan!'
            : 'Super bro! Green ticks everywhere! Test ellam semma-ah pass!',
          emotion: 'happy',
        };

      case 'TEST_FAILED':
        return {
          text: isFemale
            ? 'Aiyooo! 😂 Test fail aagiduchu. Kavalai padadha, log check pannuvoma?'
            : 'Oops! Oru test miss aachu bro. Assertion check pannalama?',
          emotion: 'confused',
        };

      case 'REPEATED_ERROR':
        return {
          text: isFemale
            ? 'Hey! Same error thirumba varuthu. Type definition check pannalama?'
            : 'Bro, idhe error thirumba varudhu. Root cause paakuriya?',
          emotion: 'confused',
        };

      case 'LONG_CODING_BURST':
        return {
          text: isFemale
            ? 'Heyyy! Romba nerama non-stop ah code panra! Oru tea/coffee break edukkuriya? ☕'
            : 'Thalaiva! 25 minutes continuous coding! Konjam stretch panni coffee kudi! ☕',
          emotion: 'happy',
        };

      case 'IDLE_CHECKIN':
        return {
          text: isFemale
            ? 'Enna amaidhiya irukka? Code logic yosikriya illa Instagram reels ah? 😂'
            : 'Enna thalaiva thinking mode ah? Illa snack thedurangala? 😂',
          emotion: 'laughing',
        };

      case 'RANDOM_JOKE':
      default:
        return this.getRandomJoke();
    }
  }
}
