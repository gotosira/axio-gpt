import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let q = searchParams.get('q')?.toString().trim();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

    // Heuristics to bias sources for popular realtime topics in Thailand
    const lower = q.toLowerCase();
    if (/[ราคาทอง]|ทองคำ|ราคาทองคำ/.test(q)) {
      q += ' site:goldtraders.or.th';
    } else if (/(weather|พยากรณ์|อากาศ|ฝน|อุณหภูมิ)/i.test(q)) {
      q += ' weather forecast';
    } else if (/(btc|bitcoin|คริปโต|ราคาเหรียญ)/i.test(q)) {
      q += ' price today';
    } else if (/(หุ้น|ดัชนี|set index|ตลาดหุ้น)/i.test(q)) {
      q += ' today';
    }

    // Simple meta-search using DuckDuckGo Instant Answer API (no key required)
    const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { 'Accept': 'application/json' }
    });
    const data = await ddg.json();

    let abstract = data.AbstractText || data.Abstract || '';
    const heading = data.Heading || '';
    const related: string[] = (data.RelatedTopics || []).slice(0, 7).map((t: { Text?: string }) => t?.Text).filter(Boolean);
    const sourceUrl = data.AbstractURL || (data.RelatedTopics && data.RelatedTopics[0]?.FirstURL) || '';

    // Fallback summary if abstract empty
    if (!abstract && related.length) {
      abstract = related.slice(0, 3).join(' • ');
    }

    return NextResponse.json({ heading, abstract, related, sourceUrl });
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}


