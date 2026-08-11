// Adaptador para rodar, sem reescrever, os handlers antigos no estilo
// Vercel serverless (req, res) dentro de Route Handlers do Next.js App
// Router. Isso permite portar a lógica de negócio (Supabase, Gemini,
// Cloudflare) das rotas antigas quase sem alteração, só trocando a "casca".

import { NextRequest, NextResponse } from 'next/server';

export type LegacyHandler = (req: LegacyReq, res: LegacyRes) => Promise<any> | any;

export interface LegacyReq {
  method: string;
  headers: Record<string, string>;
  body: any;
}

export interface LegacyRes {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => LegacyRes;
  json: (body: any) => LegacyRes;
  end: () => LegacyRes;
}

export async function runLegacyHandler(handler: LegacyHandler, request: NextRequest): Promise<NextResponse> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: any = {};
  try {
    if (request.method !== 'GET' && request.method !== 'OPTIONS') {
      body = await request.json();
    }
  } catch {
    body = {};
  }

  const req: LegacyReq = { method: request.method, headers, body };

  let statusCode = 200;
  let responseBody: any = null;
  let ended = false;

  const res: LegacyRes = {
    setHeader() {
      // Cabeçalhos de CORS das rotas antigas não são necessários no Next
      // (mesmo domínio de front e API); ignorados com segurança.
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      responseBody = payload;
      ended = true;
      return res;
    },
    end() {
      ended = true;
      return res;
    },
  };

  await handler(req, res);

  if (!ended) {
    return NextResponse.json({ error: 'A rota não retornou uma resposta.' }, { status: 500 });
  }

  return NextResponse.json(responseBody ?? {}, { status: statusCode });
}
