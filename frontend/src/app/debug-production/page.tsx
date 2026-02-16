'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export default function DebugProduction() {
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const testAPI = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setError('No token found')
          return
        }

        const config = {
          headers: { Authorization: `Bearer ${token}` }
        }

        console.log('Making API call to /api/production/productions')
        const response = await axios.get('/api/production/productions', config)
        console.log('API Response:', response.data)
        setResponse(response.data)
      } catch (error: any) {
        console.error('API Error:', error)
        setError(error.response?.data?.message || error.message)
      }
    }

    testAPI()
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Production API Debug</h1>
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div>
          <h2>API Response:</h2>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Token Info:</h2>
        <p>Token exists: {typeof window !== 'undefined' && localStorage.getItem('token') ? 'Yes' : 'No'}</p>
        <p>User: {typeof window !== 'undefined' ? localStorage.getItem('user') || 'None' : 'Server-side'}</p>
      </div>
    </div>
  )
}