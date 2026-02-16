'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface PaymentMethodReport {
  payment_method: string
  transaction_count: number
  total_amount: number
  average_amount: number
}

export default function CashierReportsPage() {
  const [reports, setReports] = useState<PaymentMethodReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    const allowedRoles = ['cashier', 'system_admin', 'admin']
    if (!allowedRoles.includes(userData.role)) {
      router.push('/login')
      return
    }

    loadReports()
  }, [router])

  const loadReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/cashier/payment-reports', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        setReports(response.data.data.payment_methods || [])
      } else {
        setError(response.data.message || 'Failed to load reports')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(Number(amount || 0))

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'CASH'
      case 'transfer':
      case 'bank_transfer':
        return 'TRANSFER'
      default:
        return method.replace('_', ' ').toUpperCase()
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading cashier reports...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Cashier Payment Reports</h1>
        <button
          onClick={() => router.push('/cashier/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}

      <div style={{ marginTop: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {reports.length === 0 ? (
          <div style={{ padding: '1rem' }}>No payment report data available.</div>
        ) : (
          reports.map((row, idx) => (
            <div key={`${row.payment_method}-${idx}`} style={{ padding: '1rem', borderBottom: idx < reports.length - 1 ? '1px solid #eee' : 'none' }}>
              <div style={{ fontWeight: 'bold' }}>{getPaymentMethodLabel(row.payment_method)}</div>
              <div>Transactions: {row.transaction_count}</div>
              <div>Total: {formatCurrency(row.total_amount)}</div>
              <div>Average: {formatCurrency(row.average_amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
