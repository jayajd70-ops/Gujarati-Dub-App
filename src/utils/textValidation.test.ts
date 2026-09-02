import { validateGujaratiTranscript, validateTranslation } from './textValidation';

function runValidationTests() {
  const tests: { name: string; fn: () => void }[] = [
    {
      name: 'Reject empty transcript',
      fn: () => {
        const res = validateGujaratiTranscript('');
        if (res.isValid) throw new Error('Expected empty transcript to be invalid');
        const resNull = validateGujaratiTranscript(null);
        if (resNull.isValid) throw new Error('Expected null transcript to be invalid');
      },
    },
    {
      name: 'Reject hallucinated English transcript',
      fn: () => {
        const hallucinated = "Hello, can't I say I am going to play magic? No, that's not super good I am going to play magic";
        const res = validateGujaratiTranscript(hallucinated);
        if (res.isValid) throw new Error('Expected English hallucinated transcript to be rejected');
        if (!res.errorReason?.includes('English') && !res.errorReason?.includes('Latin')) {
          throw new Error(`Unexpected error reason: ${res.errorReason}`);
        }
      },
    },
    {
      name: 'Accept valid Gujarati transcript',
      fn: () => {
        const valid = 'નમસ્તે, હું ગુજરાતીમાં બોલું છું અને આ મારો વિડીયો છે.';
        const res = validateGujaratiTranscript(valid);
        if (!res.isValid) throw new Error(`Expected valid Gujarati transcript, got error: ${res.errorReason}`);
        if ((res.gujaratiCharCount || 0) < 10) throw new Error('Expected Gujarati characters to be counted');
      },
    },
    {
      name: 'Reject empty translation',
      fn: () => {
        const resHi = validateTranslation('નમસ્તે', '', 'hi');
        if (resHi.isValid) throw new Error('Expected empty Hindi translation to be invalid');
        const resEn = validateTranslation('નમસ્તે', '   ', 'en');
        if (resEn.isValid) throw new Error('Expected whitespace English translation to be invalid');
      },
    },
    {
      name: 'Reject unchanged Gujarati translation',
      fn: () => {
        const gujarati = 'નમસ્તે, કેમ છો?';
        const resHi = validateTranslation(gujarati, gujarati, 'hi');
        if (resHi.isValid) throw new Error('Expected unchanged translation for Hindi to be invalid');
        const resEn = validateTranslation(gujarati, gujarati, 'en');
        if (resEn.isValid) throw new Error('Expected unchanged translation for English to be invalid');
      },
    },
    {
      name: 'Accept valid Hindi translation with Devanagari script',
      fn: () => {
        const res = validateTranslation('નમસ્તે, કેમ છો?', 'नमस्ते, आप कैसे हैं?', 'hi');
        if (!res.isValid) throw new Error(`Expected valid Hindi translation, got error: ${res.errorReason}`);
      },
    },
    {
      name: 'Accept valid English translation with Latin script',
      fn: () => {
        const res = validateTranslation('નમસ્તે, કેમ છો?', 'Hello, how are you?', 'en');
        if (!res.isValid) throw new Error(`Expected valid English translation, got error: ${res.errorReason}`);
      },
    },
    {
      name: 'Reject Gujarati script passed as Hindi translation',
      fn: () => {
        const res = validateTranslation('નમસ્તે', 'નમસ્તે મિત્રો', 'hi');
        if (res.isValid) throw new Error('Expected Gujarati script to be rejected for Hindi');
      },
    },
    {
      name: 'Reject Gujarati script passed as English translation',
      fn: () => {
        const res = validateTranslation('નમસ્તે', 'નમસ્તે મિત્રો', 'en');
        if (res.isValid) throw new Error('Expected Gujarati script to be rejected for English');
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log('--- Running Text Validation Tests ---');
  for (const t of tests) {
    try {
      t.fn();
      console.log(`[PASS] ${t.name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${t.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runValidationTests();
