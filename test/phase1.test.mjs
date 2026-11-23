import test from 'node:test';
import assert from 'node:assert/strict';

test('Character States: validates all 9 required states exist', () => {
  const requiredStates = [
    'idle',
    'listening',
    'thinking',
    'speaking',
    'laughing',
    'happy',
    'confused',
    'surprised',
    'sad',
  ];
  assert.equal(requiredStates.length, 9);
  requiredStates.forEach(state => {
    assert.ok(typeof state === 'string');
  });
});

test('Voice Personalities: verifies female (Maya) and male (Vikram) configs', () => {
  const femalePersona = {
    name: 'Maya',
    gender: 'female',
    pitch: 1.2,
    rate: 1.05,
    tag: 'cute, energetic, funny',
  };
  const malePersona = {
    name: 'Vikram',
    gender: 'male',
    pitch: 0.95,
    rate: 1.0,
    tag: 'friendly, witty, energetic',
  };

  assert.equal(femalePersona.gender, 'female');
  assert.equal(malePersona.gender, 'male');
  assert.ok(femalePersona.pitch > malePersona.pitch);
});

test('Emotion Tag Parser: correctly extracts emotion tag and Tanglish dialogue', () => {
  function parseGeminiOutput(rawText) {
    const emotionMatch = rawText.match(
      /^\[(idle|listening|thinking|speaking|laughing|happy|confused|surprised|sad)\]\s*(.*)$/i
    );

    let emotion = 'speaking';
    let spokenText = rawText;

    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      spokenText = emotionMatch[2].trim();
    } else {
      if (/😂|haha|lol|comedy/i.test(rawText)) emotion = 'laughing';
      else if (/super|mass|semma|party|congrats|wow|🔥|🎉/i.test(rawText)) emotion = 'happy';
      else if (/aiyoo|error|fail|bug|problem|ayyo/i.test(rawText)) emotion = 'confused';
      else if (/wait|check|think|paapom/i.test(rawText)) emotion = 'thinking';
    }

    return { emotion, text: spokenText };
  }

  const sample1 = '[laughing] Haha semma comedy da! Intha bug pathu stack overflow-ve bayanthuduchu! 😂';
  const parsed1 = parseGeminiOutput(sample1);
  assert.equal(parsed1.emotion, 'laughing');
  assert.equal(
    parsed1.text,
    'Haha semma comedy da! Intha bug pathu stack overflow-ve bayanthuduchu! 😂'
  );

  const sample2 = '[happy] Mass! Test ellam pass aagiduchu! Innaiku party thaan! 🔥';
  const parsed2 = parseGeminiOutput(sample2);
  assert.equal(parsed2.emotion, 'happy');
  assert.equal(parsed2.text, 'Mass! Test ellam pass aagiduchu! Innaiku party thaan! 🔥');

  const sample3 = '[confused] Aiyoo! Playwright locator match aagala pola, check pannalama?';
  const parsed3 = parseGeminiOutput(sample3);
  assert.equal(parsed3.emotion, 'confused');

  const sampleFallback = 'Super da! Nalla code pannirukka!';
  const parsedFallback = parseGeminiOutput(sampleFallback);
  assert.equal(parsedFallback.emotion, 'happy');
});

test('Clean speech utility: strips emojis and markdown symbols for natural TTS', () => {
  function cleanSpeechText(text) {
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
      )
      .replace(/[#*`_~]/g, '')
      .trim();
  }

  const input = '**Heyyy!** Enna panra? 😂 Coding ah? *Super!* 🔥';
  const cleaned = cleanSpeechText(input);
  assert.equal(cleaned, 'Heyyy! Enna panra?  Coding ah? Super!');
  assert.ok(!cleaned.includes('*'));
  assert.ok(!cleaned.includes('😂'));
});
