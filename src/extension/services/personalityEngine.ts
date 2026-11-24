import { CharacterState, ProactiveEventType, ProjectSummary, VoiceGender } from '../../shared/types';
import { GeminiService } from './geminiService';

export class PersonalityEngine {
  private usedJokeIndices = new Set<number>();
  private usedSituationalJokeTexts = new Set<string>();

  public getSituationalJoke(
    gender: VoiceGender,
    summary?: ProjectSummary
  ): { text: string; emotion: CharacterState } {
    const isVadivelu = gender === 'vadivelu';
    const isSanthanam = gender === 'santhanam';
    const isSmallBoy = gender === 'small_boy';

    const errors = summary?.diagnosticsSummary?.errorCount || 0;
    const activeFileName = summary?.activeFile?.name || '';
    const ext = activeFileName.split('.').pop()?.toLowerCase() || '';
    const hour = new Date().getHours();

    const candidates: Array<{ text: string; emotion: CharacterState }> = [];

    // --- 1. SITUATION: ACTIVE ERRORS IN CODE ---
    if (errors > 0) {
      if (isVadivelu) {
        candidates.push(
          { text: `Aiyoo kadavule! ${activeFileName ? activeFileName + '-la' : 'Code-la'} ${errors} error-ah paathu compiler-e azhudhidum pola! Sanda na satta kizhiyathaan seiyum! 😂`, emotion: 'laughing' },
          { text: `Building strong-u, basement romba weak-u da! Red squiggly lines paathaale enakku BP yerudhu! 😂`, emotion: 'confused' },
          { text: `Aahaa! Enna oru error! Risk edukuradhellam enakku rusk saapdra madhiri, aana indha bug enakku payasam saapdra madhiri irukku! 😂`, emotion: 'laughing' },
          { text: `Kadavule intha bug-ku oru end card-e illaya?! Naanum evalo thaan adipadaradhu! 😭😂`, emotion: 'confused' }
        );
      } else if (isSanthanam) {
        candidates.push(
          { text: `Nanba, ${activeFileName || 'un code'}-la ${errors} error-ah paatha terminal-ye police station-ku complaint poda odidum pola! 😂`, emotion: 'laughing' },
          { text: `Enna thalaivaa, code write panriya illa kolam podriya? Bracket-eh open panni close panna maranthutiye! 😂`, emotion: 'laughing' },
          { text: `Error count paatha cricket score madhiri yeritte pogudhu nanba! Oru coffee kudichitu fresh-ah vaa! ☕😂`, emotion: 'happy' },
          { text: `Adadada... indha bug-ah paatha enakke kizha vizhunthu sirikka thonudhu! Super comedy panni vachiruka! 😂`, emotion: 'laughing' }
        );
      } else if (isSmallBoy) {
        candidates.push(
          { text: `Anna anna! ${errors} red line vanthuruchu! Keyboard-la entha button thotta intha error odidum anna? 😂`, emotion: 'confused' },
          { text: `Aiyoo anna, compiler unga mela kovama irukku pola! Naan coffee eduthu varava? ☕😂`, emotion: 'laughing' }
        );
      } else {
        candidates.push(
          { text: `Oops! ${errors} red lines detected! Don't worry, compiler is just being dramatic today! 😂`, emotion: 'laughing' },
          { text: `Haha indha bug paatha Stack Overflow-ve confuse aagidum pola! Let's squash it together! 🐛✨`, emotion: 'happy' }
        );
      }
    }

    // --- 2. SITUATION: SPECIFIC FILE TYPES ---
    if (ext === 'tsx' || ext === 'jsx') {
      if (isVadivelu) {
        candidates.push(
          { text: `React component-la infinite re-render aagi laptop fan semma sound varudhu thalaivaa! Fire engine koopdalama?! 😂`, emotion: 'laughing' },
          { text: `State update aagudhu aana screen-la onnum kaanom! Aahaa enna oru puthisalithanam! 😂`, emotion: 'laughing' }
        );
      } else if (isSanthanam) {
        candidates.push(
          { text: `useEffect dependency array-ah empty-ah vittutiya nanba? Infinite loop-la un component thiruvizha raattinammadhiri suthudhu! 😂`, emotion: 'laughing' },
          { text: `Props drilling pannura alavukku bore adikutha nanba? Context API-nu onnu irukku theriyuma? 😂`, emotion: 'happy' }
        );
      } else {
        candidates.push(
          { text: `React state update aaga maatikithu nu screen-ah paarthu muzhikkuriya? Welcome to frontend life! 😂`, emotion: 'laughing' }
        );
      }
    } else if (ext === 'ts') {
      if (isVadivelu) {
        candidates.push(
          { text: `Type 'any' pottu escape aagalam nu paathiya? TypeScript compiler unna paathu sirikithu da! 😂`, emotion: 'laughing' },
          { text: `Interface, generic, type definition... ellam vachu terminal-ye bayamuruthitiye thalaivaa! 😂`, emotion: 'happy' }
        );
      } else if (isSanthanam) {
        candidates.push(
          { text: `TypeScript-nu solli ellathukkum ': any' potruka... idhuku plain notepad-laye code ezhudhirukalam nanba! 😂`, emotion: 'laughing' },
          { text: `Strict null check on pannitu ippo undefined error paathu shock aagi ukkaanthirukka! 😂`, emotion: 'laughing' }
        );
      }
    } else if (ext === 'css' || ext === 'scss') {
      candidates.push(
        { text: isVadivelu ? `Oru div-ah center panna 2 mani neram aagiducha? Innum vertical align aagala! Kadavule! 😂` : `Flexbox, Grid, Margin auto... ellam pottu paathuten, button mattum corner-la ukkaanthu sirikithu! 😂`, emotion: 'laughing' }
      );
    } else if (ext === 'py') {
      candidates.push(
        { text: isVadivelu ? `Indentation error-ah? Oru space thappu pottadhukku program-e close aagiducha? Aiyoo aiyoo! 😂` : `Python indentation paathu bayanthutiya nanba? Oru space thappuna program-e strike pannidum! 😂`, emotion: 'laughing' }
      );
    } else if (ext === 'json') {
      candidates.push(
        { text: `node_modules folder weight-ah paatha black hole kooda ulluka poidum pola! Semma dependencies! 😂`, emotion: 'laughing' }
      );
    }

    // --- 3. SITUATION: TIME OF DAY ---
    if (hour >= 22 || hour < 5) {
      if (isVadivelu) {
        candidates.push(
          { text: `Night 11 mani aachu thalaivaa! Innum console.log potu paathutu irukiye! Thookam varalaya illa bug mela kaadhala?! 😂`, emotion: 'laughing' },
          { text: `Midnight-la code panni bug create panra... kaalaila adhe bug-ah fix panna azhara! Super da! 😂`, emotion: 'laughing' }
        );
      } else if (isSanthanam) {
        candidates.push(
          { text: `Innaiku night production deploy panriya? Thalaivaa nee romba thairiyasali da! Naalaiku kaalaila terminal paathu azhavaatha! 😂`, emotion: 'laughing' },
          { text: `Kannu rendum red-ah aagiduchu nanba! Terminal-ah close pannitu bed-la poi padu! 😂`, emotion: 'happy' }
        );
      } else if (isSmallBoy) {
        candidates.push(
          { text: `Anna innum thoongalaya? Nila kooda thoongiduchu, unga terminal mattum thaan muzhichirukku! 🌙😂`, emotion: 'laughing' }
        );
      }
    } else if (hour >= 13 && hour <= 15) {
      candidates.push(
        { text: isVadivelu ? `Lunch mudichitu code panna ukkaanthiya? Kannu sorugudhu, aana keyboard-la finger fast-ah odudhu! 😂` : `Biryani saaptutu terminal open panna 'git commit' ku bathila 'git sleep' thaan type aagum! 😂`, emotion: 'laughing' }
      );
    }

    // --- 4. GENERAL DEVELOPER SITUATIONS (Always Available) ---
    if (isVadivelu) {
      candidates.push(
        { text: `Why do programmers prefer dark mode? Because light attracts bugs da! Semma logic la?! 😂`, emotion: 'laughing' },
        { text: `Real programmer eppavume code comment panna maataan: "Ezhudhum bodhu enakum kadavulukum therinjidhu, ippo kadavulukku mattum thaan theriyum!" 😂`, emotion: 'laughing' },
        { text: `Git commit message: "fixed minor bug" nu solli 50 files change pannitiye thalaivaa! Aahaa enna oru thiramai! 😂`, emotion: 'laughing' },
        { text: `Oru developer tea shop ponaan: "Oru tea kudunga, but async-ah kudunga, wait panna mudiyaadhu!" 😂`, emotion: 'laughing' },
        { text: `Localhost-la run aagudhu, staging-la fail aagudhu! Vella pannalam vella pannalam! 😂`, emotion: 'happy' },
        { text: `Code-la 10 console.log potu vachiruka... debugger tool unna paathu kanneer vidudhu da! 😂`, emotion: 'laughing' }
      );
    } else if (isSanthanam) {
      candidates.push(
        { text: `Stack Overflow-la irundhu code copy pannitu variable name kuda maathaama run panriya nanba?! Semma thairiyam! 😂`, emotion: 'laughing' },
        { text: `Function name 'doSomething' nu vachiruka... enna suspense thriller cinema script-ah ezhudhuruka? 😂`, emotion: 'laughing' },
        { text: `Testing-e pannama direct-ah production push panriya? Thalaivaa nee developer illa, stunt master da! 😂`, emotion: 'laughing' },
        { text: `Code-la comments ezhudhuradha paatha diary ezhudhura madhiri irukku... 'Today I fixed bug, tomorrow I cry' nu! 😂`, emotion: 'laughing' },
        { text: `Client sonna requirement onnu, nee develop pannadhu onnu, ippo render aaguradhu vera onnu! Semma comedy! 😂`, emotion: 'laughing' }
      );
    } else if (isSmallBoy) {
      candidates.push(
        { text: `Anna anna! 100 line code ezhudhirukinga, aana console.log mattum thaan print aaguthu! Haha semma anna! 😂`, emotion: 'laughing' },
        { text: `Anna! Coffee kudichitu code pannunga anna, appo thaan brain semma rocket madhiri work pannum! 🚀☕`, emotion: 'happy' },
        { text: `Anna, computer-kulla poothu intha bugs-ah ellam naane thurathi vidava? 😂`, emotion: 'laughing' }
      );
    } else {
      candidates.push(
        { text: `CSS center align panradhukulla oru yugame mudinjidum pola! Flexbox use panriya illa Grid ah? 😂`, emotion: 'laughing' },
        { text: `Code comments: "I don't know why this works, please don't touch!" Classic developer mood! 😂`, emotion: 'laughing' },
        { text: `Git commit: "Final fix v3 very final for real this time"! Semma relatable! 😂`, emotion: 'happy' },
        { text: `There are 10 types of people in the world: binary purinjavan, puriyadhavan! 😉`, emotion: 'happy' }
      );
    }

    // Filter out recently used jokes to guarantee variety
    let unused = candidates.filter(c => !this.usedSituationalJokeTexts.has(c.text));
    if (unused.length === 0) {
      this.usedSituationalJokeTexts.clear();
      unused = candidates;
    }

    const chosen = unused[Math.floor(Math.random() * unused.length)];
    this.usedSituationalJokeTexts.add(chosen.text);
    if (this.usedSituationalJokeTexts.size > 25) {
      const first = this.usedSituationalJokeTexts.values().next().value;
      if (first) this.usedSituationalJokeTexts.delete(first);
    }

    return chosen;
  }

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
    const lower = userText.toLowerCase().trim();
    const isVadivelu = gender === 'vadivelu';
    const isSanthanam = gender === 'santhanam';
    const isSmallBoy = gender === 'small_boy';

