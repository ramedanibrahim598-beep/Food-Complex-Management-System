'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

interface RawMaterial {
  id: number
  material_name: string
  unit_of_measure: string
  unit_cost: number
}

interface MaterialRow {
  raw_material_id: string
  planned_quantity: string
  actual_quantity: string
  unit_cost: string
  waste_quantity: string
  notes: string
}

export default function ProductionMaterialsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const productionId = params?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [rows, setRows] = useState<MaterialRow[]>([
    { raw_material_id: '', planned_quantity: '', actual_quantity: '', unit_cost: '', waste_quantity: '0', notes: '' },
  ])

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

    loadData()
  }, [router])

  const materialMap = useMemo(() => {
    const m = new Map<number, RawMaterial>()
    materials.forEach((item) => m.set(item.id, item))
    return m
  }, [materials])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      const [rawResp, assignedResp] = await Promise.all([
        axios.get('/api/production/raw-materials', config),
        axios.get(`/api/production/productions/${productionId}/materials`, config),
      ])

      if (rawResp.data.success) {
        setMaterials(rawResp.data.data || [])
      }

      if (assignedResp.data.success) {
        const assigned = assignedResp.data.data || []
        if (assigned.length > 0) {
          setRows(assigned.map((item: any) => ({
            raw_material_id: String(item.raw_material_id),
            planned_quantity: String(item.planned_quantity || ''),
            actual_quantity: item.actual_quantity == null ? '' : String(item.actual_quantity),
            unit_cost: String(item.unit_cost || ''),
            waste_quantity: String(item.waste_quantity || '0'),
            notes: item.notes || '',
          })))
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (index: number, key: keyof MaterialRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { raw_material_id: '', planned_quantity: '', actual_quantity: '', unit_cost: '', waste_quantity: '0', notes: '' }])
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    setError('')
    setSuccess('')

    const payloadRows = rows
      .filter((r) => r.raw_material_id && r.planned_quantity)
      .map((r) => ({
        raw_material_id: Number(r.raw_material_id),
        planned_quantity: Number(r.planned_quantity),
        actual_quantity: r.actual_quantity ? Number(r.actual_quantity) : null,
        unit_cost: r.unit_cost ? Number(r.unit_cost) : null,
        waste_quantity: r.waste_quantity ? Number(r.waste_quantity) : 0,
        notes: r.notes || null,
      }))

    if (payloadRows.length === 0) {
      setError('Add at least one valid material row')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/production/productions/${productionId}/materials`,
        { materials: payloadRows },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setSuccess('Materials assigned successfully.')
      } else {
        setError(response.data.message || 'Failed to assign materials')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading material assignment...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Assign Raw Materials</h1>
        <button
          onClick={() => router.push('/production/manage')}
          style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: '#6c757d', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>

      {error && <div style={{ marginBottom: '1rem', backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}
      {success && <div style={{ marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '4px' }}>{success}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '1rem' }}>
        {rows.map((row, idx) => {
          const selected = row.raw_material_id ? materialMap.get(Number(row.raw_material_id)) : null
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                value={row.raw_material_id}
                onChange={(e) => {
                  const materialId = e.target.value
                  updateRow(idx, 'raw_material_id', materialId)
                  const material = materialMap.get(Number(materialId))
                  if (material) updateRow(idx, 'unit_cost', String(material.unit_cost))
                }}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select material</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.material_name} ({m.unit_of_measure})
                  </option>
                ))}
              </select>
              <input
                value={row.planned_quantity}
                onChange={(e) => updateRow(idx, 'planned_quantity', e.target.value)}
                placeholder="Planned"
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                value={row.actual_quantity}
                onChange={(e) => updateRow(idx, 'actual_quantity', e.target.value)}
                placeholder="Actual"
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                value={row.unit_cost}
                onChange={(e) => updateRow(idx, 'unit_cost', e.target.value)}
                placeholder="Unit Cost"
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                value={row.waste_quantity}
                onChange={(e) => updateRow(idx, 'waste_quantity', e.target.value)}
                placeholder="Waste"
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button
                onClick={() => removeRow(idx)}
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.5rem' }}
              >
                X
              </button>
              <input
                value={row.notes}
                onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                placeholder={selected ? `Notes for ${selected.material_name}` : 'Notes'}
                style={{ gridColumn: '1 / span 6', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )
        })}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={addRow}
            style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Row
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Saving...' : 'Save Materials'}
          </button>
        </div>
      </div>
    </div>
  )
}

