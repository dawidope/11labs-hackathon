import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  console.log('🚀 [API] POST /api/generate-story - START');

  try {
    const body = await request.json();
    console.log('📦 [API] Request body:', JSON.stringify(body, null, 2));

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    console.log('🔗 [API] N8N_WEBHOOK_URL:', n8nUrl ? '✅ SET' : '❌ NOT SET');

    if (!n8nUrl) {
      console.error('❌ [API] N8N_WEBHOOK_URL is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: N8N_WEBHOOK_URL not set' },
        { status: 500 }
      );
    }

    console.log('📡 [API] Sending request to n8n...');
    const startTime = Date.now();

    // Timeout controller - 4 minuty
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`⏱️ [API] n8n responded in ${elapsed}ms with status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [API] n8n error response:', errorText);
        return NextResponse.json(
          { error: `n8n request failed: ${response.status}`, details: errorText },
          { status: response.status }
        );
      }

      const responseText = await response.text();
      console.log('📥 [API] n8n raw response (first 500 chars):', responseText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ [API] Parsed JSON successfully, keys:', Object.keys(data));
      } catch (parseError) {
        console.error('❌ [API] Failed to parse n8n response as JSON:', parseError);
        return NextResponse.json(
          { error: 'Invalid JSON response from n8n', rawResponse: responseText.substring(0, 200) },
          { status: 500 }
        );
      }

      console.log('✅ [API] Success! Returning data to client');

      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏰ [API] Request to n8n timed out after 4 minutes');
        return NextResponse.json(
          { error: 'n8n request timed out (4 min limit)' },
          { status: 504 }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('💥 [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
