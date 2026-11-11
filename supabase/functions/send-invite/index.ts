import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } =
      await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerId = userData.user.id;

    // Service role client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { invitation_id, redirect_to } = await req.json();
    if (!invitation_id || !redirect_to) {
      return json({ error: "Missing invitation_id or redirect_to" }, 400);
    }

    const { data: invitation, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("id, email, role, status, channel, invited_by, invite_token")
      .eq("id", invitation_id)
      .maybeSingle();

    if (invError) throw invError;
    if (!invitation) return json({ error: "Convite não encontrado" }, 404);
    if (invitation.status !== "pending") {
      return json({ error: "Este convite não está mais pendente" }, 400);
    }
    if ((invitation.channel ?? "email") !== "email") {
      return json({ error: "Este convite não é do canal email" }, 400);
    }

    // Check caller's roles: owner/admin can send any invite, others only their own
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const callerRoleSet = new Set(
      (callerRoles ?? []).map((r: { role: string }) => r.role)
    );
    const isOwner = callerRoleSet.has("owner");
    const isAdmin = callerRoleSet.has("admin");

    if (!isOwner && !isAdmin && invitation.invited_by !== callerId) {
      return json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    // Creates the auth user and sends Supabase's "Invite user" email.
    // handle_new_user matches the pending invitation by email and assigns role/training.
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(invitation.email, {
        redirectTo: redirect_to,
        data: { invite_token: invitation.invite_token },
      });

    if (inviteError) {
      const alreadyExists =
        (inviteError as { code?: string }).code === "email_exists" ||
        /already (been )?registered|already exists/i.test(inviteError.message);
      return json(
        {
          error: alreadyExists
            ? "Já existe uma conta com este email."
            : inviteError.message,
        },
        alreadyExists ? 409 : 400
      );
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
