# Arquitetura — Frontend Setup: Design Tokens + App Shell

## Visão geral (antes → depois)

**Antes:** `apps/admin` e `apps/pdv` são placeholders com só `main.tsx`. Sem deps, sem Tailwind, sem componentes.

**Depois:** Ambos os apps configurados com Tailwind v4, shadcn/ui (new-york), design tokens da marca Zoro&Kaya, e shells de layout funcionais.

## Componentes afetados

- `packages/ui` — tokens CSS compartilhados (fonte de verdade das cores/tipografia)
- `apps/admin` — setup completo + AdminShell (sidebar forest + topbar)
- `apps/pdv` — setup completo + PDVShell (fullscreen, touch-first)

## Padrões

- **Tailwind v4** (`@tailwindcss/vite`, sem `tailwind.config.js`) — tema via CSS `@theme`
- **shadcn/ui** estilo `new-york`, `cssVariables: true`
- **Fontes**: Fredoka 700, Sarina, Inter via Google Fonts (link no `index.html`)
- Tokens mapeados para variáveis shadcn (`--background`, `--primary`, etc.) para compatibilidade máxima

## Design tokens → CSS vars (mapeamento shadcn)

| Token marca | CSS var | Valor |
|-------------|---------|-------|
| brand-cream | --background | #F9EEE4 |
| surface | --card | #FFFDF9 |
| brand-orange | --primary | #D66D25 |
| brand-cream | --primary-foreground | #F9EEE4 |
| border | --border | #E6D8C6 |
| brand-orange | --ring | #D66D25 |
| surface-alt | --muted | #F4E9DB |
| text-muted | --muted-foreground | #937E66 |
| brand-sage | --accent | #C7C7A1 |
| danger | --destructive | #B23A1E |

## Principais arquivos a criar

### packages/ui
- `src/tokens.css` — fonte de verdade dos tokens
- `src/index.ts` — re-export

### apps/admin
- `index.html` — Google Fonts
- `vite.config.ts` — @vitejs/plugin-react + @tailwindcss/vite + alias @
- `tsconfig.json` — paths alias
- `components.json` — shadcn config
- `src/index.css` — @import tailwindcss + @theme com tokens
- `src/main.tsx` — ReactDOM.createRoot
- `src/App.tsx` — router placeholder
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/AdminShell.tsx`

### apps/pdv
- Mesmos arquivos de config
- `src/components/layout/PDVShell.tsx`
