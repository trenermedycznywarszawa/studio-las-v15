// Local contract tests: real handler, mocked RPC and notification transport. No network or secrets.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../supabase/functions/public-inquiry-ingress/index.ts', import.meta.url), 'utf8');
let handler, rpcStatus = 'created', calls = [], notifications = [], production = false;
const context = {
  Request, Response, FormData, AbortSignal, TextEncoder, crypto, console,
  Deno: { serve: fn => { handler = fn; }, env: { get: key => key === 'SUPABASE_URL'
    ? (production ? 'https://ufcumhbnuyernuwepcij.supabase.co' : 'https://example.invalid') : 'synthetic-test-secret' } },
  createClient: () => ({ rpc: async (name, payload) => { calls.push({name,payload}); return {data:{status:rpcStatus},error:null}; } }),
  fetch: async (url, options) => { notifications.push({url,fields:Object.fromEntries(options.body)}); return new Response('{}'); }
};
vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/, '')), context);
const origin = 'https://trenermedycznywarszawa.github.io';
const base = {requestId:'synthetic-request-102',name:'Osoba Testowa',phone:null,email:'fixture@example.com',
  contactMethod:'email',preferredContactWindow:null,broadGoals:[],personWords:null,
  contactConsent:true,privacyNoticeVersion:'first-contact-consent-v1',formVersion:'first-contact-v2',honeypot:''};
let passed=0;
async function check(label, body, expected, overrides={}) {
  const before=calls.length;
  const result=await handler(new Request('https://example.invalid',{
    method:'POST',headers:{origin,'content-type':'application/json','x-real-ip':'192.0.2.1',...overrides},body:JSON.stringify(body)}));
  assert.equal(result.status,expected,label);
  if(expected>=400 && expected<500 && expected!==429) assert.equal(calls.length,before,`${label}: RPC must not run`);
  passed++; return result;
}
await check('email without goals',base,202);
assert.equal(calls.at(-1).payload.p_phone,null);
await check('phone with multiple goals',{...base,email:null,phone:'600123456',contactMethod:'phone',preferredContactWindow:'before_12',broadGoals:['start_or_return','weight_figure']},202);
assert.equal(calls.at(-1).payload.p_broad_goals.length,2);
await check('SMS',{...base,email:null,phone:'600123456',contactMethod:'sms'},202);
for(const [label,patch] of [['bad email',{email:'invalid'}],['mixed contacts',{phone:'600123456'}],['unknown goal',{broadGoals:['unknown']}],['duplicate goals',{broadGoals:['weight_figure','weight_figure']}],['numeric name',{name:42}],['object phone',{phone:{}}],['free message',{personWords:'synthetic message'}],['consent missing',{contactConsent:false}],['unknown property',{admin:true}]]) await check(label,{...base,...patch},400);
await check('JSON null',null,400);
await check('array',[],400);
await check('forbidden origin',base,403,{origin:'https://example.invalid'});
await check('oversize',{...base,name:'a'.repeat(9000)},413);
const v1={...base,phone:'600123456',email:null,preferredContactWindow:'16:00–18:00',broadGoal:'Siła i kondycja po przerwie',formVersion:'first-contact-v1',personWords:'synthetic v1 message'};
delete v1.contactMethod; delete v1.broadGoals;
await check('legacy v1',v1,202);
assert.equal(calls.at(-1).name,'ingest_public_inquiry');
await check('v1 overlong optional email',{...v1,email:'x'.repeat(321)},400);
await check('v1 overlong message',{...v1,personWords:'x'.repeat(281)},400);
rpcStatus='duplicate'; await check('idempotent response',base,202);
rpcStatus='rate_limited'; const limited=await check('rate limit',base,429); assert.equal(limited.headers.get('retry-after'),'900');
rpcStatus='unavailable'; await check('disabled ingress',base,503);
rpcStatus='created'; production=true; await check('production notification payload',base,202);
assert.equal(notifications.length,1);
assert.deepEqual(notifications[0].fields,{'_subject':'Studio Las — nowy pierwszy kontakt','Powiadomienie':'Nowy pierwszy kontakt w Studio Las OS'});
rpcStatus='duplicate'; await check('duplicate does not notify',base,202); assert.equal(notifications.length,1);
console.log(`PASS ${passed} local Edge contract cases; RPC and delivery mocked, no HTTP E2E claim.`);
