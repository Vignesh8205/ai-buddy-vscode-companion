/**
 * TamilTransliterator
 * Converts Tanglish (colloquial Tamil written in English letters) into
 * native Tamil script (தமிழ்) so neural TTS engines pronounce speech
 * with 100% natural, authentic Tamil diction and zero robotic Western accent.
 */

export class TamilTransliterator {
  private static readonly PHRASE_MAP: Array<[RegExp, string]> = [
    // Iconic Vadivelu Punchlines & Comedy Expressions
    [/\bbuilding strong[- ]?u\b/gi, 'பில்டிங் ஸ்ட்ராங்கு'],
    [/\bbasement (?:romba )?weak[- ]?u\b/gi, 'பேஸ்மெண்ட் வீக்கு'],
    [/\brisk edukuradhellam\b/gi, 'ரிஸ்க் எடுக்குறதெல்லாம்'],
    [/\brusk saapdra madhiri\b/gi, 'ரஸ்க் சாப்பிடுற மாதிரி'],
    [/\bsanda na satta kizhiyathaan seiyum\b/gi, 'சண்டைனா சட்டை கிழியத்தான் செய்யும்'],
    [/\bvandhutan da vandhutan da\b/gi, 'வந்துட்டேன்டா வந்துட்டேன்டா'],
    [/\bvandhutan da\b/gi, 'வந்துட்டேன்டா'],
    [/\bvandhuten da\b/gi, 'வந்துட்டேன்டா'],
    [/\bnaan thaan unga vadivelu\b/gi, 'நான் தான் உங்க வடிவேலு'],
    [/\bnaan thaan unga santhanam\b/gi, 'நான் தான் உங்க சந்தானம்'],
    [/\bnaan thaan unga\b/gi, 'நான் தான் உங்க'],
    [/\btherikka viduvom\b/gi, 'தெறிக்க விடுவோம்'],
    [/\bterminal[- ]?ah\b/gi, 'டெர்மினலை'],
    [/\bkizha vizhunthu sirikka\b/gi, 'கீழ விழுந்து சிரிக்க'],
    [/\bjolly[- ]?ah\b/gi, 'ஜாலியா'],
    [/\bfresh[- ]?ah\b/gi, 'பிரெஷ்ஷா'],
    [/\bclean[- ]?ah\b/gi, 'கிளீனா'],
    [/\bmass[- ]?ah\b/gi, 'மாஸா'],
    [/\bfree[- ]?ah\b/gi, 'ஃப்ரீயா'],
    [/\bsimple[- ]?ah\b/gi, 'சிம்பிளா'],
    [/\bquick[- ]?ah\b/gi, 'குயிக்கா'],

    // Persona Greetings
    [/\bheyyy\b/gi, 'ஹேய்'],
    [/\bhey\b/gi, 'ஹேய்'],
    [/\baahaa\b/gi, 'ஆஹா'],
    [/\baaha\b/gi, 'ஆஹா'],
    [/\baiyoo kadavule\b/gi, 'ஐயோ கடவுளே'],
    [/\baiyoo\b/gi, 'ஐயோ'],
    [/\bayyo\b/gi, 'ஐயோ'],
    [/\bkadavule\b/gi, 'கடவுளே'],
    [/\bnanba\b/gi, 'நண்பா'],
    [/\bthalaivaa\b/gi, 'தலைவா'],
    [/\bthalaiva\b/gi, 'தலைவா'],
    [/\banna anna\b/gi, 'அண்ணா அண்ணா'],
    [/\banna\b/gi, 'அண்ணா'],
    [/\bchotu\b/gi, 'சோட்டு'],
    [/\bmaya\b/gi, 'மாயா'],
    [/\bvadivelu\b/gi, 'வடிவேலு'],
    [/\bsanthanam\b/gi, 'சந்தானம்'],

    // Tech Terms (phonetically spelled in Tamil for natural TTS reading)
    [/\bcompiler[- ]?e\b/gi, 'கம்பைலரே'],
    [/\bcompiler\b/gi, 'கம்பைலர்'],
    [/\bterminal\b/gi, 'டெர்மினல்'],
    [/\bcoding\b/gi, 'கோடிங்'],
    [/\bcode\b/gi, 'கோட்'],
    [/\berror[- ]?ah\b/gi, 'எர்ரர'],
    [/\berror\b/gi, 'எர்ரர்'],
    [/\berrors\b/gi, 'எர்ரர்ஸ்'],
    [/\bbug[- ]?ah\b/gi, 'பக்க'],
    [/\bbug\b/gi, 'பக்'],
    [/\bbugs\b/gi, 'பக்ஸ்'],
    [/\bfile[- ]?la\b/gi, 'ஃபைல்ல'],
    [/\bfile\b/gi, 'ஃபைல்'],
    [/\bproject\b/gi, 'ப்ராஜெக்ட்'],
    [/\bfunction\b/gi, 'ஃபங்ஷன்'],
    [/\bcomponent\b/gi, 'காம்பொனன்ட்'],
    [/\bkeyboard\b/gi, 'கீபோர்டு'],
    [/\bbutton\b/gi, 'பட்டன்'],
    [/\blaptop\b/gi, 'லேப்டாப்'],
    [/\bvariable\b/gi, 'வேரியபிள்'],
    [/\bconsole\.log\b/gi, 'கன்சோல் லாக்'],
    [/\bdebugger\b/gi, 'டிபக்கர்'],
    [/\bdebug\b/gi, 'டிபக்'],
    [/\bcommit\b/gi, 'கமிட்'],
    [/\bbranch\b/gi, 'பிராஞ்ச்'],
    [/\bloop\b/gi, 'லூப்'],
    [/\bstack overflow\b/gi, 'ஸ்டாக் ஓவர்ஃபுளோ'],
    [/\bcoffee\b/gi, 'காபி'],

    // Conversational Tanglish Words
    [/\binnaiku\b/gi, 'இன்னைக்கு'],
    [/\bindha\b/gi, 'இந்த'],
    [/\bantha\b/gi, 'அந்த'],
    [/\benna\b/gi, 'என்ன'],
    [/\bedhu\b/gi, 'எது'],
    [/\benga\b/gi, 'எங்க'],
    [/\beppo\b/gi, 'எப்போ'],
    [/\beppadi\b/gi, 'எப்படி'],
    [/\bnaan\b/gi, 'நான்'],
    [/\bneenga\b/gi, 'நீங்க'],
    [/\bnee\b/gi, 'நீ'],
    [/\bunga\b/gi, 'உங்க'],
    [/\bun\b/gi, 'உன்'],
    [/\benakku\b/gi, 'எனக்கு'],
    [/\bunakku\b/gi, 'உனக்கு'],
    [/\bavan\b/gi, 'அவன்'],
    [/\bava\b/gi, 'அவ'],
    [/\bavanga\b/gi, 'அவங்க'],
    [/\bidhu\b/gi, 'இது'],
    [/\badhu\b/gi, 'அது'],
    [/\bsemma\b/gi, 'செம்ம'],
    [/\bsuper\b/gi, 'சூப்பர்'],
    [/\bmass\b/gi, 'மாஸ்'],
    [/\bprachanai\b/gi, 'பிரச்சனை'],
    [/\bproblem\b/gi, 'பிராப்ளம்'],
    [/\bsolunga\b/gi, 'சொல்லுங்க'],
    [/\bsollu\b/gi, 'சொல்லு'],
    [/\bpaapom\b/gi, 'பார்ப்போம்'],
    [/\bpaatha\b/gi, 'பார்த்தா'],
    [/\bpaarthu\b/gi, 'பார்த்து'],
    [/\bpaaru\b/gi, 'பாரு'],
    [/\birukku\b/gi, 'இருக்கு'],
    [/\birukka\b/gi, 'இருக்கா'],
    [/\birukken\b/gi, 'இருக்கேன்'],
    [/\bpanra\b/gi, 'பண்ற'],
    [/\bpanriya\b/gi, 'பண்றியா'],
    [/\bpannu\b/gi, 'பண்ணு'],
    [/\bpannuvom\b/gi, 'பண்ணுவோம்'],
    [/\bpannuvoma\b/gi, 'பண்ணுவோமா'],
    [/\bpottu\b/gi, 'போட்டு'],
    [/\bpodu\b/gi, 'போடு'],
    [/\bpodriya\b/gi, 'போடுறியா'],
    [/\bromba\b/gi, 'ரொம்ப'],
    [/\bkizha\b/gi, 'கீழ'],
    [/\bsirikka\b/gi, 'சிரிக்க'],
    [/\bthonudhu\b/gi, 'தோணுது'],
    [/\bthookam\b/gi, 'தூக்கம்'],
    [/\bkudichitu\b/gi, 'குடிச்சிட்டு'],
    [/\bvaruva\b/gi, 'வருவ'],
    [/\bvarava\b/gi, 'வரவா'],
    [/\bvaa\b/gi, 'வா'],
    [/\bvanga\b/gi, 'வாங்க'],
    [/\bpoidum\b/gi, 'போயிடும்'],
    [/\bvarudhu\b/gi, 'வருது'],
    [/\bvanthuruchu\b/gi, 'வந்துடுச்சு'],
    [/\baagiduchu\b/gi, 'ஆகிடுச்சு'],
    [/\baagala\b/gi, 'ஆகல'],
    [/\baachu\b/gi, 'ஆச்சு'],
    [/\bazhudhidum\b/gi, 'அழுதுடும்'],
    [/\bpola\b/gi, 'போல'],
    [/\billa\b/gi, 'இல்ல'],
    [/\billai\b/gi, 'இல்லை'],
    [/\baama\b/gi, 'ஆமா'],
    [/\baana\b/gi, 'ஆனா'],
    [/\bmattum\b/gi, 'மட்டும்'],
    [/\bkooda\b/gi, 'கூட'],
    [/\bapdi\b/gi, 'அப்படி'],
    [/\bipdi\b/gi, 'இப்படி'],
    [/\bepdi\b/gi, 'எப்படி'],
    [/\bkonjam\b/gi, 'கொஞ்சம்'],
    [/\btheriyuma\b/gi, 'தெரியுமா'],
    [/\btheriyum\b/gi, 'தெரியும்'],
    [/\btheriyala\b/gi, 'தெரியல'],
    [/\bbayanthutiya\b/gi, 'பயந்துட்டியா'],
    [/\bbayam\b/gi, 'பயம்'],
    [/\bda\b/gi, 'டா'],
    [/\bdi\b/gi, 'டி'],
    [/\bpa\b/gi, 'ப்பா'],
    [/\bmachan\b/gi, 'மச்சான்'],
    [/\bbro\b/gi, 'ப்ரோ'],
  ];

  /**
   * Transliterates Tanglish text to Tamil Unicode script.
   * If the text already has Tamil Unicode characters, it returns it directly.
   */
  public static toTamil(text: string): string {
    if (!text || !text.trim()) return '';

    // If text already contains extensive Tamil script (>= 5 Tamil characters), return as-is
    const tamilChars = text.match(/[\u0B80-\u0BFF]/g);
    if (tamilChars && tamilChars.length >= 5) {
      return text;
    }

    let result = text;

    // Apply high-frequency vocabulary mapping
    for (const [pattern, tamil] of TamilTransliterator.PHRASE_MAP) {
      result = result.replace(pattern, tamil);
    }

    return result;
  }
}
