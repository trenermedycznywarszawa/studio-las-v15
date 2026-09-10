import { collectAttentionSignals, signalIdentity, signalInstanceKey, signalTypeLabel, withoutReviewedSignals } from "./decision-support.js";
export function collectWorkspaceSignals(workspace = {}) {
 const signals = [
  ...(workspace.sessions || []).flatMap(session=>collectAttentionSignals({session}).signals),
  ...(workspace.trainingLoad || []).flatMap(trainingLoad=>collectAttentionSignals({trainingLoad}).signals),
  ...(workspace.preSessionChecks || []).flatMap(preSessionCheck=>collectAttentionSignals({preSessionCheck}).signals),
  ...(workspace.guidanceEvents || []).map(event=>{
   const source={id:"client-observation",source:"client-response",sourceDate:event.event_date,sourceId:event.id,sourceRevision:event.created_at};
   return {...source,signalKey:signalInstanceKey(source),level:"review",label:"Odpowiedź klienta do przeglądu",context:event.payload?.note || "Zapisana odpowiedź klienta.",trainerQuestion:"Czy ta informacja zmienia następne ustalenie?"};
  })
 ];
 const keys=new Set(signals.map(signal=>signal.signalKey));
 for(const review of workspace.signalReviews || []) {
  if(review.outcome==="contact_required" && !review.contact_resolved_at && !keys.has(review.signal_key)) {
   const source=signalIdentity(review.signal_key);
   signals.push({...source,signalKey:review.signal_key,level:"review",label:signalTypeLabel(review.signal_key),context:"Kontakt nadal wymaga potwierdzenia. Pierwotny przegląd pozostaje w historii.",trainerQuestion:"Co ustalono po kontakcie?"});
  }
 }
 const pendingKeys=new Set((workspace.signalReviews || []).filter(r=>r.outcome==="contact_required"&&!r.contact_resolved_at).map(r=>r.signal_key));
 const rank=s=>s.level==="urgent-review"?0:pendingKeys.has(s.signalKey)?1:s.level==="information"?3:2;
 signals.sort((a,b)=>rank(a)-rank(b) || String(b.sourceDate).localeCompare(String(a.sourceDate)));
 return withoutReviewedSignals({...collectAttentionSignals(),signals});
}
