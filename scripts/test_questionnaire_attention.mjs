import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrainerAttentionModel} from '../assets/os/trainer-attention-model.js';
import {assembleTrainerAttentionSnapshot,getTrainerAttentionReadContract} from '../assets/os/trainer-attention-snapshot.js';
import {loadTrainerAttention} from '../assets/os/trainer-attention-runtime.js';
import {TrainerAttentionController} from '../assets/os/trainer-attention-controller.js';
import {collectWorkspaceSignals} from '../assets/os/trainer-signals.js';
import {signalTypeLabel} from '../assets/os/decision-support.js';
import {StudioLasRepository} from '../assets/os/data.js';

const client={id:'owned',name:'Fikcyjny klient',status:'active',owner_trainer_id:'11111111-1111-4111-8111-111111111111',stage:1,next_session_date:null,next_review_date:null};
const assignment={id:'assignment-a',client_id:'owned',status:'submitted',submitted_at:'2020-01-02T10:00:00Z'};
const snapshot=(overrides={})=>({clients:[client],sessions:[],trainingLoad:[],preSessionChecks:[],guidanceEvents:[],signalReviews:[],questionnaireAssignments:[assignment],...overrides});
const options={trainerProfile:{id:'11111111-1111-4111-8111-111111111111',role:'trainer'},today:'2026-10-26'};
const model=s=>buildTrainerAttentionModel(s,options);
const first=model(snapshot()).attention[0];
assert.equal(first.reason,'Ankieta przekazana do przeglądu');
assert.equal(first.client,client.name);
assert.equal(first.clientId,client.id);
assert.equal(first.sourceRevision,assignment.submitted_at);
assert.equal(model(snapshot()).attention.length,1,'Old submissions have no age cutoff');
assert.equal(model(snapshot({clients:[{...client,status:'archived'}]})).attention.length,1,'Archiving is not acknowledgement');
assert.equal(signalTypeLabel(first.signalKey),first.reason,'History has a questionnaire label');
const archived=snapshot({clients:[{...client,status:'archived',next_review_date:'2020-01-01'}],sessions:[{id:'old-session',client_id:client.id,date:'2020-01-01',updated_at:'2020-01-01T10:00:00Z',vas_before:0,vas_after:5,readiness:1,sleep_quality:null}]});
assert.equal(model(archived).attention.length,1,'Archived questionnaire must not reopen unrelated historical signals or scheduled reviews');

const review={id:'review',client_id:client.id,signal_key:first.signalKey,outcome:'noted_no_change',contact_resolved_at:null};
const reviewed=snapshot({signalReviews:[review]});
assert.equal(model(reviewed).attention.length,0);
assert.equal(model(structuredClone(reviewed)).attention.length,0,'Reload preserves exact review identity');
assert.equal(reviewed.signalReviews.length,1,'Review stays in history');
assert.equal(model(snapshot({signalReviews:[review],questionnaireAssignments:[assignment,{...assignment,id:'assignment-b'}]})).attention.length,1,'Another assignment on same date is independent');
assert.equal(model(snapshot({signalReviews:[review],questionnaireAssignments:[{...assignment,submitted_at:'2026-10-26T10:00:00Z'}]})).attention.length,1,'Another submission revision is independent');
assert.equal(collectWorkspaceSignals({questionnaireOverview:{assignments:[assignment]},signalReviews:[]}).signals[0].signalKey,first.signalKey,'Card and queue use identical keys');
for(const status of ['assigned','in_progress','cancelled']) assert.equal(collectWorkspaceSignals({questionnaireOverview:{assignments:[{...assignment,status,submitted_at:null}]}}).signals.length,0);
assert.throws(()=>model(snapshot({questionnaireAssignments:[{...assignment,client_id:'foreign'}]})),/outside the snapshot/);
assert.throws(()=>model(snapshot({questionnaireAssignments:[{...assignment,submitted_at:null}]})),/submitted_at/);
assert.throws(()=>model(snapshot({questionnaireAssignments:[{...assignment,submitted_at:'invalid'}]})),/invalid submitted/);
const contract=getTrainerAttentionReadContract().questionnaireAssignments;
assert.deepEqual(contract.transfer,['id','client_id','status','submitted_at']);
assert.equal(contract.predicates.status,'eq.submitted');
assert.equal(contract.predicates['questionnaire_versions.questionnaire_templates.template_key'],'eq.pre_pwd_first_visit');
assert(!/answers|goal_snapshot|responses/.test(contract.select));
assert(!('limit' in contract.predicates));
assert(!('submitted_at' in contract.predicates),'No arbitrary history cutoff');
const reads=Object.fromEntries(Object.entries(snapshot()).map(([k,data])=>[k,{data,error:null}]));
reads.questionnaireAssignments.data=[{...assignment,answers:'must not enter queue'}];
assert(!('answers' in assembleTrainerAttentionSnapshot(reads).questionnaireAssignments[0]));
reads.questionnaireAssignments={data:[],error:new Error('questionnaire unavailable')};
assert.throws(()=>assembleTrainerAttentionSnapshot(reads),/questionnaireAssignments read failed/);

