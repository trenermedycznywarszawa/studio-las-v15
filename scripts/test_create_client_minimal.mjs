import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {StudioLasRepository}=await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '../assets/os/data.js');
const owner='11111111-1111-4111-8111-111111111111';
function harness(mode='success'){
 const calls=[];let committed;
 const auth={request:async(path,options)=>{
  calls.push({path,options});
  if(options.method==='POST'){
   if(mode==='denied'||options.headers.Prefer!=='return=minimal') throw Object.assign(new Error('RLS'),{status:403,code:'42501'});
   committed=options.body;return null;
  }
  assert.ok(committed,'GET must follow completed INSERT');
  const query=new URL(path,'https://fixture.invalid').searchParams;
  assert.equal(query.get('id'),'eq.'+committed.id);
  if(mode==='get-error')throw Object.assign(new Error('Read failed'),{status:403});
  if(mode==='hidden')return [];
  return [{...committed,owner_trainer_id:mode==='wrong-owner'?'other':owner}];
 }};
 return {repo:new StudioLasRepository({supabaseUrl:'https://fixture.invalid'},auth),calls};
}
const input={name:'Synthetic client',email:'synthetic@example.invalid',engagementType:'diagnostic_visit'};
{
 const {repo,calls}=harness();const row=await repo.createClient(owner,input);
 assert.equal(calls.length,2);assert.equal(calls[0].options.method,'POST');assert.equal(calls[1].options.method,'GET');
 assert.equal(calls[0].options.headers.Prefer,'return=minimal');
 assert.equal(new URL(calls[0].path,'https://fixture.invalid').search,'');
 assert.match(row.id,/^[0-9a-f-]{36}$/);assert.equal(row.owner_trainer_id,owner);assert.equal(row.package,null);
}
{
 const {repo,calls}=harness('denied');await assert.rejects(repo.createClient(owner,input),e=>e.status===403&&e.code==='42501');assert.equal(calls.length,1);
}
for(const mode of ['hidden','get-error','wrong-owner']){
 const {repo,calls}=harness(mode);
 await assert.rejects(repo.createClient(owner,input),e=>e.code==='CLIENT_CREATED_READBACK_FAILED'&&e.creationCommitted===true&&e.clientId===calls[0].options.body.id);
 assert.equal(calls.filter(c=>c.options.method==='POST').length,1);assert.equal(calls.length,2);
}
console.log('PASS: success, denied INSERT, hidden row, failed GET, wrong owner; no POST retry. Offline transport tests only.');
