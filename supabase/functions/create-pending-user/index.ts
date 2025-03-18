import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get the request body
    const { userId, email, fullName, department } = await req.json();

    // Validate required fields
    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "User ID and email are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Check if user already exists in pending_users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("pending_users")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingUser) {
      // User already exists, return success
      return new Response(
        JSON.stringify({ success: true, data: existingUser }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Insert the pending user with the service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("pending_users")
      .insert({
        id: userId,
        email: email,
        full_name: fullName || null,
        department: department || null,
        status: "pending",
      })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
