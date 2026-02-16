const fs = require('fs');

const filePath = 'frontend/src/app/production/inventory/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The materials list section that should be between the filters and the modals
const materialsListSection = `
      {/* Materials List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#333' }}>📦 Materials ({filteredMaterials.length})</h3>
        </div>
        
        {filteredMaterials.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔭</div>
            <h3>No Materials Found</h3>
            <p>No materials match your current filters.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredMaterials.map((material, index) => (
              <div 
                key={material.id} 
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < filteredMaterials.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  {/* Material Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{getStatusIcon(material.stock_status || 'unknown')}</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{material.material_name}</h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Code:</strong> {material.material_code} • <strong>Category:</strong> {material.category}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Supplier:</strong> {material.supplier_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      <strong>Location:</strong> {material.storage_location}
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div style={{ textAlign: 'center' }}>
                    <div 
                      style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.875rem', 
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(material.stock_status || 'unknown')
                      }}
                    >
                      {(material.stock_status || 'unknown').replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {material.unit_of_measure}
                    </div>
                  </div>

                  {/* Stock Levels */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {formatNumber(material.current_stock)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Current Stock
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      Min: {formatNumber(material.minimum_stock)} • Max: {formatNumber(material.maximum_stock)}
                    </div>
                  </div>

                  {/* Value & Cost */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
                      {formatCurrency(material.stock_value)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Stock Value
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      Unit: {formatCurrency(material.unit_cost)}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div>
                    {(material.stock_status === 'low_stock' || material.stock_status === 'out_of_stock') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPurchaseOrder(material)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🛒 Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Purchase Orders */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Recent Purchase Orders</h3>
        {purchaseOrders.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No purchase orders found.</p>
        ) : (
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {purchaseOrders.map((po, index) => (
              <div key={po.id} style={{ padding: '1rem 0', borderBottom: index < purchaseOrders.length - 1 ? '1px solid #eee' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{po.po_number} - {po.material_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Supplier: {po.supplier_name} | Qty: {formatNumber(po.quantity)} {po.unit_of_measure || ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#333' }}>
                    {formatCurrency(po.total_cost)}
                  </div>
                  <div>
                    <span style={{ backgroundColor: getPoStatusColor(po.status), color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {po.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <select
                      value={po.status}
                      onChange={(e) => updatePurchaseOrderStatus(po.id, e.target.value as PurchaseOrder['status'])}
                      style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="ordered">Ordered</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                {po.notes && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: po.status === 'cancelled' ? '#fee2e2' : '#e0f2fe',
                    borderLeft: \`3px solid \${po.status === 'cancelled' ? '#dc2626' : '#0284c7'}\`,
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    <strong style={{ color: po.status === 'cancelled' ? '#991b1b' : '#075985' }}>
                      {po.status === 'cancelled' ? '❌ Rejection Note:' : '💬 Manager Comment:'}
                    </strong>
                    <div style={{ marginTop: '0.25rem', color: '#374151' }}>{po.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleOpenPurchaseOrder()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛒 Create Purchase Order
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh Inventory
          </button>
          <button 
            onClick={() => alert('Stock Adjustment feature coming soon!')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📝 Adjust Stock
          </button>
        </div>
      </div>
`;

// Replace the section from Materials List comment to Purchase Order Modal
content = content.replace(
  /\{\/\* Materials List \*\/\}\s+\{\/\* Purchase Order Modal \*\/\}/,
  materialsListSection + '\n\n      {/* Purchase Order Modal */}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Materials list section restored');
