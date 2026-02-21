'use client'

interface Result {
  orderId: string
  originalBox?: string
  optimizedBox: string
  baselineCost: number
  optimizedCost: number
  savings: number
  utilization: number
}

interface ResultsTableProps {
  results: Result[]
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No results to display
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Original Box
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Optimized Box
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Baseline Cost
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Optimized Cost
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Savings
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((result, idx) => (
            <tr key={idx}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.orderId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {result.originalBox || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.optimizedBox}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${result.baselineCost.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${result.optimizedCost.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                ${result.savings.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.utilization.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
