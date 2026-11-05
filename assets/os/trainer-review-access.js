const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UI capability derived from existing client ownership; RLS remains authoritative.
export const OWNER_REVIEW_MESSAGE = "Przegląd zapisuje właściciel klienta";

export function trainerCanReviewClient(client, profile) {
  if (!profile || typeof profile.id !== "string" || !PROFILE_ID.test(profile.id) || !profile.role) {
    throw new Error("Nie udało się potwierdzić profilu trenera.");
  }
  if (profile.role !== "trainer") return false;
  if (!client || typeof client.id !== "string" || !client.id.trim()
    || typeof client.owner_trainer_id !== "string" || !PROFILE_ID.test(client.owner_trainer_id)) {
    throw new Error("Nie udało się potwierdzić właściciela klienta. Odśwież widok.");
  }
  return client.owner_trainer_id === profile.id;
}

export async function assertCurrentReviewOwner(repository, clientId, expectedProfileId) {
  if (repository.auth.getAuthenticatorAssuranceLevel() !== "aal2") throw new Error("Wymagana sesja trenera AAL2.");
  const profile = await repository.auth.getProfile();
  if (profile?.id !== expectedProfileId) throw new Error("Sesja zmieniła się. Odśwież widok.");
  const rows = await repository.rest("clients", {query:{id:`eq.${clientId}`,select:"id,owner_trainer_id",limit:1}});
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== clientId) throw new Error("Nie udało się potwierdzić właściciela klienta. Odśwież widok.");
  if (!trainerCanReviewClient(rows[0], profile)) throw new Error(OWNER_REVIEW_MESSAGE);
  if (repository.auth.getAuthenticatorAssuranceLevel() !== "aal2") throw new Error("Wymagana sesja trenera AAL2.");
}
