import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get all users from auth.users
    const { data: authUsers, error: authError } =
      await supabaseClient.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Error fetching auth users: ${authError.message}`);
    }

    // Update profiles with emails
    let updatedCount = 0;
    for (const user of authUsers.users) {
      if (user.id && user.email) {
        const { error } = await supabaseClient.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        if (!error) {
          updatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${updatedCount} user emails`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
