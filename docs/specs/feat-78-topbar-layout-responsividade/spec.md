# Spec — Topbar: Layout, Responsividade e Funcionalidade

**Issue:** #78  
**Branch:** feat/78-topbar-layout-responsividade  
**Arquivo-alvo:** `apps/admin/src/components/layout/Topbar.tsx`

---

## Problema

O Topbar do admin apresenta três categorias de problema:

### 1. Layout — espaço morto em viewports largas

`flex-1 max-w-lg` na busca cria um gap vazio entre a barra de busca e os controles da direita.

**Exemplo em 1280px:**
- Sidebar: 240px → área útil do conteúdo: 1040px
- Padding horizontal (`px-6`): 48px → usável: 992px
- Controles direita (estimado): ~330px + gaps
- Search com `flex-1` e `max-w-lg` (512px): ocupa 512px
- **Gap morto: ~134px** entre search e controles — visível como área vazia no centro-direito da header

### 2. Responsividade — sem breakpoints

Estrutura flat em uma única linha para qualquer viewport. Em telas menores que ~900px, os controles ficam sobrepostos ou cortados. Sem colapso, sem menu hamburger, sem adaptação mobile.

### 3. Controles estáticos (sem funcionalidade)

| Controle | Estado atual | Estado esperado |
|----------|-------------|-----------------|
| Busca | Input decorativo, sem ação | Busca global roteável |
| Seletor de unidade | String `'Loja Centro'` hardcoded | Unidade real do contexto de auth |
| Notificações | Bolinha laranja estática | Badge com contagem + dropdown |
| Menu do usuário | Avatar + nome sem ação | Dropdown com perfil e sair |

---

## Fora de escopo desta issue

- Implementação completa da busca global (buscar produto por nome, cliente, pedido) — só o handler de roteamento/redirect para `/search?q=` é suficiente
- Backend de notificações (badge pode ser mockado com contagem fixa)
- Página de perfil do usuário

---

## Comportamento desejado

### Layout

A busca deve expandir para preencher o espaço disponível sem criar gap. Duas abordagens possíveis:

**Opção A (recomendada):** remover `max-w-lg` e deixar `flex-1` puro — search ocupa todo espaço entre sidebar e controles direita.

**Opção B:** adicionar `justify-between` no container e `mx-auto` com `max-w-lg` para centrar o search — mais refinado visualmente mas adiciona complexidade.

Decisão: **Opção A** — simples, consistente com padrão de admin ERP onde a busca ocupa a barra inteira.

### Responsividade

| Breakpoint | Comportamento |
|-----------|---------------|
| `< 768px` (mobile) | Search oculto (apenas ícone de lupa abre fullscreen), unit selector oculto, user menu vira ícone |
| `768px–1024px` (tablet) | Search menor, unit selector visible, user = avatar só sem nome |
| `>= 1024px` (desktop) | Layout atual mas sem gap: search `flex-1`, user com nome |

### Seletor de unidade

Ler `user.unit` (ou equivalente) do contexto `useAuth`. Se o contexto não expõe unidade, usar `user?.name` como fallback temporário e documentar como `TODO: integrar endpoint /me com unidade`.

### Notificações

- Badge com número: `0` oculta badge, `1-9` mostra número, `10+` mostra `9+`
- Contagem pode ser mockada como `0` inicialmente (sem endpoint real)
- Dropdown básico: lista vazia com "Nenhuma notificação" quando count = 0

### Menu do usuário

Ao clicar: dropdown com:
1. Nome e email do usuário
2. Separador
3. Link para `/configuracoes`
4. Botão "Sair" → chama `logout()` do `useAuth`

---

## Critérios de aceite

- [ ] Sem gap visual entre search e controles em viewports 1024px, 1280px e 1440px
- [ ] Em 768px search colapsa para ícone de lupa
- [ ] Em < 768px user menu vira só avatar sem nome
- [ ] Seletor de unidade exibe dado real (não string hardcoded)
- [ ] Notificações com badge numérico (pode ser 0 mockado)
- [ ] User menu dropdown funcional com Sair conectado ao `logout()` do AuthContext
- [ ] Typing na busca + Enter navega para `/search?q=<termo>` (ou `/?search=<termo>` se rota não existe ainda)

---

## Notas técnicas

### AuthContext

```tsx
// apps/admin/src/contexts/AuthContext.tsx
const { user, logout } = useAuth()
// user.name → nome do usuário
// Verificar se expõe unit/unidade. Se não, adicionar ao contexto na mesma issue.
```

### Dropdown para notificações e user menu

Usar `@radix-ui/react-dropdown-menu` (já disponível via shadcn) ou implementar com Ark UI `Menu` se disponível. Não criar dropdown custom.

### Breakpoints Tailwind

```
sm: 640px, md: 768px, lg: 1024px, xl: 1280px
```

### Roteamento da busca

```tsx
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()

// onSubmit do form da busca:
navigate(`/search?q=${encodeURIComponent(query)}`)
// Se /search não existir, usar useSearchParams no Dashboard como alternativa temporária
```

---

## Sequência de implementação sugerida

1. **Fix layout** (remove `max-w-lg`) — 15 min, zero risco, entrega valor imediato
2. **User menu dropdown** (Sair + perfil) — 30 min, usa Radix DropdownMenu já presente
3. **Seletor de unidade** — 20 min, lê do contexto
4. **Responsividade** — 1h, breakpoints Tailwind
5. **Notificações** — 30 min, badge mockado + dropdown vazio
6. **Busca** — 20 min, form com navigate
