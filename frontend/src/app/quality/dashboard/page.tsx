'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface TodayMetrics {
  total_inspections: number
  passed_inspections: number
  failed_inspections: number
  pending_inspections: number
  pass_rate: number
}

interface WeeklyTrend {
  date: string
  total: number
  passed: number
  failed: number
}

interface QualityIssue {
  defect_type: string
  count: number
}

interface RecentCheck {
  id: number
  status: string
  check_date: string
  defect_type: string | null
  defect_count: number
  sample_size: number
  production: {
    product_name: string
    batch_number: string
  }
  inspector: {
    name: string
  }
}

interface PendingInspection {
  id: number
  product_name: string
  batch_number: string
  production_date: string
  quantity_produced: number
  supervisor: {
    name: string
  }
}

export default function QualityDashboard() {
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null)
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([])
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([])
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([])
  const [pendingInspections, setPendingInspections] = useState<PendingInspection[]>([])
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
    const allowedRoles = ['quality_controller', 'system_admin', 'admin']
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

      console.log('Fetching quality dashboard data...')
      const response = await axios.get('/api/quality/dashboard', config)
      console.log('Quality dashboard response:', response.data)

      if (response.data.success) {
        const data = response.data.data
        console.log('Dashboard data:', data)
        setTodayMetrics(data.today_metrics)
        setWeeklyTrends(data.weekly_trends || [])
        setRecentChecks(data.recent_checks || [])
        setQualityIssues(data.quality_issues || [])
        setPendingInspections(data.pending_inspections || [])
        setError('') // Clear any previous errors
      } else {
        setError('Failed to load dashboard data: ' + response.data.message)
      }
    } catch (error: any) {
      console.error('Quality dashboard error:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load dashboard data'
      setError(errorMessage)
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
      case 'passed': return '#28a745'
      case 'failed': return '#dc3545'
      case 'pending': return '#ffc107'
      default: return '#6c757d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅'
      case 'failed': return '❌'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Quality Dashboard...</h1>
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
          src="/images/quality control image.jpg" 
          alt="Quality Control"
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
              ✅ Quality Control Dashboard
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Monitor and ensure product quality standards
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Overview</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <button 
            onClick={() => router.push('/quality/inspection?new=1')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 New Inspection
          </button>
          <button
            onClick={() => router.push('/quality/inspection')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✅ Quality Inspection
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
          <strong>Error:</strong> {error}
          <button 
            onClick={() => {
              setError('')
              setLoading(true)
              fetchDashboardData()
            }}
            style={{ 
              marginLeft: '1rem', 
              padding: '0.25rem 0.75rem', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !todayMetrics && (
        <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          <strong>Warning:</strong> No dashboard data available. This might be a temporary issue.
        </div>
      )}

      {/* Today's Quality Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.8rem', fontWeight: '700' }}>🔍 Today's Quality Overview</h2>
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
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>🔍</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Total Inspections</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.total_inspections || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Completed today
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
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Passed</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.passed_inspections || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Quality approved
            </div>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(235, 51, 73, 0.3)',
            color: 'white',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(235, 51, 73, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(235, 51, 73, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>❌</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Failed</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.failed_inspections || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Quality rejected
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
              {todayMetrics?.pending_inspections || 0}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Awaiting inspection
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
              <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>📊</div>
              <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Pass Rate</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {todayMetrics?.pass_rate?.toFixed(1) || 0}%
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Quality pass rate
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Quality Issues */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>⚠️ Top Quality Issues</h3>
          {qualityIssues.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No quality issues this month</p>
          ) : (
            <div>
              {qualityIssues.map((issue, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < qualityIssues.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{issue.defect_type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#dc3545' }}>
                      {formatNumber(issue.count)} cases
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Inspections */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>⏳ Pending Inspections</h3>
          {pendingInspections.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No pending inspections</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {pendingInspections.slice(0, 6).map((production, index) => (
                <div 
                  key={production.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem 0', 
                    borderBottom: index < Math.min(pendingInspections.length, 6) - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push(`/quality/inspection?production_id=${production.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{production.product_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {production.batch_number} • {production.supervisor?.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {production.production_date}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {formatNumber(production.quantity_produced)} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => router.push('/quality/inspection')}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}
          >
            🔍 Start New Inspection
          </button>
        </div>
      </div>

      {/* Recent Quality Checks */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🕒 Recent Quality Checks</h3>
        {recentChecks.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No recent quality checks found</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentChecks.map((check, index) => (
              <div 
                key={check.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem 0', 
                  borderBottom: index < recentChecks.length - 1 ? '1px solid #eee' : 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(check.status)}</span>
                    <div style={{ fontWeight: 'bold' }}>{check.production?.product_name}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {check.production?.batch_number} • Inspector: {check.inspector?.name}
                  </div>
                  {check.defect_type && (
                    <div style={{ fontSize: '0.875rem', color: '#dc3545', marginTop: '0.25rem' }}>
                      Defect: {check.defect_type} ({check.defect_count} found)
                    </div>
                  )}
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
                      backgroundColor: getStatusColor(check.status)
                    }}
                  >
                    {check.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Sample: {formatNumber(check.sample_size)}
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
            onClick={() => router.push('/quality/inspection')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 New Quality Check
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Dashboard
          </button>
          <button 
            onClick={() => router.push('/quality/reports')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
