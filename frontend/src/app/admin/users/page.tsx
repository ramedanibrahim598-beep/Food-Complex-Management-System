'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface NewUser {
  name: string
  email: string
  password: string
  role: string
  is_active: boolean
}

const getErrorMessage = (error: any, fallback: string): string => {
  const apiError = error?.response?.data
  if (!apiError) return fallback

  const message = typeof apiError.message === 'string' ? apiError.message : fallback
  const details = apiError.data

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return message
  }

  const validationMessages = Object.values(details)
    .flatMap((value) => Array.isArray(value) ? value : [String(value)])
    .filter(Boolean)

  if (validationMessages.length === 0) {
    return message
  }

  return `${message}: ${validationMessages.join(', ')}`
}

const formatCreatedDate = (createdAt?: string): string => {
  if (!createdAt) return '-'

  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString()
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true
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
    if (userData.role !== 'system_admin') {
      router.push('/login')
      return
    }

    setCurrentUserId(userData.id)
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (error: any) {
      setError('Failed to load users')
      console.error('Users error:', error)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      setError('Name, email, and password are required')
      return
    }

    if (newUser.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/admin/users', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setUsers([{ ...response.data.data, created_at: response.data.data.created_at ?? new Date().toISOString() }, ...users])
        setNewUser({ name: '', email: '', password: '', role: 'user', is_active: true })
        setShowCreateForm(false)
        setError('')
      }
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to create user'))
    }
  }

  const updateUser = async (user: User) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`/api/admin/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setUsers(users.map(u => u.id === user.id ? { ...u, ...response.data.data, created_at: response.data.data.created_at ?? u.created_at } : u))
        setEditingUser(null)
        setError('')
      }
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to update user'))
    }
  }

  const deleteUser = async (userId: number) => {
    if (currentUserId === userId) {
      setError('You cannot delete your own account')
      return
    }

    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setUsers(users.filter(u => u.id !== userId))
        setError('')
      }
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to delete user'))
    }
  }

  const resetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (minimum 8 characters):')?.trim() || ''
    if (!newPassword) return
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/admin/users/${userId}/reset-password`, {
        password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        alert('Password reset successfully')
        setError('')
      }
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to reset password'))
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Users...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>User Management</h1>
        <div>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Dashboard
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Create User
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3>Create New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="system_admin">System Admin</option>
              <option value="general_manager">General Manager</option>
              <option value="production_manager">Production Manager</option>
              <option value="quality_controller">Quality Controller</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              <input
                type="checkbox"
                checked={newUser.is_active}
                onChange={(e) => setNewUser({...newUser, is_active: e.target.checked})}
              />
              {' '}Active
            </label>
          </div>
          <div>
            <button 
              onClick={createUser}
              style={{ marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Create
            </button>
            <button 
              onClick={() => setShowCreateForm(false)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {editingUser?.id === user.id ? (
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      style={{ padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {editingUser?.id === user.id ? (
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      style={{ padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {editingUser?.id === user.id ? (
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      style={{ padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="system_admin">System Admin</option>
                      <option value="general_manager">General Manager</option>
                      <option value="production_manager">Production Manager</option>
                      <option value="quality_controller">Quality Controller</option>
                      <option value="cashier">Cashier</option>
                    </select>
                  ) : (
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.875rem',
                      backgroundColor: 
                        user.role === 'system_admin' ? '#dc3545' : 
                        user.role === 'admin' ? '#ffc107' : 
                        user.role === 'general_manager' ? '#6f42c1' :
                        user.role === 'production_manager' ? '#28a745' :
                        user.role === 'quality_controller' ? '#17a2b8' :
                        user.role === 'cashier' ? '#fd7e14' :
                        '#6c757d',
                      color: user.role === 'admin' ? '#000' : '#fff'
                    }}>
                      {user.role.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {editingUser?.id === user.id ? (
                    <input
                      type="checkbox"
                      checked={editingUser.is_active}
                      onChange={(e) => setEditingUser({...editingUser, is_active: e.target.checked})}
                    />
                  ) : (
                    <span style={{ 
                      color: user.is_active ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {formatCreatedDate(user.created_at)}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {editingUser?.id === user.id ? (
                    <div>
                      <button 
                        onClick={() => updateUser(editingUser)}
                        style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingUser(null)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button 
                        onClick={() => setEditingUser(user)}
                        style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => resetPassword(user.id)}
                        style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        disabled={currentUserId === user.id}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: currentUserId === user.id ? 'not-allowed' : 'pointer',
                          opacity: currentUserId === user.id ? 0.6 : 1,
                          fontSize: '0.875rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
