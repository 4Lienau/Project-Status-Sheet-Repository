/**
 * Azure AD Sync Edge Function
 *
 * This function syncs ACTIVE user data from Azure Active Directory to Supabase
 * Only users with accountEnabled=true AND department is not null are synchronized
 * Runs every 6 hours via cron schedule
 * Can also be triggered manually from the admin dashboard
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Azure AD user interface
interface AzureUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  accountEnabled: boolean;
  createdDateTime: string;
}

// Supabase directory user interface
interface DirectoryUser {
  azure_user_id: string;
  display_name: string;
  email: string;
  user_principal_name: string;
  job_title?: string;
  department?: string;
  account_enabled: boolean;
  created_date_time: string;
  last_synced: string;
  sync_status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Azure AD Sync started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Azure AD configuration
    const tenantId = Deno.env.get("AZURE_TENANT_ID");
    const clientId = Deno.env.get("AZURE_CLIENT_ID");
    const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
    const scope =
      Deno.env.get("AZURE_GRAPH_API_SCOPE") ||
      "https://graph.microsoft.com/.default";

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "Missing Azure AD configuration. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.",
      );
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from("azure_sync_logs")
      .insert({
        sync_status: "running",
        users_processed: 0,
        users_created: 0,
        users_updated: 0,
        users_deactivated: 0,
      })
      .select()
      .single();

    if (syncLogError) {
      console.error("Error creating sync log:", syncLogError);
      throw syncLogError;
    }

    const syncLogId = syncLog.id;
    console.log(`Sync log created with ID: ${syncLogId}`);

    try {
      // Get Azure AD access token
      console.log("Getting Azure AD access token...");
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: scope,
            grant_type: "client_credentials",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(
          `Failed to get Azure AD token: ${tokenResponse.status} ${errorText}`,
        );
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      console.log("Azure AD access token obtained successfully");

      // Fetch ACTIVE users from Azure AD (only accountEnabled=true AND department is not null)
      console.log("Fetching active users with departments from Azure AD...");
      let allUsers: AzureUser[] = [];
      let nextLink = `https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled,createdDateTime&$filter=accountEnabled eq true and department ne null&$top=999`;

      while (nextLink) {
        const usersResponse = await fetch(nextLink, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          throw new Error(
            `Failed to fetch users from Azure AD: ${usersResponse.status} ${errorText}`,
          );
        }

        const usersData = await usersResponse.json();
        allUsers = allUsers.concat(usersData.value || []);
        nextLink = usersData["@odata.nextLink"];

        console.log(
          `Fetched ${usersData.value?.length || 0} active users with departments, total so far: ${allUsers.length}`,
        );
      }

      console.log(
        `Total active users with departments fetched from Azure AD: ${allUsers.length}`,
      );

      // Process users in batches
      const batchSize = 100;
      let usersProcessed = 0;
      let usersCreated = 0;
      let usersUpdated = 0;
      let usersDeactivated = 0;

      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}, users ${i + 1} to ${Math.min(i + batchSize, allUsers.length)}`,
        );

        for (const azureUser of batch) {
          try {
            // Prepare user data for Supabase
            const directoryUser: Partial<DirectoryUser> = {
              azure_user_id: azureUser.id,
              display_name: azureUser.displayName || "",
              email: azureUser.mail || azureUser.userPrincipalName || "",
              user_principal_name: azureUser.userPrincipalName || "",
              job_title: azureUser.jobTitle || null,
              department: azureUser.department || null,
              account_enabled: azureUser.accountEnabled,
              created_date_time: azureUser.createdDateTime,
              last_synced: new Date().toISOString(),
              sync_status: "active", // All fetched users are active with departments due to filter
            };

            // Upsert user data
            const { data: existingUser } = await supabase
              .from("directory_users")
              .select("id")
              .eq("azure_user_id", azureUser.id)
              .single();

            if (existingUser) {
              // Update existing user
              const { error: updateError } = await supabase
                .from("directory_users")
                .update(directoryUser)
                .eq("azure_user_id", azureUser.id);

              if (updateError) {
                console.error(
                  `Error updating user ${azureUser.id}:`,
                  updateError,
                );
              } else {
                usersUpdated++;
              }
            } else {
              // Create new user
              const { error: insertError } = await supabase
                .from("directory_users")
                .insert(directoryUser);

              if (insertError) {
                console.error(
                  `Error creating user ${azureUser.id}:`,
                  insertError,
                );
              } else {
                usersCreated++;
              }
            }

            usersProcessed++;
          } catch (userError) {
            console.error(`Error processing user ${azureUser.id}:`, userError);
          }
        }
      }

      // Mark users as inactive if they no longer exist in the active Azure AD users with departments
      // Since we only fetch active users with departments, any previously active user not in this list
      // has either been deactivated, deleted from Azure AD, or had their department removed
      const azureUserIds = allUsers.map((u) => u.id);
      if (azureUserIds.length > 0) {
        const { data: deactivatedUsers, error: deactivateError } =
          await supabase
            .from("directory_users")
            .update({
              sync_status: "inactive",
              last_synced: new Date().toISOString(),
            })
            .not(
              "azure_user_id",
              "in",
              `(${azureUserIds.map((id) => `'${id}'`).join(",")})`,
            )
            .eq("sync_status", "active")
            .select("id");

        if (deactivateError) {
          console.error("Error deactivating users:", deactivateError);
        } else {
          usersDeactivated = deactivatedUsers?.length || 0;
        }
      }

      // Update sync log with success
      await supabase
        .from("azure_sync_logs")
        .update({
          sync_completed_at: new Date().toISOString(),
          sync_status: "completed",
          users_processed: usersProcessed,
          users_created: usersCreated,
          users_updated: usersUpdated,
          users_deactivated: usersDeactivated,
        })
        .eq("id", syncLogId);

      console.log("Azure AD Sync completed successfully");
      console.log(
        `Summary: ${usersProcessed} processed, ${usersCreated} created, ${usersUpdated} updated, ${usersDeactivated} deactivated`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Azure AD sync completed successfully (active users with departments only)",
          summary: {
            usersProcessed,
            usersCreated,
            usersUpdated,
            usersDeactivated,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (syncError) {
      console.error("Sync error:", syncError);

      // Update sync log with error
      await supabase
        .from("azure_sync_logs")
        .update({
          sync_completed_at: new Date().toISOString(),
          sync_status: "failed",
          error_message: syncError.message,
        })
        .eq("id", syncLogId);

      throw syncError;
    }
  } catch (error) {
    console.error("Azure AD Sync failed:", error);

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
