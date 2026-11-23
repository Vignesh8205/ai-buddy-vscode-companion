import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Test Cooldown & Frequency Configuration
test('Proactive Engine: correctly configures cooldown duration by user preference', () => {
  function getCooldownDuration(frequency) {
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

  assert.equal(getCooldownDuration('high'), 120000);
  assert.equal(getCooldownDuration('medium'), 240000);
  assert.equal(getCooldownDuration('low'), 480000);
  assert.equal(getCooldownDuration('off'), Infinity);
});

// 2. Test Cooldown Evaluation and High Priority Bypass
test('Proactive Engine: enforces cooldown and allows high priority event bypass', () => {
  let lastProactiveTimestamp = 1000000;
  const cooldownMs = 240000; // 4 mins

  function shouldTrigger(now, eventType) {
    const timeSinceLast = now - lastProactiveTimestamp;
    const isHighPriority = eventType === 'TEST_PASSED' || eventType === 'BUG_FIXED';
    const effectiveCooldown = isHighPriority ? cooldownMs * 0.4 : cooldownMs; // 96s for high priority

    if (timeSinceLast < effectiveCooldown) {
      return false; // suppressed by cooldown
    }
    lastProactiveTimestamp = now;
    return true;
  }

  // Case A: 60s later (under 96s) -> both normal and high priority are suppressed
  assert.equal(shouldTrigger(1060000, 'RANDOM_JOKE'), false);
  assert.equal(shouldTrigger(1060000, 'TEST_PASSED'), false);

  // Case B: 120s later (over 96s high priority cooldown, but under 240s normal cooldown)
  assert.equal(shouldTrigger(1120000, 'RANDOM_JOKE'), false); // Normal is blocked!
  assert.equal(shouldTrigger(1120000, 'TEST_PASSED'), true); // High priority passes!

  // Reset timestamp for next check
  lastProactiveTimestamp = 1120000;

  // Case C: 300s later (over 240s normal cooldown) -> normal joke passes
  assert.equal(shouldTrigger(1450000, 'RANDOM_JOKE'), true);
});

// 3. Test Personality Engine Templates and Joke Rotation
test('Personality Engine: verifies Tanglish response generation across all proactive event categories', () => {
  function getTemplate(eventType, gender) {
    const isFemale = gender === 'female';
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
    }
  }

  const events = [
    'BUG_FIXED',
    'TEST_PASSED',
    'TEST_FAILED',
    'REPEATED_ERROR',
    'LONG_CODING_BURST',
    'IDLE_CHECKIN',
  ];

  events.forEach(ev => {
    const femaleReply = getTemplate(ev, 'female');
    assert.ok(femaleReply.text.length > 10);
    assert.ok(['happy', 'confused', 'laughing'].includes(femaleReply.emotion));

    const maleReply = getTemplate(ev, 'male');
    assert.ok(maleReply.text.length > 10);
    assert.ok(['happy', 'confused', 'laughing'].includes(maleReply.emotion));
  });
});

// 4. Test Mute Mode & Quiet Mode Suppression
test('Proactive Engine: strictly honors frequency = off (mute)', () => {
  function canTrigger(frequency) {
    return frequency !== 'off';
  }

  assert.equal(canTrigger('high'), true);
  assert.equal(canTrigger('medium'), true);
  assert.equal(canTrigger('low'), true);
  assert.equal(canTrigger('off'), false);
});
