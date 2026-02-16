'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ProductionPlan {
  id: number
  product_name: string
  batch_number: string
  quantity_target: number
  production_line: string
  shift: string
  production_date: string
  start_time: string
  status: string
  notes?: string | null
  supervisor?: {
    id: number
    name: string
  } | null
}

interface PurchaseOrder {
  id: number
  po_number: string
  material_name: string
  supplier_name: string
  unit_of_measure?: string
  quantity: number
  unit_cost: number
  total_cost: number
  expected_delivery_date: string
  status: string
  notes?: string | null
  created_at: string
  creator?: {
    id: number
    name: string
  } | null
  rawMaterial?: {
    id: number
    material_name: string
    material_code?: string | null
  } | null
}

export default function ManagerApprovalsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.push('/login')
      return
    }

    let userData: { role?: string } = {}
    try {
      userData = JSON.parse(user)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    const allowedRoles = ['system_admin', 'admin', 'general_manager', 'manager']
    if (!userData.role || !allowedRoles.includes(userData.role)) {
      router.push('/login')
      return
    }

    loadApprovals()
  }, [router])

  const authConfig = () => {
    const token = localStorage.getItem('token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    }
  }

  const loadApprovals = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get('/api/manager/approvals/overview', authConfig())
      if (response.data?.success) {
        setPlans(response.data.data?.planned_productions || [])
        setPurchaseOrders(response.data.data?.pending_purchase_orders || [])
      } else {
        setError(response.data?.message || 'Failed to load approvals')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const submitDecision = async (type: 'productions' | 'purchase-orders', id: number, decision: 'approve' | 'reject') => {
    const commentInput = window.prompt('Optional comment for this decision:')
    if (commentInput === null) {
      return
    }

    const saving = `${type}-${id}-${decision}`
    setSavingKey(saving)
    setError('')

    try {
      await axios.put(`/api/manager/approvals/${type}/${id}`, {
        decision,
        comment: commentInput.trim()
      }, authConfig())

      await loadApprovals()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save decision')
    } finally {
      setSavingKey('')
    }
  }

  const formatCurrency = (amount: number | string) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(numValue || 0)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>📝 Manager Approvals</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/manager/dashboard')} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#6b7280', color: '#fff', cursor: 'pointer' }}>🏠 Dashboard</button>
          <button onClick={() => router.push('/manager/reports')} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' }}>📊 Reports</button>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/login')
            }}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer' }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading approvals...</div>
      ) : (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>🏭 Planned Productions ({plans.length})</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {plans.length === 0 ? (
                <div style={{ padding: '1rem', color: '#6b7280' }}>No planned productions waiting for approval.</div>
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{plan.batch_number || `Production #${plan.id}`}</div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          🍞 Product: <strong>{plan.product_name || 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          📊 Target Quantity: <strong>{plan.quantity_target || 0} kg</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          🏭 Production Line: <strong>{plan.production_line || 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          🕐 Shift: <strong>{plan.shift ? plan.shift.charAt(0).toUpperCase() + plan.shift.slice(1) : 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          📅 Scheduled Date: <strong>{new Date(plan.production_date).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          ⏰ Start Time: <strong>{plan.start_time || 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                          👤 Supervisor: <strong>{plan.supervisor?.name || 'N/A'}</strong>
                        </div>
                        {plan.notes && (
                          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            📝 {plan.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => submitDecision('productions', plan.id, 'approve')}
                          disabled={savingKey !== ''}
                          style={{ padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer' }}
                        >
                          {savingKey === `productions-${plan.id}-approve` ? 'Saving...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => submitDecision('productions', plan.id, 'reject')}
                          disabled={savingKey !== ''}
                          style={{ padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer' }}
                        >
                          {savingKey === `productions-${plan.id}-reject` ? 'Saving...' : '❌ Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: '0.75rem' }}>📦 Pending Purchase Orders ({purchaseOrders.length})</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {purchaseOrders.length === 0 ? (
                <div style={{ padding: '1rem', color: '#6b7280' }}>No pending purchase orders waiting for approval.</div>
              ) : (
                purchaseOrders.map((po) => (
                  <div key={po.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{po.po_number || `PO #${po.id}`}</div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          📦 Material: <strong>{po.material_name || po.rawMaterial?.material_name || 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          📊 Quantity: <strong>{po.quantity || 0} {po.unit_of_measure || 'units'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          💰 Total Cost: <strong>{formatCurrency(po.total_cost || 0)}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          🏢 Supplier: <strong>{po.supplier_name || 'N/A'}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          📅 Expected Delivery: <strong>{new Date(po.expected_delivery_date).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                          👤 Requested By: <strong>{po.creator?.name || 'N/A'}</strong>
                        </div>
                        {po.notes && (
                          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            📝 {po.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => submitDecision('purchase-orders', po.id, 'approve')}
                          disabled={savingKey !== ''}
                          style={{ padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer' }}
                        >
                          {savingKey === `purchase-orders-${po.id}-approve` ? 'Saving...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => submitDecision('purchase-orders', po.id, 'reject')}
                          disabled={savingKey !== ''}
                          style={{ padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer' }}
                        >
                          {savingKey === `purchase-orders-${po.id}-reject` ? 'Saving...' : '❌ Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
