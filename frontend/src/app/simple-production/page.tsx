'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Production {
  id: number
  product_name: string
  batch_number: string
  status: string
  supervisor?: {
    name: string
  }
}

export default function SimpleProduction() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    loadProductions()
  }, [])

  const loadProductions = async () => {
    try {
      setLoading(true)
      setError('')
      setDebugInfo('Starting production load...')

      // Check if user is logged in
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      
      if (!token || !user) {
        setError('Not logged in. Please login first.')
        setDebugInfo(prev => prev + '\n❌ No token or user found in localStorage')
        setLoading(false)
        return
      }

      const userData = JSON.parse(user)
      setDebugInfo(prev => prev + '\n✅ Found user: ' + userData.name + ' (' + userData.role + ')')
      setDebugInfo(prev => prev + '\n✅ Found token: ' + token.substring(0, 20) + '...')

      // Make API call
      setDebugInfo(prev => prev + '\n🔄 Making API call to /api/production/productions')
      
      const response = await axios.get('/api/production/productions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })

      setDebugInfo(prev => prev + '\n✅ API call successful')
      setDebugInfo(prev => prev + '\n📊 Response status: ' + response.status)
      setDebugInfo(prev => prev + '\n📊 Response data structure: ' + JSON.stringify(Object.keys(response.data)))

      if (response.data.success) {
        const productionData = response.data.data
        setDebugInfo(prev => prev + '\n✅ API returned success: true')
        setDebugInfo(prev => prev + '\n📊 Production data type: ' + typeof productionData)
        
        if (productionData && productionData.data) {
          // Laravel pagination response
          setProductions(productionData.data)
          setDebugInfo(prev => prev + '\n✅ Found ' + productionData.data.length + ' productions (paginated)')
          setDebugInfo(prev => prev + '\n📊 Total productions: ' + productionData.total)
        } else if (Array.isArray(productionData)) {
          // Direct array response
          setProductions(productionData)
          setDebugInfo(prev => prev + '\n✅ Found ' + productionData.length + ' productions (direct array)')
        } else {
          setError('Unexpected data structure')
          setDebugInfo(prev => prev + '\n❌ Unexpected data structure: ' + JSON.stringify(productionData))
        }
      } else {
        setError(response.data.message || 'API returned success: false')
        setDebugInfo(prev => prev + '\n❌ API returned success: false')
      }

    } catch (error: any) {
      console.error('Production load error:', error)
      setError('Failed to load productions: ' + (error.response?.data?.message || error.message))
      setDebugInfo(prev => prev + '\n❌ Error: ' + (error.response?.data?.message || error.message))
      
      if (error.response?.status) {
        setDebugInfo(prev => prev + '\n❌ HTTP Status: ' + error.response.status)
      }
      
      if (error.response?.data) {
        setDebugInfo(prev => prev + '\n❌ Error data: ' + JSON.stringify(error.response.data))
      }
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    try {
      setDebugInfo('Testing login...')
      const response = await axios.post('/api/login', {
        email: 'production@example.com',
        password: 'password123'
      })

      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        setDebugInfo(prev => prev + '\n✅ Login successful, token stored')
        
        // Reload productions
        loadProductions()
      } else {
        setDebugInfo(prev => prev + '\n❌ Login failed: ' + response.data.message)
      }
    } catch (error: any) {
      setDebugInfo(prev => prev + '\n❌ Login error: ' + (error.response?.data?.message || error.message))
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Simple Production Test</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testLogin}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Login as Production Manager
        </button>
        
        <button 
          onClick={loadProductions}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Reload Productions
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {productions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3>Productions ({productions.length})</h3>
          <ul>
            {productions.slice(0, 5).map(prod => (
              <li key={prod.id}>
                {prod.product_name} - {prod.batch_number} ({prod.status}) - Supervisor: {prod.supervisor?.name || 'N/A'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>Debug Info:</h3>
        <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
          {debugInfo}
        </pre>
      </div>
    </div>
  )
}