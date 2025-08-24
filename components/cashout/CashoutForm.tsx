'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  Gift, 
  CreditCard, 
  Banknote,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

const cashoutSchema = z.object({
  points: z.number().min(500, 'Minimum 500 points required ($5.00)'),
  method: z.enum(['BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'CASH']),
  destinationRef: z.string().min(1, 'Payment destination is required'),
})

type CashoutFormData = z.infer<typeof cashoutSchema>

interface CashoutFormProps {
  onSuccess: () => void
}

export function CashoutForm({ onSuccess }: CashoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [walletData, setWalletData] = useState({
    pointsBalance: 0,
    cashBalance: 0,
    lockedAmount: 0
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CashoutFormData>({
    resolver: zodResolver(cashoutSchema),
    defaultValues: {
      method: 'BANK_TRANSFER',
      points: 500
    }
  })

  const watchedPoints = watch('points')
  const watchedMethod = watch('method')

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWalletData({
          pointsBalance: data.stats.currentPointsBalance,
          cashBalance: data.stats.currentCashBalance,
          lockedAmount: data.stats.lockedAmount
        })
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    }
  }

  const calculateCashAmount = (points: number) => {
    return points * 0.01 // $0.01 per point
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Banknote className="h-5 w-5" />
      case 'PAYPAL':
        return <CreditCard className="h-5 w-5" />
      case 'STRIPE':
        return <CreditCard className="h-5 w-5" />
      case 'CASH':
        return <DollarSign className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer'
      case 'PAYPAL':
        return 'PayPal'
      case 'STRIPE':
        return 'Credit/Debit Card'
      case 'CASH':
        return 'Cash Pickup'
      default:
        return method
    }
  }

  const getDestinationPlaceholder = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Enter bank account number'
      case 'PAYPAL':
        return 'Enter PayPal email address'
      case 'STRIPE':
        return 'Enter card details'
      case 'CASH':
        return 'Enter pickup location'
      default:
        return 'Enter payment destination'
    }
  }

  const onSubmit = async (data: CashoutFormData) => {
    if (data.points > walletData.pointsBalance) {
      setError('Insufficient points balance')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/cashouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: data.points,
          method: data.method,
          destinationRef: data.destinationRef
        })
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Cashout request failed')
      }
    } catch (error) {
      console.error('Cashout error:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-success-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cashout Request Submitted!</h2>
        <p className="text-gray-600 mb-4">
          Your request to cash out {watchedPoints} points for ${calculateCashAmount(watchedPoints).toFixed(2)} has been submitted.
        </p>
        <p className="text-sm text-gray-500">
          You will receive a notification once the payment is processed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cash Out Points</h2>
        <p className="text-gray-600">Convert your points to real money</p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-600">Available Points</p>
            <p className="text-3xl font-bold text-primary-900">{walletData.pointsBalance}</p>
            <p className="text-sm text-primary-600 mt-1">
              ≈ ${(walletData.pointsBalance * 0.01).toFixed(2)} USD
            </p>
          </div>
          <div className="p-3 bg-primary-200 rounded-full">
            <Gift className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Points Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points to Cash Out
          </label>
          <div className="relative">
            <Input
              type="number"
              min="500"
              max={walletData.pointsBalance}
              step="100"
              {...register('points', { valueAsNumber: true })}
              error={errors.points?.message}
              leftIcon={<Gift className="h-4 w-4" />}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-sm text-gray-500">
                = ${calculateCashAmount(watchedPoints).toFixed(2)}
              </span>
            </div>
          </div>
          {errors.points && (
            <p className="mt-1 text-sm text-danger-600">{errors.points.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum: 500 points ($5.00) | Maximum: {walletData.pointsBalance} points
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'CASH'] as const).map((method) => (
              <label
                key={method}
                className={`
                  flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors
                  ${watchedMethod === method 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="radio"
                  value={method}
                  {...register('method')}
                  className="sr-only"
                />
                <div className="flex items-center space-x-2">
                  {getMethodIcon(method)}
                  <span className="text-sm font-medium">{getMethodLabel(method)}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Destination
          </label>
          <Input
            placeholder={getDestinationPlaceholder(watchedMethod)}
            {...register('destinationRef')}
            error={errors.destinationRef?.message}
            leftIcon={getMethodIcon(watchedMethod)}
          />
          {errors.destinationRef && (
            <p className="mt-1 text-sm text-danger-600">{errors.destinationRef.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {watchedMethod === 'BANK_TRANSFER' && 'Enter your bank account number for the transfer'}
            {watchedMethod === 'PAYPAL' && 'Enter the PayPal email address where you want to receive the payment'}
            {watchedMethod === 'STRIPE' && 'Enter your card details for the payment'}
            {watchedMethod === 'CASH' && 'Enter the location where you want to pick up your cash'}
          </p>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Transaction Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Points to cash out:</span>
              <span className="font-medium">{watchedPoints} points</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash amount:</span>
              <span className="font-medium text-success-600">
                ${calculateCashAmount(watchedPoints).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment method:</span>
              <span className="font-medium">{getMethodLabel(watchedMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing fee:</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="font-bold text-success-600">
                  ${calculateCashAmount(watchedPoints).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-danger-400 mr-2" />
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || watchedPoints > walletData.pointsBalance}
          isLoading={isLoading}
        >
          {isLoading ? 'Processing...' : 'Submit Cashout Request'}
        </Button>
      </form>

      {/* Important Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Important Information</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Cashout requests are processed within 2-3 business days</li>
          <li>• Minimum cashout amount is 500 points ($5.00)</li>
          <li>• Processing fees may apply depending on payment method</li>
          <li>• You will receive email confirmation once processed</li>
          <li>• Points are locked during processing to prevent double-spending</li>
        </ul>
      </div>
    </div>
  )
}