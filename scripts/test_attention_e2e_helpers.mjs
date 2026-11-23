import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getTrainerAttentionReadContract} from '../assets/os/trainer-attention-snapshot.js';
import {questionnaireBacklogKeys,questionnaireBacklog,assertQueueKeys,testSignalCase,eventSignalKey,sessionSignalKey,expectQueue} from './attention_e2e_helpers.mjs';

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

// Regression scenario: multiple synthetic clients in questionnaire backlog and queue
const clientA_rows = [
  { id: 'clientA-q1', client_id: 'c7200000-0000-4000-8000-000000000001', status: 'submitted', submitted_at: '2026-10-26T10:00:00+00:00' }
];
const clientB_rows = [
  { id: 'clientB-q1', client_id: 'c7200000-0000-4000-8000-000000000002', status: 'submitted', submitted_at: '2026-11-05T12:00:00+00:00' }
];
const multiClientRows = [...clientA_rows, ...clientB_rows];
const multiClientBaseline = questionnaireBacklogKeys(multiClientRows, []);
assert.equal(multiClientBaseline.length, 2, 'Backlog must aggregate unreviewed questionnaires across multiple clients');
const clientA_key = multiClientBaseline.find(k => k.includes('clientA-q1'));
const clientB_key = multiClientBaseline.find(k => k.includes('clientB-q1'));
assert(clientA_key && clientB_key, 'Both client keys must be present in multi-client baseline');

// Reviewing client A questionnaire preserves client B in backlog
const afterClientAReview = questionnaireBacklogKeys(multiClientRows, [{ signal_key: clientA_key, outcome: 'noted_no_change' }]);
assert.deepEqual(afterClientAReview, [clientB_key], 'Client B questionnaire must remain in backlog when client A is reviewed');

// Unresolved contact for client B preserves it in backlog
const withPendingContact = questionnaireBacklogKeys(multiClientRows, [
  { signal_key: clientA_key, outcome: 'noted_no_change' },
  { signal_key: clientB_key, outcome: 'contact_required', contact_resolved_at: null }
]);
assert.deepEqual(withPendingContact, [clientB_key], 'Pending contact for client B must retain signal in backlog');

// Multi-client queue validation succeeds when all client keys are present in DOM
const multiPage = {
  waitForFunction: async (fn, keys) => { assert.deepEqual(keys, multiClientBaseline); },
  locator: () => ({ evaluateAll: async () => [...multiClientBaseline] }),
  getByText: () => ({ count: async () => 0, waitFor: async () => {} })
};
await expectQueue(multiPage, multiClientBaseline, []);

// Diagnostic reporting on timeout / signal mismatch
const unexpectedKey='synthetic-unexpected-signal';
const diagnosticPage = {
  waitForFunction: async () => { throw new Error('Timeout 30000ms exceeded'); },
  locator: () => ({ evaluateAll: async () => [clientB_key,unexpectedKey] }),
  getByText: () => ({ count: async () => 0, waitFor: async () => {} })
};
await assert.rejects(
  () => expectQueue(diagnosticPage, multiClientBaseline, []),
  (err) => {
    assert(err.message.includes('expectQueue timeout'), 'Must report expectQueue timeout');
    assert(err.message.includes(`Missing: [${clientA_key}]`), 'Must report missing client A key');
    assert(err.message.includes(`Unexpected: [${unexpectedKey}]`), 'Must report the unexpected signal even when counts match');
    assert(err.message.includes('Timeout 30000ms exceeded'), 'Must preserve original error cause');
    return true;
  }
);

