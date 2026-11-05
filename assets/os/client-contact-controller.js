// Transient drafts only. Confirmed receipts are reloaded from the authorized projection.
export class ClientContactController {
  constructor(portal) { this.portal=portal; this.states={}; }
  reset() { this.states={}; }
  reconcile(snapshot) {
    for(const entry of Object.values(this.states)) {
      const receipt=(snapshot.contactRequests || []).find(row=>row.id===entry.submissionId);
      if(receipt) { entry.receipt=receipt; entry.status="saved"; }
    }
  }
  start(itemId) {
    const entry=this.states[itemId];
    if(entry && ["editing","saving","uncertain","failed"].includes(entry.status)) return;
    if(!this.portal.snapshot?.homePlan?.items?.some(row=>row.id===itemId)) return;
    this.states[itemId]={status:"editing",question:""}; this.portal.emit();
  }
  draft(itemId,text) { const entry=this.states[itemId]; if(entry && ["editing","failed"].includes(entry.status)) entry.question=text; }
  async submit(itemId,text) {
    const portal=this.portal, previous=this.states[itemId];
    if(portal.disposed || previous?.status==="saving" || previous?.status==="saved") return;
    const item=portal.snapshot?.homePlan?.items?.find(row=>row.id===itemId);
    if(!item && previous?.status!=="uncertain") return;
    const entry=previous?.status==="uncertain" ? previous : {
      homePlanItemId:itemId,homePlanId:portal.snapshot.homePlan.id,
      question:String(text ?? previous?.question ?? "").trim(),submissionId:portal.makeId()
    };
    if(!entry.question || entry.question.length>500) return;
    entry.status="saving"; entry.message=""; this.states[itemId]=entry; portal.emit();
    try {
      const receipt=await portal.repository.saveClientContactRequest(entry);
      if(portal.disposed) return;
      if(!receipt?.id || receipt.id!==entry.submissionId || !receipt.savedAt) throw Error("Missing question receipt");
      entry.receipt=receipt; entry.status="saved"; portal.emit();
    } catch(error) {
      if(portal.disposed) return;
      const status=Number(error.status || 0);
      if([401,403].includes(status)) {
        portal.snapshot=null; portal.responses={}; this.reset(); portal.error="Nie można potwierdzić dostępu. Zaloguj się ponownie.";
      } else {
        entry.status=status>=400 && status<500 && ![408,409,429].includes(status)?"failed":"uncertain";
        entry.message=entry.status==="failed"?"Nie zapisano pytania. Treść została zachowana. Odśwież ustalenia i spróbuj ponownie.":"Nie udało się potwierdzić zapisu. Ponów tę samą próbę — nie powstanie drugie zgłoszenie.";
      }
      portal.emit(); return;
    }
    await portal.load();
  }
  async retry(itemId) {
    await this.portal.load();
    if(!this.portal.error && this.states[itemId]?.status==="uncertain") await this.submit(itemId);
  }
}
