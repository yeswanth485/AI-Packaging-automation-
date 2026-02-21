'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CostTrendChartProps {
  data: Array<{
    date: string
    baseline: number
    optimized: number
    savings: number
  }>
}

export default function CostTrendChart({ data }: CostTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Legend />
        <Line type="monotone" dataKey="baseline" stroke="#ef4444" name="Baseline Cost" />
        <Line type="monotone" dataKey="optimized" stroke="#3b82f6" name="Optimized Cost" />
        <Line type="monotone" dataKey="savings" stroke="#10b981" name="Savings" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
