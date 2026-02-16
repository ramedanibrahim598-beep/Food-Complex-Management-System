'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { logoutUser } from '../../../lib/auth'

interface TodayMetrics {
  total_orders: number
  completed_orders: number
  pending_orders: number
  total_sales: number
  average_order_value: number
}

interface RecentOrder {
  id: number
  order_number: string
  customer_name: string | null
  order_type: string
  status: string
  total_amount: number
  order_date: string
  order_items: Array<{
    product_name: string
    quantity: number
    unit_price: number
  }>
}

interface PendingOrder {
  id: number
  order_number: string
  customer_name: string | null
  order_type: string
  status: string
  total_amount: number
  order_date: string
  order_items: Array<{
    product_name: string
    quantity: number
  }>
}

interface PaymentMethod {
  payment_method: string
  count: number
  total: number
}

export default function CashierDashboard() {
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
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

    let userData: { role?: string } = {}
    try {
      userData = JSON.parse(user)
    } catch (e) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }
    const allowedRoles = ['cashier', 'system_admin', 'admin']
    if (!userData.role || !allowedRoles.includes(userData.role)) {
      router.push('/login')
      return
    }

    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.get('/api/cashier/dashboard', config)

      if (response.data.success) {
        const data = response.data.data
        setTodayMetrics(data.today_metrics)
        setRecentOrders(data.recent_orders || [])
        setPendingOrders(data.pending_orders || [])
        setPaymentMethods(data.payment_methods || [])
      }
    } catch (error: any) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(numValue || 0)
  }

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num
    return new Intl.NumberFormat('en-US').format(numValue || 0)
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
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '$'
      case 'transfer':
      case 'bank_transfer':
        return 'TR'
      default: return 'PM'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash'
      case 'transfer':
      case 'bank_transfer':
        return 'Transfer'
      default:
        return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getOrderItemCount = (order: any) => {
    if (Array.isArray(order?.order_items)) return order.order_items.length
    if (Array.isArray(order?.orderItems)) return order.orderItems.length
    return 0
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Cashier Dashboard...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with Image */}
      <div style={{ 
        marginBottom: '2rem',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        position: 'relative',
        height: '200px'
      }}>
        <img 
          src="/images/cashier image.jpg" 
          alt="Cashier Operations"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)',
          display: 'flex',
          alignItems: 'center',
          padding: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', margin: 0, marginBottom: '0.5rem' }}>
              💰 Cashier Dashboard
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Manage orders and process payments
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Overview</h2>
        <div>
          <button 
            onClick={() => router.push('/cashier/pos')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛒 New Order
          </button>
          <button 
            onClick={() => router.push('/cashier/orders')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📋 All Orders
          </button>
          <button 
            onClick={() => router.push('/')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back to Home
          </button>
          <button 
            onClick={() => logoutUser(router)}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Today's Sales Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.8rem', fontWeight: '700' }}>💰 Today's Sales Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>📊</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Total Orders</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.total_orders || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Orders processed today
            </div>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(17, 153, 142, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(17, 153, 142, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(17, 153, 142, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>✅</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Completed</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.completed_orders || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Orders completed
            </div>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(240, 147, 251, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(240, 147, 251, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(240, 147, 251, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>⏳</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Pending</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.pending_orders || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Orders pending
            </div>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(250, 112, 154, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(250, 112, 154, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(250, 112, 154, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>💰</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Total Sales</h3>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {formatCurrency(todayMetrics?.total_sales || 0)}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Revenue generated
            </div>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(79, 172, 254, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(79, 172, 254, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(79, 172, 254, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>📈</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Avg Order</h3>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {formatCurrency(todayMetrics?.average_order_value || 0)}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Average order value
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Payment Methods */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>💳 Payment Methods Today</h3>
          {paymentMethods.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No payments processed today</p>
          ) : (
            <div>
              {paymentMethods.map((method, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < paymentMethods.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>
                      {getPaymentMethodIcon(method.payment_method)}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {getPaymentMethodLabel(method.payment_method)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {formatNumber(method.count)} transactions
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                      {formatCurrency(method.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Orders */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>⏳ Pending Orders</h3>
          {pendingOrders.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No pending orders</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {pendingOrders.slice(0, 6).map((order, index) => (
                <div 
                  key={order.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < Math.min(pendingOrders.length, 6) - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push(`/cashier/orders?order_id=${order.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ marginRight: '0.5rem' }}>{getOrderTypeIcon(order.order_type)} {getOrderTypeLabel(order.order_type)}</span>
                      <div style={{ fontWeight: 'bold' }}>#{order.order_number}</div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {order.customer_name || 'Walk-in Customer'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {getOrderItemCount(order)} items
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div 
                      style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(order.status),
                        marginBottom: '0.25rem'
                      }}
                    >
                      {order.status.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => router.push('/cashier/orders')}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}
          >
            📋 View All Orders
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🕒 Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No recent orders found</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentOrders.map((order, index) => (
              <div 
                key={order.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem 0', 
                  borderBottom: index < recentOrders.length - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => router.push(`/cashier/orders?order_id=${order.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(order.status)}</span>
                    <div style={{ fontWeight: 'bold' }}>#{order.order_number}</div>
                    <span style={{ marginLeft: '0.5rem' }}>{getOrderTypeIcon(order.order_type)} {getOrderTypeLabel(order.order_type)}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    {order.customer_name || 'Walk-in Customer'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    {getOrderItemCount(order)} items • {new Date(order.order_date).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div 
                    style={{ 
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '20px', 
                      fontSize: '0.875rem', 
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: getStatusColor(order.status),
                      marginBottom: '0.25rem'
                    }}
                  >
                    {order.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/cashier/pos')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛒 New Order
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Dashboard
          </button>
          <button 
            onClick={() => router.push('/cashier/reports')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Payment Reports
          </button>
        </div>
      </div>
    </div>
  )
}



