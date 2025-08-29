// app/api/ai/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // Accept free-text from either "prompt" or "description"
    const prompt =
      (form.get('prompt') as string | null) ??
      (form.get('description') as string | null) ??
      '';

    // Collect PDFs if any were attached (but it's fine if there are none)
    const files = form.getAll('files');

    let docsText = '';
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const name = f.name || 'document';
      if (!name.toLowerCase().endsWith('.pdf')) continue;

      const buf = Buffer.from(await f.arrayBuffer());
      // dynamic import so Next bundles correctly (Node runtime required above)
      // @ts-expect-error: no published types in some environments
      const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text?: string }>;
      const data = await pdfParse(buf);

      docsText += `\n\n# Document: ${name}\n${data?.text || ''}`;
    }

    const combined = [prompt?.trim(), docsText.trim()].filter(Boolean).join('\n\n');

    if (!combined) {
      // Now the endpoint only errors if *neither* prompt nor files are provided
      return NextResponse.json(
        { error: 'Provide a description or attach files.' },
        { status: 400 }
      );
    }

    // Return a single blob of text your chat route (or client) can feed to the AI
    return NextResponse.json({ ok: true, text: combined });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Ingest failed' },
      { status: 500 }
    );
  }
}
