import { withSupabase } from "npm:@supabase/server@^1";

const QA_TRAINER_AUTH_USER_ID = "2058e0e7-5429-40f7-8a48-2f074420797b";
const QA_TRAINER_PROFILE_ID = "ea3363ac-c4a6-4b4a-b8b5-6150a1ec6e5d";
const QA_CLIENT_AUTH_USER_ID = "a4000000-0000-4000-8000-000000000002";
const QA_CLIENT_EMAIL = "release-e2e-client-a-20260910@example.invalid";
const MARKER_PATTERN = /^E2E-GHA-[A-Za-z0-9_-]{1,80}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ActorProfile = { id: string; role: string };
type RpcResult = { data: unknown; error: unknown };
type QaRpcClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult>;
};

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Qa!${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}9a`;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid payload`);
  }
  return value as Record<string, unknown>;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

    const actorAuthUserId = String(ctx.userClaims?.id || ctx.jwtClaims?.sub || "");
    const actorAal = String(ctx.jwtClaims?.aal || "");
    if (actorAuthUserId !== QA_TRAINER_AUTH_USER_ID || actorAal !== "aal2") {
      return response({ error: "qa_trainer_aal2_required" }, 403);
    }

    try {
      const { data: rawActorProfile, error: profileError } = await ctx.supabaseAdmin
        .from("profiles")
        .select("id,role")
        .eq("auth_user_id", actorAuthUserId)
        .maybeSingle();
      if (profileError) throw profileError;
      const actorProfile = rawActorProfile as unknown as ActorProfile | null;
      if (actorProfile?.id !== QA_TRAINER_PROFILE_ID || actorProfile?.role !== "trainer") {
        return response({ error: "qa_trainer_profile_required" }, 403);
      }

      const qaDb = ctx.supabase as unknown as QaRpcClient;
      const body = await req.json();
      const action = String(body?.action || "");
      const marker = String(body?.marker || "");
      if (!MARKER_PATTERN.test(marker)) return response({ error: "invalid_marker" }, 400);

      if (action === "prepare") {
        const password = randomPassword();
        const { data: updatedUser, error: passwordError } = await ctx.supabaseAdmin.auth.admin.updateUserById(
          QA_CLIENT_AUTH_USER_ID,
          { password }
        );
        if (passwordError || String(updatedUser?.user?.email || "").toLowerCase() !== QA_CLIENT_EMAIL) {
          throw passwordError || new Error("QA client auth identity mismatch");
        }

        const { data: rawFixture, error: fixtureError } = await qaDb.rpc("prepare_questionnaire_e2e_db", {
          p_marker: marker
        });
        if (fixtureError) throw fixtureError;
        const fixture = asRecord(rawFixture, "prepare_questionnaire_e2e_db");

        return response({
          fixture: {
            ...fixture,
            clientEmail: QA_CLIENT_EMAIL,
            clientPassword: password
          }
        });
      }

      if (action === "cleanup") {
        const assignmentId = String(body?.assignmentId || "");
        if (!UUID_PATTERN.test(assignmentId)) return response({ error: "invalid_assignment_id" }, 400);

        const { data: cleanup, error: cleanupError } = await qaDb.rpc("cleanup_questionnaire_e2e_db", {
          p_assignment_id: assignmentId,
          p_marker: marker
        });
        if (cleanupError) throw cleanupError;

        const { error: passwordError } = await ctx.supabaseAdmin.auth.admin.updateUserById(
          QA_CLIENT_AUTH_USER_ID,
          { password: randomPassword() }
        );
        if (passwordError) throw passwordError;
        return response({ cleanup });
      }

      return response({ error: "unsupported_action" }, 400);
    } catch (error) {
      console.error("questionnaire E2E fixture failure", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error)
      });
      return response({ error: "questionnaire_e2e_fixture_failed" }, 500);
    }
  })
};
