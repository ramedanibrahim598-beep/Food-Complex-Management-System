'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface RawMaterial {
  id: number
  material_name: string
  material_code: string
  category: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  unit_cost: number
  supplier_name: string
  supplier_contact: string
  last_purchase_date: string
  last_purchase_quantity: number
  last_purchase_cost: number
  status: string
  description: string
  storage_location: string
  expiry_date: string
  stock_status: string
  stock_value: number
}

interface InventorySummary {
  total_materials: number
  low_stock_count: number
  out_of_stock_count: number
  expiring_soon_count: number
  total_inventory_value: number
}

interface InventoryData {
  materials: RawMaterial[]
  summary: InventorySummary
  alerts: {
    low_stock: RawMaterial[]
    out_of_stock: RawMaterial[]
    expiring_soon: RawMaterial[]
  }
}

interface PurchaseOrder {
  id: number
  po_number: string
  material_name: string
  supplier_name: string
  unit_of_measure: string | null
  quantity: number
  unit_cost: number
  total_cost: number
  expected_delivery_date: string
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled'
  created_at: string
  notes?: string | null
}

export default function ProductionInventory() {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)
  const [purchaseOrder, setPurchaseOrder] = useState({
    material_name: '',
    supplier_name: '',
    unit_of_measure: '',
    unit_cost: '',
    quantity: '',
    expected_delivery_date: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false)
  const [stockAdjustment, setStockAdjustment] = useState({
    material_id: 0,
    material_name: '',
    current_stock: 0,
    unit_of_measure: '',
    adjustment_type: 'add' as 'add' | 'remove',
    quantity: '',
    reason: ''
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

    fetchInventoryData()
    fetchPurchaseOrders()
  }, [router])

  const fetchInventoryData = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const response = await axios.get('/api/production/inventory', config)

      if (response.data.success) {
        setInventoryData(response.data.data)
      }
    } catch (error: any) {
      setError('Failed to load inventory data')
      console.error('Inventory error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/production/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
        params: { per_page: 10 }
      })

      console.log('Purchase Orders API Response:', response.data)

      if (response.data.success) {
        // Handle Laravel pagination structure
        let poData = response.data.data
        
        // If data has pagination structure (data.data), extract the array
        if (poData && typeof poData === 'object' && 'data' in poData) {
          poData = poData.data
        }
        
        // Ensure it's an array
        const orders = Array.isArray(poData) ? poData : []
        console.log('Setting purchase orders:', orders.length, 'orders')
        setPurchaseOrders(orders)
      }
    } catch (error: any) {
      console.error('Failed to load purchase orders:', error)
    }
  }

  const handleOpenPurchaseOrder = (material?: RawMaterial) => {
    if (material) {
      setSelectedMaterial(material)
      const suggestedQuantity = material.maximum_stock - material.current_stock
      setPurchaseOrder({
        material_name: material.material_name,
        supplier_name: material.supplier_name,
        unit_of_measure: material.unit_of_measure,
        unit_cost: material.unit_cost.toString(),
        quantity: suggestedQuantity.toString(),
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: `Restock ${material.material_name} - Current: ${material.current_stock}, Min: ${material.minimum_stock}`
      })
    } else {
      setSelectedMaterial(null)
      setPurchaseOrder({
        material_name: '',
        supplier_name: '',
        unit_of_measure: '',
        unit_cost: '',
        quantity: '',
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      })
    }
    setShowPurchaseOrderModal(true)
  }

  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!purchaseOrder.material_name || !purchaseOrder.supplier_name || !purchaseOrder.unit_cost || !purchaseOrder.quantity) {
      alert('Please fill in material, supplier, unit cost, and quantity')
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const unitCost = parseFloat(purchaseOrder.unit_cost)
      const quantity = parseFloat(purchaseOrder.quantity)
      const orderData = {
        raw_material_id: selectedMaterial?.id || null,
        material_name: purchaseOrder.material_name,
        supplier_name: purchaseOrder.supplier_name,
        unit_of_measure: purchaseOrder.unit_of_measure || null,
        quantity,
        unit_cost: unitCost,
        expected_delivery_date: purchaseOrder.expected_delivery_date,
        notes: purchaseOrder.notes || null
      }

      const response = await axios.post('/api/production/purchase-orders', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create purchase order')
      }

      const savedPo = response.data.data
      alert(`Purchase Order Created\n\nPO Number: ${savedPo.po_number}\nMaterial: ${savedPo.material_name}\nQuantity: ${formatNumber(savedPo.quantity)} ${savedPo.unit_of_measure || ''}\nSupplier: ${savedPo.supplier_name}\nTotal Cost: ${formatCurrency(savedPo.total_cost)}\nExpected Delivery: ${savedPo.expected_delivery_date}`)

      setShowPurchaseOrderModal(false)
      setSelectedMaterial(null)
      setPurchaseOrder({
        material_name: '',
        supplier_name: '',
        unit_of_measure: '',
        unit_cost: '',
        quantity: '',
        expected_delivery_date: '',
        notes: ''
      })
      
      console.log('Purchase order created successfully, refreshing data...')
      await fetchInventoryData()
      await fetchPurchaseOrders()
      console.log('Data refresh complete')

    } catch (error: any) {
      console.error('Purchase order error:', error)
      alert('Failed to create purchase order: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
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
      case 'normal': return '#28a745'
      case 'low_stock': return '#ffc107'
      case 'out_of_stock': return '#dc3545'
      case 'overstock': return '#17a2b8'
      default: return '#6c757d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return '✅'
      case 'low_stock': return '⚠️'
      case 'out_of_stock': return '❌'
      case 'overstock': return '📈'
      default: return '❓'
    }
  }

  const getPoStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending': return '#ffc107'
      case 'approved': return '#17a2b8'
      case 'ordered': return '#007bff'
      case 'received': return '#28a745'
      case 'cancelled': return '#dc3545'
      default: return '#6c757d'
    }
  }

  const updatePurchaseOrderStatus = async (purchaseOrderId: number, status: PurchaseOrder['status']) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(
        `/api/production/purchase-orders/${purchaseOrderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        fetchPurchaseOrders()
      } else {
        alert(response.data.message || 'Failed to update purchase order status')
      }
    } catch (error: any) {
      alert('Failed to update purchase order status: ' + (error.response?.data?.message || error.message))
    }
  }

  
  const handleOpenStockAdjustment = (material: RawMaterial) => {
    setStockAdjustment({
      material_id: material.id,
      material_name: material.material_name,
      current_stock: material.current_stock,
      unit_of_measure: material.unit_of_measure,
      adjustment_type: 'add',
      quantity: '',
      reason: ''
    })
    setShowStockAdjustmentModal(true)
  }

  const handleSubmitStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/production/raw-materials/${stockAdjustment.material_id}/adjust-stock`,
        {
          adjustment_type: stockAdjustment.adjustment_type,
          quantity: parseFloat(stockAdjustment.quantity),
          reason: stockAdjustment.reason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        alert(`✅ Stock adjusted successfully!\n\nOld Stock: ${response.data.data.old_stock}\nNew Stock: ${response.data.data.new_stock}\nAdjustment: ${response.data.data.adjustment} ${stockAdjustment.unit_of_measure}`)
        setShowStockAdjustmentModal(false)
        setStockAdjustment({
          material_id: 0,
          material_name: '',
          current_stock: 0,
          unit_of_measure: '',
          adjustment_type: 'add',
          quantity: '',
          reason: ''
        })
        await fetchInventoryData()
      } else {
        alert('Failed to adjust stock: ' + response.data.message)
      }
    } catch (error: any) {
      alert('Failed to adjust stock: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMaterials = inventoryData?.materials.filter(material => {
    const matchesSearch = material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || material.category === categoryFilter
    const matchesStatus = !statusFilter || material.stock_status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  }) || []

  const categories = Array.from(new Set(inventoryData?.materials.map(m => m.category) || []))

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Inventory...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Material Inventory</h1>
        <div>
          <button 
            onClick={() => router.push('/production/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
           📊 Dashboard
          </button>
          <button 
            onClick={() => router.push('/production/manage')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
           ⚙️ Manage Production
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

      {/* Inventory Summary */}
      {inventoryData && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>📊 Inventory Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #007bff' }}>
              <h3 style={{ marginTop: 0, color: '#007bff', fontSize: '1.1rem' }}>📦 Total Materials</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                {inventoryData.summary.total_materials}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Active materials
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #ffc107' }}>
              <h3 style={{ marginTop: 0, color: '#ffc107', fontSize: '1.1rem' }}>⚠️ Low Stock</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                {inventoryData.summary.low_stock_count}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Need restocking
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #dc3545' }}>
              <h3 style={{ marginTop: 0, color: '#dc3545', fontSize: '1.1rem' }}>❌ Out of Stock</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                {inventoryData.summary.out_of_stock_count}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Urgent restocking
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #fd7e14' }}>
              <h3 style={{ marginTop: 0, color: '#fd7e14', fontSize: '1.1rem' }}>⏰ Expiring Soon</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                {inventoryData.summary.expiring_soon_count}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Within 30 days
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #28a745' }}>
              <h3 style={{ marginTop: 0, color: '#28a745', fontSize: '1.1rem' }}>💰 Total Value</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                {formatCurrency(inventoryData.summary.total_inventory_value)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Inventory value
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>🔍 Filter Materials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or code..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button 
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('')
                setStatusFilter('')
              }}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🗑️ Clear Filters
          </button>        </div>
      </div>

      
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#333' }}>📦 Materials ({filteredMaterials.length})</h3>
        </div>
        
        {filteredMaterials.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔭</div>
            <h3>No Materials Found</h3>
            <p>No materials match your current filters.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredMaterials.map((material, index) => (
              <div 
                key={material.id} 
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < filteredMaterials.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  {/* Material Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(material.stock_status || 'unknown')}</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{material.material_name}</h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Code:</strong> {material.material_code} • <strong>Category:</strong> {material.category}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Supplier:</strong> {material.supplier_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      <strong>Location:</strong> {material.storage_location}
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div style={{ textAlign: 'center' }}>
                    <div 
                      style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.875rem', 
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(material.stock_status || 'unknown')
                      }}
                    >
                      {(material.stock_status || 'unknown').replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {material.unit_of_measure}
                    </div>
                  </div>

                  {/* Stock Levels */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {formatNumber(material.current_stock)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Current Stock
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      Min: {formatNumber(material.minimum_stock)} • Max: {formatNumber(material.maximum_stock)}
                    </div>
                  </div>

                  {/* Value & Cost */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
                      {formatCurrency(material.stock_value)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Stock Value
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      Unit: {formatCurrency(material.unit_cost)}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(material.stock_status === 'low_stock' || material.stock_status === 'out_of_stock') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPurchaseOrder(material)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🛒 Order
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenStockAdjustment(material)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📝 Adjust
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Purchase Orders */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Recent Purchase Orders</h3>
        {purchaseOrders.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No purchase orders found.</p>
        ) : (
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {purchaseOrders.map((po, index) => (
              <div key={po.id} style={{ padding: '1rem 0', borderBottom: index < purchaseOrders.length - 1 ? '1px solid #eee' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{po.po_number} - {po.material_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Supplier: {po.supplier_name} | Qty: {formatNumber(po.quantity)} {po.unit_of_measure || ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#333' }}>
                    {formatCurrency(po.total_cost)}
                  </div>
                  <div>
                    <span style={{ backgroundColor: getPoStatusColor(po.status), color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {po.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <select
                      value={po.status}
                      onChange={(e) => updatePurchaseOrderStatus(po.id, e.target.value as PurchaseOrder['status'])}
                      style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="ordered">Ordered</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                {po.notes && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: po.status === 'cancelled' ? '#fee2e2' : '#e0f2fe',
                    borderLeft: `3px solid ${po.status === 'cancelled' ? '#dc2626' : '#0284c7'}`,
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    <strong style={{ color: po.status === 'cancelled' ? '#991b1b' : '#075985' }}>
                      {po.status === 'cancelled' ? '❌ Rejection Note:' : '💬 Manager Comment:'}
                    </strong>
                    <div style={{ marginTop: '0.25rem', color: '#374151' }}>{po.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleOpenPurchaseOrder()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛒 Create Purchase Order
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Inventory
          </button>
        </div>
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.875rem', color: '#666' }}>
          💡 Tip: Use the "📝 Adjust" button next to each material to adjust its stock level
        </div>
      </div>
    </div>

      {/* Purchase Order Modal */}
      {showPurchaseOrderModal && (
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
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🛒 Create Purchase Order
            </h2>

            <form onSubmit={handleSubmitPurchaseOrder}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Material Name *
                </label>
                <input
                  type="text"
                  value={purchaseOrder.material_name}
                  onChange={(e) => setPurchaseOrder(prev => ({ ...prev, material_name: e.target.value }))}
                  required
                  placeholder="Enter material name"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={purchaseOrder.supplier_name}
                  onChange={(e) => setPurchaseOrder(prev => ({ ...prev, supplier_name: e.target.value }))}
                  required
                  placeholder="Enter supplier name"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={purchaseOrder.unit_of_measure}
                    onChange={(e) => setPurchaseOrder(prev => ({ ...prev, unit_of_measure: e.target.value }))}
                    placeholder="e.g., kg, liters, bags"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Unit Cost *
                  </label>
                  <input
                    type="number"
                    value={purchaseOrder.unit_cost}
                    onChange={(e) => setPurchaseOrder(prev => ({ ...prev, unit_cost: e.target.value }))}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Enter unit cost"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {selectedMaterial && (
                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>
                    {selectedMaterial.material_name}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    <strong>Code:</strong> {selectedMaterial.material_code}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    <strong>Supplier:</strong> {selectedMaterial.supplier_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    <strong>Current Stock:</strong> {formatNumber(selectedMaterial.current_stock)} {selectedMaterial.unit_of_measure}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    <strong>Minimum Stock:</strong> {formatNumber(selectedMaterial.minimum_stock)} {selectedMaterial.unit_of_measure}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    <strong>Unit Cost:</strong> {formatCurrency(selectedMaterial.unit_cost)}
                  </div>
                </div>
              )}

              {selectedMaterial && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Order Quantity ({purchaseOrder.unit_of_measure || selectedMaterial.unit_of_measure}) *
                    </label>
                    <input
                      type="number"
                      value={purchaseOrder.quantity}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                      min="1"
                      step="0.01"
                      placeholder="Enter quantity"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <small style={{ color: '#666' }}>
                      Suggested: {formatNumber(selectedMaterial.maximum_stock - selectedMaterial.current_stock)} {selectedMaterial.unit_of_measure}
                    </small>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Expected Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={purchaseOrder.expected_delivery_date}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Estimated Total Cost
                    </label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#e7f3ff', 
                      borderRadius: '4px',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#007bff'
                    }}>
                      {formatCurrency(parseFloat(purchaseOrder.quantity || '0') * parseFloat(purchaseOrder.unit_cost || '0'))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Notes
                    </label>
                    <textarea
                      value={purchaseOrder.notes}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Additional notes or special instructions..."
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {!selectedMaterial && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Order Quantity ({purchaseOrder.unit_of_measure || 'units'}) *
                    </label>
                    <input
                      type="number"
                      value={purchaseOrder.quantity}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                      min="1"
                      step="0.01"
                      placeholder="Enter quantity"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Expected Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={purchaseOrder.expected_delivery_date}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Estimated Total Cost
                    </label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#e7f3ff', 
                      borderRadius: '4px',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#007bff'
                    }}>
                      {formatCurrency(parseFloat(purchaseOrder.quantity || '0') * parseFloat(purchaseOrder.unit_cost || '0'))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Notes
                    </label>
                    <textarea
                      value={purchaseOrder.notes}
                      onChange={(e) => setPurchaseOrder(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Additional notes or special instructions..."
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseOrderModal(false)
                    setSelectedMaterial(null)
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
                  {submitting ? '⏳ Creating...' : '✅ Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Stock Adjustment Modal */}
      {showStockAdjustmentModal && (
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
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📝 Adjust Stock - {stockAdjustment.material_name}</h2>
            
            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Current Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                {stockAdjustment.current_stock} {stockAdjustment.unit_of_measure}
              </div>
            </div>

            <form onSubmit={handleSubmitStockAdjustment}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Adjustment Type *</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="add"
                      checked={stockAdjustment.adjustment_type === 'add'}
                      onChange={(e) => setStockAdjustment(prev => ({ ...prev, adjustment_type: 'add' }))}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>➕ Add Stock</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="remove"
                      checked={stockAdjustment.adjustment_type === 'remove'}
                      onChange={(e) => setStockAdjustment(prev => ({ ...prev, adjustment_type: 'remove' }))}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>➖ Remove Stock</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Quantity ({stockAdjustment.unit_of_measure}) *
                </label>
                <input
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Enter quantity"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                />
                {stockAdjustment.quantity && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                    New stock will be: <strong style={{ color: stockAdjustment.adjustment_type === 'add' ? '#28a745' : '#dc3545' }}>
                      {stockAdjustment.adjustment_type === 'add' 
                        ? (parseFloat(String(stockAdjustment.current_stock)) + parseFloat(stockAdjustment.quantity || '0')).toFixed(2)
                        : (parseFloat(String(stockAdjustment.current_stock)) - parseFloat(stockAdjustment.quantity || '0')).toFixed(2)
                      } {stockAdjustment.unit_of_measure}
                    </strong>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Reason *</label>
                <textarea
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Enter reason for adjustment (e.g., Physical count correction, Damaged materials, etc.)"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                  This will be logged in the activity history
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockAdjustmentModal(false)
                    setStockAdjustment({
                      material_id: 0,
                      material_name: '',
                      current_stock: 0,
                      unit_of_measure: '',
                      adjustment_type: 'add',
                      quantity: '',
                      reason: ''
                    })
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
                    backgroundColor: stockAdjustment.adjustment_type === 'add' ? '#28a745' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? '⏳ Adjusting...' : `✅ ${stockAdjustment.adjustment_type === 'add' ? 'Add' : 'Remove'} Stock`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
