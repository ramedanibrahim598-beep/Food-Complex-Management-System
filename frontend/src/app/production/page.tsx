'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductionHome() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.replace('/login')
      return
    }

    try {
      const userData = JSON.parse(user)
      const allowedRoles = ['production_manager', 'system_admin', 'admin']

      if (!allowedRoles.includes(userData.role)) {
        router.replace('/login')
        return
      }

      router.replace('/production/dashboard')
    } catch {
      router.replace('/login')
    }
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', color: '#333' }}>Redirecting to Production Dashboard...</h1>
    </div>
  )
}