    // 1. Greetings
    if (/^(hi|hello|hey|vanakkam|halo|heyyy|welcome|oi|thalaiva)/i.test(lower)) {
      let text = 'Heyyy! Super to meet you! Naan Maya, unga cute coding buddy! ✨';
      if (isVadivelu) {
        text = 'Aahaa! Vandhutan da vandhutan da! Naan thaan unga Vadivelu! Enna thalaivaa, innaiku bugs-ah ellam thamsam panna poroma?! 😂';
      } else if (isSanthanam) {
        text = 'Nanba! Enna innaiku early-ah terminal open pannitiya? Naan Santhanam! Code write panriya illa kolam podriya?! 😂';
      } else if (isSmallBoy) {
        text = 'Anna anna! Naan Chotu! Enna super project panreenga? Enakkum coding solli thaanganna! ✨';
      }
      return { text, emotion: 'happy' };
    }

    // 2. Playwright / Testing
    if (/playwright|test|automation|cypress|jest|vitest|qa/i.test(lower)) {
      let text = 'Ohh! Automation testing ah? Super! Innaiku bugs-ah catch panna poroma? All green ticks varanum! 🔥';
      if (isVadivelu) {
        text = 'Risk edukuradhellam enakku rusk saapdra madhiri! Playwright test-ah run pannu thalaivaa, paathukalam! 😂';
      } else if (isSanthanam) {
        text = 'Playwright test run aagudha? Inga paaru nanba, timeout error aana mattum en kitta varatha, coffee kudichitu vaa! 😂';
      } else if (isSmallBoy) {
        text = 'Anna! Ella test-um pass aagiducha? Semma mass anna! Innaiku green tick party thaan! 🧪';
      }
      return { text, emotion: 'happy' };
    }

