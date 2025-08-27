import { NextResponse } from 'next/server'
export async function GET(){ return NextResponse.json({ ok:true, runtime:'edge-or-node', now: Date.now() }) }
