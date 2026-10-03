import { button, checkbox, create, detailsForm, field, formatDate, panel, statusBox, submitForm } from "./common.js";
function itemView(item, actions) {
  const controls = [button("Otwórz kontekst", {onclick:() => actions.onOpenClientContext(item.clientId)})];
  if (item.contactReviewId) {
    controls.push(detailsForm("Kontakt zakończony", submitForm([
      field("Co ustalono po kontakcie?", "note", "textarea", {required:true,maxlength:1000}),
      ...(item.sourceChangedSinceContact ? [checkbox("Sprawdziłem zmieniony zapis", "confirmed", false, {required:true})] : [])
    ], "Kontakt zakończony", values => actions.onAttentionContact(item, values.note))));
  } else if (item.signalKey) {
    controls.push(button("Przejrzane · bez zmiany", {onclick:() => actions.onAttentionReview(item,"noted_no_change")}));
    controls.push(button("Potrzebny kontakt", {onclick:() => actions.onAttentionReview(item,"contact_required")}));
  }
  return create("article", {className:"record attention-case", "data-signal-key":item.signalKey || ""}, [
    create("h3", {text:item.client}), create("strong", {text:item.reason}), create("p", {text:item.context}),
    create("p", {className:"muted",text:`Źródło: ${item.source}`}),
    item.sourceChangedSinceContact ? statusBox("Zapis zmienił się od otwarcia kontaktu. Sprawdź aktualny kontekst.") : null,
    create("div", {className:"attention-actions"}, controls)
  ]);
}
export function trainerAttentionView(model, actions) {
  if (!model) return statusBox("Nie udało się wczytać spraw.", "error");
  return panel("Uwaga trenera", create("div", {className:"attention-queue"}, [
    create("p", {className:"muted",text:formatDate(model.today)}),
    model.attention.length ? create("div", {className:"signal-list"}, model.attention.map(item=>itemView(item,actions)))
      : create("p", {className:"attention-empty",text:"Brak spraw do przejrzenia."}),
    create("p", {className:"muted",text:"Historia przeglądów i kontaktów jest dostępna w karcie klienta."})
  ]));
}