    // 3. Joke request
    if (/joke|comedy|sirippu|funny|laugh/i.test(lower)) {
      return this.getSituationalJoke(gender, summary);
    }

    // 4. How are you / Status
    if (/how are you|eppadi irukka|nalama|fine/i.test(lower)) {
      let text = 'Naan full energetic-ah irukken! Unga code-la zero bugs paatha innum jolly-ah iruppen! 😄';
      if (isVadivelu) {
        text = 'Naan eppavume jolly thaan thalaivaa! Aana intha terminal error paatha thaan konjam heart beat adhigam aagudhu! 😂';
      } else if (isSanthanam) {
        text = 'Naan super-ah irukken nanba! Nee thaan terminal-ah paathu shock aagi ukkaanthirukka pola! 😂';
      } else if (isSmallBoy) {
        text = 'Naan semma jolly-ah irukken anna! Innaiku unga kooda coding panna ready! 🚀';
      }
      return { text, emotion: 'happy' };
    }

    // 5. Who are you
    if (/who are you|yaar nee|un per|your name|intro/i.test(lower)) {
      let text = 'Naan Maya! Unga cute & energetic VS Code pair programmer! 💖';
      if (isVadivelu) {
        text = 'Aahaa! Enna oru kelvi! Naan thaan unga Vaigai Puyal Vadivelu! Kodai-kodaikku comedy coding buddy! 😂';
      } else if (isSanthanam) {
        text = 'Naan Santhanam nanba! Counters king! Bugs vandha comedy pannuven, help venumna razor-sharp solution tharuven! 😎';
      } else if (isSmallBoy) {
        text = 'Naan Chotu anna! Unga thambi! Unga kooda ukkaanthu coding kathuka vandhirukken! 👦';
      }
      return { text, emotion: 'happy' };
    }

