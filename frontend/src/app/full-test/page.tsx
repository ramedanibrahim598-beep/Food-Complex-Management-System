'use client'

import { useState } from 'react'
import axios from 'axios'

export default function FullTest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const runFullTest = async () => {
    setLoading(true)
    setResult('')
    setStep(0)

    try {
      // Step 1: Test health endpoint
      setStep(1)
      setResult('Step 1: Testing health endpoint...')
      const healthResponse = await axios.get('/api/health')
      console.log('Health response:', healthResponse.data)
      
      // Step 2: Test login
      setStep(2)
      setResult(prev => prev + '\n✅ Health OK\n\nStep 2: Testing login...')
      const loginResponse = await axios.post('/api/login', {
        email: 'production@example.com',
        password: 'password123'
      })
      console.log('Login response:', loginResponse.data)
      
      if (!loginResponse.data.success) {
        throw new Error('Login failed: ' + loginResponse.data.message)
      }
      
      const token = loginResponse.data.data.token
      const user = loginResponse.data.data.user
      
      // Step 3: Store token and test production API
      setStep(3)
      setResult(prev => prev + '\n✅ Login successful\n✅ Token: ' + token.substring(0, 20) + '...\n✅ User: ' + user.name + ' (' + user.role + ')\n\nStep 3: Testing production API...')
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      const productionResponse = await axios.get('/api/production/productions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })
      console.log('Production response:', productionResponse.data)
      
      if (productionResponse.data.success) {
        const productions = productionResponse.data.data
        setResult(prev => prev + '\n✅ Production API successful\n✅ Total productions: ' + productions.total + '\n✅ Current page items: ' + productions.data.length)
        
        if (productions.data.length > 0) {
          const first = productions.data[0]
          setResult(prev => prev + '\n✅ First production: ' + first.product_name + ' (Batch: ' + first.batch_number + ')')
        }
      } else {
        throw new Error('Production API failed: ' + productionResponse.data.message)
      }
      
      setStep(4)
      setResult(prev => prev + '\n\n🎉 ALL TESTS PASSED! The production manager module is working correctly.')
      
    } catch (error: any) {
      console.error('Test failed at step', step, ':', error)
      setResult(prev => prev + '\n\n❌ Test failed at step ' + step + ': ' + (error.response?.data?.message || error.message))
      
      if (error.response?.data) {
        setResult(prev => prev + '\n\nError details: ' + JSON.stringify(error.response.data, null, 2))
      }
    }
    
    setLoading(false)
  }

  const clearStorage = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setResult('Storage cleared')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Full Production Manager Test</h1>
      <p>This will test the complete flow: Health → Login → Production API</p>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={runFullTest} 
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Running Test...' : 'Run Full Test'}
        </button>
        
        <button 
          onClick={clearStorage} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Clear Storage
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Test Results:</h3>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: '1.5' }}>
            {result}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
        <h4 style={{ color: '#856404', marginTop: 0 }}>Test Credentials:</h4>
        <p style={{ margin: '0.5rem 0', color: '#856404' }}>
          <strong>Email:</strong> production@example.com<br/>
          <strong>Password:</strong> password123<br/>
          <strong>Expected Role:</strong> production_manager
        </p>
      </div>
    </div>
  )
}