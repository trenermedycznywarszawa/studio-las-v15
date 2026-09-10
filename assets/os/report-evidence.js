export const REPORT_QUESTIONS = Object.freeze({
 start_goal: "Co było ważne dla tej osoby na początku?",
 start_capability: "Co mogła robić, a co ją ograniczało?",
 change: "Co się zmieniło — w odniesieniu do wybranych źródeł?",
 interpretation: "Interpretacja Damiana — co wynika z tych informacji?",
 decision: "Decyzja Damiana — co z tego wynika dla prowadzenia?",
 current_capability: "Co ta osoba może teraz robić w ważnej dla niej sytuacji?",
 next_step: "Co dalej i kiedy wracamy do oceny?"
});
export const EVIDENCE_LABELS = Object.freeze({sessions:"Sesja / PWD",assessment_results:"Obserwacja ruchowa",guidance_events:"Oryginalna odpowiedź klienta",body_measurements:"Kontekst pomiaru",training_load_observations:"Kontekst obciążenia"});
export function reportCandidates(workspace) {
 const groups = [
  ["sessions",workspace.sessions,"date",row=>[row.trainer_observation,row.trainer_decision,row.client_summary]],
  ["assessment_results",workspace.assessments,"performed_at",row=>[row.test_name,row.result_text,row.interpretation]],
  ["guidance_events",workspace.guidanceEvents,"event_date",row=>[row.payload?.note || row.payload?.response]],
  ["body_measurements",workspace.measurements,"measured_at",row=>[row.trainer_interpretation,row.client_summary]],
  ["training_load_observations",workspace.trainingLoad,"observed_at",row=>[row.trainer_note,row.client_summary]]
 ];
 return groups.flatMap(([table,rows,date,parts])=>(rows||[]).map(row=>({table,id:row.id,updated_at:row.updated_at,date:row[date],excerpt:parts(row).filter(Boolean).join("\n")})))
  .filter(item=>item.id && item.date && item.updated_at && item.excerpt.trim())
  .sort((a,b)=>String(a.date).localeCompare(String(b.date)) || a.id.localeCompare(b.id));
}
export function reportInput(values, candidates) {
 const sources=candidates.filter((_,index)=>values[`evidence_${index}`]===true).map(({table,id,updated_at})=>({table,id,updated_at}));
 if(sources.length<3 || sources.length>7) { const error=new Error("Wybierz od 3 do 7 datowanych źródeł."); error.displayMessage=error.message; error.status=400; throw error; }
 return {title:values.title,report:Object.fromEntries([...Object.keys(REPORT_QUESTIONS),"client_material"].map(key=>[key,String(values[key]||"").trim()])),sources};
}
