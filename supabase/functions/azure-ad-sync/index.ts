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

  // Add health check endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/health")) {
    console.log("🏥 Health check requested");
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "Azure AD Sync function is accessible",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  // Wrap everything in comprehensive error handling
  try {
    console.log("🚀 Azure AD Sync started at:", new Date().toISOString());
    console.log("📋 Request method:", req.method);
    console.log("🔗 Request URL:", req.url);
    console.log("🌍 Environment check - Deno version:", Deno.version.deno);

    // Early environment variable check with detailed logging
    console.log(
      "🔍 EARLY ENV CHECK - Checking critical environment variables...",
    );
    const envVars = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      AZURE_TENANT_ID: Deno.env.get("AZURE_TENANT_ID"),
      AZURE_CLIENT_ID: Deno.env.get("AZURE_CLIENT_ID"),
      AZURE_CLIENT_SECRET: Deno.env.get("AZURE_CLIENT_SECRET"),
    };

    console.log("🔍 EARLY ENV CHECK - Environment variables status:", {
      SUPABASE_URL: envVars.SUPABASE_URL
        ? `Present (${envVars.SUPABASE_URL.substring(0, 30)}...)`
        : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY
        ? `Present (${envVars.SUPABASE_SERVICE_ROLE_KEY.length} chars)`
        : "MISSING",
      AZURE_TENANT_ID: envVars.AZURE_TENANT_ID
        ? `Present (${envVars.AZURE_TENANT_ID.substring(0, 8)}...)`
        : "MISSING",
      AZURE_CLIENT_ID: envVars.AZURE_CLIENT_ID
        ? `Present (${envVars.AZURE_CLIENT_ID.substring(0, 8)}...)`
        : "MISSING",
      AZURE_CLIENT_SECRET: envVars.AZURE_CLIENT_SECRET
        ? `Present (${envVars.AZURE_CLIENT_SECRET.length} chars)`
        : "MISSING",
    });

    // Check for missing critical environment variables
    const missingVars = [];
    if (!envVars.SUPABASE_URL) missingVars.push("SUPABASE_URL");
    if (!envVars.SUPABASE_SERVICE_ROLE_KEY)
      missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!envVars.AZURE_TENANT_ID) missingVars.push("AZURE_TENANT_ID");
    if (!envVars.AZURE_CLIENT_ID) missingVars.push("AZURE_CLIENT_ID");
    if (!envVars.AZURE_CLIENT_SECRET) missingVars.push("AZURE_CLIENT_SECRET");

    if (missingVars.length > 0) {
      const errorMessage = `❌ CRITICAL: Missing required environment variables: ${missingVars.join(", ")}`;
      console.error(errorMessage);
      console.error(
        "❌ Please configure these environment variables in your Supabase project settings.",
      );
      console.error(
        "❌ Go to: Supabase Dashboard > Project Settings > Edge Functions > Environment Variables",
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required environment variables: ${missingVars.join(", ")}`,
          missingVariables: missingVars,
          instructions:
            "Please configure the missing environment variables in your Supabase project settings under Edge Functions > Environment Variables",
          timestamp: new Date().toISOString(),
          stage: "early_validation",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    console.log(
      "✅ EARLY ENV CHECK - All critical environment variables are present",
    );

    // Validate environment variables first (detailed check)
    console.log("🔍 DETAILED ENV CHECK - Re-checking environment variables...");
    const supabaseUrl = envVars.SUPABASE_URL;
    const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      const error = "SUPABASE_URL environment variable is not set";
      console.error("❌", error);
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!supabaseServiceKey) {
      const error = "SUPABASE_SERVICE_ROLE_KEY environment variable is not set";
      console.error("❌", error);
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("✅ Supabase environment variables validated");
    console.log("🔗 Supabase URL:", supabaseUrl.substring(0, 30) + "...");
    console.log("🔑 Service key length:", supabaseServiceKey.length);

    // Initialize Supabase client
    console.log("🔌 Initializing Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase client initialized");

    // Get Azure AD configuration with detailed validation
    console.log("🔍 DETAILED AZURE CHECK - Checking Azure AD configuration...");
    const tenantId = envVars.AZURE_TENANT_ID;
    const clientId = envVars.AZURE_CLIENT_ID;
    const clientSecret = envVars.AZURE_CLIENT_SECRET;
    const scope =
      Deno.env.get("AZURE_GRAPH_API_SCOPE") ||
      "https://graph.microsoft.com/.default";

    console.log(
      "🏢 Tenant ID present:",
      !!tenantId,
      tenantId ? `(${tenantId.substring(0, 8)}...)` : "(missing)",
    );
    console.log(
      "🆔 Client ID present:",
      !!clientId,
      clientId ? `(${clientId.substring(0, 8)}...)` : "(missing)",
    );
    console.log(
      "🔐 Client Secret present:",
      !!clientSecret,
      clientSecret ? `(${clientSecret.length} chars)` : "(missing)",
    );
    console.log("🎯 Scope:", scope);

    if (!tenantId) {
      const error = "AZURE_TENANT_ID environment variable is not set";
      console.error("❌", error);
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!clientId) {
      const error = "AZURE_CLIENT_ID environment variable is not set";
      console.error("❌", error);
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!clientSecret) {
      const error = "AZURE_CLIENT_SECRET environment variable is not set";
      console.error("❌", error);
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("✅ Azure AD configuration validated");

    // Test Supabase connection first
    console.log("🧪 Testing Supabase connection...");
    try {
      const { data: testData, error: testError } = await supabase
        .from("azure_sync_logs")
        .select("id")
        .limit(1);

      if (testError) {
        console.error("❌ Supabase connection test failed:", testError);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Supabase connection failed: ${testError.message}`,
            details: testError,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }
      console.log("✅ Supabase connection test successful");
    } catch (connectionError) {
      console.error("❌ Supabase connection error:", connectionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Supabase connection error: ${connectionError.message}`,
          details: connectionError,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Create sync log entry
    console.log("📝 Creating sync log entry...");
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
      console.error("❌ Error creating sync log:", syncLogError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create sync log: ${syncLogError.message}`,
          details: syncLogError,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const syncLogId = syncLog.id;
    console.log(`✅ Sync log created with ID: ${syncLogId}`);

    try {
      // Get Azure AD access token
      console.log("🔐 Getting Azure AD access token...");
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      console.log("🔗 Token URL:", tokenUrl);

      const tokenBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope,
        grant_type: "client_credentials",
      });

      console.log("📋 Token request parameters:", {
        client_id: clientId.substring(0, 8) + "...",
        scope: scope,
        grant_type: "client_credentials",
        client_secret_length: clientSecret.length,
      });

      let tokenResponse;
      try {
        tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: tokenBody,
        });
      } catch (fetchError) {
        console.error("❌ Network error getting Azure AD token:", fetchError);
        throw new Error(
          `Network error getting Azure AD token: ${fetchError.message}`,
        );
      }

      console.log("📡 Token response status:", tokenResponse.status);
      console.log(
        "📡 Token response headers:",
        Object.fromEntries(tokenResponse.headers.entries()),
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("❌ Azure AD token request failed:");
        console.error("   Status:", tokenResponse.status);
        console.error("   Status Text:", tokenResponse.statusText);
        console.error("   Error Response:", errorText);

        // Try to parse error response for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error("   Parsed Error:", errorJson);
        } catch (parseError) {
          console.error("   Could not parse error response as JSON");
        }

        throw new Error(
          `Failed to get Azure AD token: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`,
        );
      }

      let tokenData;
      try {
        tokenData = await tokenResponse.json();
      } catch (jsonError) {
        console.error("❌ Error parsing token response JSON:", jsonError);
        throw new Error(
          `Error parsing Azure AD token response: ${jsonError.message}`,
        );
      }

      if (!tokenData.access_token) {
        console.error("❌ No access token in response:", tokenData);
        throw new Error("Azure AD token response missing access_token");
      }

      const accessToken = tokenData.access_token;
      console.log("✅ Azure AD access token obtained successfully");
      console.log("🔑 Token type:", tokenData.token_type || "Bearer");
      console.log(
        "⏰ Token expires in:",
        tokenData.expires_in || "unknown",
        "seconds",
      );

      // Fetch ALL users from Azure AD first, then filter in JavaScript
      // This avoids any potential Graph API filter operator issues
      console.log("👥 Fetching all users from Azure AD...");
      console.log(
        "🔍 Using minimal Graph API query to avoid filter operator issues...",
      );
      console.log(
        "🔍 Will filter for active users and valid departments in JavaScript...",
      );
      let allUsers: AzureUser[] = [];
      let nextLink = `https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled,createdDateTime&$top=999`;

      console.log("🔗 Initial Graph API URL:", nextLink);
      let pageCount = 0;

      while (nextLink) {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount}...`);
        console.log(`🔗 Current URL being fetched: ${nextLink}`);

        let usersResponse;
        try {
          usersResponse = await fetch(nextLink, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
        } catch (fetchError) {
          console.error(
            `❌ Network error fetching users page ${pageCount}:`,
            fetchError,
          );
          throw new Error(
            `Network error fetching users from Azure AD: ${fetchError.message}`,
          );
        }

        console.log(
          `📡 Users response status (page ${pageCount}):`,
          usersResponse.status,
        );
        console.log(
          `📡 Users response headers (page ${pageCount}):`,
          Object.fromEntries(usersResponse.headers.entries()),
        );

        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          console.error(
            `❌ Azure AD users request failed (page ${pageCount}):`,
          );
          console.error("   Status:", usersResponse.status);
          console.error("   Status Text:", usersResponse.statusText);
          console.error("   Error Response:", errorText);

          // Try to parse error response for more details
          try {
            const errorJson = JSON.parse(errorText);
            console.error("   Parsed Error:", errorJson);

            // Check for specific Graph API errors
            if (errorJson.error && errorJson.error.code) {
              console.error(`   Graph API Error Code: ${errorJson.error.code}`);
              console.error(
                `   Graph API Error Message: ${errorJson.error.message}`,
              );

              // Handle specific error cases
              if (errorJson.error.code === "InvalidAuthenticationToken") {
                throw new Error(
                  `Azure AD authentication failed: ${errorJson.error.message}. Please check your Azure AD application configuration and permissions.`,
                );
              } else if (errorJson.error.code === "Forbidden") {
                throw new Error(
                  `Azure AD access forbidden: ${errorJson.error.message}. Please ensure your application has the required Graph API permissions (User.Read.All).`,
                );
              } else if (errorJson.error.code === "Request_UnsupportedQuery") {
                throw new Error(
                  `Azure AD query unsupported: ${errorJson.error.message}. The filter query may not be supported by your Azure AD tenant.`,
                );
              }
            }
          } catch (parseError) {
            console.error("   Could not parse error response as JSON");
          }

          throw new Error(
            `Failed to fetch users from Azure AD (page ${pageCount}): ${usersResponse.status} ${usersResponse.statusText} - ${errorText}`,
          );
        }

        let usersData;
        try {
          usersData = await usersResponse.json();
        } catch (jsonError) {
          console.error(
            `❌ Error parsing users response JSON (page ${pageCount}):`,
            jsonError,
          );
          throw new Error(
            `Error parsing Azure AD users response: ${jsonError.message}`,
          );
        }

        if (!usersData.value || !Array.isArray(usersData.value)) {
          console.error(
            `❌ Invalid users data structure (page ${pageCount}):`,
            usersData,
          );
          throw new Error(
            `Invalid users data structure from Azure AD (page ${pageCount})`,
          );
        }

        allUsers = allUsers.concat(usersData.value);
        nextLink = usersData["@odata.nextLink"];

        console.log(
          `✅ Fetched ${usersData.value.length} users from page ${pageCount}, total so far: ${allUsers.length}`,
        );

        if (nextLink) {
          console.log(`🔗 Next page URL: ${nextLink}`);
        } else {
          console.log(`🏁 No more pages to fetch`);
        }
      }

      console.log(`Total users fetched from Azure AD: ${allUsers.length}`);

      // First, filter for active users only
      console.log("🔍 Filtering for active users (accountEnabled=true)...");
      const activeUsers = allUsers.filter(
        (user) => user.accountEnabled === true,
      );
      console.log(
        `🔧 ACTIVE FILTER: Filtered out ${allUsers.length - activeUsers.length} inactive users, keeping ${activeUsers.length} active users`,
      );
      allUsers = activeUsers;

      // Enhanced validation function to check for invalid department values
      const isValidDepartment = (department: any): boolean => {
        if (department === null || department === undefined) return false;
        if (typeof department !== "string") return false;

        const trimmed = department.trim().toLowerCase();
        if (trimmed.length === 0) return false;

        // Common placeholder values that should be excluded
        const invalidValues = [
          "null",
          "undefined",
          "n/a",
          "na",
          "none",
          "tbd",
          "to be determined",
          "-",
          "--",
          "---",
          ".",
          "..",
          "...",
          "?",
          "??",
          "???",
          "unknown",
          "unassigned",
          "not assigned",
          "not available",
          "temp",
          "temporary",
          "test",
          "testing",
          "placeholder",
          "empty",
          "blank",
          "missing",
          "no department",
          "nodepartment",
        ];

        return !invalidValues.includes(trimmed);
      };

      // Filter users with valid departments (client-side filtering)
      console.log("🔍 Filtering users with valid departments (client-side)...");
      const invalidUsers = allUsers.filter(
        (user) => !isValidDepartment(user.department),
      );

      if (invalidUsers.length > 0) {
        console.log(
          `🔧 CLIENT-SIDE FILTER: Found ${invalidUsers.length} users without valid departments that will be excluded:`,
        );
        invalidUsers.slice(0, 10).forEach((user, index) => {
          console.log(
            `  ${index + 1}. User ${user.id} (${user.displayName || user.userPrincipalName}) - department: ${JSON.stringify(user.department)} (type: ${typeof user.department})`,
          );
        });
        if (invalidUsers.length > 10) {
          console.log(`  ... and ${invalidUsers.length - 10} more users`);
        }

        // Filter to only valid users
        const validUsers = allUsers.filter((user) =>
          isValidDepartment(user.department),
        );

        console.log(
          `🛡️ CLIENT-SIDE FILTER: Filtered out ${invalidUsers.length} invalid users, keeping ${validUsers.length} valid users`,
        );
        allUsers = validUsers;
      } else {
        console.log(
          "✅ All fetched users have valid departments - no filtering needed",
        );
      }

      // Log sample of department values for debugging
      if (allUsers.length > 0) {
        console.log("📊 Sample of department values from valid users:");
        const sampleUsers = allUsers.slice(0, 10);
        sampleUsers.forEach((user, index) => {
          console.log(
            `  ${index + 1}. User ${user.id} (${user.displayName || user.userPrincipalName}) - department: "${user.department?.trim()}" (length: ${user.department?.trim().length})`,
          );
        });

        // Log unique department values for analysis
        const uniqueDepartments = [
          ...new Set(allUsers.map((u) => u.department?.trim()).filter(Boolean)),
        ];
        console.log(`📈 Found ${uniqueDepartments.length} unique departments:`);
        uniqueDepartments.slice(0, 20).forEach((dept, index) => {
          console.log(`  ${index + 1}. "${dept}"`);
        });
        if (uniqueDepartments.length > 20) {
          console.log(
            `  ... and ${uniqueDepartments.length - 20} more departments`,
          );
        }
      }

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
            // FINAL SAFETY CHECK: This should never fail since we've already filtered
            if (!isValidDepartment(azureUser.department)) {
              console.error(
                `🚨 CRITICAL SAFETY VIOLATION: User ${azureUser.id} (${azureUser.displayName}) has invalid department: ${JSON.stringify(azureUser.department)}`,
              );
              console.error(
                `🚨 This should never happen! Terminating sync to prevent data corruption.`,
              );
              throw new Error(
                `Invalid user data detected: User ${azureUser.id} has no valid department. Sync terminated to prevent data corruption.`,
              );
            }

            const finalDepartment = azureUser.department.trim();

            // Prepare user data for Supabase
            const directoryUser: Partial<DirectoryUser> = {
              azure_user_id: azureUser.id,
              display_name: azureUser.displayName || "",
              email: azureUser.mail || azureUser.userPrincipalName || "",
              user_principal_name: azureUser.userPrincipalName || "",
              job_title: azureUser.jobTitle || null,
              department: finalDepartment, // Use the validated and trimmed department
              account_enabled: azureUser.accountEnabled,
              created_date_time: azureUser.createdDateTime,
              last_synced: new Date().toISOString(),
              sync_status: "active", // All fetched users are active with departments due to filter
            };

            // Log the user being processed for debugging
            console.log(
              `📝 Processing user ${azureUser.id} (${azureUser.displayName}) with department: "${finalDepartment}"`,
            );

            // FINAL DATABASE SAFETY CHECK: Verify department before database operation
            if (!isValidDepartment(directoryUser.department)) {
              console.error(
                `🚨 DATABASE SAFETY CHECK FAILED: About to insert/update user ${azureUser.id} with invalid department: ${JSON.stringify(directoryUser.department)}`,
              );
              throw new Error(
                `Database safety check failed: User ${azureUser.id} department is invalid. Sync terminated.`,
              );
            }

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
      // Since we only process active users with valid departments, any previously active user not in this list
      // has either been deactivated, deleted from Azure AD, or had their department removed/cleared
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

      // Log validation statistics
      const totalFetched = usersProcessed + (invalidUsers?.length || 0);
      console.log(
        `Sync Summary: ${totalFetched} users fetched from Azure AD, ${invalidUsers?.length || 0} filtered out due to invalid departments, ${usersProcessed} processed and synced`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Azure AD sync completed successfully (active users with valid departments only)",
          summary: {
            usersProcessed,
            usersCreated,
            usersUpdated,
            usersDeactivated,
            totalFetched: usersProcessed + (invalidUsers?.length || 0),
            filteredOut: invalidUsers?.length || 0,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (syncError) {
      console.error("❌ Sync error:", syncError);
      console.error("❌ Sync error stack:", syncError.stack);
      console.error("❌ Sync error name:", syncError.name);
      console.error("❌ Sync error message:", syncError.message);

      // Update sync log with error
      try {
        await supabase
          .from("azure_sync_logs")
          .update({
            sync_completed_at: new Date().toISOString(),
            sync_status: "failed",
            error_message: syncError.message,
          })
          .eq("id", syncLogId);
        console.log("✅ Sync log updated with error status");
      } catch (logError) {
        console.error("❌ Failed to update sync log with error:", logError);
      }

      // Return detailed error response instead of throwing
      const syncErrorResponse = {
        success: false,
        error: syncError?.message || "Sync error occurred",
        errorType: syncError?.name || "SyncError",
        errorString: syncError?.toString() || "Sync error toString failed",
        syncLogId: syncLogId,
        timestamp: new Date().toISOString(),
        stage: "sync_execution",
        debugInfo: {
          hasStack: !!syncError?.stack,
          hasMessage: !!syncError?.message,
          hasName: !!syncError?.name,
          errorKeys: syncError ? Object.keys(syncError) : [],
          stackTrace: syncError?.stack?.substring(0, 500) || "No stack trace",
        },
      };

      console.error(
        "❌ Sending sync error response:",
        JSON.stringify(syncErrorResponse, null, 2),
      );

      return new Response(JSON.stringify(syncErrorResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  } catch (error) {
    console.error("❌ Azure AD Sync failed (outer catch):", error);
    console.error("❌ Error stack:", error?.stack);
    console.error("❌ Error name:", error?.name);
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error toString:", error?.toString());
    console.error(
      "❌ Full error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );

    // Enhanced error response with more debugging information
    const errorResponse = {
      success: false,
      error: error?.message || "Unknown error occurred",
      errorType: error?.name || "UnknownError",
      errorString: error?.toString() || "Error toString failed",
      timestamp: new Date().toISOString(),
      stage: "outer_catch",
      debugInfo: {
        hasStack: !!error?.stack,
        hasMessage: !!error?.message,
        hasName: !!error?.name,
        errorKeys: error ? Object.keys(error) : [],
        errorConstructor: error?.constructor?.name || "unknown",
      },
    };

    console.error(
      "❌ Sending error response:",
      JSON.stringify(errorResponse, null, 2),
    );

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
