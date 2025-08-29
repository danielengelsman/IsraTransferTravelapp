// app/api/ai/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files');

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    let docsText = '';
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const name = f.name || 'document.pdf';
      if (!name.toLowerCase().endsWith('.pdf')) continue;

      const buf = Buffer.from(await f.arrayBuffer());
      // dynamic import keeps edge bundler happy, but we also force node runtime above
      // @ts-expect-error no types published
      const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text?: string }>;
      const data = await pdfParse(buf);

      docsText += `\n\n# Document: ${name}\n${data?.text || ''}`;
    }

    return NextResponse.json({ ok: true, text: docsText.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Ingest failed' }, { status: 500 });
  }
}
