'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function QualityReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
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

    loadReports()
  }, [router])

  const loadReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/quality/reports', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        setData(response.data.data)
      } else {
        setError(response.data.message || 'Failed to load quality reports')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading quality reports...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Quality Reports</h1>
        <button
          onClick={() => router.push('/quality/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div>Total Inspections</div>
            <strong>{data.overall_metrics?.total_inspections || 0}</strong>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div>Passed</div>
            <strong>{data.overall_metrics?.passed_count || 0}</strong>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div>Failed</div>
            <strong>{data.overall_metrics?.failed_count || 0}</strong>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div>Pass Rate</div>
            <strong>{Number(data.overall_metrics?.pass_rate || 0).toFixed(1)}%</strong>
          </div>
        </div>
      )}
    </div>
  )
}

