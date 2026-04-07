'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface GastoChartProps {
  data: Array<{ data: string; gasto: number; conversoes: number }>
}

export function GastoChart({ data }: GastoChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    dataLabel: new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gastoGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00FFFF" />
            <stop offset="100%" stopColor="#8A2BE2" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A3A" />
        <XAxis
          dataKey="dataLabel"
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${v}`}
        />
        <Tooltip
          contentStyle={{ background: '#0F0F2A', border: '1px solid #1A1A3A', borderRadius: 8, color: '#fff' }}
          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gasto']}
          labelStyle={{ color: '#00FFFF' }}
        />
        <Line
          type="monotone"
          dataKey="gasto"
          stroke="url(#gastoGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#00FFFF' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
