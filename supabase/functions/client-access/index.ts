import { withSupabase } from "npm:@supabase/server@^1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_USER_PAGES = 20;
const USERS_PER_PAGE = 200;

type ActorProfile = {
  id: string;
  role: "trainer" | "client";
};

type ClientRecord = {
  id: string;
  email: string | null;
  status: string;
  deleted_at: string | null;
  owner_trainer_id: string;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type ClientProfile = {
  id: string;
  role: "trainer" | "client";
};

type ActiveLink = {
  client_id: string;
  user_id: string;
};

type LinkResult = {
  link_status?: string;
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

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function allowedOrigin(req: Request) {
  const configured = String(Deno.env.get("STUDIO_LAS_ALLOWED_ORIGINS") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (configured.length === 0) return false;
  return configured.includes(origin);
}

async function findAuthUserByEmail(supabaseAdmin: any, email: string): Promise<AuthUser | null> {
  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE
    });

    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users as AuthUser[] : [];
    const match = users.find(user => normalizeEmail(user.email) === email);
    if (match) return match;
    if (users.length < USERS_PER_PAGE) break;
  }
  return null;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return response({ error: "method_not_allowed" }, 405);
    }

    if (!allowedOrigin(req)) {
      return response({ error: "origin_not_allowed" }, 403);
    }

    try {
      const body = await req.json();
      const action = String(body?.action || "");
      const clientId = String(body?.clientId || "");
      const actorAuthUserId = String(ctx.userClaims?.id || ctx.jwtClaims?.sub || "");
      const actorAal = String(ctx.jwtClaims?.aal || "");
      const admin = ctx.supabaseAdmin as any;
      const scoped = ctx.supabase as any;

      if (actorAal !== "aal2") {
        return response({ error: "mfa_aal2_required" }, 403);
      }

      if (!UUID_PATTERN.test(clientId) || !UUID_PATTERN.test(actorAuthUserId)) {
        return response({ error: "invalid_request" }, 400);
      }

      const { data: actorData, error: profileError } = await admin
        .from("profiles")
        .select("id,role")
        .eq("auth_user_id", actorAuthUserId)
        .maybeSingle();
      const actorProfile = actorData as ActorProfile | null;

      if (profileError) throw profileError;
      if (!actorProfile || actorProfile.role !== "trainer") {
        return response({ error: "trainer_required" }, 403);
      }

      const { data: clientData, error: clientError } = await admin
        .from("clients")
        .select("id,email,status,deleted_at,owner_trainer_id")
        .eq("id", clientId)
        .eq("owner_trainer_id", actorProfile.id)
        .is("deleted_at", null)
        .maybeSingle();
      const client = clientData as ClientRecord | null;

      if (clientError) throw clientError;
      if (!client) {
        return response({ error: "owner_client_not_found" }, 404);
      }

      if (action === "status") {
        const { data, error } = await scoped.rpc("trainer_client_access_status", {
          p_client_id: clientId
        });
        if (error) throw error;
        return response({ access: data });
      }

      if (action === "revoke") {
        const { data, error } = await admin.rpc("admin_revoke_client_account", {
          p_client_id: clientId,
          p_owner_trainer_id: actorProfile.id
        });
        if (error) throw error;

        return response({
          access: {
            status: "revoked",
            revokedLinks: Number(data || 0)
          }
        });
      }

      if (action !== "invite") {
        return response({ error: "unsupported_action" }, 400);
      }

      if (client.status !== "active") {
        return response({ error: "inactive_client" }, 409);
      }

      const requestedEmail = normalizeEmail(body?.email);
      const clientEmail = normalizeEmail(client.email);
      if (!EMAIL_PATTERN.test(requestedEmail) || requestedEmail.length > 320) {
        return response({ error: "valid_email_required" }, 400);
      }

      // Invitation must match the email stored on the owner-controlled client
      // record. This prevents a mistyped form value from granting access to a
      // different person.
      if (!clientEmail || requestedEmail !== clientEmail) {
        return response({ error: "email_must_match_client_record" }, 409);
      }

      const { data: targetLinkRows, error: targetLinkError } = await admin
        .from("client_users")
        .select("client_id,user_id")
        .eq("client_id", clientId)
        .eq("status", "active")
        .limit(1);
      if (targetLinkError) throw targetLinkError;
      const targetLink = (Array.isArray(targetLinkRows) ? targetLinkRows[0] : null) as ActiveLink | null;

      let authUser = await findAuthUserByEmail(admin, requestedEmail);
      let clientProfile: ClientProfile | null = null;

      if (authUser) {
        const { data: clientProfileData, error: clientProfileError } = await admin
          .from("profiles")
          .select("id,role")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (clientProfileError) throw clientProfileError;
        clientProfile = clientProfileData as ClientProfile | null;

        if (clientProfile?.role === "trainer") {
          return response({ error: "trainer_account_cannot_be_linked_as_client" }, 409);
        }

        if (clientProfile) {
          const { data: accountLinkRows, error: accountLinkError } = await admin
            .from("client_users")
            .select("client_id,user_id")
            .eq("user_id", clientProfile.id)
            .eq("status", "active")
            .limit(1);
          if (accountLinkError) throw accountLinkError;
          const accountLink = (Array.isArray(accountLinkRows) ? accountLinkRows[0] : null) as ActiveLink | null;

          if (accountLink && accountLink.client_id !== clientId) {
            return response({ error: "account_already_linked_revoke_first" }, 409);
          }
        }
      }

      if (targetLink && (!clientProfile || targetLink.user_id !== clientProfile.id)) {
        return response({ error: "client_already_linked_revoke_first" }, 409);
      }

      if (targetLink && clientProfile && targetLink.user_id === clientProfile.id) {
        return response({
          access: {
            status: "active",
            email: requestedEmail,
            invitationSent: false,
            existingAuthAccount: true
          }
        });
      }

      let invitationSent = false;
      if (!authUser) {
        const redirectTo = String(Deno.env.get("STUDIO_LAS_CLIENT_REDIRECT_URL") || "").trim();
        if (!redirectTo) {
          return response({ error: "client_redirect_not_configured" }, 503);
        }

        const { data: inviteData, error: inviteError } = await admin.auth.admin
          .inviteUserByEmail(requestedEmail, { redirectTo });

        if (inviteError) throw inviteError;
        authUser = (inviteData?.user || null) as AuthUser | null;
        invitationSent = true;
      }

      if (!authUser?.id || !UUID_PATTERN.test(String(authUser.id))) {
        throw new Error("Auth user was not created or resolved");
      }

      const { data: linkRows, error: linkError } = await admin.rpc(
        "admin_link_client_account",
        {
          p_client_id: clientId,
          p_owner_trainer_id: actorProfile.id,
          p_auth_user_id: authUser.id,
          p_email: requestedEmail
        }
      );

      if (linkError) throw linkError;
      const link = (Array.isArray(linkRows) ? linkRows[0] : linkRows) as LinkResult | null;

      return response({
        access: {
          status: link?.link_status || "active",
          email: requestedEmail,
          invitationSent,
          existingAuthAccount: !invitationSent
        }
      });
    } catch (error) {
      console.error("client-access failure", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error)
      });
      return response({ error: "client_access_operation_failed" }, 500);
    }
  })
};
