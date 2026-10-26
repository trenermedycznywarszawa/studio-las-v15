import assert from 'node:assert/strict';
import {trainerCanReviewClient,assertCurrentReviewOwner} from '../assets/os/trainer-review-access.js';
import {buildTrainerAttentionModel} from '../assets/os/trainer-attention-model.js';
import {loadTrainerAttention} from '../assets/os/trainer-attention-runtime.js';
const owner={id:'11111111-1111-4111-8111-111111111111',role:'trainer'},shared={id:'22222222-2222-4222-8222-222222222222',role:'trainer'},clientProfile={id:'33333333-3333-4333-8333-333333333333',role:'client'};
const client={id:'synthetic-client',name:'Synthetic',status:'active',owner_trainer_id:owner.id,stage:1,next_session_date:null,next_review_date:null};
const assignment={id:'assignment',client_id:client.id,status:'submitted',submitted_at:'2026-10-25T10:00:00Z'};
const snapshot={clients:[client],sessions:[],trainingLoad:[],preSessionChecks:[],guidanceEvents:[],signalReviews:[],questionnaireAssignments:[assignment]};
const model=(profile,data=snapshot)=>buildTrainerAttentionModel(data,{today:'2026-10-26',trainerProfile:profile});
assert.equal(trainerCanReviewClient(client,owner),true);
assert.equal(trainerCanReviewClient(client,shared),false);
assert.equal(trainerCanReviewClient(client,clientProfile),false);
const item=model(owner).attention[0];assert(item.canReview);
assert.equal(model(shared).attention.length,0);
assert.throws(()=>model(clientProfile),/current trainer profile/);
const review={id:'review',client_id:client.id,signal_key:item.signalKey,outcome:'noted_no_change',contact_resolved_at:null};
assert.equal(model(owner,{...snapshot,signalReviews:[review]}).attention.length,0);
assert.equal(model(shared,{...snapshot,signalReviews:[]}).attention.length,0,'No permanent task when owner review is private');
assert.equal(model(shared,{...snapshot,signalReviews:[{...review,outcome:'contact_required'}]}).attention.length,0,'No questionnaire contact reconstruction for nonowner');
for(const value of [undefined,null,'','not-a-profile-id']){
 assert.throws(()=>model(owner,{...snapshot,clients:[{...client,owner_trainer_id:value}]}),/owner_trainer_id/);
 assert.throws(()=>trainerCanReviewClient({...client,owner_trainer_id:value},owner),/właściciela/);
}
assert.throws(()=>model(undefined),/current trainer profile/);
assert.throws(()=>model({...owner,id:'invalid'},{...snapshot,clients:[],questionnaireAssignments:[]}),/current trainer profile/);
assert.throws(()=>model(owner,{...snapshot,clients:[client,{...client,owner_trainer_id:shared.id}]}),/ambiguous owner/);
assert.throws(()=>trainerCanReviewClient(client,{id:'malformed',role:'trainer'}),/profilu/);
let reads=0;
function repo(profile,rows=[client],aal='aal2') {return {auth:{getProfile:async()=>profile,getAuthenticatorAssuranceLevel:()=>aal},rest:async(table,args)=>{assert.equal(table,'clients');assert.equal(args.query.select,'id,owner_trainer_id');reads++;return rows;}};}
await assertCurrentReviewOwner(repo(owner),client.id,owner.id);
await assert.rejects(()=>assertCurrentReviewOwner(repo(shared),client.id,shared.id),/właściciel/);
await assert.rejects(()=>assertCurrentReviewOwner(repo(owner,[]),client.id,owner.id),/właściciela/);
await assert.rejects(()=>assertCurrentReviewOwner(repo(owner,[{...client,id:'another'}]),client.id,owner.id),/właściciela/);
await assert.rejects(()=>assertCurrentReviewOwner(repo(owner),client.id,shared.id),/Sesja zmieniła/);
await assert.rejects(()=>assertCurrentReviewOwner(repo(owner,[client],'aal1'),client.id,owner.id),/AAL2/);
let clientReads=0;await assert.rejects(()=>loadTrainerAttention({auth:{getAuthenticatorAssuranceLevel:()=> 'aal2',getProfile:async()=>clientProfile},rest:async()=>{clientReads++;return[];}}),e=>e.status===403);assert.equal(clientReads,0);
console.log('REVIEW_ACCESS_MATRIX_PASS — owner/shared/client; owner validation, private history, new session and fresh write guard.');
