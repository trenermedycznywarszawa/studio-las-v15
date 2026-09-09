import { button, create, field, formatDate, statusBox, submitForm } from "./common.js";
export function clientResponseForm(item, model) {
  const entry = model.responseStates?.[item.id];
  const receipt = item.todayResponse || entry?.receipt;
  if (receipt) return create("section", {className:"client-response"}, [
    statusBox(`Odpowiedź zapisana · ${formatDate(receipt.eventDate)}`, "ok"),
    create("p", {text:receipt.text || (receipt.legacyCompleted === true ? "Zapisano wykonanie." : "Zapisano odpowiedź.")}),
    create("p", {className:"muted",text:"Jeśli chcesz coś wyjaśnić, skontaktuj się z Damianem. Oryginalna odpowiedź pozostaje bez zmian."})
  ]);
  if (entry?.status === "saving") return statusBox("Zapisywanie odpowiedzi…");
  if (entry?.status === "uncertain") return create("section", {}, [
    statusBox(entry.message,"error"), create("p",{text:entry.response}),
    button("Sprawdź i ponów ten sam zapis",{onclick:()=>model.onRetryResponse(item.id),disabled:model.loading})
  ]);
  return create("section", {className:"client-response"}, [
    create("p",{text:"Odpowiedź jest opcjonalna. Co się wydarzyło i czy jest coś, co Damian powinien wiedzieć?"}),
    create("p",{className:"muted",text:"Możesz opisać wykonanie zgodnie z ustaleniem, uzgodnioną krótszą wersję, przerwanie, brak próby lub to, że dziś wskazówka nie miała zastosowania."}),
    entry?.status === "failed" ? statusBox(entry.message,"error") : null,
    submitForm([field("Twoja odpowiedź — opcjonalnie", "response", "textarea", {required:true,maxlength:500,rows:2,value:entry?.response || ""})],
      "Zapisz odpowiedź", values=>model.onSaveCheckin(item.id,values.response),"form-grid",{disabled:model.loading})
  ]);
}
