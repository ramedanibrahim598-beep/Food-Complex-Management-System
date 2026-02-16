'use client'

import { useState } from 'react'
import axios from 'axios'

export default function ApiTest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testHealthEndpoint = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/health')
      setResult('Health API works: ' + JSON.stringify(response.data))
    } catch (error: any) {
      setResult('Health API failed: ' + error.message)
    }
    setLoading(false)
  }

  const testLoginEndpoint = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/login', {
        email: 'production@example.com',
        password: 'password123'
      })
      setResult('Login API works: ' + JSON.stringify(response.data))
      
      // Store token for further tests
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
    } catch (error: any) {
      setResult('Login API failed: ' + (error.response?.data?.message || error.message))
    }
    setLoading(false)
  }

  const testProductionEndpoint = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setResult('No token found. Please login first.')
        setLoading(false)
        return
      }

      const response = await axios.get('/api/production/productions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult('Production API works: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      setResult('Production API failed: ' + (error.response?.data?.message || error.message))
      console.error('Full error:', error.response?.data || error)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>API Test Page</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testHealthEndpoint} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Health API
        </button>
        
        <button 
          onClick={testLoginEndpoint} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Login API
        </button>
        
        <button 
          onClick={testProductionEndpoint} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Production API
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Result:</h3>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}