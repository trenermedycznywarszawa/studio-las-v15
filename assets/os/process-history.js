import { reportCandidates } from "./report-evidence.js";
export function processReviewPoints(workspace) {
  const points = [
    ...(workspace.sessions || []).map(row => ({id:`session:${row.id}`, date:row.date, at:row.created_at, label:row.session_type === "pwd" ? "Zapis PWD" : "Zapis spotkania"})),
    ...(workspace.signalReviews || []).map(row => ({id:`review:${row.id}`,date:row.reviewed_at,at:row.reviewed_at,label:"Przegląd sygnału"})),
    ...(workspace.cycleDecisions || []).map(row => ({id:`decision:${row.id}`,date:row.decided_at,at:row.decided_at,label:"Decyzja po przeglądzie"}))
  ].filter(row => Number.isFinite(Date.parse(row.at)));
  return points.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at) || a.id.localeCompare(b.id));
}
export function processChanges(workspace, point) {
  const records = reportCandidates(workspace);
  const cutoff = point ? Date.parse(point.at) : -Infinity;
  return {
    recent: records.filter(row=>Date.parse(row.recordedAt)>cutoff).sort((a,b)=>Date.parse(b.recordedAt)-Date.parse(a.recordedAt)),
    older: records.filter(row=>!(Date.parse(row.recordedAt)>cutoff))
  };
}
