'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Product {
  name: string
  price: number
  unit: string
  category: string
}

interface CartItem {
  product: Product
  quantity: number
  total: number
}

interface ReceiptData {
  orderNumber: string
  transactionId: string
  paymentMethod: string
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  change: number
  createdAt: string
  customerName: string
  items: CartItem[]
}

export default function POSPage() {
  const [products] = useState<Product[]>([
    { name: 'Wheat Flour', price: 5.99, unit: '1kg bag', category: 'Flour' },
    { name: 'Maize Flour', price: 6.49, unit: '1kg bag', category: 'Flour' },
    { name: 'Macaroni', price: 3.99, unit: '500g pack', category: 'Pasta' },
    { name: 'Spaghetti', price: 4.49, unit: '500g pack', category: 'Pasta' },
    { name: 'Biscuits', price: 2.99, unit: '200g pack', category: 'Baked Goods' },
  ])
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState<'on_shop' | 'delivery'>('on_shop')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    const allowedRoles = ['cashier', 'system_admin', 'admin']
    if (!allowedRoles.includes(userData.role)) {
      router.push('/login')
      return
    }
  }, [router])

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.name === product.name)
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.name === product.name
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1, total: product.price }])
    }
  }

  const updateQuantity = (productName: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productName)
      return
    }
    
    setCart(cart.map(item =>
      item.product.name === productName
        ? { ...item, quantity, total: quantity * item.product.price }
        : item
    ))
  }

  const removeFromCart = (productName: string) => {
    setCart(cart.filter(item => item.product.name !== productName))
  }

  const clearCart = () => {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
    setAmountPaid('')
    setError('')
    setSuccess('')
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.10 // 10% tax
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError('Please add items to cart')
      return
    }

    const orderTotal = calculateTotal()
    const amountPaidValue = paymentMethod === 'cash'
      ? parseFloat(amountPaid || '0')
      : orderTotal

    if (paymentMethod === 'cash' && amountPaidValue < orderTotal) {
      setError('Cash received cannot be less than total amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Not authenticated. Please login again.')
        router.push('/login')
        return
      }

      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }

      const orderData = {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        // On shop is mapped to takeout for current backend enum compatibility.
        order_type: orderType === 'on_shop' ? 'takeout' : 'delivery',
        notes: notes || null,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.total
        })),
        payment_method: paymentMethod,
        subtotal: calculateSubtotal(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal()
      }

      console.log('Submitting order:', orderData)

      const response = await axios.post('/api/cashier/orders', orderData, config)

      console.log('Order response:', response.data)

      if (response.data.success) {
        const order = response.data.data
        const paymentResponse = await axios.post('/api/cashier/payments', {
          order_id: order.id,
          payment_method: paymentMethod,
          amount_paid: amountPaidValue,
        }, config)

        if (!paymentResponse.data.success) {
          throw new Error(paymentResponse.data.message || 'Failed to process payment')
        }

        const payment = paymentResponse.data.data
        setSuccess(`✅ Order #${order.order_number} created and paid successfully!`)
        setReceiptData({
          orderNumber: order.order_number,
          transactionId: payment.transaction_id,
          paymentMethod,
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          total: orderTotal,
          amountPaid: amountPaidValue,
          change: parseFloat(payment.change_amount || '0'),
          createdAt: new Date().toISOString(),
          customerName: customerName || 'Walk-in Customer',
          items: cart,
        })
        clearCart()
      } else {
        setError(response.data.message || 'Failed to create order')
      }
    } catch (error: any) {
      console.error('Order error:', error)
      console.error('Error response:', error.response)
      
      if (error.response) {
        // Server responded with error
        setError(error.response.data?.message || error.response.data?.error || 'Failed to create order')
      } else if (error.request) {
        // Request made but no response
        setError('No response from server. Please check if backend is running.')
      } else {
        // Something else happened
        setError(error.message || 'Failed to create order')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount)
  }

  const printReceipt = () => {
    if (!receiptData) return

    const receiptWindow = window.open('', 'PRINT', 'height=650,width=420')
    if (!receiptWindow) return

    const itemRows = receiptData.items.map((item) =>
      `<tr><td>${item.product.name} x${item.quantity}</td><td style="text-align:right;">${formatCurrency(item.total)}</td></tr>`
    ).join('')

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receiptData.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2, p { margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 4px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .totals p { display: flex; justify-content: space-between; margin: 4px 0; }
          </style>
        </head>
        <body>
          <h2>Yetebaberut Food</h2>
          <p>Order: ${receiptData.orderNumber}</p>
          <p>Transaction: ${receiptData.transactionId}</p>
          <p>Date: ${new Date(receiptData.createdAt).toLocaleString()}</p>
          <p>Customer: ${receiptData.customerName}</p>
          <p>Payment: ${receiptData.paymentMethod.replace('_', ' ')}</p>
          <table>
            ${itemRows}
          </table>
          <div class="totals">
            <p><span>Subtotal</span><span>${formatCurrency(receiptData.subtotal)}</span></p>
            <p><span>Tax</span><span>${formatCurrency(receiptData.tax)}</span></p>
            <p><strong>Total</strong><strong>${formatCurrency(receiptData.total)}</strong></p>
            <p><span>Paid</span><span>${formatCurrency(receiptData.amountPaid)}</span></p>
            <p><span>Change</span><span>${formatCurrency(receiptData.change)}</span></p>
          </div>
          <p style="margin-top:12px;">Thank you for your purchase.</p>
        </body>
      </html>
    `)

    receiptWindow.document.close()
    receiptWindow.focus()
    receiptWindow.print()
    receiptWindow.close()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>🛒 Point of Sale</h1>
        <button 
          onClick={() => router.push('/cashier/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {receiptData && (
        <div style={{ backgroundColor: '#e7f3ff', color: '#0c5460', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Receipt ready for Order #{receiptData.orderNumber}</span>
          <div>
            <button
              onClick={printReceipt}
              style={{ marginRight: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Print Receipt
            </button>
            <button
              onClick={() => setReceiptData(null)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Products Section */}
        <div>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {products.map((product, index) => (
              <div
                key={index}
                onClick={() => addToCart(product)}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.borderColor = '#007bff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                  {product.category}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#333' }}>
                  {product.name}
                </h3>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  {product.unit}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'sticky', top: '2rem' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>Cart</h2>

            {/* Customer Info */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            {/* Order Type */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Order Type:</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="on_shop">On Shop</option>
                <option value="delivery">🚚 Delivery</option>
              </select>
            </div>

            {/* Cart Items */}
            <div style={{ marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Cart is empty</p>
              ) : (
                cart.map((item, index) => (
                  <div key={index} style={{ padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.product.name}</div>
                      <button
                        onClick={() => removeFromCart(item.product.name)}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => updateQuantity(item.product.name, item.quantity - 1)}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.name, item.quantity + 1)}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ fontWeight: 'bold' }}>{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                placeholder="Order notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
              />
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Payment Method:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="cash">💵 Cash</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cash Received:</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder={calculateTotal().toFixed(2)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            )}

            {/* Totals */}
            <div style={{ borderTop: '2px solid #eee', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Tax (10%):</span>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: '#28a745' }}>
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: cart.length === 0 ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || loading}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  backgroundColor: cart.length === 0 || loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cart.length === 0 || loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Processing...' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



