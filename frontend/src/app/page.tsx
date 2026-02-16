'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()

  const roles = [
    {
      title: 'System Admin',
      icon: '⚙️',
      description: 'Users and settings',
      route: '/login?redirect=/admin/dashboard',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'General Manager',
      icon: '📊',
      description: 'Reports and approvals',
      route: '/login?redirect=/manager/dashboard',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'Production Manager',
      icon: '🏭',
      description: 'Production and stock',
      route: '/login?redirect=/production/dashboard',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      title: 'Quality Controller',
      icon: '✅',
      description: 'Quality checks',
      route: '/login?redirect=/quality/dashboard',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      title: 'Cashier',
      icon: '💰',
      description: 'Orders and payments',
      route: '/login?redirect=/cashier/dashboard',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ]

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        fontFamily: 'system-ui',
        display: 'flex'
      }}
    >
      {/* Left Side - Role Buttons */}
      <div
        style={{
          width: '45%',
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem'
        }}
      >
        {/* Top Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '3rem'
        }}>
          {/* Logo/Image - Top Left */}
          <div style={{ 
            width: '80px',
            height: '80px',
            position: 'relative'
          }}>
            <Image 
              src="/images/logo of company.png" 
              alt="Yetebaberut Food Complex Logo"
              width={80}
              height={80}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}
            />
          </div>
          
          {/* Company Name - Top Right */}
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ 
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2
            }}>
              Yetebaberut
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: '1rem',
              color: '#00c2ff',
              fontWeight: 500
            }}>
              Food Complex
            </p>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ 
            fontSize: '1.1rem',
            color: '#b0b0b0',
            margin: 0,
            lineHeight: 1.5
          }}>
            Industrial Food Production & Wholesale Distribution Management System
          </p>
        </div>

        {/* Role Buttons - Vertically Stacked */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            flex: 1,
            justifyContent: 'center'
          }}
        >
          {roles.map((role, index) => (
            <button
              key={index}
              onClick={() => router.push(role.route)}
              style={{
                background: role.gradient,
                border: 'none',
                borderRadius: '10px',
                padding: '0.55rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(10px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 194, 255, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ 
                fontSize: '1.6rem',
                lineHeight: 1
              }}>
                {role.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: 0,
                  marginBottom: '0.2rem',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  {role.title}
                </h3>
                <p style={{ 
                  margin: 0,
                  fontSize: '0.78rem',
                  opacity: 0.95
                }}>
                  {role.description}
                </p>
              </div>
              <div style={{ fontSize: '1.1rem' }}>→</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '2rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.85rem'
        }}>
          <p style={{ margin: 0 }}>Â© 2026 Yetebaberut Food Complex. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Video Background */}
      <div
        style={{
          width: '55%',
          minHeight: '100vh',
          position: 'relative',
          backgroundColor: '#000'
        }}
      >
        <iframe
          src="https://www.youtube.com/embed/ac2EcuTvhgk?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&playlist=ac2EcuTvhgk&rel=0&showinfo=0"
          title="Background Video"
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
            pointerEvents: 'none',
            objectFit: 'cover'
          }}
        />
        
        {/* Subtle overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(26,26,46,0.3) 0%, rgba(0,0,0,0.1) 100%)'
          }}
        />
      </div>
    </main>
  )
}

