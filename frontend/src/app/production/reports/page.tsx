'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface DailyReport {
  id?: number
  report_date: string
  total_batches: number
  completed_batches: number
  in_progress_batches: number
  total_produced: number
  total_target: number
  efficiency: number
  issues: string
  recommendations: string
  submitted_by: string | { id: number; name: string }
  submitted_at?: string
}

export default function ProductionReports() {
  const [showReportModal, setShowReportModal] = useState(false)
  const [submittedReports, setSubmittedReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [todayStats, setTodayStats] = useState<any>(null)
  const [reportForm, setReportForm] = useState<DailyReport>({
    report_date: new Date().toISOString().split('T')[0],
    total_batches: 0,
    completed_batches: 0,
    in_progress_batches: 0,
    total_produced: 0,
    total_target: 0,
    efficiency: 0,
    issues: '',
    recommendations: '',
    submitted_by: ''
  })
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

    setReportForm(prev => ({ ...prev, submitted_by: userData.name }))
    fetchTodayStats()
    fetchSubmittedReports()
  }, [router])

  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.get('/api/production/dashboard', config)

      if (response.data.success) {
        const stats = response.data.data.today_metrics
        setTodayStats(stats)
        
        // Auto-fill form with today's stats
        setReportForm(prev => ({
          ...prev,
          total_batches: stats.total_batches || 0,
          completed_batches: stats.completed_batches || 0,
          in_progress_batches: stats.in_progress_batches || 0,
          total_produced: stats.total_produced || 0,
          total_target: stats.total_target || 0,
          efficiency: stats.efficiency || 0
        }))
      }
    } catch (error: any) {
      console.error('Failed to fetch today stats:', error)
    }
  }

  const fetchSubmittedReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { per_page: 20 }
      }

      console.log('=== FETCHING SUBMITTED REPORTS ===')
      const response = await axios.get('/api/production/daily-reports', config)
      console.log('Fetch response:', response.data)

      if (response.data.success) {
        const reportsData = response.data.data?.data || response.data.data || []
        console.log('Reports data:', reportsData)
        console.log('Reports count:', Array.isArray(reportsData) ? reportsData.length : 'Not an array')
        setSubmittedReports(Array.isArray(reportsData) ? reportsData : [])
      }
    } catch (error: any) {
      console.error('Failed to fetch reports:', error)
      console.error('Error response:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      // Don't send submitted_by - backend will use authenticated user
      const { submitted_by, ...reportData } = reportForm
      
      console.log('=== SUBMITTING DAILY REPORT ===')
      console.log('Report data:', reportData)
      console.log('Token exists:', !!token)
      
      const response = await axios.post('/api/production/daily-reports', reportData, config)
      
      console.log('=== RESPONSE RECEIVED ===')
      console.log('Success:', response.data.success)
      console.log('Full response:', response.data)
      console.log('Report ID:', response.data.data?.id)

      if (response.data.success) {
        const reportId = response.data.data?.id
        alert(`✅ Daily production report submitted successfully!\n\nReport ID: ${reportId}\nThe General Manager can now view this report.`)
        
        setShowReportModal(false)
        setReportForm({
          report_date: new Date().toISOString().split('T')[0],
          total_batches: todayStats?.total_batches || 0,
          completed_batches: todayStats?.completed_batches || 0,
          in_progress_batches: todayStats?.in_progress_batches || 0,
          total_produced: todayStats?.total_produced || 0,
          total_target: todayStats?.total_target || 0,
          efficiency: todayStats?.efficiency || 0,
          issues: '',
          recommendations: '',
          submitted_by: reportForm.submitted_by
        })
        
        console.log('Fetching updated reports list...')
        await fetchSubmittedReports()
      } else {
        throw new Error(response.data.message || 'Failed to submit report')
      }
    } catch (error: any) {
      console.error('=== SUBMIT ERROR ===')
      console.error('Error object:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      let errorMessage = 'Unknown error occurred'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.errors) {
        errorMessage = JSON.stringify(error.response.data.errors)
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert('❌ Failed to submit report:\n\n' + errorMessage + '\n\nCheck browser console for details.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Reports...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Daily Production Reports</h1>
        <div>
          <button 
            onClick={() => setShowReportModal(true)}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📝 Submit Daily Report
          </button>
          <button 
            onClick={() => router.push('/production/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => router.push('/production')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Today's Stats Summary */}
      {todayStats && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>📊 Today's Production Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>{todayStats.total_batches}</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Batches</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{todayStats.completed_batches}</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>{todayStats.in_progress_batches}</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>In Progress</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>{todayStats.efficiency?.toFixed(1)}%</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Efficiency</div>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Reports List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#333' }}>📋 Submitted Reports ({submittedReports.length})</h3>
        </div>
        
        {submittedReports.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3>No Reports Submitted Yet</h3>
            <p>Click "Submit Daily Report" to create your first report.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {submittedReports.map((report, index) => (
              <div 
                key={report.id}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < submittedReports.length - 1 ? '1px solid #eee' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#333' }}>
                      Report for {formatDate(report.report_date)}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Submitted by {typeof report.submitted_by === 'object' ? report.submitted_by.name : report.submitted_by} on {new Date(report.submitted_at!).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '0.25rem 0.75rem', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem' 
                  }}>
                    Submitted
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Total Batches</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{report.total_batches}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Completed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#28a745' }}>{report.completed_batches}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Efficiency</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: parseFloat(String(report.efficiency)) >= 80 ? '#28a745' : '#dc3545' }}>
                      {parseFloat(String(report.efficiency)).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Production</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{report.total_produced} / {report.total_target}</div>
                  </div>
                </div>

                {report.issues && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>Issues:</div>
                    <div style={{ fontSize: '0.875rem', color: '#666', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                      {report.issues}
                    </div>
                  </div>
                )}

                {report.recommendations && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>Recommendations:</div>
                    <div style={{ fontSize: '0.875rem', color: '#666', padding: '0.5rem', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
                      {report.recommendations}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📝 Submit Daily Production Report</h2>
            
            <form onSubmit={handleSubmitReport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Report Date *</label>
                <input
                  type="date"
                  value={reportForm.report_date}
                  onChange={(e) => setReportForm(prev => ({ ...prev, report_date: e.target.value }))}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Total Batches *</label>
                  <input
                    type="number"
                    value={reportForm.total_batches}
                    onChange={(e) => setReportForm(prev => ({ ...prev, total_batches: parseInt(e.target.value) || 0 }))}
                    required
                    min="0"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Completed Batches *</label>
                  <input
                    type="number"
                    value={reportForm.completed_batches}
                    onChange={(e) => setReportForm(prev => ({ ...prev, completed_batches: parseInt(e.target.value) || 0 }))}
                    required
                    min="0"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Total Produced (kg) *</label>
                  <input
                    type="number"
                    value={reportForm.total_produced}
                    onChange={(e) => setReportForm(prev => ({ ...prev, total_produced: parseFloat(e.target.value) || 0 }))}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target (kg) *</label>
                  <input
                    type="number"
                    value={reportForm.total_target}
                    onChange={(e) => setReportForm(prev => ({ ...prev, total_target: parseFloat(e.target.value) || 0 }))}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Efficiency (%) *</label>
                  <input
                    type="number"
                    value={reportForm.efficiency}
                    onChange={(e) => setReportForm(prev => ({ ...prev, efficiency: parseFloat(e.target.value) || 0 }))}
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Issues / Problems Encountered</label>
                <textarea
                  value={reportForm.issues}
                  onChange={(e) => setReportForm(prev => ({ ...prev, issues: e.target.value }))}
                  rows={3}
                  placeholder="Describe any issues, delays, or problems encountered today..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Recommendations / Action Items</label>
                <textarea
                  value={reportForm.recommendations}
                  onChange={(e) => setReportForm(prev => ({ ...prev, recommendations: e.target.value }))}
                  rows={3}
                  placeholder="Suggest improvements, required resources, or action items..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? '⏳ Submitting...' : '✅ Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
