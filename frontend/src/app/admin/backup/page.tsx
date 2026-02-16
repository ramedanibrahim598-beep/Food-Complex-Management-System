'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Backup {
  filename: string
  name: string
  size: number
  created_at: string
  path: string
}

export default function BackupManagement() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [backupName, setBackupName] = useState('')
  const [backupDescription, setBackupDescription] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'system_admin') {
      router.push('/login')
      return
    }

    fetchBackups()
  }, [router])

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/admin/backups', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setBackups(response.data.data)
      }
    } catch (error: any) {
      setError('Failed to load backups')
      console.error('Backups error:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/admin/backup', {
        name: backupName || undefined,
        description: backupDescription || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setBackupName('')
        setBackupDescription('')
        setError('')
        // Refresh the backup list
        await fetchBackups()
        alert('Backup created successfully!')
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = async (filename: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/admin/backups/${filename}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      setError('Failed to download backup')
    }
  }

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`/api/admin/backups/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setBackups(backups.filter(b => b.filename !== filename))
        setError('')
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete backup')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Backups...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Backup Management</h1>
        <button 
          onClick={() => router.push('/admin/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Dashboard
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Create Backup Form */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3>Create New Backup</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Backup name (optional)"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={backupDescription}
            onChange={(e) => setBackupDescription(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <button 
          onClick={createBackup}
          disabled={creating}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: creating ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: creating ? 'not-allowed' : 'pointer' 
          }}
        >
          {creating ? 'Creating Backup...' : '💾 Create Backup'}
        </button>
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <p><strong>Note:</strong> This will create a complete database backup including all tables and data.</p>
          <p>The backup will be stored on the server and can be downloaded or deleted from the list below.</p>
        </div>
      </div>

      {/* Backups List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
          <h3 style={{ margin: 0 }}>Available Backups ({backups.length})</h3>
        </div>
        
        {backups.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <p>No backups found. Create your first backup using the form above.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Filename</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Size</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.filename}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                    <div>
                      <strong>{backup.filename}</strong>
                      {backup.name !== backup.filename && (
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>{backup.name}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                    {formatBytes(backup.size)}
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                    {new Date(backup.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                    <div>
                      <button 
                        onClick={() => downloadBackup(backup.filename)}
                        style={{ 
                          marginRight: '0.5rem', 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: '#007bff', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          fontSize: '0.875rem' 
                        }}
                      >
                        📥 Download
                      </button>
                      <button 
                        onClick={() => deleteBackup(backup.filename)}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          fontSize: '0.875rem' 
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Backup Information */}
      <div style={{ marginTop: '2rem', backgroundColor: '#e9ecef', padding: '1.5rem', borderRadius: '8px' }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>💡 Backup Information</h4>
        <ul style={{ marginBottom: 0, color: '#6c757d' }}>
          <li>Backups are created using mysqldump and include all database tables and data</li>
          <li>Backup files are stored in the server's storage/app/backups directory</li>
          <li>You can download backups to your local machine for safekeeping</li>
          <li>Regular backups are recommended before major system updates</li>
          <li>Deleted backups cannot be recovered - download important backups first</li>
        </ul>
      </div>
    </div>
  )
}