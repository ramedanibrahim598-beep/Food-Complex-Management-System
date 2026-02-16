'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    setDebugInfo({
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasUser: !!user,
      userData: user ? JSON.parse(user) : null,
      currentUrl: window.location.href
    })
  }, [])

  const testManagerAPI = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setTestResult('No token found in localStorage')
        return
      }

      console.log('Testing with token:', token.substring(0, 20) + '...')

      const response = await axios.get('/api/manager/reports/operational', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: {
          start_date: '2026-01-01',
          end_date: '2026-02-01'
        }
      })

      setTestResult('SUCCESS: ' + JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('API Test Error:', error)
      setTestResult('ERROR: ' + JSON.stringify({
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }, null, 2))
    }
  }

  const loginAndTest = async () => {
    try {
      // First login
      const loginResponse = await axios.post('/api/login', {
        email: 'admin@example.com',
        password: 'password123'
      })

      if (loginResponse.data.success) {
        const token = loginResponse.data.data.token
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(loginResponse.data.data.user))
        
        setTestResult('Login successful, token stored. Now testing manager API...')
        
        // Then test manager API
        setTimeout(testManagerAPI, 1000)
      } else {
        setTestResult('Login failed: ' + JSON.stringify(loginResponse.data))
      }
    } catch (error: any) {
      setTestResult('Login error: ' + error.message)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Debug Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Current State</h2>
        <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={loginAndTest}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            marginRight: '1rem'
          }}
        >
          Login & Test Manager API
        </button>
        
        <button 
          onClick={testManagerAPI}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          Test Manager API (with existing token)
        </button>
      </div>

      <div>
        <h2>Test Result</h2>
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          minHeight: '200px',
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {testResult || 'Click a button to test...'}
        </pre>
      </div>
    </div>
  )
}