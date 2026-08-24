import assert from 'node:assert/strict';
import { createGuidanceState, makeTrainerDecision, submitClientEvent } from '../prototypes/client-guidance-loop-v1/state.js';

const passed = [];
const check = (name, test) => { test(); passed.push(name); };

check('cold start has one current guidance', () => {
  const state = createGuidanceState();
  assert.equal(state.guidance.version, 1);
  assert.ok(state.guidance.action);
});

check('question does not change guidance automatically and names the response channel', () => {
  const state = createGuidanceState();
  const next = submitClientEvent(state, { type: 'question', text: 'Czy możemy to omówić?' });
  assert.equal(next.guidance.version, 1);
  assert.match(next.clientMessage, /nie zmienia automatycznie/i);
  assert.match(next.clientMessage, /uzgodnionym kanałem/i);
});

check('concern requests direct human contact without automatic guidance change', () => {
  const state = createGuidanceState();
  const next = submitClientEvent(state, { type: 'concern', text: 'Nie wiem, czy mogę kontynuować.' });
  assert.equal(next.guidance.version, 1);
  assert.equal(next.latestEvent.type, 'concern');
  assert.match(next.clientMessage, /Nie podejmuj decyzji w aplikacji/i);
  assert.match(next.clientMessage, /telefonicznie, przez WhatsApp albo podczas sesji/i);
});

check('Damian publication replaces the previous current guidance', () => {
  const next = makeTrainerDecision(createGuidanceState(), 'publish', { channel: 'paper' });
  assert.equal(next.guidance.version, 2);
  assert.equal(next.guidance.channel, 'paper');
  assert.match(next.clientMessage, /Poprzednia nie jest już aktywna/i);
});

console.log(`CLIENT_GUIDANCE_LOOP_SUCCESS ${passed.length}/${passed.length} PASS`);
for (const name of passed) console.log(`PASS ${name}`);
