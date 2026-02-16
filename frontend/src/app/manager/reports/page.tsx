'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ReportData {
  production?: any
  sales?: any
  quality?: any
  operational?: any
}

const getLocalDateString = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().split('T')[0]
}

export default function ManagerReports() {
  const [activeTab, setActiveTab] = useState('operational')
  const [reportData, setReportData] = useState<ReportData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    start_date: getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    end_date: getLocalDateString(new Date())
  })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    console.log('Reports page loaded, token:', token ? 'exists' : 'missing')
    console.log('User data:', user)
    
    if (!token || !user) {
      console.log('No token or user, redirecting to login')
      router.push('/login')
      return
    }

    let userData: { role?: string } = {}
    try {
      userData = JSON.parse(user)
    } catch (e) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }
    console.log('Parsed user data:', userData)
    
    const allowedRoles = ['system_admin', 'admin', 'general_manager']
    if (!userData.role || !allowedRoles.includes(userData.role)) {
      console.log('User role not authorized:', userData.role, 'Allowed roles:', allowedRoles)
      router.push('/login')
      return
    }

    console.log('Fetching report for activeTab:', activeTab)
    fetchReport(activeTab)
  }, [router, activeTab])

  const fetchReport = async (reportType: string, retryCount = 0) => {
    setLoading(true)
    setError('') // Clear previous errors
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found. Please login again.')
        return
      }

      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: dateRange,
        timeout: 10000 // 10 second timeout
      }

      console.log(`Fetching report: ${reportType}`, { 
        url: `/api/manager/reports/${reportType}`,
        params: dateRange,
        hasToken: !!token
      })

      const response = await axios.get(`/api/manager/reports/${reportType}`, config)

      console.log(`Response for ${reportType}:`, response.data)

      if (response.data.success) {
        setReportData(prev => ({
          ...prev,
          [reportType]: response.data.data
        }))
        setError('') // Clear any previous errors
      } else {
        setError(`Failed to load ${reportType} report: ${response.data.message}`)
      }
    } catch (error: any) {
      console.error(`Error fetching ${reportType} report:`, error)
      
      // Retry once if it's a network error
      if (retryCount === 0 && (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR')) {
        console.log(`Retrying ${reportType} report...`)
        setTimeout(() => fetchReport(reportType, 1), 1000)
        return
      }
      
      if (error.response) {
        if (error.response.status === 401) {
          setError('Authentication failed. Please login again.')
          // Clear invalid token
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        } else {
          setError(`Failed to load ${reportType} report: ${error.response.data?.message || error.response.statusText}`)
        }
      } else if (error.request) {
        setError(`Network error: Unable to reach server for ${reportType} report. Please check your connection.`)
      } else {
        setError(`Failed to load ${reportType} report: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = () => {
    fetchReport(activeTab)
  }

  const formatCurrency = (amount: number | string) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(numValue || 0)
  }

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num
    return new Intl.NumberFormat('en-US').format(numValue || 0)
  }

  const formatPercentage = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num
    return `${(numValue || 0).toFixed(1)}%`
  }

  const renderOperationalReport = () => {
    const data = reportData.operational
    console.log('Rendering operational report, data:', data)
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading operational report...</div>
          {loading && <div style={{ marginTop: '1rem', color: '#666' }}>Please wait while we fetch the data...</div>}
        </div>
      )
    }

    return (
      <div>
        <h3>Operational Overview</h3>
        
        {/* Department Connection Summary */}
        <div style={{ backgroundColor: '#e3f2fd', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #2196f3' }}>
          <h4 style={{ marginTop: 0, color: '#1976d2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏢 Cross-Department Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏭</div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Production Manager</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                {data.production?.summary?.total_batches || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Production Batches</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Quality Controller</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>
                {data.quality?.summary?.total_checks || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Quality Checks</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Cashier</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
                {data.sales?.summary?.total_orders || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Orders Processed</div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px', fontSize: '0.875rem', textAlign: 'center' }}>
            <strong>Data Flow:</strong> Production Manager creates batches {'->'} Quality Controller inspects products {'->'} Cashier sells approved products
          </div>
        </div>
        
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#28a745' }}>Production Efficiency</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatPercentage(data.kpis?.production_efficiency || 0)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#007bff' }}>Quality Pass Rate</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatPercentage(data.kpis?.quality_pass_rate || 0)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffc107' }}>Sales Growth</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: (data.kpis?.sales_growth || 0) >= 0 ? '#28a745' : '#dc3545' }}>
              {(data.kpis?.sales_growth || 0) >= 0 ? '+' : ''}{formatPercentage(data.kpis?.sales_growth || 0)}
            </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#17a2b8' }}>Revenue per Unit</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data.kpis?.revenue_per_unit || 0)}</div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Production Summary */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#28a745' }}>🏭 Production Summary</h4>
            {data.production?.summary ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Batches:</span>
                  <strong>{data.production.summary.total_batches || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Units Produced:</span>
                  <strong>{formatNumber(data.production.summary.total_produced || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Target Units:</span>
                  <strong>{formatNumber(data.production.summary.total_target || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Avg Efficiency:</span>
                  <strong>{formatPercentage(data.production.summary.avg_efficiency || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Cost:</span>
                  <strong>{formatCurrency(data.production.summary.total_cost || 0)}</strong>
                </div>
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No production data available</p>
            )}
          </div>

          {/* Sales Summary */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#007bff' }}>💰 Sales Summary</h4>
            {data.sales?.summary ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Orders:</span>
                  <strong>{data.sales.summary.total_orders || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Units Sold:</span>
                  <strong>{formatNumber(data.sales.summary.total_quantity || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Revenue:</span>
                  <strong>{formatCurrency(data.sales.summary.total_revenue || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Avg Order Value:</span>
                  <strong>{formatCurrency(data.sales.summary.avg_order_value || 0)}</strong>
                </div>
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No sales data available</p>
            )}
          </div>

          {/* Quality Summary */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#ffc107' }}>✅ Quality Summary</h4>
            {data.quality?.summary ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Checks:</span>
                  <strong>{data.quality.summary.total_checks || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Passed:</span>
                  <strong style={{ color: '#28a745' }}>{data.quality.summary.passed_checks || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Failed:</span>
                  <strong style={{ color: '#dc3545' }}>{(data.quality.summary.total_checks || 0) - (data.quality.summary.passed_checks || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pass Rate:</span>
                  <strong style={{ color: (data.quality.summary.pass_rate || 0) >= 95 ? '#28a745' : '#dc3545' }}>
                    {formatPercentage(data.quality.summary.pass_rate || 0)}
                  </strong>
                </div>
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No quality data available</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderProductionReport = () => {
    const data = reportData.production
    console.log('Rendering production report, data:', data)
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading production report...</div>
          {loading && <div style={{ marginTop: '1rem', color: '#666' }}>Please wait while we fetch the data...</div>}
        </div>
      )
    }

    return (
      <div>
        <h3>Production Report</h3>
        
        {/* Production Summary */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#28a745' }}>📊 Production Summary</h4>
          {data.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Batches</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.summary.total_batches}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Units Produced</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatNumber(data.summary.total_produced)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Target Units</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatNumber(data.summary.total_target)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Avg Efficiency</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.summary.avg_efficiency >= 80 ? '#28a745' : '#dc3545' }}>
                  {formatPercentage(data.summary.avg_efficiency)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Cost</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data.summary.total_cost)}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Production by Status */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📈 Production by Status</h4>
            {data.by_status && data.by_status.length > 0 ? (
              <div>
                {data.by_status.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_status.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.status}</span>
                    <strong>{item.count} batches</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No status data available</p>
            )}
          </div>

          {/* Production by Shift */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>🕐 Production by Shift</h4>
            {data.by_shift && data.by_shift.length > 0 ? (
              <div>
                {data.by_shift.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_shift.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span>{item.shift} Shift</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.batches} batches</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>{formatNumber(item.quantity)} units</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No shift data available</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>🏆 Top Products by Production</h4>
          {data.by_product && data.by_product.length > 0 ? (
            <div>
              {data.by_product.slice(0, 10).map((item: any, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < Math.min(data.by_product.length, 10) - 1 ? '1px solid #eee' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>{item.batches} batches</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>{formatNumber(item.total_quantity)} units</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No product data available</p>
          )}
        </div>

        {/* Production Daily Reports */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>📋 Production Daily Reports</h4>
          {data.daily_reports && data.daily_reports.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Submitted By</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Batches</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Completed</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>In Progress</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Produced</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Target</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Efficiency</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Issues/Recommendations</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_reports.map((report: any) => (
                    <tr key={report.id}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        {new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        {report.submitted_by?.name || report.submittedBy?.name || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        {report.total_batches}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#28a745', fontWeight: 'bold' }}>
                        {report.completed_batches}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#ffc107', fontWeight: 'bold' }}>
                        {report.in_progress_batches}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        {formatNumber(report.total_produced)}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        {formatNumber(report.total_target)}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px', 
                          backgroundColor: report.efficiency >= 90 ? '#d4edda' : report.efficiency >= 75 ? '#fff3cd' : '#f8d7da',
                          color: report.efficiency >= 90 ? '#155724' : report.efficiency >= 75 ? '#856404' : '#721c24',
                          fontWeight: 'bold',
                          fontSize: '0.875rem'
                        }}>
                          {formatPercentage(report.efficiency)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem', maxWidth: '300px' }}>
                        {report.issues && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#856404' }}>⚠️ Issues:</strong>
                            <div style={{ color: '#666', marginTop: '0.25rem' }}>{report.issues}</div>
                          </div>
                        )}
                        {report.recommendations && (
                          <div>
                            <strong style={{ color: '#155724' }}>💡 Recommendations:</strong>
                            <div style={{ color: '#666', marginTop: '0.25rem' }}>{report.recommendations}</div>
                          </div>
                        )}
                        {!report.issues && !report.recommendations && <span style={{ color: '#999' }}>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No daily reports submitted for this period</p>
          )}
        </div>
      </div>
    )
  }

  const renderSalesReport = () => {
    const data = reportData.sales
    console.log('Rendering sales report, data:', data)
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading sales report...</div>
          {loading && <div style={{ marginTop: '1rem', color: '#666' }}>Please wait while we fetch the data...</div>}
        </div>
      )
    }

    return (
      <div>
        <h3>Sales Report</h3>
        
        {/* Sales Summary */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#007bff' }}>💰 Sales Summary</h4>
          {data.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Orders</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.summary.total_orders}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Units Sold</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatNumber(data.summary.total_quantity)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(data.summary.total_revenue)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Avg Order Value</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data.summary.avg_order_value)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Discounts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>{formatCurrency(data.summary.total_discounts)}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Sales by Status */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📊 Sales by Status</h4>
            {data.by_status && data.by_status.length > 0 ? (
              <div>
                {data.by_status.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_status.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.order_status}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.count} orders</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>{formatCurrency(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No status data available</p>
            )}
          </div>

          {/* Sales by Channel */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>🛒 Sales by Channel</h4>
            {data.by_channel && data.by_channel.length > 0 ? (
              <div>
                {data.by_channel.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_channel.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.sales_channel}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.orders} orders</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>{formatCurrency(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No channel data available</p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Top Products by Revenue */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>🏆 Top Products by Revenue</h4>
            {data.by_product && data.by_product.length > 0 ? (
              <div>
                {data.by_product.slice(0, 8).map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < Math.min(data.by_product.length, 8) - 1 ? '1px solid #eee' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>{item.orders} orders • {formatNumber(item.quantity)} units</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No product data available</p>
            )}
          </div>

          {/* Payment Status */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>💳 Payment Status</h4>
            {data.payment_status && data.payment_status.length > 0 ? (
              <div>
                {data.payment_status.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.payment_status.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center' }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor:
                          item.payment_status === 'completed' ? '#28a745'
                          : item.payment_status === 'pending' ? '#ffc107'
                          : item.payment_status === 'refunded' ? '#6f42c1'
                          : '#dc3545',
                        marginRight: '0.5rem'
                      }}></span>
                      {item.payment_status}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.count} orders</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>{formatCurrency(item.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No payment data available</p>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>Customer Daily Orders</h4>
          {data.customer_orders && data.customer_orders.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Order</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Phone</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Cashier</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customer_orders.slice(0, 50).map((order: any) => (
                    <tr key={order.id}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{order.order_number}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{order.customer_name || 'Walk-in Customer'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{order.customer_phone || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{order.cashier?.name || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textTransform: 'capitalize' }}>{order.status}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{formatCurrency(order.total_amount)}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{new Date(order.order_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No customer orders found for this date range</p>
          )}
        </div>
      </div>
    )
  }

  const renderQualityReport = () => {
    const data = reportData.quality
    console.log('Rendering quality report, data:', data)
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading quality report...</div>
          {loading && <div style={{ marginTop: '1rem', color: '#666' }}>Please wait while we fetch the data...</div>}
        </div>
      )
    }

    return (
      <div>
        <h3>Quality Report</h3>
        
        {/* Quality Summary */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#ffc107' }}>✅ Quality Summary</h4>
          {data.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Checks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.summary.total_checks}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Passed Checks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{data.summary.passed_checks}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Failed Checks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>{data.summary.failed_checks}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Warning Checks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>{data.summary.warning_checks}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Pass Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.summary.pass_rate >= 95 ? '#28a745' : data.summary.pass_rate >= 85 ? '#ffc107' : '#dc3545' }}>
                  {formatPercentage(data.summary.pass_rate)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Quality by Result */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📊 Quality by Result</h4>
            {data.by_result && data.by_result.length > 0 ? (
              <div>
                {data.by_result.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_result.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center' }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: item.result === 'pass' ? '#28a745' : item.result === 'warning' ? '#ffc107' : '#dc3545',
                        marginRight: '0.5rem'
                      }}></span>
                      {item.result}
                    </span>
                    <strong>{item.count} checks</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No result data available</p>
            )}
          </div>

          {/* Quality by Check Type */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>🔍 Quality by Check Type</h4>
            {data.by_type && data.by_type.length > 0 ? (
              <div>
                {data.by_type.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < data.by_type.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.check_type}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.total_checks} checks</div>
                      <div style={{ fontSize: '0.875rem', color: item.pass_rate >= 95 ? '#28a745' : item.pass_rate >= 85 ? '#ffc107' : '#dc3545' }}>
                        {formatPercentage(item.pass_rate)} pass rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No check type data available</p>
            )}
          </div>
        </div>

        {/* Quality by Product */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>🏆 Quality by Product</h4>
          {data.by_product && data.by_product.length > 0 ? (
            <div>
              {data.by_product.slice(0, 10).map((item: any, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < Math.min(data.by_product.length, 10) - 1 ? '1px solid #eee' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>{item.total_checks} checks • {item.passed} passed</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.1rem',
                      color: item.pass_rate >= 95 ? '#28a745' : item.pass_rate >= 85 ? '#ffc107' : '#dc3545' 
                    }}>
                      {formatPercentage(item.pass_rate)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>pass rate</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No product data available</p>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1.5rem' }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>Quality Daily Checks</h4>
          {data.daily_checks && data.daily_checks.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Check #</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Batch</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Inspector</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Result</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_checks.slice(0, 50).map((check: any) => (
                    <tr key={check.id}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.check_number || `QC-${check.id}`}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.product_name || check.production?.product_name || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.batch_number || check.production?.batch_number || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.inspector?.name || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.check_type || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textTransform: 'capitalize' }}>{check.result || check.status || '-'}</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        {check.check_date ? new Date(check.check_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>{check.observations || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No daily quality checks found for this date range</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Operational Reports</h1>
        <button 
          onClick={() => router.push('/manager')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Dashboard
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={() => fetchReport(activeTab)}
            style={{ 
              marginLeft: '1rem', 
              padding: '0.25rem 0.5rem', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Date Range Selector */}
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Start Date:</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>End Date:</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={handleDateRangeChange}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Update Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px 8px 0 0', padding: '0' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { key: 'operational', label: '📊 Operational Overview' },
            { key: 'production', label: '🏭 Production' },
            { key: 'sales', label: '💰 Sales' },
            { key: 'quality', label: '✅ Quality' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                borderBottom: activeTab === tab.key ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                borderRadius: activeTab === tab.key ? '8px 8px 0 0' : '0'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0 0 8px 8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', minHeight: '400px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading {activeTab} report...</div>
          </div>
        ) : (
          <>
            {activeTab === 'operational' && renderOperationalReport()}
            {activeTab === 'production' && renderProductionReport()}
            {activeTab === 'sales' && renderSalesReport()}
            {activeTab === 'quality' && renderQualityReport()}
          </>
        )}
      </div>
    </div>
  )
}
