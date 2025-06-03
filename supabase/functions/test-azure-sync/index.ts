/**
 * Test Azure AD Sync Edge Function
 *
 * This is a simplified test function to help diagnose Azure AD sync issues
 * It performs basic environment variable checks and Azure AD connectivity tests
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log("🧪 Test Azure AD Sync started at:", new Date().toISOString());
    console.log("📋 Request method:", req.method);
    console.log("🔗 Request URL:", req.url);

    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        total: 0,
      },
    };

    // Test 1: Environment Variables
    console.log("🧪 Test 1: Checking environment variables...");
    const envTest = {
      name: "Environment Variables",
      status: "passed",
      details: {},
      issues: [],
    };

    const requiredEnvVars = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_ID",
      "AZURE_CLIENT_SECRET",
    ];

    for (const varName of requiredEnvVars) {
      const value = Deno.env.get(varName);
      if (value) {
        envTest.details[varName] = `Present (${value.length} chars)`;
        console.log(`✅ ${varName}: Present (${value.length} characters)`);
      } else {
        envTest.details[varName] = "MISSING";
        envTest.issues.push(`${varName} is missing`);
        envTest.status = "failed";
        console.log(`❌ ${varName}: MISSING`);
      }
    }

    results.tests.push(envTest);
    if (envTest.status === "passed") results.summary.passed++;
    else results.summary.failed++;
    results.summary.total++;

    // Test 2: Azure AD Token Request (only if env vars are present)
    if (envTest.status === "passed") {
      console.log("🧪 Test 2: Testing Azure AD token request...");
      const tokenTest = {
        name: "Azure AD Token Request",
        status: "passed",
        details: {},
        issues: [],
      };

      try {
        const tenantId = Deno.env.get("AZURE_TENANT_ID");
        const clientId = Deno.env.get("AZURE_CLIENT_ID");
        const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
        const scope =
          Deno.env.get("AZURE_GRAPH_API_SCOPE") ||
          "https://graph.microsoft.com/.default";

        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        console.log(`🔗 Token URL: ${tokenUrl}`);

        const tokenBody = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: scope,
          grant_type: "client_credentials",
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: tokenBody,
        });

        tokenTest.details.httpStatus = tokenResponse.status;
        tokenTest.details.httpStatusText = tokenResponse.statusText;

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          tokenTest.details.hasAccessToken = !!tokenData.access_token;
          tokenTest.details.tokenType = tokenData.token_type;
          tokenTest.details.expiresIn = tokenData.expires_in;
          console.log(`✅ Azure AD token request successful`);
        } else {
          const errorText = await tokenResponse.text();
          tokenTest.status = "failed";
          tokenTest.issues.push(
            `HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`,
          );
          tokenTest.details.errorResponse = errorText.substring(0, 500);
          console.log(
            `❌ Azure AD token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
          );
        }
      } catch (error) {
        tokenTest.status = "failed";
        tokenTest.issues.push(`Exception: ${error.message}`);
        tokenTest.details.exception = error.message;
        console.log(`❌ Azure AD token request exception: ${error.message}`);
      }

      results.tests.push(tokenTest);
      if (tokenTest.status === "passed") results.summary.passed++;
      else results.summary.failed++;
      results.summary.total++;
    } else {
      console.log(
        "⏭️ Skipping Azure AD token test due to missing environment variables",
      );
    }

    // Test 3: Supabase Connection (only if env vars are present)
    if (envTest.status === "passed") {
      console.log("🧪 Test 3: Testing Supabase connection...");
      const supabaseTest = {
        name: "Supabase Connection",
        status: "passed",
        details: {},
        issues: [],
      };

      try {
        const { createClient } = await import(
          "https://esm.sh/@supabase/supabase-js@2"
        );
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Test basic connectivity
        const { data: testData, error: testError } = await supabase
          .from("azure_sync_logs")
          .select("id")
          .limit(1);

        if (testError) {
          supabaseTest.status = "failed";
          supabaseTest.issues.push(`Database error: ${testError.message}`);
          supabaseTest.details.error = testError;
          console.log(`❌ Supabase connection failed: ${testError.message}`);
        } else {
          supabaseTest.details.connectionSuccessful = true;
          supabaseTest.details.testQueryResult = testData
            ? "Data returned"
            : "No data (table empty)";
          console.log(`✅ Supabase connection successful`);
        }
      } catch (error) {
        supabaseTest.status = "failed";
        supabaseTest.issues.push(`Exception: ${error.message}`);
        supabaseTest.details.exception = error.message;
        console.log(`❌ Supabase connection exception: ${error.message}`);
      }

      results.tests.push(supabaseTest);
      if (supabaseTest.status === "passed") results.summary.passed++;
      else results.summary.failed++;
      results.summary.total++;
    } else {
      console.log(
        "⏭️ Skipping Supabase connection test due to missing environment variables",
      );
    }

    console.log(
      `🧪 Test completed: ${results.summary.passed}/${results.summary.total} tests passed`,
    );

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: results.summary.failed > 0 ? 500 : 200,
    });
  } catch (error) {
    console.error("❌ Test function failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Test function failed",
        errorType: error?.name || "TestError",
        timestamp: new Date().toISOString(),
        stage: "test_execution",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
