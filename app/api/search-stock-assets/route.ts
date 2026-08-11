import { NextRequest, NextResponse } from 'next/server';
import { searchStockImages, buildStockSearchQuery } from '@/lib/server/stockService';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { query, scene_id, topic } = await request.json();
    const finalQuery = (query && String(query).trim()) || buildStockSearchQuery({ text: topic || '' });
    const assets = await searchStockImages(finalQuery, 12, 'portrait');
    return NextResponse.json({ success: true, scene_id, assets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao buscar imagens de stock.' }, { status: 500 });
  }
}
