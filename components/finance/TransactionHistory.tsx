'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface PayoutTransaction {
  id: string
  cashoutRequestId: string
  gateway: string
  gatewayTxnId?: string
  status: string
  rawWebhookJson?: any
  createdAt: string
  updatedAt: string
  cashoutRequest: {
    id: string
    userId: string
    pointsUsed: number
    cashAmount: number
    method: string
    destinationRef: string
    status: string
    user: {
      name: string
      email: string
    }
  }
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gatewayFilter, setGatewayFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchTransactionHistory()
  }, [currentPage, statusFilter, gatewayFilter])

  const fetchTransactionHistory = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        status: statusFilter !== 'all' ? statusFilter : '',
        gateway: gatewayFilter !== 'all' ? gatewayFilter : '',
        search: searchQuery
      })

      const response = await fetch(`/api/admin/finance/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchTransactionHistory()
  }

  const exportTransactions = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        status: statusFilter !== 'all' ? statusFilter : '',
        gateway: gatewayFilter !== 'all' ? gatewayFilter : '',
        search: searchQuery,
        format: 'csv'
      })

      const response = await fetch(`/api/admin/finance/transactions/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting transactions:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'NEEDS_INFO':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'NEEDS_INFO':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const formatGateway = (gateway: string) => {
    switch (gateway) {
      case 'STRIPE':
        return 'Stripe'
      case 'PAYPAL':
        return 'PayPal'
      case 'BANK':
        return 'Bank Transfer'
      default:
        return gateway
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Transaction History
        </h2>
        <p className="text-gray-600">
          Track all payout transactions and their status
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, amount, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
              <option value="NEEDS_INFO">Needs Info</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gateway</label>
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Gateways</option>
              <option value="STRIPE">Stripe</option>
              <option value="PAYPAL">PayPal</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </button>
            
            <button
              onClick={exportTransactions}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gateway
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500">
                      {transaction.gatewayTxnId || 'No external ID'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.cashoutRequest.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.cashoutRequest.user.email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">${transaction.cashoutRequest.cashAmount.toFixed(2)}</div>
                      <div className="text-gray-500">
                        {transaction.cashoutRequest.pointsUsed.toLocaleString()} points
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatGateway(transaction.gateway)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span className="ml-1">{transaction.status}</span>
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-600">No transactions match the current filters.</p>
        </div>
      )}
    </div>
  )
}