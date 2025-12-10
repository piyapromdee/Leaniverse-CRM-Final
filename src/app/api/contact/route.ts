// File: src/app/api/contact/route.ts (Final Corrected Version)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Lazy Supabase Configuration ---
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_supabaseClient) return _supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase environment variables are not set.');
  }

  _supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return _supabaseClient;
}
// --- END: Supabase Configuration ---

export async function POST(request: NextRequest) {
  try {
    // --- CHANGED: Updated fields to match the new form ---
    const { fullName, company, email, phone, employeeCount, mainGoal } = await request.json();

    // --- CHANGED: Updated validation logic ---
    if (!fullName || !company || !email || !employeeCount || !mainGoal) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // --- ADDED: Save data to Supabase ---
    const { data, error: dbError } = await getSupabase()
      .from('contacts')
      .insert({
        fullName,
        company,
        email,
        phone,
        employee_count: employeeCount,
        main_goal: mainGoal,
      } as any)
      .select()
      .single();

    const dbData = data as { id: string } | null;

    if (dbError) {
      console.error('Error saving to Supabase:', dbError);
      return NextResponse.json(
        { error: 'Failed to save lead to database' },
        { status: 500 }
      );
    }
    // --- END: Save data to Supabase ---


    // --- CHANGED: Updated email content with new fields ---
    const emailContent = `
New Lead Submission - Dummi & Co Website

A new lead has submitted the trial form.

--- Customer Details ---
- Full Name: ${fullName}
- Company: ${company}
- Email: ${email}
- Phone: ${phone}

--- Qualification Info ---
- Company Size: ${employeeCount}
- Main Goal: ${mainGoal}

Submitted on: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}

--- Next Steps ---
Please follow up with this lead within 24 hours.
Database Record ID: ${dbData?.id || 'N/A'}

---
This is an automated notification.
    `;

    // --- CHANGED: Updated email subject ---
    const emailData = {
      from: 'Dummi & Co Leads <noreply@yourdomain.com>', // Update your domain
      to: 'janjaratp@dummyandco.com',
      subject: `✅ New Trial Lead: ${fullName} from ${company} (${employeeCount} employees)`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>').replace(/- /g, '&bull; ')
    };

    // --- Log the operation ---
    console.log('✅ Lead successfully saved to Supabase. DB ID:', dbData?.id);
    console.log('✅ Preparing email notification for:', emailData.to);

    // In production, uncomment and use your email provider
    // await resend.emails.send(emailData);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Form submitted successfully. We will be in touch shortly!',
        leadId: dbData?.id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing lead form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}