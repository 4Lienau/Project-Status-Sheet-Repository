/**
 * Sync Scheduler Edge Function
 *
 * This function runs every hour and checks if any scheduled syncs are due to run.
 * It reads the sync_configurations table and triggers the appropriate sync functions.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
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
    console.log("Sync Scheduler started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all enabled sync configurations that are due to run
    const { data: syncConfigs, error } = await supabase
      .from("sync_configurations")
      .select("*")
      .eq("is_enabled", true)
      .lte("next_run_at", new Date().toISOString());

    if (error) {
      console.error("Error fetching sync configurations:", error);
      throw error;
    }

    const results = [];

    for (const config of syncConfigs || []) {
      console.log(`Processing sync: ${config.sync_type}`);

      try {
        let functionName = "";

        switch (config.sync_type) {
          case "azure_ad_sync":
            functionName = "supabase-functions-azure-ad-sync";
            break;
          // Add other sync types here as needed
          default:
            console.log(`Unknown sync type: ${config.sync_type}`);
            continue;
        }

        // Update the sync configuration before triggering
        const nextRunTime = new Date();
        nextRunTime.setHours(nextRunTime.getHours() + config.frequency_hours);

        const { error: updateError } = await supabase
          .from("sync_configurations")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunTime.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        if (updateError) {
          console.error(
            `Error updating sync config for ${config.sync_type}:`,
            updateError,
          );
        }

        // Trigger the sync function
        const { data: syncResult, error: syncError } =
          await supabase.functions.invoke(functionName, {
            body: { manual: false, scheduled: true },
          });

        if (syncError) {
          console.error(`Error triggering ${config.sync_type}:`, syncError);
          results.push({
            sync_type: config.sync_type,
            success: false,
            error: syncError.message,
          });
        } else {
          console.log(`Successfully triggered ${config.sync_type}`);
          results.push({
            sync_type: config.sync_type,
            success: true,
            result: syncResult,
          });
        }
      } catch (syncError) {
        console.error(`Error processing ${config.sync_type}:`, syncError);
        results.push({
          sync_type: config.sync_type,
          success: false,
          error: syncError.message,
        });
      }
    }

    console.log("Sync Scheduler completed");
    console.log(`Processed ${results.length} sync configurations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync scheduler completed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Sync Scheduler failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
