import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getPOSCatalog, getCustomers, createSale, getSettings } from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function genCode() {
  return 'VTA-' + Date.now().toString(36).toUpperCase()
}

function printTicket(sale, items, customer) {
  const win = window.open('', '_blank', 'width=320,height=600')
  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  win.document.write(`
    <html><head><title>Ticket</title>
    <style>
      body { font-family: monospace; font-size: 12px; padding: 8px; width: 280px; }
      h2 { text-align: center; font-size: 14px; margin: 0 0 8px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      .total { font-size: 16px; font-weight: bold; }
      .center { text-align: center; }
    </style></head>
    <body>
      <h2>ERP Global</h2>
      <div class="center">${sale.code || sale.id?.slice(0,8)}</div>
      <div class="center">${new Date().toLocaleString('es-MX')}</div>
      ${customer ? `<div class="center">Cliente: ${customer.name}</div>` : ''}
      <div class="divider"></div>
      ${items.map(i => `
        <div class="row"><span>${i.product_name} (${i.qty})</span><span>${fmt(i.qty * i.unit_price)}</span></div>
        ${i.color || i.size ? `<div style="font-size:10px;color:#666">${[i.color, i.size].filter(Boolean).join(' / ')}</div>` : ''}
      `).join('')}
      <div class="divider"></div>
      <div class="row total"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:8px">¡Gracias por su compra!</div>
    </body></html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

export default function POSModule({ lang }) {
  const { profile } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [customers, setCustomers] = useState([])
  const [settings, setSettings] = useState({ layaway_min_pct: '20', layaway_days: '30' })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [customerId, setCustomerId] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [cat, custs, setts] = await Promise.all([
        getPOSCatalog('', ''),
        getCustomers(),
        getSettings()
      ])
      setCatalog(cat)
      setCustomers(custs)
      setSettings(setts)
      const cats = [...new Set(cat.map(v => v.products?.category).filter(Boolean))]
      setCategories(cats)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = catalog.filter(v => {
    const s = search.toLowerCase()
    const matchSearch = !search ||
      (v.products?.name || '').toLowerCase().includes(s) ||
      (v.sku || '').toLowerCase().includes(s) ||
      (v.color || '').toLowerCase().includes(s)
    const matchCat = !category || v.products?.category === category
    return matchSearch && matchCat
  })

  function addToCart(variant) {
    setCart(prev => {
      const existing = prev.find(i => i.variant_id === variant.id)
      if (existing) {
        return prev.map(i => i.variant_id === variant.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        variant_id: variant.id,
        product_variant_id: variant.id,
        product_name: variant.products?.name || '',
        color: variant.color || '',
        size: variant.size || '',
        unit_price: Number(variant.products?.price || 0),
        qty: 1
      }]
    })
  }

  function changeQty(variantId, delta) {
    setCart(prev => prev.map(i => {
      if (i.variant_id !== variantId) return i
      const newQty = i.qty + delta
      return newQty <= 0 ? null : { ...i, qty: newQty }
    }).filter(Boolean))
  }

  const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const minDown = subtotal * (Number(settings.layaway_min_pct || 20) / 100)

  async function confirmSale() {
    if (!cart.length) { toast.error('El carrito está vacío'); return }
    if (paymentMethod === 'apartado' && !customerId) { toast.error('Selecciona un cliente para apartado'); return }
    if (paymentMethod === 'apartado' && Number(downPayment) < minDown) {
      toast.error(`El anticipo mínimo es ${fmt(minDown)} (${settings.layaway_min_pct}%)`)
      return
    }
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const saleData = {
        code: genCode(),
        customer_id: customerId || null,
        salesperson_id: profile?.id || null,
        sale_date: today,
        total: subtotal,
        status: paymentMethod === 'apartado' ? 'pendiente' : 'confirmada',
        payment_terms: paymentMethod
      }
      const items = cart.map(i => ({
        product_variant_id: i.product_variant_id,
        product_name: i.product_name,
        color: i.color,
        size: i.size,
        qty: i.qty,
        unit_price: i.unit_price,
        total: i.qty * i.unit_price
      }))
      const sale = await createSale(saleData, items)
      const customer = customers.find(c => c.id === customerId)
      printTicket(sale, items, customer)
      toast.success('Venta registrada exitosamente')
      setCart([])
      setCustomerId('')
      setDownPayment('')
      setPaymentMethod('efectivo')
    } catch (e) {
      toast.error('Error al registrar la venta: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div className="pos-layout">
      {/* LEFT: Product catalog */}
      <div className="pos-left">
        <div className="toolbar">
          <input
            className="search-input"
            style={{ flex: 1 }}
            placeholder="Buscar producto, SKU, color..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-chips">
            <span
              className={`chip${!category ? ' active' : ''}`}
              onClick={() => setCategory('')}
            >Todos</span>
            {categories.map(c => (
              <span
                key={c}
                className={`chip${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >{c}</span>
            ))}
          </div>
        </div>

        <div className="pos-product-grid">
          {filtered.map(v => (
            <div key={v.id} className="pos-product-card" onClick={() => addToCart(v)}>
              <div className="pos-product-name">{v.products?.name}</div>
              <div className="pos-product-meta">
                {[v.color, v.size].filter(Boolean).join(' / ')}
                {v.sku && <span> · {v.sku}</span>}
              </div>
              <div className="pos-product-price">{fmt(v.products?.price)}</div>
              <div style={{ fontSize: 11, color: v.stock <= 5 ? 'var(--warning)' : 'var(--text3)' }}>
                Stock: {v.stock}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">▣</div>
              <div className="empty-title">Sin productos</div>
              <div className="empty-sub">Ajusta el filtro o agrega productos al catálogo</div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart + Payment */}
      <div className="pos-right">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Carrito ({cart.length})
          </span>
          {cart.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>Vaciar</button>
          )}
        </div>

        <div className="pos-cart">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <div className="empty-icon">⊡</div>
              <div className="empty-title">Carrito vacío</div>
              <div className="empty-sub">Selecciona productos del catálogo</div>
            </div>
          ) : cart.map(item => (
            <div key={item.variant_id} className="pos-cart-item">
              <div className="pos-cart-item-name">
                <div>{item.product_name}</div>
                {(item.color || item.size) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {[item.color, item.size].filter(Boolean).join(' / ')}
                  </div>
                )}
              </div>
              <div className="pos-cart-item-qty">
                <button onClick={() => changeQty(item.variant_id, -1)}>−</button>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                <button onClick={() => changeQty(item.variant_id, 1)}>+</button>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', minWidth: 64, textAlign: 'right' }}>
                {fmt(item.qty * item.unit_price)}
              </span>
            </div>
          ))}
        </div>

        <div className="pos-payment">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total:</span>
            <span className="pos-total">{fmt(subtotal)}</span>
          </div>

          <div className="field">
            <label>Método de pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="apartado">Apartado</option>
            </select>
          </div>

          {paymentMethod === 'apartado' && (
            <>
              <div className="field">
                <label>Cliente</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Anticipo (mín. {settings.layaway_min_pct}% = {fmt(minDown)})</label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={e => setDownPayment(e.target.value)}
                  placeholder={fmt(minDown)}
                  min={minDown}
                />
              </div>
            </>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
            disabled={saving || !cart.length}
            onClick={confirmSale}
          >
            {saving ? 'Procesando...' : (paymentMethod === 'apartado' ? '◧ Crear apartado' : '✓ Confirmar venta')}
          </button>
        </div>
      </div>
    </div>
  )
}
