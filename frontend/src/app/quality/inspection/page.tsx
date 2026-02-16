'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'

interface QualityCheck {
  id: number
  status: string
  check_date: string
  defect_type: string | null
  defect_count: number
  sample_size: number
  notes: string | null
  production: {
    id: number
    product_name: string
    batch_number: string
    production_date: string
    quantity_produced: number
  }
  inspector: {
    name: string
  }
}

interface Production {
  id: number
  product_name: string
  batch_number: string
  production_date: string
  quantity_produced: number
  quantity_target: number
  production_line: string
  supervisor: {
    name: string
  }
}

const getLocalDateString = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

export default function QualityInspection() {
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([])
  const [availableProductions, setAvailableProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewInspectionForm, setShowNewInspectionForm] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    defect_type: ''
  })
  
  // Function to generate batch number
  const generateBatchNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `QC-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
  }

  // New inspection form state
  const [newInspection, setNewInspection] = useState({
    batch_number: generateBatchNumber(),
    product_name: '',
    check_date: getLocalDateString(),
    status: 'pending',
    defect_type: '',
    defect_count: 0,
    sample_size: 100,
    notes: ''
  })

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
    const allowedRoles = ['quality_controller', 'system_admin', 'admin']
    if (!allowedRoles.includes(userData.role)) {
      router.push('/login')
      return
    }

    // Open new inspection modal when requested from dashboard
    const openNew = searchParams.get('new')
    if (openNew === '1') {
      setShowNewInspectionForm(true)
    }

    // Check if production_id is provided in URL
    const productionId = searchParams.get('production_id')
    if (productionId) {
      // If coming from dashboard with production_id, we can still support it
      // but the form will use batch_number input instead
    }

    fetchData()
  }, [router, searchParams])

  const fetchData = async (activeFilters = filters) => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      console.log('Fetching inspection data...')
      console.log('Token exists:', !!token)
      console.log('Filters:', activeFilters)
      
      // Fetch quality checks and available productions
      const [checksResponse, productionsResponse] = await Promise.all([
        axios.get('/api/quality/checks', {
          ...config,
          params: Object.fromEntries(
            Object.entries(activeFilters).filter(([, value]) => value !== '')
          )
        }).catch(err => {
          console.error('Checks API error:', err)
          console.error('Checks error response:', err.response)
          throw err
        }),
        axios.get('/api/quality/available-productions', config).catch(err => {
          console.error('Productions API error:', err)
          console.error('Productions error response:', err.response)
          throw err
        })
      ])

      console.log('Checks response:', checksResponse.data)
      console.log('Productions response:', productionsResponse.data)

      if (checksResponse.data.success) {
        const checksData = checksResponse.data.data.data || []
        console.log('Setting quality checks:', checksData.length, 'items')
        setQualityChecks(checksData)
      } else {
        console.error('Checks failed:', checksResponse.data.message)
        setError('Checks: ' + checksResponse.data.message)
      }

      if (productionsResponse.data.success) {
        const prodsData = productionsResponse.data.data || []
        console.log('Setting available productions:', prodsData.length, 'items')
        setAvailableProductions(prodsData)
      } else {
        console.error('Productions failed:', productionsResponse.data.message)
        setError('Productions: ' + productionsResponse.data.message)
      }
      
      if (checksResponse.data.success && productionsResponse.data.success) {
        setError('') // Clear error if both successful
      }
    } catch (error: any) {
      console.error('Inspection error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error headers:', error.response?.headers)
      
      let errorMessage = 'Failed to load inspection data'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setLoading(true)
    fetchData(filters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      date_from: '',
      date_to: '',
      defect_type: ''
    }
    setFilters(clearedFilters)
    setLoading(true)
    fetchData(clearedFilters)
  }

  const handleNewInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.post('/api/quality/checks', newInspection, config)

      if (response.data.success) {
        setShowNewInspectionForm(false)
        setNewInspection({
          batch_number: generateBatchNumber(),
          product_name: '',
          check_date: getLocalDateString(),
          status: 'pending',
          defect_type: '',
          defect_count: 0,
          sample_size: 100,
          notes: ''
        })
        fetchData()
        alert('✅ Quality inspection created successfully!')
      }
    } catch (error: any) {
      console.error('Create inspection error:', error)
      alert('❌ Failed to create inspection: ' + (error.response?.data?.message || error.message))
    }
  }

  const updateInspectionStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.put(`/api/quality/checks/${id}`, { status }, config)

      if (response.data.success) {
        fetchData()
        alert(`Inspection ${status} successfully!`)
      }
    } catch (error: any) {
      alert('Failed to update inspection: ' + (error.response?.data?.message || error.message))
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
        <h1>Loading Quality Inspections...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Quality Inspection</h1>
        <div>
          <button 
            onClick={() => setShowNewInspectionForm(true)}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 New Inspection
          </button>
          <button 
            onClick={() => router.push('/quality/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => router.push('/quality')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back
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
              fetchData()
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

      {/* New Inspection Form Modal */}
      {showNewInspectionForm && (
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
            padding: '2rem', 
            borderRadius: '8px', 
            maxWidth: '600px', 
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🔍 New Quality Inspection</h3>
            <form onSubmit={handleNewInspectionSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Inspection Batch Number:</label>
                <input
                  type="text"
                  value={newInspection.batch_number}
                  readOnly
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f8f9fa', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 'bold' }}
                />
                <small style={{ color: '#666' }}>Auto-generated unique inspection ID</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Product Name: *</label>
                <select
                  value={newInspection.product_name}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, product_name: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select product...</option>
                  <option value="Wheat Flour">Wheat Flour</option>
                  <option value="Maize Flour">Maize Flour</option>
                  <option value="Macaroni">Macaroni</option>
                  <option value="Spaghetti">Spaghetti</option>
                  <option value="Biscuits">Biscuits</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Check Date:</label>
                  <input
                    type="date"
                    value={newInspection.check_date}
                    onChange={(e) => setNewInspection(prev => ({ ...prev, check_date: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sample Size:</label>
                  <input
                    type="number"
                    value={newInspection.sample_size}
                    onChange={(e) => setNewInspection(prev => ({ ...prev, sample_size: parseInt(e.target.value) }))}
                    min="1"
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Status:</label>
                <select
                  value={newInspection.status}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {newInspection.status === 'failed' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Defect Type:</label>
                    <input
                      type="text"
                      value={newInspection.defect_type}
                      onChange={(e) => setNewInspection(prev => ({ ...prev, defect_type: e.target.value }))}
                      placeholder="e.g., Surface defects, Dimensional variance..."
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Defect Count:</label>
                    <input
                      type="number"
                      value={newInspection.defect_count}
                      onChange={(e) => setNewInspection(prev => ({ ...prev, defect_count: parseInt(e.target.value) }))}
                      min="0"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notes:</label>
                <textarea
                  value={newInspection.notes}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional inspection notes..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowNewInspectionForm(false)}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Create Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>🔍 Filter Inspections</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>From Date:</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>To Date:</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Defect Type:</label>
            <input
              type="text"
              value={filters.defect_type}
              onChange={(e) => handleFilterChange('defect_type', e.target.value)}
              placeholder="Search defects..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={applyFilters}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 Apply Filters
          </button>
          <button 
            onClick={clearFilters}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🗑️ Clear Filters
          </button>
        </div>
      </div>

      {/* Quality Checks List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#333' }}>🔍 Quality Inspections ({qualityChecks.length})</h3>
        </div>
        
        {qualityChecks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h3>No Quality Inspections Found</h3>
            <p>No inspections match your current filters.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {qualityChecks.map((check, index) => (
              <div 
                key={check.id}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < qualityChecks.length - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  {/* Production Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(check.status)}</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{check.production?.product_name}</h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Batch:</strong> {check.production?.batch_number}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Inspector:</strong> {check.inspector?.name}
                    </div>
                    {check.defect_type && (
                      <div style={{ fontSize: '0.875rem', color: '#dc3545' }}>
                        <strong>Defect:</strong> {check.defect_type}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'center' }}>
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
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {check.check_date}
                    </div>
                  </div>

                  {/* Sample Info */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {formatNumber(check.sample_size)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Sample Size
                    </div>
                    {check.defect_count > 0 && (
                      <div style={{ fontSize: '0.875rem', color: '#dc3545', fontWeight: 'bold' }}>
                        {formatNumber(check.defect_count)} defects
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ textAlign: 'center' }}>
                    {check.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            updateInspectionStatus(check.id, 'passed')
                          }}
                          style={{ padding: '0.25rem 0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ✅ Pass
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            updateInspectionStatus(check.id, 'failed')
                          }}
                          style={{ padding: '0.25rem 0.75rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ❌ Fail
                        </button>
                      </div>
                    )}
                    {check.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Has notes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
            {qualityChecks.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Inspections</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
            {qualityChecks.filter(c => c.status === 'passed').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Passed</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
            {qualityChecks.filter(c => c.status === 'failed').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Failed</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>
            {qualityChecks.filter(c => c.status === 'pending').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Pending</div>
        </div>
      </div>
    </div>
  )
}
