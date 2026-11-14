import { button, create, field, formatDate, statusBox, submitForm } from "./common.js";
export function clientContactForm(item,model) {
  const entry=model.contactStates?.[item.id];
  const saved=(model.snapshot?.contactRequests || []).filter(row=>row.homePlanItemId===item.id);
  if(entry?.receipt && !saved.some(row=>row.id===entry.receipt.id)) saved.unshift(entry.receipt);
  const content=[];
  if(saved.length) content.push(create("details",{},[
    create("summary",{text:`Wysłane pytania (${saved.length})`}),
    ...saved.map(row=>create("div",{className:"record"},[
      create("p",{text:row.text}),create("p",{className:"muted",text:`Zapisano · ${formatDate(row.savedAt)}`})
    ]))
  ]));
  if(entry?.status==="saved") content.push(statusBox("Pytanie zapisane. Jest dostępne dla Damiana.","ok"));
  if(entry?.status==="saving") content.push(statusBox("Zapisywanie pytania…"));
  else if(entry?.status==="uncertain") content.push(statusBox(entry.message,"error"),create("p",{text:entry.question}),
    button("Sprawdź i ponów pytanie",{onclick:()=>model.onRetryContact(item.id),disabled:model.loading}));
  else if(["editing","failed"].includes(entry?.status)) {
    const form=submitForm([field("Treść pytania", "question", "textarea", {required:true,maxlength:500,rows:3,value:entry.question || ""})],
      "Wyślij pytanie",values=>model.onSendContact(item.id,values.question),"form-grid",{disabled:model.loading});
    form.querySelector("textarea").addEventListener("input",event=>model.onContactDraft(item.id,event.target.value));
    if(entry.message) content.push(statusBox(entry.message,"error"));
    content.push(form);
  } else if(model.snapshot?.homePlan?.items?.some(row=>row.id===item.id)) content.push(
    button("Mam pytanie / potrzebuję kontaktu",{onclick:()=>model.onStartContact(item.id),disabled:model.loading}));
  return create("section",{className:"client-contact","data-item-id":item.id},content);
}
