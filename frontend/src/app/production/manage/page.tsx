'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Production {
  id: number
  product_name: string
  batch_number: string
  quantity_produced: number
  quantity_target: number
  production_cost: number
  production_line: string
  shift: string
  status: string
  production_date: string
  start_time: string
  end_time: string
  notes?: string
  supervisor: {
    id: number
    name: string
  }
  production_details: Array<{
    id: number
    raw_material: {
      material_name: string
      unit_of_measure: string
    }
    planned_quantity: number
    actual_quantity: number
    unit_cost: number
    total_cost: number
    waste_quantity: number
  }>
}

export default function ProductionManage() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewProductionModal, setShowNewProductionModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null)
  const [updateData, setUpdateData] = useState({
    status: '',
    quantity_produced: '',
    production_cost: '',
    notes: ''
  })
  const [newProduction, setNewProduction] = useState({
    product_name: '',
    batch_number: '',
    quantity_target: '',
    production_line: '',
    shift: '',
    production_date: '',
    start_time: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    product_name: '',
    date_from: '',
    date_to: '',
    production_line: ''
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

    fetchProductions()
  }, [router])

  const fetchProductions = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      }

      console.log('Fetching productions with config:', config)
      const response = await axios.get('/api/production/productions', config)
      console.log('Production API response:', response.data)

      if (response.data.success) {
        // Handle Laravel pagination response structure
        const productionData = response.data.data
        if (productionData && productionData.data) {
          // Laravel pagination: response.data.data.data
          setProductions(productionData.data)
        } else if (Array.isArray(productionData)) {
          // Direct array response
          setProductions(productionData)
        } else {
          console.error('Unexpected data structure:', productionData)
          setProductions([])
        }
      } else {
        setError(response.data.message || 'Failed to load productions')
      }
    } catch (error: any) {
      console.error('Productions error:', error)
      if (error.response) {
        console.error('Error response:', error.response.data)
        setError(error.response.data.message || 'Failed to load productions')
      } else {
        setError('Failed to load productions: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setLoading(true)
    fetchProductions()
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      product_name: '',
      date_from: '',
      date_to: '',
      production_line: ''
    })
    setLoading(true)
    fetchProductions()
  }

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num
    return new Intl.NumberFormat('en-ET').format(numValue || 0)
  }

  const formatCurrency = (amount: number | string) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    return 'Br ' + new Intl.NumberFormat('en-ET', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue || 0)
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

  const calculateEfficiency = (produced: number, target: number): string => {
    if (target === 0) return '0.0'
    return ((produced / target) * 100).toFixed(1)
  }

  const handleNewProductionChange = (field: string, value: string) => {
    setNewProduction(prev => ({ ...prev, [field]: value }))
  }

  const generateBatchNumber = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const productCode = newProduction.product_name.slice(0, 3).toUpperCase() || 'PRD'
    return `BATCH-${date}-${productCode}-${random}`
  }

  const handleSubmitNewProduction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.post('/api/production/productions', newProduction, config)

      if (response.data.success) {
        alert('✅ Production batch created successfully!')
        setShowNewProductionModal(false)
        setNewProduction({
          product_name: '',
          batch_number: '',
          quantity_target: '',
          production_line: '',
          shift: '',
          production_date: '',
          start_time: '',
          notes: ''
        })
        fetchProductions() // Refresh the list
      }
    } catch (error: any) {
      console.error('Create production error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create production'
      setError(errorMessage)
      alert('❌ ' + errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenUpdateModal = (production: Production) => {
    setSelectedProduction(production)
    setUpdateData({
      status: production.status,
      quantity_produced: production.quantity_produced.toString(),
      production_cost: production.production_cost.toString(),
      notes: production.notes || ''
    })
    setShowUpdateModal(true)
  }

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduction) return

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.put(
        `/api/production/productions/${selectedProduction.id}`,
        updateData,
        config
      )

      if (response.data.success) {
        alert('✅ Production updated successfully!')
        setShowUpdateModal(false)
        setSelectedProduction(null)
        fetchProductions()
      }
    } catch (error: any) {
      console.error('Update production error:', error)
      alert('❌ Failed to update production: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Productions...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Production Management</h1>
        <div>
          <button 
            onClick={() => router.push('/production/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => router.push('/production/inventory')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📦 Inventory
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

      {/* Filters */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>🔍 Filter Productions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Product Name:</label>
            <input
              type="text"
              value={filters.product_name}
              onChange={(e) => handleFilterChange('product_name', e.target.value)}
              placeholder="Search product..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
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
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Production Line:</label>
            <input
              type="text"
              value={filters.production_line}
              onChange={(e) => handleFilterChange('production_line', e.target.value)}
              placeholder="Line A, Line B..."
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
          <button 
            onClick={() => {
              const batchNum = generateBatchNumber()
              setNewProduction(prev => ({ ...prev, batch_number: batchNum }))
              setShowNewProductionModal(true)
            }}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ New Production
          </button>
        </div>
      </div>

      {/* Productions List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#333' }}>🏭 Production Batches ({productions.length})</h3>
        </div>
        
        {productions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3>No Productions Found</h3>
            <p>No production batches match your current filters.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {productions.map((production, index) => (
              <div 
                key={production.id} 
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < productions.length - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                onClick={() => alert(`Production details for ${production.batch_number} - Full details view coming soon!`)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  {/* Production Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(production.status)}</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{production.product_name}</h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Batch:</strong> {production.batch_number}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Line:</strong> {production.production_line} • <strong>Shift:</strong> {production.shift}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      <strong>Supervisor:</strong> {production.supervisor?.name || 'Not assigned'}
                    </div>
                    {production.notes && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        backgroundColor: production.status === 'cancelled' ? '#fee2e2' : '#e0f2fe',
                        borderLeft: `3px solid ${production.status === 'cancelled' ? '#dc2626' : '#0284c7'}`,
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong style={{ color: production.status === 'cancelled' ? '#991b1b' : '#075985' }}>
                          {production.status === 'cancelled' ? '❌ Rejection Note:' : '💬 Manager Comment:'}
                        </strong>
                        <div style={{ marginTop: '0.25rem', color: '#374151' }}>{production.notes}</div>
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
                        backgroundColor: getStatusColor(production.status)
                      }}
                    >
                      {production.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {production.production_date}
                    </div>
                  </div>

                  {/* Production Numbers */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {formatNumber(production.quantity_produced)} / {formatNumber(production.quantity_target)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Produced / Target
                    </div>
                    <div 
                      style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 'bold',
                        color: parseFloat(calculateEfficiency(production.quantity_produced, production.quantity_target)) >= 80 ? '#28a745' : '#dc3545'
                      }}
                    >
                      {calculateEfficiency(production.quantity_produced, production.quantity_target)}% Efficiency
                    </div>
                  </div>

                  {/* Cost */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
                      {formatCurrency(production.production_cost)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Production Cost
                    </div>
                    {production.production_details && production.production_details.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        {production.production_details.length} materials used
                      </div>
                    )}
                  </div>
                </div>

                {/* Update Button */}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenUpdateModal(production)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    📝 Update Status
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/production/materials/${production.id}`)
                    }}
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    📦 Assign Materials
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
            {productions.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Batches</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
            {productions.filter(p => p.status === 'completed').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Completed</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>
            {productions.filter(p => p.status === 'in_progress').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>In Progress</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#17a2b8' }}>
            {productions.filter(p => p.status === 'planned').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Planned</div>
        </div>
      </div>

      {/* Update Production Modal */}
      {showUpdateModal && selectedProduction && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📝 Update Production</h2>
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{selectedProduction.product_name}</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Batch: {selectedProduction.batch_number}</div>
            </div>
            
            <form onSubmit={handleSubmitUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Status *</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, status: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Quantity Produced (kg)</label>
                <input
                  type="number"
                  value={updateData.quantity_produced}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, quantity_produced: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="Enter actual quantity produced"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666' }}>Target: {formatNumber(selectedProduction.quantity_target)} kg</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Production Cost (ETB)</label>
                <input
                  type="number"
                  value={updateData.production_cost}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, production_cost: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="Enter total production cost"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notes</label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes or updates..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false)
                    setSelectedProduction(null)
                  }}
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
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? '⏳ Updating...' : '✅ Update Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Production Modal */}
      {showNewProductionModal && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>➕ New Production Batch</h2>
            
            <form onSubmit={handleSubmitNewProduction}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Product Name *</label>
                <select
                  value={newProduction.product_name}
                  onChange={(e) => handleNewProductionChange('product_name', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select Product</option>
                  <option value="Wheat Flour">Wheat Flour</option>
                  <option value="Maize Flour">Maize Flour</option>
                  <option value="Macaroni">Macaroni</option>
                  <option value="Spaghetti">Spaghetti</option>
                  <option value="Biscuits">Biscuits</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Batch Number *</label>
                <input
                  type="text"
                  value={newProduction.batch_number}
                  onChange={(e) => handleNewProductionChange('batch_number', e.target.value)}
                  required
                  placeholder="BATCH-YYYYMMDD-XXX-999"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666' }}>Auto-generated, but you can modify it</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Quantity (kg) *</label>
                <input
                  type="number"
                  value={newProduction.quantity_target}
                  onChange={(e) => handleNewProductionChange('quantity_target', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g., 1000"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Production Line *</label>
                <select
                  value={newProduction.production_line}
                  onChange={(e) => handleNewProductionChange('production_line', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select Line</option>
                  <option value="Line 1">Line 1</option>
                  <option value="Line 2">Line 2</option>
                  <option value="Line 3">Line 3</option>
                  <option value="Line A">Line A</option>
                  <option value="Line B">Line B</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift *</label>
                <select
                  value={newProduction.shift}
                  onChange={(e) => handleNewProductionChange('shift', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select Shift</option>
                  <option value="morning">Morning (6:00 AM - 2:00 PM)</option>
                  <option value="afternoon">Afternoon (2:00 PM - 10:00 PM)</option>
                  <option value="night">Night (10:00 PM - 6:00 AM)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Production Date *</label>
                <input
                  type="date"
                  value={newProduction.production_date}
                  onChange={(e) => handleNewProductionChange('production_date', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Start Time *</label>
                <input
                  type="time"
                  value={newProduction.start_time}
                  onChange={(e) => handleNewProductionChange('start_time', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notes</label>
                <textarea
                  value={newProduction.notes}
                  onChange={(e) => handleNewProductionChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes or instructions..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowNewProductionModal(false)}
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
                  {submitting ? '⏳ Creating...' : '✅ Create Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
