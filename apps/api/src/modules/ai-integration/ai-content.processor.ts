import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AiContentType, AiGenerationStatus, AiProvider, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { AiKeysService } from '../ai-keys/ai-keys.service';
import { AiIntegrationRepository } from './ai-integration.repository';
import { PrismaService } from '../../prisma/prisma.service';

export const AI_CONTENT_QUEUE = 'ai-content';

export interface AiContentJob {
  generationId: string;
  unitId: string;
}

interface GeneratedContent {
  description?: string;
  short_description?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  schema_org_json?: Record<string, unknown>;
}

// OpenAI-compatible chat completion (works for OPENAI and DEEPSEEK)
async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  prompt: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
    body: JSON.stringify({
      model: url.includes('deepseek') ? 'deepseek-chat' : 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0].content.parts[0].text;
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { content: { text: string }[] };
  return data.content[0].text;
}

async function callLlm(provider: AiProvider, apiKey: string, prompt: string): Promise<string> {
  switch (provider) {
    case AiProvider.OPENAI:
      return callOpenAiCompatible('https://api.openai.com/v1/chat/completions', apiKey, prompt);
    case AiProvider.DEEPSEEK:
      return callOpenAiCompatible('https://api.deepseek.com/chat/completions', apiKey, prompt);
    case AiProvider.GOOGLE_GEMINI:
      return callGemini(apiKey, prompt);
    case AiProvider.ANTHROPIC:
      return callAnthropic(apiKey, prompt);
  }
}

function buildPrompt(
  types: AiContentType[],
  productName: string,
  categoryName: string | null,
  brandName: string | null,
): string {
  const ctx = [productName, categoryName && `Categoria: ${categoryName}`, brandName && `Marca: ${brandName}`]
    .filter(Boolean)
    .join('. ');

  const parts: string[] = [
    `Você é um especialista em marketing e SEO para pet shops. Responda APENAS em JSON válido conforme solicitado.`,
    `Produto: ${ctx}`,
    `Gere os seguintes campos no JSON de resposta:`,
  ];

  if (types.includes(AiContentType.DESCRIPTION)) {
    parts.push(`- "description": descrição comercial detalhada (máx 800 chars), benefícios e características`);
  }
  if (types.includes(AiContentType.SHORT_DESCRIPTION)) {
    parts.push(`- "short_description": resumo de 1-2 frases (máx 160 chars)`);
  }
  if (types.includes(AiContentType.SEO)) {
    parts.push(`- "seo_title": título SEO (máx 60 chars)`);
    parts.push(`- "seo_description": meta description (máx 160 chars)`);
    parts.push(`- "seo_keywords": array com 3-5 palavras-chave relevantes`);
  }
  if (types.includes(AiContentType.SCHEMA_ORG)) {
    parts.push(`- "schema_org_json": Schema.org JSON-LD do tipo Product com @context, @type, name, description`);
  }

  return parts.join('\n');
}

@Processor(AI_CONTENT_QUEUE)
export class AiContentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiContentProcessor.name);

  constructor(
    private readonly repository: AiIntegrationRepository,
    private readonly aiKeys: AiKeysService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<AiContentJob>): Promise<void> {
    const { generationId, unitId } = job.data;

    await this.repository.update(generationId, { status: AiGenerationStatus.PROCESSING });

    try {
      const generation = await this.repository.findById(generationId, unitId);
      if (!generation) throw new Error(`Generation ${generationId} not found`);

      const product = await this.prisma.product.findFirst({
        where: { id: generation.product_id, unidade_id: unitId },
        include: { category: true, brand: true },
      });
      if (!product) throw new Error(`Product ${generation.product_id} not found`);

      // SECURITY: rawKey used only for LLM call, never logged or serialized
      const rawKey = await this.aiKeys.resolveActiveKey(unitId, generation.provider);

      const prompt = buildPrompt(
        generation.types,
        product.name,
        product.category?.name ?? null,
        product.brand?.name ?? null,
      );

      const raw = await callLlm(generation.provider, rawKey, prompt);
      const generated = JSON.parse(raw) as GeneratedContent;

      await this.repository.update(generationId, {
        status: AiGenerationStatus.DONE,
        generated: generated as unknown as Prisma.InputJsonValue,
      });

      this.logger.log(`Generation ${generationId} completed for product ${product.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Generation ${generationId} failed: ${msg}`);
      await this.repository.update(generationId, {
        status: AiGenerationStatus.FAILED,
        error_message: msg,
      });
    }
  }
}
