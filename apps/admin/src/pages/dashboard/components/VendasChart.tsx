import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface VendasDia {
  data: string
  total_centavos: number
  total_pedidos: number
}

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(isoDate: string, todayStr: string): string {
  if (isoDate === todayStr) return 'Hoje'
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'short' })
}

interface VendasChartProps {
  dados: VendasDia[]
}

export function VendasChart({ dados }: VendasChartProps) {
  const todayStr = useMemo(getTodayStr, [])

  const chartData = useMemo(
    () =>
      dados.map((d) => ({
        ...d,
        label: getDayLabel(d.data, todayStr),
      })),
    [dados, todayStr],
  )

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-display text-base font-bold text-foreground mb-4">
        Vendas — últimos 7 dias
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            formatter={(v) => [formatBRL(Number(v)), 'Total']}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey="total_centavos"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
            opacity={0.9}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
