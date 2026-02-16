'use client'

import { useState } from 'react'
import axios from 'axios'

export default function DebugLogin() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testDebugLogin = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/debug-login', {
        email: 'production@example.com',
        password: 'password123'
      })
      
      console.log('Debug response:', response.data)
      setResult('Debug response: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('Debug error:', error)
      setResult('Debug failed: ' + (error.response?.data?.message || error.message))
    }
    setLoading(false)
  }

  const testActualLogin = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/login', {
        email: 'production@example.com',
        password: 'password123'
      })
      
      console.log('Login response:', response.data)
      setResult('Login response: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('Login error:', error)
      setResult('Login failed: ' + JSON.stringify(error.response?.data || error.message, null, 2))
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Debug Login</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testDebugLogin} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Debug Endpoint
        </button>
        
        <button 
          onClick={testActualLogin} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Actual Login
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Result:</h3>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}