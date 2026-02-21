'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BoxUsageChartProps {
  data: Array<{
    boxType: string
    count: number
    percentage: number
  }>
}

export default function BoxUsageChart({ data }: BoxUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="boxType" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" name="Usage Count" />
      </BarChart>
    </ResponsiveContainer>
  )
}
