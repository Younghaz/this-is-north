import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      message: "AdminGuard debug endpoint",
      instructions: [
        "1. Open browser dev tools (F12)",
        "2. Go to Console tab", 
        "3. Visit /admin page",
        "4. Look for 'AdminGuard:' messages to see what's happening"
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}