function repository(data=snapshot(),role='trainer',aal='aal2') {
 const calls=[];
 return {calls,auth:{getAuthenticatorAssuranceLevel:()=>aal,getProfile:async()=>({id:"11111111-1111-4111-8111-111111111111",role})},
 rest:async(table,{query})=>{
  calls.push({table,query});
  const key=Object.keys(getTrainerAttentionReadContract()).find(k=>getTrainerAttentionReadContract()[k].table===table);
  return Number(query.offset)>0?[]:data[key];
 }};
}
for(const [role,aal] of [['client','aal2'],['trainer','aal1']]){
 const repo=repository(snapshot(),role,aal);
 await assert.rejects(()=>loadTrainerAttention(repo,options),e=>e.status===403);
 assert.equal(repo.calls.length,0,'Denied roles never read the queue');
}
const repo=repository();
assert.equal((await loadTrainerAttention(repo,options)).model.attention.length,1);
assert(repo.calls.some(c=>c.table==='questionnaire_assignments'&&c.query.order==='id.asc'&&c.query.limit==='200'));
const failure=repository();const read=failure.rest;
failure.rest=async(table,args)=>{if(table==='questionnaire_assignments')throw new Error('source unavailable');return read(table,args);};
const state={trainerAttentionEnabled:true,repository:failure,config:{mode:'staging'},trainerAttention:model(snapshot())};
const controller=new TrainerAttentionController(state,{render:()=>{}});
await assert.rejects(()=>controller.refresh(),/source unavailable/);
assert.equal(state.trainerAttention,null,'Stale or quiet model must not survive read failure');
assert(state.trainerAttentionError);

const persisted=[];
const state2={trainerAttentionEnabled:true,repository:repo,profile:{id:'11111111-1111-4111-8111-111111111111'}};
repo.saveSignalReview=async(actor,clientId,key,outcome)=>{persisted.push({actor,clientId,key,outcome});return review;};
const controller2=new TrainerAttentionController(state2,{render:()=>{},withWrite:async(label,write)=>write(),loadWorkspace:async id=>{state2.activeClientId=id;},refreshInquiry:async()=>{}});
await controller2.openClient(client.id);
assert.equal(persisted.length,0,'Opening context is not a review');
await controller2.review(first,'noted_no_change');
assert.deepEqual(persisted,[{actor:'11111111-1111-4111-8111-111111111111',clientId:client.id,key:first.signalKey,outcome:'noted_no_change'}]);
repo.rest=repository(snapshot({questionnaireAssignments:[{...assignment,submitted_at:'2026-10-26T11:00:00Z'}]})).rest;
await assert.rejects(()=>controller2.review(first,'noted_no_change'),/Sprawa zmieniła się/);
assert.equal(persisted.length,1,'Stale UI cannot acknowledge newer submission');

const transportCalls=[];
const realRepo=new StudioLasRepository({supabaseUrl:'https://fixture.invalid'},{request:async(path,args)=>{transportCalls.push({path,args});return [];}});
await realRepo.rest('questionnaire_assignments',{query:{select:contract.select}});
await assert.rejects(()=>realRepo.rest('questionnaire_assignments',{method:'POST',body:{}}),/Table is not available/);
await realRepo.saveSignalReview('11111111-1111-4111-8111-111111111111',client.id,first.signalKey,'noted_no_change');
assert.equal(transportCalls[1].args.body.signal_key,first.signalKey);
assert(first.signalKey.length<500);
const migration=readFileSync(new URL('../supabase/migrations/20260904150825_decision_state_integrity_v1.sql',import.meta.url),'utf8');
assert(migration.includes('unique (client_id, signal_key)'));
assert(migration.includes('actor_profile_id = private.current_profile_id()'));
assert(migration.includes('private.trainer_owns_client(client_id)'));
console.log('QUESTIONNAIRE_ATTENTION_PASS: history, resubmission, isolation, AAL2/role, fail-closed reads, review persistence transport and stale action protection (offline).');
