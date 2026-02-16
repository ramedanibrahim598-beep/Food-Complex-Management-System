'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QualityPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/quality/dashboard')
  }, [router])

  return null
}
