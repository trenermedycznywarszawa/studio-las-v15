import { processReviewPoints, processChanges } from "../process-history.js";
import { create, clear, detailsForm, formatDate, statusBox } from "./common.js";
function sourceRecord(row) {
  return create("article", {className:"record process-source"}, [
    create("strong", {text:`${row.label} · ${formatDate(row.date)}`}),
    create("p", {className:"preserve-lines",text:row.excerpt}),
    create("p", {className:"muted",text:`Źródło: ${row.table}/${row.id} · zapis lub uzupełnienie: ${new Date(row.recordedAt).toLocaleString("pl-PL")}`})
  ]);
}
export function processHistoryPanel(workspace) {
  if (workspace.sectionStatus?.reports !== "ready" || workspace.sectionStatus?.measurements !== "ready") return statusBox("Historia źródeł jest niepełna. Dokończ odczyt raportów i pomiarów, aby zobaczyć zmiany.");
  const points=processReviewPoints(workspace), list=create("div", {className:"process-changes"});
  const select=create("select", {"aria-label":"Pokaż zapisy od"}, [
    ...points.map(point=>create("option", {value:point.id,text:`${point.label} · ${formatDate(point.date)} · ${new Date(point.at).toLocaleTimeString("pl-PL")}`})),
    create("option", {value:"",text:"Początek zapisanej historii"})
  ]);
  function render() {
    const {recent,older}=processChanges(workspace,points.find(point=>point.id===select.value));
    clear(list);
    list.append(create("h4", {text:"Nowe lub uzupełnione zapisy"}));
    list.append(recent.length ? create("div",{},recent.map(sourceRecord)) : create("p",{text:"Brak nowych zapisów. Sam brak danych nie oznacza problemu."}));
    if(older.length) list.append(detailsForm(`Starszy kontekst (${older.length})`,create("div",{},older.map(sourceRecord))));
  }
  select.addEventListener("change",render);render();
  const link=create("a",{className:"button",href:"#trainer-reports",text:"Przejdź do materiału na raport"});
  link.addEventListener("click",()=>{const composer=document.querySelector(".report-composer");if(composer)composer.open=true;});
  return detailsForm("Co zapisano od spotkania lub przeglądu",create("div",{className:"process-history"},[
    create("p",{className:"muted",text:"Porównujemy czas zapisu lub uzupełnienia z wybranym punktem. Data przy źródle wskazuje, kiedy wydarzenie miało miejsce. To materiał do oceny, nie ocena postępu."}),
    select,list,link
  ]));
}
