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

  public generateFallbackConversation(
    userText: string,
    gender: VoiceGender,
    summary?: ProjectSummary
  ): { text: string; emotion: CharacterState } {
    const isFemale = gender === 'female';
    const lower = userText.toLowerCase().trim();

    // 1. Greetings
    if (/^(hi|hello|hey|vanakkam|halo|heyyy|welcome|oi)/i.test(lower)) {
      return {
        text: isFemale
          ? 'Heyyy! Super to meet you! Naan Maya, unga coding buddy! Enna project panra? Chat-la sollunga! ✨'
          : 'Vanakkam bro! Naan Vikram! Coding-la doubts, bugs, jokes ethuvaanaalum naan irukken! Eppo start pannuvom? 🚀',
        emotion: 'happy',
      };
    }

    // 2. Playwright / Testing
    if (/playwright|test|automation|cypress|jest|vitest|qa/i.test(lower)) {
      return {
        text: isFemale
          ? 'Ohh! Automation testing ah? Super! Innaiku bugs-ah catch panna poroma? All green ticks varanum! 🔥'
          : 'Playwright testing vera level bro! Test cases ezhudhiyaacha? Innaiku bugs ellaam odipoidum! 🧪',
        emotion: 'happy',
      };
    }

    // 3. Joke request
    if (/joke|comedy|sirippu|funny|laugh/i.test(lower)) {
      return this.getRandomJoke();
    }

    // 4. How are you / Status
    if (/how are you|eppadi irukka|nalama|fine/i.test(lower)) {
      return {
        text: isFemale
          ? 'Naan full energetic-ah irukken! Unga code-la zero bugs paatha innum jolly-ah iruppen! 😄'
          : 'Semma jolly-ah irukken bro! Innaiku target features ellam mudichiduvoma? 💪',
        emotion: 'happy',
      };
    }

    // 5. Who are you
    if (/who are you|yaar nee|un per|your name|intro/i.test(lower)) {
      return {
        text: isFemale
          ? 'Naan Maya! Unga cute & energetic VS Code pair programmer! Jokes solluven, bugs track pannuven, jolly-ah pesuven! 💖'
          : 'Naan Vikram! Unga witty coding companion! Workspace analyze panni helpful-ah pesuven! 🤝',
        emotion: 'happy',
      };
    }

    // 6. Bug / Error / Help
    if (/error|bug|help|issue|fail|problem|stuck|fix/i.test(lower)) {
      if (summary && summary.diagnosticsSummary.errorCount > 0) {
        const top = summary.diagnosticsSummary.topErrors[0];
        return {
          text: `Aiyooo! ${top.file}:${top.line}-la "${top.message.slice(0, 70)}" error irukku. Type definition check pannalama? 🤔`,
          emotion: 'confused',
        };
      }
      return {
        text: isFemale
          ? 'Kavalai padadha! Bug enga irukku nu paapom! Code explain pannu, namma sernthu fix pannuvom! 🐞'
          : 'Don\'t worry bro! Bug fix panradhu namma velai! Code snippet sollu, solution kandupidikkalam! 🛠️',
        emotion: 'thinking',
      };
    }

    // 7. Project questions
    if (/project|workspace|stack|tech|repo/i.test(lower)) {
      const proj = summary?.projectName || 'Active Workspace';
      const lang = summary?.primaryLanguage || 'Code';
      const test = summary?.testFramework ? `, Testing: ${summary.testFramework}` : '';
      return {
        text: isFemale
          ? `Namma current project: ${proj} (${lang}${test})! Mass-ah develop panrom! 🔥`
          : `Project ${proj} semma setup bro! ${lang} use panrom, coding super-ah poguthu! 🚀`,
        emotion: 'happy',
      };
    }

    // 8. General conversational response with gentle API Key reminder
    return {
      text: isFemale
        ? `Super da! "${userText}" kettu yosikren! Nalla point! (💡 Tip: Settings icon click panni free Gemini API Key potta, deep AI reasoning kedaikkum!) ✨`
        : `Got it bro! "${userText}" semma! Namma work semma speed-ah poguthu! (💡 Tip: Add Gemini API Key in Settings for unlimited AI coding brain!) 🚀`,
      emotion: 'speaking',
    };
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