    // 6. Bug / Error / Help
    if (/error|bug|help|issue|fail|problem|stuck|fix/i.test(lower)) {
      if (summary && summary.diagnosticsSummary.errorCount > 0) {
        const top = summary.diagnosticsSummary.topErrors[0];
        if (isVadivelu) {
          return {
            text: `Aiyooo kadavule! ${top.file}:${top.line}-la "${top.message.slice(0, 50)}" nu error kaatudhu! Idhuku oru end card-e illaya?! 😱`,
            emotion: 'confused',
          };
        } else if (isSanthanam) {
          return {
            text: `Adadada! ${top.file}:${top.line}-la syntax error! Enna thalaivaa, bracket poduradhula kuda kanjathanam ah?! 😂`,
            emotion: 'confused',
          };
        } else if (isSmallBoy) {
          return {
            text: `Aiyoo anna! ${top.file}:${top.line}-la error vanthuruchu! Naan coffee eduthu varava, relax aagi fix pannunga! 🥺`,
            emotion: 'sad',
          };
        }
        return {
          text: `Aiyooo! ${top.file}:${top.line}-la "${top.message.slice(0, 70)}" error irukku. Type definition check pannalama? 🤔`,
          emotion: 'confused',
        };
      }
      return {
        text: isVadivelu
          ? 'Kadavule! Enna aachu thalaivaa? Sanda na satta kizhiyathaan seiyum! Code-ah kaatu, thamsam pannidalam! 🛠️'
          : isSanthanam
          ? 'Nanba, tension aagadha! Entha line-la error-nu sollu, counter attack panni fix pannuvom! ⚡'
          : isSmallBoy
          ? 'Anna! Kavalaiye padatheenga, namma sernthu intha bug-ah thurathi vidalam! 💪'
          : 'Kavalai padadha! Bug enga irukku nu paapom! Code explain pannu, namma sernthu fix pannuvom! 🐞',
        emotion: 'thinking',
      };
    }

    // 7. Project questions
    if (/project|workspace|stack|tech|repo/i.test(lower)) {
      const proj = summary?.projectName || 'Active Workspace';
      const lang = summary?.primaryLanguage || 'Code';
      const test = summary?.testFramework ? `, Testing: ${summary.testFramework}` : '';
      return {
        text: isVadivelu
          ? `Namma project ${proj} (${lang}${test}) vera level thalaivaa! Aahaa enna oru setup! 🔥`
          : isSanthanam
          ? `Project ${proj} semma setup nanba! Coding speed pathu terminal-ye bayanthu odudhu! 🚀`
          : isSmallBoy
          ? `Anna! Namma project ${proj} semmaya irukku! Naanum intha ${lang} kathuka poren! ✨`
          : `Namma current project: ${proj} (${lang}${test})! Mass-ah develop panrom! 🔥`,
        emotion: 'happy',
      };
    }

    // 8. General conversational response
    return {
      text: isVadivelu
        ? `Aahaa! "${userText}" semma matter thalaivaa! Vella pannalam vella pannalam! 😂`
        : isSanthanam
        ? `Nanba! "${userText}" super point! Fast-ah coding mudichitu tea saapda polam! ☕`
        : isSmallBoy
        ? `Semma anna! "${userText}" kettu semma jolly-ah irukku! Coding continue pannunga anna! 🚀`
        : `Super da! "${userText}" semma! Namma work semma speed-ah poguthu! ✨`,
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
