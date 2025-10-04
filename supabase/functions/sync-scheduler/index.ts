/**
 * Sync Scheduler Edge Function
 *
 * This function runs on a cron schedule and checks if any scheduled syncs are due to run.
 * It logs every execution to the scheduler_logs table for visibility.
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
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let logId = null;

  try {
    console.log("🔄 Sync Scheduler started at", new Date().toISOString());

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create initial log entry
    const { data: logEntry, error: logError } = await supabase
      .from("scheduler_logs")
      .insert({
        run_at: new Date().toISOString(),
        sync_was_due: false,
        sync_triggered: false,
      })
      .select()
      .single();

    if (logError) {
      console.error("❌ Error creating scheduler log:", logError);
    } else {
      logId = logEntry.id;
      console.log("📝 Created scheduler log entry:", logId);
    }

    // Get all enabled sync configurations that are due to run
    const { data: syncConfigs, error } = await supabase
      .from("sync_configurations")
      .select("*")
      .eq("is_enabled", true);

    if (error) {
      console.error("❌ Error fetching sync configurations:", error);
      throw error;
    }

    console.log(`📋 Found ${syncConfigs?.length || 0} enabled sync configurations`);

    // Filter for configs that are due
    const now = new Date();
    const dueConfigs = (syncConfigs || []).filter(config => {
      if (!config.next_run_at) return false;
      const nextRun = new Date(config.next_run_at);
      return nextRun <= now;
    });

    console.log(`⏰ ${dueConfigs.length} sync(s) are due to run`);

    const results = [];
    let syncWasDue = dueConfigs.length > 0;
    let syncTriggered = false;

    for (const config of dueConfigs) {
      console.log(`🔄 Processing sync: ${config.sync_type}`);

      try {
        let functionName = "";

        switch (config.sync_type) {
          case "azure_ad_sync":
            functionName = "supabase-functions-azure-ad-sync";
            break;
          default:
            console.log(`⚠️ Unknown sync type: ${config.sync_type}`);
            continue;
        }

        // Update the sync configuration before triggering
        const nextRunTime = new Date();
        nextRunTime.setHours(nextRunTime.getHours() + config.frequency_hours);

        console.log(`📅 Updating next run time to: ${nextRunTime.toISOString()}`);

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
            `❌ Error updating sync config for ${config.sync_type}:`,
            updateError,
          );
        }

        // Trigger the sync function
        console.log(`🚀 Invoking ${functionName}...`);
        
        const { data: syncResult, error: syncError } =
          await supabase.functions.invoke(functionName, {
            body: { manual: false, scheduled: true },
          });

        if (syncError) {
          console.error(`❌ Error triggering ${config.sync_type}:`, syncError);
          results.push({
            sync_type: config.sync_type,
            success: false,
            error: syncError.message,
          });
        } else {
          console.log(`✅ Successfully triggered ${config.sync_type}`);
          syncTriggered = true;
          results.push({
            sync_type: config.sync_type,
            success: true,
            result: syncResult,
          });
        }
      } catch (syncError) {
        console.error(`❌ Error processing ${config.sync_type}:`, syncError);
        results.push({
          sync_type: config.sync_type,
          success: false,
          error: syncError.message,
        });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`⏱️ Execution completed in ${executionTime}ms`);

    // Update the log entry with results
    if (logId) {
      const { error: updateLogError } = await supabase
        .from("scheduler_logs")
        .update({
          sync_was_due: syncWasDue,
          sync_triggered: syncTriggered,
          sync_result: results.length > 0 ? results : null,
          execution_time_ms: executionTime,
        })
        .eq("id", logId);

      if (updateLogError) {
        console.error("❌ Error updating scheduler log:", updateLogError);
      } else {
        console.log("✅ Updated scheduler log with results");
      }
    }

    console.log("✅ Sync Scheduler completed successfully");
    console.log(`📊 Summary: ${results.length} sync(s) processed, ${syncTriggered ? 'sync triggered' : 'no sync triggered'}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync scheduler completed",
        syncWasDue,
        syncTriggered,
        results,
        executionTimeMs: executionTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("❌ Sync Scheduler failed:", error);

    // Update log entry with error if we have a log ID
    if (logId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from("scheduler_logs")
          .update({
            error_message: error.message,
            execution_time_ms: executionTime,
          })
          .eq("id", logId);
      } catch (updateError) {
        console.error("❌ Error updating log with error:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        executionTimeMs: executionTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});