// REST adapter: emulate server filtering, stable ordering and server-side caps.
// All requests stay synthetic, including the current trainer profile read.
const fetchCalls=[];
const originalFetch=globalThis.fetch;
const authUserId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId='11111111-1111-4111-8111-111111111111';
const otherOwnerId='22222222-2222-4222-8222-222222222222';
const clientA=clientA_rows[0].client_id,clientB=clientB_rows[0].client_id;
const sharedId='c7200000-0000-4000-8000-000000000003';
const deletedId='c7200000-0000-4000-8000-000000000004';
const archivedId='c7200000-0000-4000-8000-000000000005';
const token=`e30.${Buffer.from(JSON.stringify({sub:authUserId})).toString('base64url')}.synthetic`;
const makeClient=(id,extra={})=>({id,name:'Synthetic',status:'active',owner_trainer_id:ownerId,stage:null,next_session_date:null,next_review_date:null,deleted_at:null,...extra});
const clients=[makeClient(clientA),makeClient(clientB),makeClient(sharedId,{owner_trainer_id:otherOwnerId}),makeClient(deletedId,{deleted_at:'2026-11-01T12:00:00Z'}),makeClient(archivedId,{status:'archived'})];
const makeAssignment=(id,client_id)=>({id,client_id,status:'submitted',submitted_at:'2026-11-01T12:00:00Z'});
const contracts=getTrainerAttentionReadContract();
let assignments=[...multiClientRows],reviews=[],profile={id:ownerId,role:'trainer'};
let serverPageSize=Infinity,failedTable=null;
const projection=(row,select)=>Object.fromEntries(select.split(',').filter(k=>!k.includes('!')).map(k=>[k,row[k]]));
globalThis.fetch=async(address,options)=>{
 const url=new URL(address),query=url.searchParams,table=url.pathname.split('/').at(-1);
 assert.equal(url.origin,'https://ulauyoqjoetjqktegeuq.supabase.co');
 assert.equal(options.method,'GET','Baseline must never mutate staging');
 assert.equal(options.headers.Authorization,`Bearer ${token}`);
 fetchCalls.push(url);
 if(table===failedTable)return new Response('synthetic read failure',{status:503});
 if(table==='profiles'){
  assert.equal(query.get('auth_user_id'),`eq.${authUserId}`);
  return Response.json(profile?[profile]:[]);
 }
 const source=Object.keys(contracts).find(name=>contracts[name].table===table);
 assert(['clients','questionnaireAssignments','signalReviews'].includes(source),`Unexpected baseline source ${table}`);
 const contract=contracts[source];
 assert.equal(query.get('select'),contract.select);
 assert.equal(query.get('order'),contract.order,'Every paginated read requires stable ordering');
 for(const [key,value] of Object.entries(contract.predicates))assert.equal(query.get(key),value);
 let data=source==='clients'?clients.filter(row=>row.deleted_at===null):source==='questionnaireAssignments'?assignments:reviews;
 const idFilter=query.get('id'),clientFilter=query.get('client_id');
 if(idFilter)data=data.filter(row=>`eq.${row.id}`===idFilter);
 if(clientFilter)data=data.filter(row=>`eq.${row.client_id}`===clientFilter);
 data=[...data].sort((a,b)=>a.id.localeCompare(b.id));
 const offset=Number(query.get('offset')),limit=Number(query.get('limit'));
 assert(Number.isInteger(offset)&&offset>=0&&Number.isInteger(limit)&&limit>0);
 return Response.json(data.slice(offset,offset+Math.min(limit,serverPageSize)).map(row=>projection(row,contract.select)));
};
try {
 const allBacklog=await questionnaireBacklog(token);
 assert.deepEqual(allBacklog,multiClientBaseline,'Without a filter both client questionnaires remain');
 for(const table of ['questionnaire_assignments','trainer_signal_reviews']){
  assert(fetchCalls.some(url=>url.pathname.endsWith(table)));
  assert(fetchCalls.filter(url=>url.pathname.endsWith(table)).every(url=>!url.searchParams.has('client_id')));
 }
 fetchCalls.length=0;
 const filteredBacklog=await questionnaireBacklog(token,clientA);
 assert.deepEqual(filteredBacklog,[clientA_key],'Client A filter must return exactly its one questionnaire');
 for(const table of ['questionnaire_assignments','trainer_signal_reviews']){
  const calls=fetchCalls.filter(url=>url.pathname.endsWith(table));
  assert(calls.length>0,`${table}: filtered read must be exercised`);
  assert(calls.every(url=>url.searchParams.get('client_id')===`eq.${clientA}`),`${table}: missing client_id filter`);
 }
 assert(fetchCalls.filter(url=>url.pathname.endsWith('clients')).every(url=>url.searchParams.get('id')===`eq.${clientA}`));
 assert.deepEqual(await questionnaireBacklog(token,clientB),[clientB_key]);

 // Nonempty review fixtures make a missing review filter observable as an
 // out-of-snapshot error, rather than allowing an empty mock to hide it.
 reviews=[{id:'review-a',client_id:clientA,signal_key:clientA_key,outcome:'contact_required',contact_resolved_at:null},{id:'review-b',client_id:clientB,signal_key:clientB_key,outcome:'contact_required',contact_resolved_at:null}];
 assert.deepEqual(await questionnaireBacklog(token,clientA),[clientA_key]);
 reviews[0].outcome='noted_no_change';
 assert.deepEqual(await questionnaireBacklog(token),[clientB_key],'Reviewing A cannot remove B');
 assert.deepEqual(await questionnaireBacklog(token,clientA),[]);
 assert.deepEqual(await questionnaireBacklog(token,clientB),[clientB_key]);
 reviews=[];

 // Visibility is not ownership: shared clients cannot add questionnaire reviews
 // to this trainer's baseline. Archived owned submissions still require review.
 const shared=makeAssignment('shared-questionnaire',sharedId);
 const archived=makeAssignment('archived-questionnaire',archivedId);
 assignments=[...multiClientRows,shared,archived];
 assert.deepEqual(await questionnaireBacklog(token),questionnaireBacklogKeys([...multiClientRows,archived],[]));
 assert.deepEqual(await questionnaireBacklog(token,sharedId),[]);
 assert.deepEqual(await questionnaireBacklog(token,archivedId),questionnaireBacklogKeys([archived],[]));
 assert.deepEqual(await questionnaireBacklog(token,deletedId),[],'Soft-deleted clients are outside the client read contract');
 assignments=[...multiClientRows,makeAssignment('deleted-questionnaire',deletedId)];
 await assert.rejects(()=>questionnaireBacklog(token),/references a client outside the snapshot/,'Never hide an orphaned source silently');
 assignments=[...multiClientRows];

 // Simulate a server cap smaller than the requested page. Stop only on an
 // empty page, including reviews whose later page removes the first signal.
 serverPageSize=1;
 reviews=[{id:'review-a',client_id:clientA,signal_key:clientA_key,outcome:'contact_required',contact_resolved_at:null},{id:'review-b',client_id:clientB,signal_key:clientB_key,outcome:'noted_no_change',contact_resolved_at:null}];
 fetchCalls.length=0;
 assert.deepEqual(await questionnaireBacklog(token),[clientA_key]);
 for(const table of ['clients','questionnaire_assignments','trainer_signal_reviews']){
  const offsets=fetchCalls.filter(url=>url.pathname.endsWith(table)).map(url=>Number(url.searchParams.get('offset')));
  assert(offsets.length>=3,`${table}: later and empty pages must be read`);
  assert.deepEqual(offsets,Array.from({length:offsets.length},(_,i)=>i));
 }
 assert.deepEqual(await questionnaireBacklog(token,clientA),[clientA_key]);
 serverPageSize=Infinity;reviews=[];

 profile={id:otherOwnerId,role:'trainer'};
 assert.deepEqual(await questionnaireBacklog(token),[],'Never infer ownership from client visibility');
 profile={id:ownerId,role:'client'};
 await assert.rejects(()=>questionnaireBacklog(token),/requires a trainer profile/);
 profile=null;
 await assert.rejects(()=>questionnaireBacklog(token),/Exactly one current trainer profile/);
 profile={id:ownerId,role:'trainer'};
 failedTable='questionnaire_assignments';
 await assert.rejects(()=>questionnaireBacklog(token),/503/,'A failed read must not become an empty baseline');
 failedTable=null;
} finally {
 globalThis.fetch=originalFetch;
}

for(const file of ['e2e_trainer_attention_flow.mjs','e2e_client_contact_requests.mjs']){
 const text=await readFile(new URL(file,import.meta.url),'utf8');
 assert(!/\bempty\(/.test(text));assert(!/attention-case["']\)\.count\(\),1/.test(text));
 for(const line of text.split('\n'))if(/\.getByRole\("button",\{name:"(?:Przejrzane · bez zmiany|Potrzebny kontakt|Kontakt zakończony)"/.test(line))assert(line.includes('testSignalCase('),`${file}: write action must have an exact source key`);
 assert(text.includes('questionnaireBacklog('));assert(/assert\.deepEqual\(await questionnaireBacklog\(/.test(text),'End-of-run persistent backlog must be unchanged');
}
console.log('ATTENTION_E2E_HELPERS_PASS: 12-questionnaire baseline, 2/1 client filtering, ownership, soft-delete boundary, exhaustive pagination, exact event/revision selectors, diagnostics and historical-write guard.');
