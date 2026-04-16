import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// SECTION: API Health Check Route
// PURPOSE: Allows Kubernetes, Docker, or Load Balancers (like AWS ALB) 
// to instantly verify if the backend server and database are alive.
// ============================================================

export async function GET() {
  try {
    // 1. Check if the Node.js API server itself is running
    const serverTime = new Date().toISOString();

    // 2. IMPORTANT: Verify Database connectivity
    // A server isn't truly "healthy" if it lost DB connection
    const { error } = await supabase.from('jobs').select('id').limit(1);
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    // 3. Return 200 OK Status
    return NextResponse.json(
      {
        status: 'OK',
        message: 'Code Review Copilot Systems are fully operational.',
        timestamp: serverTime,
        database: 'CONNECTED',
      },
      { status: 200 }
    );

  } catch (error: any) {
    // If anything fails, return 503 Service Unavailable
    console.error('[HEALTH CHECK FAILED]:', error);
    
    return NextResponse.json(
      {
        status: 'ERROR',
        message: 'System critical failure',
        error: error.message || 'Unknown error',
      },
      { status: 503 }
    );
  }
}
