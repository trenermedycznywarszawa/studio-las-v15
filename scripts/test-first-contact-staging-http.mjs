// Staging only. Enable staging ingress explicitly first; remove this run's fixtures afterwards.
// No credentials, production requests, or notification messages are sent by this script.
import assert from 'node:assert/strict';
const url='https://ulauyoqjoetjqktegeuq.supabase.co/functions/v1/public-inquiry-ingress';
const prefix=process.env.STUDIO_LAS_TEST_PREFIX;
if(!/^pr102-http-[a-z0-9-]{8,50}$/.test(prefix||'')) throw Error('Unique STUDIO_LAS_TEST_PREFIX required');
const origin='https://trenermedycznywarszawa.github.io';
const base={requestId:prefix+'-email',name:'Test syntetyczny PR102',phone:null,email:'pr102@example.invalid',contactMethod:'email',preferredContactWindow:null,broadGoals:[],personWords:null,contactConsent:true,formVersion:'first-contact-v2',privacyNoticeVersion:'first-contact-consent-v1',honeypot:''};
let count=0;
async function post(label,payload,status,requestOrigin=origin){
 const res=await fetch(url,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 assert.equal(res.status,status,`${label}: unexpected HTTP status`); count++;
 console.log(`PASS ${label}: HTTP ${res.status}`);
}
await post('invalid then retry',{...base,email:'invalid'},400);
await post('email zero goals',base,202);
await post('duplicate request',base,202);
await post('phone multiple goals',{...base,requestId:prefix+'-phone',email:null,phone:'600123456',contactMethod:'phone',preferredContactWindow:'before_12',broadGoals:['start_or_return','weight_figure']},202);
await post('SMS',{...base,requestId:prefix+'-sms',email:null,phone:'600123456',contactMethod:'sms'},202);
const v1={...base,requestId:prefix+'-v1',phone:'600123456',email:null,preferredContactWindow:'16:00–18:00',broadGoal:'Siła i kondycja po przerwie',formVersion:'first-contact-v1'};
delete v1.contactMethod;delete v1.broadGoals;
await post('legacy v1',v1,202);
await post('free message rejected',{...base,personWords:'synthetic'},400);
await post('unknown goal rejected',{...base,broadGoals:['unknown']},400);
await post('JSON null',null,400);
await post('forbidden origin',base,403,'https://example.invalid');
await post('fifth allowed request',{...base,requestId:prefix+'-fifth'},202);
await post('rate limit',{...base,requestId:prefix+'-limited'},429);
console.log(`PASS ${count} staging HTTP cases. Verify five exact fixture rows and cleanup; no trainer UI or notification delivery claim.`);
