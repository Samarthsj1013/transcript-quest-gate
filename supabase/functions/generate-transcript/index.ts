import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId } = await req.json();

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating PDF for request ${requestId} by user ${user.id}`);

    // Verify the request belongs to the user and is approved
    const { data: request, error: requestError } = await supabaseClient
      .from('transcript_requests')
      .select('*')
      .eq('id', requestId)
      .eq('student_id', user.id)
      .eq('status', 'APPROVED')
      .single();

    if (requestError || !request) {
      console.error('Request verification failed:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found or not approved' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch student info
    const { data: studentInfo, error: studentError } = await supabaseClient
      .from('users')
      .select(`
        *,
        student_profiles (
          branches (branch_name),
          academic_batches (batch_year)
        )
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !studentInfo) {
      console.error('Student info fetch failed:', studentError);
      return new Response(
        JSON.stringify({ error: 'Student information not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch student marks
    const { data: studentMarks, error: marksError } = await supabaseClient
      .from('student_marks')
      .select('*')
      .eq('student_id', user.id)
      .order('semester')
      .order('serial_no');

    if (marksError) {
      console.error('Marks fetch failed:', marksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch marks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For now, return the data as JSON
    // In a production environment, you would generate the actual PDF here
    // using a library that supports encryption (PDFKit, etc.)
    const response = {
      success: true,
      message: 'PDF generation endpoint ready',
      data: {
        studentInfo,
        marks: studentMarks || [],
        verificationToken: request.verification_token,
      },
    };

    console.log(`PDF data prepared for request ${requestId}`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-transcript function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
