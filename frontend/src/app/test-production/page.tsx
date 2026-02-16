'use client'

import { useState } from 'react'
import axios from 'axios'

export default function TestProduction() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')

  const testLogin = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/login', {
        email: 'production@example.com',
        password: 'password123'
      })
      
      console.log('Login response:', response.data)
      setResult('Login successful: ' + JSON.stringify(response.data, null, 2))
      
      if (response.data.success && response.data.token) {
        setToken(response.data.token)
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setResult('Login failed: ' + (error.response?.data?.message || error.message))
    }
    setLoading(false)
  }

  const testProductions = async () => {
    setLoading(true)
    try {
      const currentToken = token || localStorage.getItem('token')
      if (!currentToken) {
        setResult('No token available. Please login first.')
        setLoading(false)
        return
      }

      console.log('Using token:', currentToken.substring(0, 20) + '...')
      
      const response = await axios.get('/api/production/productions', {
        headers: { 
          Authorization: `Bearer ${currentToken}`,
          Accept: 'application/json'
        }
      })
      
      console.log('Productions response:', response.data)
      setResult('Productions loaded: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('Productions error:', error)
      setResult('Productions failed: ' + (error.response?.data?.message || error.message))
    }
    setLoading(false)
  }

  const testDirectAPI = async () => {
    setLoading(true)
    try {
      // Test direct Laravel API
      const response = await axios.get('http://127.0.0.1:8001/api/health')
      console.log('Direct API response:', response.data)
      setResult('Direct API works: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('Direct API error:', error)
      setResult('Direct API failed: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Production API Test</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testDirectAPI} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Direct API
        </button>
        
        <button 
          onClick={testLogin} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Login
        </button>
        
        <button 
          onClick={testProductions} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Productions
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
      
      {token && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Current Token:</h3>
          <p style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>{token.substring(0, 50)}...</p>
        </div>
      )}
    </div>
  )
}