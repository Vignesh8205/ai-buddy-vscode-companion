import test from 'node:test';
import assert from 'node:assert/strict';

test('TamilTransliterator: accurately transliterates common Vadivelu phrases', async () => {
  const { TamilTransliterator } = await import('../src/extension/services/tamilTransliterator.ts');

  const input1 = 'Aahaa! Vandhutan da! Naan thaan unga Vadivelu!';
  const tamil1 = TamilTransliterator.toTamil(input1);
  assert.ok(/ஆஹா/.test(tamil1), 'Should contain ஆஹா');
  assert.ok(/வடிவேலு/.test(tamil1), 'Should contain வடிவேலு');
  assert.ok(/வந்துட்டேன்டா/.test(tamil1), 'Should contain வந்துட்டேன்டா');

  const input2 = 'Building strong-u, basement weak-u da!';
  const tamil2 = TamilTransliterator.toTamil(input2);
  assert.ok(/பில்டிங் ஸ்ட்ராங்கு/.test(tamil2), 'Should contain பில்டிங் ஸ்ட்ராங்கு');
  assert.ok(/பேஸ்மெண்ட் வீக்கு/.test(tamil2), 'Should contain பேஸ்மெண்ட் வீக்கு');
});

test('TamilTransliterator: accurately transliterates Santhanam and Maya phrases', async () => {
  const { TamilTransliterator } = await import('../src/extension/services/tamilTransliterator.ts');

  const inputSanthanam = 'Nanba! Naan thaan unga Santhanam! Terminal therikka viduvom!';
  const tamilSanthanam = TamilTransliterator.toTamil(inputSanthanam);
  assert.ok(/நண்பா/.test(tamilSanthanam), 'Should contain நண்பா');
  assert.ok(/சந்தானம்/.test(tamilSanthanam), 'Should contain சந்தானம்');
  assert.ok(/தெறிக்க விடுவோம்/.test(tamilSanthanam), 'Should contain தெறிக்க விடுவோம்');

  const inputMaya = 'Heyyy! Naan Maya! Jolly-ah code pannuvoma?';
  const tamilMaya = TamilTransliterator.toTamil(inputMaya);
  assert.ok(/மாயா/.test(tamilMaya), 'Should contain மாயா');
  assert.ok(/ஜாலியா/.test(tamilMaya), 'Should contain ஜாலியா');
});

test('Dual-Channel Parser: extracts emotion, display Tanglish, and voice Tamil script', () => {
  function parseGeminiOutput(rawText) {
    let spokenTamil;
    let workingText = rawText;

    const tamilMatch = workingText.match(/<tamil>([\s\S]*?)<\/tamil>/i);
    if (tamilMatch) {
      spokenTamil = tamilMatch[1].trim();
      workingText = workingText.replace(/<tamil>[\s\S]*?<\/tamil>/gi, '').trim();
    }

    const emotionMatch = workingText.match(
      /^\[(idle|listening|thinking|speaking|laughing|happy|confused|surprised|sad)\]\s*(.*)$/i
    );

    let emotion = 'speaking';
    let text = workingText;

    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      text = emotionMatch[2].trim();
    }

    return { emotion, text, spokenTamil };
  }

  const raw = '[happy] Aahaa semma coding da! <tamil>ஆஹா செம்ம கோடிங் டா!</tamil>';
  const parsed = parseGeminiOutput(raw);
  assert.equal(parsed.emotion, 'happy');
  assert.equal(parsed.text, 'Aahaa semma coding da!');
  assert.equal(parsed.spokenTamil, 'ஆஹா செம்ம கோடிங் டா!');
});
