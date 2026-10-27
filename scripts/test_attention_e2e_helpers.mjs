import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {questionnaireBacklogKeys,assertQueueKeys,testSignalCase,eventSignalKey,sessionSignalKey,expectQueue} from './attention_e2e_helpers.mjs';
const rows=Array.from({length:12},(_,i)=>({id:`old-${i}`,status:'submitted',submitted_at:'2020-01-02T10:00:00+00:00'}));
const baseline=questionnaireBacklogKeys(rows,[]);
assert.equal(baseline.length,12,'All historical unreviewed submissions remain in the baseline');
assertQueueKeys(baseline,baseline);
const event=eventSignalKey({id:'new-question',eventDate:'2026-10-27',savedAt:'2026-10-27T10:00:00+00:00'});
assertQueueKeys([...baseline,event],baseline,[event]);
assertQueueKeys(baseline,baseline,[]);
assert.throws(()=>assertQueueKeys(baseline.slice(1),baseline),/Queue must retain/);
assert.throws(()=>assertQueueKeys([...baseline,'unrelated'],baseline),/Queue must retain/);
assert.throws(()=>assertQueueKeys([...baseline,event,event],baseline,[event]),/Queue must retain/);
assert.throws(()=>assertQueueKeys(baseline,baseline,[event]),/Queue must retain/);
assert.throws(()=>assertQueueKeys(baseline,baseline,[baseline[0]]),/must be distinct/);
assert.throws(()=>assertQueueKeys([],undefined),/Explicit questionnaire baseline/);
assert.throws(()=>testSignalCase({locator:()=>{throw Error('must not query')}},baseline[0]),/never act on a historical questionnaire/);
let selector;testSignalCase({locator:value=>selector=value},event);assert(selector.includes('data-signal-key=')&&selector.includes(event));
assert.equal(questionnaireBacklogKeys(rows,[{signal_key:baseline[0],outcome:'noted_no_change'}]).length,11);
assert.equal(questionnaireBacklogKeys(rows,[{signal_key:baseline[0],outcome:'contact_required',contact_resolved_at:null}]).length,12);
assert.equal(questionnaireBacklogKeys(rows,[{signal_key:baseline[0],outcome:'contact_required',contact_resolved_at:'2026-10-27'}]).length,11);
const changed={...rows[0],submitted_at:'2026-10-27T12:00:00+00:00'};
assert.equal(questionnaireBacklogKeys([changed],[{signal_key:baseline[0],outcome:'noted_no_change'}]).length,1);
const session={id:'new-session',date:'2026-10-27',updated_at:'2026-10-27T10:00:00+00:00'};
assert.notEqual(sessionSignalKey(session),sessionSignalKey({...session,updated_at:'2026-10-27T11:00:00+00:00'}));
assert.throws(()=>eventSignalKey({id:'missing'}),/exact persisted event identity/);
assert.throws(()=>sessionSignalKey({id:'missing'}),/exact persisted session revision/);
// Exercise the asynchronous helper with a synthetic DOM-facing adapter, no network.
const expected=[...baseline,event].sort();let waited=false;
const page={waitForFunction:async(fn,keys)=>{assert.deepEqual(keys,expected);waited=true;},locator:()=>({evaluateAll:async()=>[...expected]}),getByText:text=>({count:async()=>0,waitFor:async()=>{}})};
await expectQueue(page,baseline,[event]);assert(waited);
for(const file of ['e2e_trainer_attention_flow.mjs','e2e_client_contact_requests.mjs']){
 const text=await readFile(new URL(file,import.meta.url),'utf8');
 assert(!/\bempty\(/.test(text));assert(!/attention-case["']\)\.count\(\),1/.test(text));
 for(const line of text.split('\n'))if(/\.getByRole\("button",\{name:"(?:Przejrzane · bez zmiany|Potrzebny kontakt|Kontakt zakończony)"/.test(line))assert(line.includes('testSignalCase('),`${file}: write action must have an exact source key`);
 assert(text.includes('questionnaireBacklog('));assert(/assert\.deepEqual\(await questionnaireBacklog\(/.test(text),'End-of-run persistent backlog must be unchanged');
}
console.log('ATTENTION_E2E_HELPERS_PASS: 12-questionnaire baseline, strict deltas, exact event/revision selectors, historical-write guard and scoped action contracts.');
