import { collectTrainerAttentionPages } from "./trainer-attention-snapshot.js";
export function loadReportGuidanceEvents(repository, clientId) {
  return collectTrainerAttentionPages(({offset,limit})=>repository.rest("guidance_events", {query:{
    client_id:`eq.${clientId}`, deleted_at:"is.null", kind:"in.(client_checkin,client_contact_request)",
    select:"id,client_id,home_plan_item_id,event_date,kind,payload,created_at,updated_at", order:"id.asc", offset, limit
  }}));
}
