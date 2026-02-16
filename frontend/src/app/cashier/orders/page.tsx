'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'

interface OrderItem {
  id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
}

interface Order {
  id: number
  order_number: string
  customer_name: string | null
  customer_phone: string | null
  order_type: string
  status: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  order_date: string
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()
  const searchParams = useSearchParams()

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

    fetchOrders()
  }, [router, statusFilter])

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: statusFilter !== 'all' ? { status: statusFilter } : {}
      }

      const response = await axios.get('/api/cashier/orders', config)

      if (response.data.success) {
        // Handle paginated response - orders are in response.data.data.data
        const ordersData = response.data.data.data || response.data.data || []
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        
        // Check if there's an order_id in URL params
        const orderId = searchParams.get('order_id')
        if (orderId && Array.isArray(ordersData)) {
          const order = ordersData.find((o: Order) => o.id === parseInt(orderId))
          if (order) {
            setSelectedOrder(order)
          }
        }
      }
    } catch (error: any) {
      setError('Failed to load orders')
      console.error('Orders error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.put(
        `/api/cashier/orders/${orderId}/status`,
        { status: newStatus },
        config
      )

      if (response.data.success) {
        fetchOrders()
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus })
        }
      }
    } catch (error: any) {
      setError('Failed to update order status')
      console.error('Update error:', error)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(numValue || 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745'
      case 'pending': return '#ffc107'
      case 'preparing': return '#17a2b8'
      case 'ready': return '#fd7e14'
      case 'cancelled': return '#dc3545'
      default: return '#6c757d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'pending': return '⏳'
      case 'preparing': return '👨‍🍳'
      case 'ready': return '🔔'
      case 'cancelled': return '❌'
      default: return '❓'
    }
  }

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine_in': return '🍽️'
      case 'takeout': return '🥡'
      case 'delivery': return '🚚'
      default: return '📦'
    }
  }

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return 'Delivery'
      case 'dine_in':
      case 'takeout':
      case 'on_shop':
        return 'On Shop'
      default:
        return type.replace('_', ' ').toUpperCase()
    }
  }
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Orders...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>📋 All Orders</h1>
        <div>
          <button 
            onClick={() => router.push('/cashier/pos')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛒 New Order
          </button>
          <button 
            onClick={() => router.push('/cashier/dashboard')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        {/* Orders List */}
        <div>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>
            Orders ({orders.length})
          </h2>
          
          {orders.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
              <p>No orders found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    backgroundColor: selectedOrder?.id === order.id ? '#e7f3ff' : 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    border: selectedOrder?.id === order.id ? '2px solid #007bff' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedOrder?.id !== order.id) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedOrder?.id !== order.id) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{getStatusIcon(order.status)}</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>#{order.order_number}</span>
                      <span>{getOrderTypeIcon(order.order_type)} {getOrderTypeLabel(order.order_type)}</span>
                    </div>
                    <div
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(order.status)
                      }}
                    >
                      {order.status.toUpperCase()}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                    {order.customer_name || 'Walk-in Customer'}
                    {order.customer_phone && ` • ${order.customer_phone}`}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {order.order_items.length} items • {new Date(order.order_date).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#28a745' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Details */}
        {selectedOrder && (
          <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#333' }}>Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(selectedOrder.status)}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>#{selectedOrder.order_number}</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {new Date(selectedOrder.order_date).toLocaleString()}
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#333' }}>Customer Information</h3>
                <div style={{ fontSize: '0.875rem' }}>
                  <div><strong>Name:</strong> {selectedOrder.customer_name || 'Walk-in Customer'}</div>
                  {selectedOrder.customer_phone && (
                    <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>
                  )}
                  <div><strong>Type:</strong> {getOrderTypeIcon(selectedOrder.order_type)} {getOrderTypeLabel(selectedOrder.order_type)}</div>
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#333' }}>Order Items</h3>
                {selectedOrder.order_items.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0',
                      borderBottom: index < selectedOrder.order_items.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderTop: '2px solid #eee', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#dc3545' }}>
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: '#28a745' }}>
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <strong>Notes:</strong> {selectedOrder.notes}
                </div>
              )}

              {/* Status Update */}
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: '#333' }}>Update Status</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                          style={{ flex: 1, padding: '0.5rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Start Preparing
                        </button>
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                          style={{ flex: 1, padding: '0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                        style={{ width: '100%', padding: '0.5rem', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Mark as Ready
                      </button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                        style={{ width: '100%', padding: '0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Complete Order
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


