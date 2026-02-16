'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { logoutUser } from '../../../lib/auth'

interface TodayMetrics {
  total_batches: number
  completed_batches: number
  in_progress_batches: number
  total_produced: number
  total_target: number
  efficiency: number
}

interface MaterialAlert {
  low_stock_count: number
  expiring_count: number
}

interface RecentProduction {
  id: number
  product_name: string
  batch_number: string
  status: string
  quantity_produced: number
  quantity_target: number
  production_date: string
  supervisor: {
    name: string
  }
}

export default function ProductionDashboard() {
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null)
  const [materialAlerts, setMaterialAlerts] = useState<MaterialAlert | null>(null)
  const [recentProductions, setRecentProductions] = useState<RecentProduction[]>([])
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
    const allowedRoles = ['production_manager', 'system_admin', 'admin']
    if (!allowedRoles.includes(userData.role)) {
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

      const response = await axios.get('/api/production/dashboard', config)

      if (response.data.success) {
        const data = response.data.data
        setTodayMetrics(data.today_metrics)
        setMaterialAlerts(data.material_alerts)
        setRecentProductions(data.recent_productions || [])
      }
    } catch (error: any) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num
    return new Intl.NumberFormat('en-US').format(numValue || 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745'
      case 'in_progress': return '#ffc107'
      case 'planned': return '#17a2b8'
      case 'cancelled': return '#dc3545'
      default: return '#6c757d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'in_progress': return '⚡'
      case 'planned': return '📋'
      case 'cancelled': return '❌'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Production Dashboard...</h1>
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
          src="/images/production image.jpg" 
          alt="Production Floor"
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
              🏭 Production Dashboard
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Monitor and manage production operations
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Overview</h2>
        <div>
          <button 
            onClick={() => router.push('/production/manage')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚙️ Manage Production
          </button>
          <button 
            onClick={() => router.push('/production/inventory')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📦 Inventory
          </button>
          <button 
            onClick={() => router.push('/production')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back
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

      {/* Today's Production Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.8rem', fontWeight: '700' }}>📊 Today's Production Overview</h2>
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
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Total Batches</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.total_batches || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Scheduled for today
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
              {todayMetrics?.completed_batches || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Batches finished
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
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>⚡</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>In Progress</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.in_progress_batches || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Currently running
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
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Efficiency</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.efficiency?.toFixed(1) || 0}%
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Production efficiency
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
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>🏭</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Production Output</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {formatNumber(todayMetrics?.total_produced || 0)} / {formatNumber(todayMetrics?.total_target || 0)}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Produced / Target units
            </div>
          </div>
        </div>
      </div>

      {/* Material Alerts and Recent Productions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Material Alerts */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>⚠️ Material Alerts</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '0.5rem' }}>📉</span>
                Low Stock Materials
              </span>
              <strong style={{ color: '#856404' }}>{materialAlerts?.low_stock_count || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '0.5rem' }}>⏰</span>
                Expiring Soon
              </span>
              <strong style={{ color: '#721c24' }}>{materialAlerts?.expiring_count || 0}</strong>
            </div>
          </div>
          <button 
            onClick={() => router.push('/production/inventory')}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📦 View Full Inventory
          </button>
        </div>

        {/* Recent Productions */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🕒 Recent Productions</h3>
          {recentProductions.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No recent productions found</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentProductions.slice(0, 8).map((production, index) => (
                <div 
                  key={production.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < Math.min(recentProductions.length, 8) - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '0.5rem' }}>{getStatusIcon(production.status)}</span>
                      {production.product_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {production.batch_number} • {production.supervisor?.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: getStatusColor(production.status) }}>
                      {production.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {formatNumber(production.quantity_produced)} / {formatNumber(production.quantity_target)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => router.push('/production/manage')}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}
          >
            ⚙️ Manage All Productions
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/production/manage?action=new')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ New Production Batch
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Dashboard
          </button>
          <button 
            onClick={() => router.push('/production/reports')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Submit Daily Report
          </button>
          <button 
            onClick={() => router.push('/production/inventory?filter=low_stock')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚠️ Check Low Stock
          </button>
        </div>
      </div>
    </div>
  )
}
