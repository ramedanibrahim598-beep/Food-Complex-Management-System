'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface TodayMetrics {
  production: {
    batches_completed: number
    total_produced: number
    efficiency: number
  }
  sales: {
    orders_count: number
    revenue: number
    avg_order_value: number
  }
  quality: {
    checks_performed: number
    pass_rate: number
    failed_checks: number
  }
}

interface Alert {
  type: string
  severity: string
  message: string
  timestamp: string
}

interface TopProduct {
  product_name: string
  revenue: number
  quantity: number
  orders: number
}

export default function ManagerDashboard() {
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
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
    const allowedRoles = ['system_admin', 'admin', 'general_manager', 'manager']
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

      const response = await axios.get('/api/manager/dashboard/overview', config)

      if (response.data.success) {
        const data = response.data.data
        setTodayMetrics(data.today_metrics)
        setAlerts(data.alerts || [])
        setTopProducts(data.top_products || [])
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
    return new Intl.NumberFormat('en-ET').format(numValue || 0)
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Dashboard...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>General Manager Dashboard</h1>
        <div>
          <button 
            onClick={() => router.push('/manager/reports')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 View Reports
          </button>
          <button
            onClick={() => router.push('/manager/approvals')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📝 Approvals
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/login')
            }}
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

      {/* Today's Key Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.8rem', fontWeight: '700' }}>📊 Today's Performance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Production Metrics */}
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', opacity: 0.95 }}>
              <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>🏭</span> Production
            </h3>
            {todayMetrics && (
              <div style={{ fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Batches Completed:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{todayMetrics.production.batches_completed}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Total Produced:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{formatNumber(todayMetrics.production.total_produced)} units</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.9 }}>Efficiency:</span>
                  <strong style={{ fontSize: '1.3rem' }}>
                    {todayMetrics.production.efficiency.toFixed(1)}%
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Sales Metrics */}
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', opacity: 0.95 }}>
              <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>💰</span> Sales
            </h3>
            {todayMetrics && (
              <div style={{ fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Orders:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{todayMetrics.sales.orders_count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Revenue:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(todayMetrics.sales.revenue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.9 }}>Avg Order Value:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(todayMetrics.sales.avg_order_value)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Quality Metrics */}
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', opacity: 0.95 }}>
              <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>✅</span> Quality
            </h3>
            {todayMetrics && (
              <div style={{ fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Checks Performed:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{todayMetrics.quality.checks_performed}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.9 }}>Pass Rate:</span>
                  <strong style={{ fontSize: '1.3rem' }}>
                    {todayMetrics.quality.pass_rate.toFixed(1)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.9 }}>Failed Checks:</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {todayMetrics.quality.failed_checks}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts and Top Products Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Alerts */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🚨 Recent Alerts</h3>
          {alerts.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No alerts at this time</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '0.75rem', 
                    marginBottom: '0.5rem', 
                    borderRadius: '4px',
                    backgroundColor: alert.severity === 'high' ? '#f8d7da' : alert.severity === 'medium' ? '#fff3cd' : '#d1ecf1',
                    borderLeft: `4px solid ${alert.severity === 'high' ? '#dc3545' : alert.severity === 'medium' ? '#ffc107' : '#17a2b8'}`
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {alert.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{alert.message}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🏆 Top Performing Products (30 days)</h3>
          {topProducts.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No sales data available</p>
          ) : (
            <div>
              {topProducts.map((product, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < topProducts.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{product.product_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {formatNumber(product.quantity)} units • {product.orders} orders
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/manager/reports')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 View Detailed Reports
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Data
          </button>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚙️ System Admin
          </button>
        </div>
      </div>
    </div>
  )
}
