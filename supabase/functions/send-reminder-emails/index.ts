import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  manual?: boolean;
  dryRun?: boolean;
  minDaysSinceUpdate?: number;
  cooldownDays?: number;
  testEmail?: string; // New parameter for test mode
}

interface ReminderResult {
  evaluatedCount: number;
  dueCount: number;
  sentCount: number;
  skippedCount: number;
  targets: Array<{
    projectId: string;
    projectTitle: string;
    managerEmail: string;
    lastUpdated: string;
    reason?: string;
  }>;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('[send-reminder-emails] Starting function...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const reminderFromEmail = Deno.env.get('REMINDER_FROM_EMAIL') ?? '';
    const reminderReplyToEmail = Deno.env.get('REMINDER_REPLY_TO_EMAIL') ?? '';
    const appUrl = Deno.env.get('APP_URL') ?? 'https://2e19f6eb-69d8-4928-ba50-fe83b05f7b15.canvases.tempo.build';

    console.log('[send-reminder-emails] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasResendKey: !!resendApiKey,
      hasFromEmail: !!reminderFromEmail,
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('[send-reminder-emails] Missing Supabase credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Missing Supabase credentials',
          evaluatedCount: 0,
          dueCount: 0,
          sentCount: 0,
          skippedCount: 0,
          targets: [],
          errors: ['Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const {
      manual = false,
      dryRun = false,
      minDaysSinceUpdate = 14,
      cooldownDays = 7,
      testEmail,
    }: ReminderRequest = await req.json();

    console.log('[send-reminder-emails] Request params:', { manual, dryRun, minDaysSinceUpdate, cooldownDays, testEmail });

    // Check for email credentials if sending (not dry run and not test mode without email)
    if (!dryRun && !testEmail && (!resendApiKey || !reminderFromEmail)) {
      console.error('[send-reminder-emails] Missing environment variables for sending emails');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required environment variables: RESEND_API_KEY or REMINDER_FROM_EMAIL',
          evaluatedCount: 0,
          dueCount: 0,
          sentCount: 0,
          skippedCount: 0,
          targets: [],
          errors: ['Missing required environment variables: RESEND_API_KEY or REMINDER_FROM_EMAIL']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // TEST MODE: Send a sample email to the specified test email address
    if (testEmail) {
      console.log('[send-reminder-emails] Test mode - sending sample email to:', testEmail);
      
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing RESEND_API_KEY - cannot send test email',
            evaluatedCount: 0,
            dueCount: 0,
            sentCount: 0,
            skippedCount: 0,
            targets: [],
            errors: ['Missing RESEND_API_KEY']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // For test mode, use a fallback email if REMINDER_FROM_EMAIL is not set
      const fromEmail = reminderFromEmail || 'onboarding@resend.dev';
      
      console.log('[send-reminder-emails] Using from email:', fromEmail);
      console.log('[send-reminder-emails] API key present:', !!resendApiKey);

      // Create a sample project for the test email
      const sampleProject = {
        id: 'sample-project-id',
        title: 'Sample Project - Test Reminder',
        status: 'active',
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      };

      const daysSinceUpdate = 20;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
            <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ TEST EMAIL - This is a sample reminder</p>
            <p style="margin: 5px 0 0 0; color: #92400E; font-size: 14px;">This email was sent to <strong>${testEmail}</strong> for testing purposes.</p>
          </div>
          
          <h2 style="color: #333;">Project Update Reminder</h2>
          <p>Hello,</p>
          <p>This is a friendly reminder that the following project hasn't been updated in <strong>${daysSinceUpdate} days</strong>:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">${sampleProject.title}</h3>
            <p style="margin: 5px 0;"><strong>Last Updated:</strong> ${new Date(sampleProject.updated_at).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${sampleProject.status}</p>
          </div>
          <p>Please take a moment to review and update the project status:</p>
          <div style="margin: 20px 0;">
            <a href="${appUrl}/project/${sampleProject.id}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Edit Project</a>
            <a href="${appUrl}/project/${sampleProject.id}/view" style="background-color: #6B7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Project</a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder. If you have any questions, please contact your administrator.</p>
        </div>
      `;

      const emailPayload: any = {
        from: fromEmail,
        to: [testEmail],
        subject: `[TEST] Reminder: Update needed for "${sampleProject.title}"`,
        html: emailHtml,
      };

      if (reminderReplyToEmail) {
        emailPayload.reply_to = [reminderReplyToEmail];
      }

      console.log('[send-reminder-emails] Sending email with payload:', {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        hasReplyTo: !!emailPayload.reply_to,
      });

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(emailPayload),
      });

      const responseText = await emailResponse.text();
      console.log('[send-reminder-emails] Resend API response:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        body: responseText,
      });

      if (!emailResponse.ok) {
        let errorMessage = `Failed to send test email (${emailResponse.status}): ${responseText}`;
        
        // Parse the error if it's JSON
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          
          // Add helpful guidance for common errors
          if (emailResponse.status === 403 || errorMessage.includes('domain')) {
            errorMessage += '\n\n⚠️ Domain Verification Required:\n' +
              '1. Log into your Resend account at https://resend.com/domains\n' +
              '2. Verify the domain used in REMINDER_FROM_EMAIL\n' +
              '3. Or use "onboarding@resend.dev" for testing (set REMINDER_FROM_EMAIL to this value)\n' +
              `4. Current from email: ${fromEmail}`;
          }
        } catch (e) {
          // If not JSON, use the raw text
        }
        
        console.error('[send-reminder-emails] Test email failed:', errorMessage);
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            evaluatedCount: 0,
            dueCount: 0,
            sentCount: 0,
            skippedCount: 0,
            targets: [],
            errors: [errorMessage]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      console.log('[send-reminder-emails] Test email sent successfully');
      return new Response(
        JSON.stringify({ 
          evaluatedCount: 1,
          dueCount: 1,
          sentCount: 1,
          skippedCount: 0,
          targets: [{
            projectId: sampleProject.id,
            projectTitle: sampleProject.title,
            managerEmail: testEmail,
            lastUpdated: sampleProject.updated_at,
          }],
          errors: [],
          testMode: true,
          message: `Test email sent successfully to ${testEmail}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const result: ReminderResult = {
      evaluatedCount: 0,
      dueCount: 0,
      sentCount: 0,
      skippedCount: 0,
      targets: [],
      errors: [],
    };

    // Query projects that need reminders using updated_at field
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minDaysSinceUpdate);

    console.log('[send-reminder-emails] Querying projects with cutoff date:', cutoffDate.toISOString());
    console.log('[send-reminder-emails] Current date:', new Date().toISOString());

    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('id, title, project_manager, updated_at, status')
      .in('status', ['active', 'on_hold'])
      .lt('updated_at', cutoffDate.toISOString());

    if (projectsError) {
      console.error('[send-reminder-emails] Projects query error:', projectsError);
      result.errors.push(`Failed to query projects: ${projectsError.message}`);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('[send-reminder-emails] Found projects:', projects?.length || 0);
    if (projects && projects.length > 0) {
      console.log('[send-reminder-emails] Project details:', projects.map(p => ({
        title: p.title,
        status: p.status,
        updated_at: p.updated_at,
        manager: p.project_manager
      })));
    }
    
    result.evaluatedCount = projects?.length || 0;

    if (!projects || projects.length === 0) {
      console.log('[send-reminder-emails] No projects found, returning empty result');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check cooldown period for each project
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

    for (const project of projects) {
      console.log(`[send-reminder-emails] Processing project: ${project.title}`);
      
      // Check if reminder was sent recently
      const { data: recentReminders } = await supabaseClient
        .from('reminder_emails')
        .select('sent_at')
        .eq('project_id', project.id)
        .gte('sent_at', cooldownDate.toISOString())
        .limit(1);

      if (recentReminders && recentReminders.length > 0) {
        console.log(`[send-reminder-emails] Skipping project ${project.title} - reminder sent recently`);
        result.skippedCount++;
        result.targets.push({
          projectId: project.id,
          projectTitle: project.title,
          managerEmail: project.project_manager || 'Unknown',
          lastUpdated: project.updated_at,
          reason: 'Reminder sent recently (within cooldown period)',
        });
        continue;
      }

      // Resolve manager email
      let managerEmail = project.project_manager;
      
      // If project_manager is not an email, try to look it up in profiles
      if (managerEmail && !managerEmail.includes('@')) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('email')
          .ilike('full_name', managerEmail)
          .single();

        if (profile?.email) {
          managerEmail = profile.email;
        } else {
          console.log(`[send-reminder-emails] Could not resolve email for manager: ${managerEmail}`);
          result.skippedCount++;
          result.targets.push({
            projectId: project.id,
            projectTitle: project.title,
            managerEmail: project.project_manager || 'Unknown',
            lastUpdated: project.updated_at,
            reason: 'Could not resolve manager email',
          });
          continue;
        }
      }

      if (!managerEmail || !managerEmail.includes('@')) {
        console.log(`[send-reminder-emails] Invalid manager email for project ${project.title}`);
        result.skippedCount++;
        result.targets.push({
          projectId: project.id,
          projectTitle: project.title,
          managerEmail: project.project_manager || 'Unknown',
          lastUpdated: project.updated_at,
          reason: 'Invalid or missing manager email',
        });
        continue;
      }

      console.log(`[send-reminder-emails] Project ${project.title} is due for reminder to ${managerEmail}`);
      result.dueCount++;
      result.targets.push({
        projectId: project.id,
        projectTitle: project.title,
        managerEmail,
        lastUpdated: project.updated_at,
      });

      // Send email if not a dry run
      if (!dryRun) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Project Update Reminder</h2>
            <p>Hello,</p>
            <p>This is a friendly reminder that the following project hasn't been updated in <strong>${daysSinceUpdate} days</strong>:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #555;">${project.title}</h3>
              <p style="margin: 5px 0;"><strong>Last Updated:</strong> ${new Date(project.updated_at).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ${project.status}</p>
            </div>
            <p>Please take a moment to review and update the project status:</p>
            <div style="margin: 20px 0;">
              <a href="${appUrl}/project/${project.id}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Edit Project</a>
              <a href="${appUrl}/project/${project.id}/view" style="background-color: #6B7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Project</a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder. If you have any questions, please contact your administrator.</p>
          </div>
        `;

        const emailPayload: any = {
          from: reminderFromEmail,
          to: [managerEmail],
          subject: `Reminder: Update needed for "${project.title}"`,
          html: emailHtml,
        };

        if (reminderReplyToEmail) {
          emailPayload.reply_to = [reminderReplyToEmail];
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          result.errors.push(
            `Failed to send email for project ${project.title}: ${errorText}`
          );
          continue;
        }

        result.sentCount++;

        // Log the reminder
        await supabaseClient.from('reminder_emails').insert({
          project_id: project.id,
          project_manager_email: managerEmail,
          status: 'sent',
          days_since_update: daysSinceUpdate,
        });
      }
    }

    console.log('[send-reminder-emails] Completed successfully:', result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[send-reminder-emails] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        evaluatedCount: 0,
        dueCount: 0,
        sentCount: 0,
        skippedCount: 0,
        targets: [],
        errors: [error.message]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});