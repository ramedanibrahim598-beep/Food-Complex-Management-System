'use client'

import axios from 'axios'

type RouterLike = {
  replace: (href: string) => void
}

export const clearAuthSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const logoutUser = async (router?: RouterLike) => {
  const token = localStorage.getItem('token')

  try {
    if (token) {
      await axios.post(
        '/api/logout',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
    }
  } catch (error) {
    // Always clear local session even if API logout fails.
  } finally {
    clearAuthSession()
    if (router) {
      router.replace('/login')
    } else {
      window.location.href = '/login'
    }
  }
}
