import { create, detailsForm, field, formatDate, recordList, submitForm } from "./common.js";

function additionForm(event, model, kind) {
  const correction = kind === "correction";
  return submitForm([
    field(correction ? "Uzupełnienie wypowiedzi klienta" : "Interpretacja trenera", "body", "textarea", { required: true, maxlength: 2000 }),
    ...(correction ? [field("Powód korekty / źródło wyjaśnienia", "reason", "textarea", { required: true, maxlength: 500 })] : [])
  ], "Dodaj osobny zapis", values => model.onAddObservationNote(event.id, { ...values, kind }));
}

export function observationHistory(workspace, model) {
  return detailsForm("Odpowiedzi klienta i osobne uzupełnienia", create("section", {}, [
    create("p", { className: "muted", text: "Oryginalna odpowiedź pozostaje bez zmian. Korekta wyjaśnia wypowiedź; interpretacja opisuje ocenę trenera." }),
    recordList(workspace.guidanceEvents, event => {
      const item = (workspace.homePlanItems || []).find(row => row.id === event.home_plan_item_id);
      const payload = event.payload || {};
      return create("article", { className: "record" }, [
        create("h4", { text: `${formatDate(event.event_date)} · ${item?.name || "Odpowiedź do wskazówki"}` }),
        create("strong", { text: "Oryginalna odpowiedź klienta" }),
        create("p", { text: [event.completed === true ? "Wykonane" : event.completed === false ? "Niewykonane" : "",
          payload.energyScore != null ? `Energia: ${payload.energyScore}/10` : "",
          payload.symptomScore != null ? `Dolegliwości: ${payload.symptomScore}/10` : "", payload.note].filter(Boolean).join(" · ") }),
        item ? create("p", { className: "muted", text: `Ówczesna wskazówka: ${[item.dosage, item.stop_criteria].filter(Boolean).join(" · ")}` }) : null,
        recordList([...(event.guidance_observation_notes || [])].sort((a,b) => a.created_at.localeCompare(b.created_at)), note => create("div", { className: "record" }, [
          create("strong", { text: `${note.kind === "correction" ? "Korekta / wyjaśnienie" : "Interpretacja trenera"} · ${formatDate(note.created_at)}` }),
          create("p", { className: "muted", text: `Autor: ${note.profiles?.display_name || "Trener"} · ${new Date(note.created_at).toLocaleString("pl-PL")}` }),
          detailsForm("Identyfikator autora zapisu", create("p", { text: note.created_by })),
          create("p", { text: note.body }),
          note.reason ? create("p", { text: `Powód: ${note.reason}` }) : null
        ]), "Brak osobnych uzupełnień."),
        detailsForm("Dodaj korektę z powodem", additionForm(event, model, "correction")),
        detailsForm("Dodaj interpretację trenera", additionForm(event, model, "trainer_interpretation"))
      ]);
    }, "Brak odpowiedzi klienta.")
  ]));
}
