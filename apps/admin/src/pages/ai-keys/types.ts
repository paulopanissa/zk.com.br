export type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'DEEPSEEK' | 'GOOGLE_GEMINI'

export interface AiKey {
  id: string
  provider: AiProvider
  label: string
  key_prefix: string
  key_suffix: string
  key_masked: string
  active: boolean
  last_tested_at: string | null
  last_test_ok: boolean | null
  last_test_latency_ms: number | null
  created_at: string
  updated_at: string
}

export const PROVIDER_CONFIG: Record<AiProvider, { label: string; badgeClass: string }> = {
  OPENAI:        { label: 'OpenAI',        badgeClass: 'border-success/40 bg-success/10 text-success' },
  ANTHROPIC:     { label: 'Anthropic',     badgeClass: 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' },
  DEEPSEEK:      { label: 'DeepSeek',      badgeClass: 'border-primary/40 bg-primary/10 text-primary' },
  GOOGLE_GEMINI: { label: 'Google Gemini', badgeClass: 'border-brand-ochre/40 bg-brand-ochre/10 text-brand-ochre' },
}
