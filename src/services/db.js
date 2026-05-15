import { supabase } from '../lib/supabase'

// ── Dashboard ──────────────────────────────────────────────────────────────
export async function getDashboardKpis() {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [saleToday, saleMonth, layaways, inventory] = await Promise.all([
    supabase.from('sales').select('total').gte('sale_date', today).neq('status', 'cancelada'),
    supabase.from('sales').select('total').gte('sale_date', monthStart).neq('status', 'cancelada'),
    supabase.from('layaways').select('status'),
    supabase.from('inventory_items').select('stock, min_stock'),
  ])

  const salesTodayTotal = (saleToday.data || []).reduce((s, r) => s + Number(r.total || 0), 0)
  const salesMonthTotal = (saleMonth.data || []).reduce((s, r) => s + Number(r.total || 0), 0)
  const activeLayaways = (layaways.data || []).filter(l => l.status === 'activo' || l.status === 'proximo').length
  const overdueLayaways = (layaways.data || []).filter(l => l.status === 'vencido').length
  const lowStock = (inventory.data || []).filter(i => i.stock > 0 && i.stock < i.min_stock).length
  const criticalStock = (inventory.data || []).filter(i => i.stock === 0).length

  return { salesTodayTotal, salesMonthTotal, activeLayaways, overdueLayaways, lowStock, criticalStock }
}

export async function getWeeklySales() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  const { data } = await supabase
    .from('sales')
    .select('sale_date, total')
    .gte('sale_date', days[0])
    .neq('status', 'cancelada')

  return days.map(day => ({
    label: day.slice(5),
    value: (data || []).filter(s => s.sale_date === day).reduce((sum, s) => sum + Number(s.total || 0), 0)
  }))
}

export async function getLayawayStatusCounts() {
  const { data } = await supabase.from('layaways').select('status')
  const counts = {}
  for (const r of (data || [])) counts[r.status] = (counts[r.status] || 0) + 1
  return counts
}

export async function getRecentSales(limit = 5) {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customers(name)')
    .order('sale_date', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

// ── Products ───────────────────────────────────────────────────────────────
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(id)')
    .order('name')
  if (error) return []
  return (data || []).map(p => ({ ...p, variant_count: p.product_variants?.length || 0 }))
}

export async function getProductVariants(productId) {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
  if (error) return []
  return data || []
}

export async function getPOSCatalog(search = '', category = '') {
  let q = supabase
    .from('product_variants')
    .select('*, products(id, name, code, category, brand, price, cost, status, image_url)')
    .gt('stock', 0)
  if (category) q = q.eq('products.category', category)
  const { data, error } = await q
  if (error) return []
  let items = (data || []).filter(v => v.products)
  if (search) {
    const s = search.toLowerCase()
    items = items.filter(v =>
      v.products.name.toLowerCase().includes(s) ||
      (v.sku || '').toLowerCase().includes(s) ||
      (v.color || '').toLowerCase().includes(s)
    )
  }
  return items
}

export async function createProduct(product) {
  const { data, error } = await supabase.from('products').insert(product).select().single()
  if (error) throw error
  return data
}

export async function createProductVariant(variant) {
  const { data, error } = await supabase.from('product_variants').insert(variant).select().single()
  if (error) throw error
  return data
}

// ── Customers ──────────────────────────────────────────────────────────────
export async function getCustomers(segment = '') {
  let q = supabase.from('customers').select('*').order('name')
  if (segment) q = q.eq('segment', segment)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function createCustomer(customer) {
  const { data, error } = await supabase.from('customers').insert(customer).select().single()
  if (error) throw error
  return data
}

// ── Sales ──────────────────────────────────────────────────────────────────
export async function getSales(status = '', limit = 50) {
  let q = supabase
    .from('sales')
    .select('*, customers(name, code), profiles(name)')
    .order('sale_date', { ascending: false })
    .limit(limit)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function getSaleItems(saleId) {
  const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', saleId)
  if (error) return []
  return data || []
}

export async function createSale(saleData, items) {
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert(saleData)
    .select()
    .single()
  if (saleErr) throw saleErr

  if (items && items.length) {
    const rows = items.map(i => ({ ...i, sale_id: sale.id }))
    const { error: itemsErr } = await supabase.from('sale_items').insert(rows)
    if (itemsErr) throw itemsErr

    // update stock
    for (const i of items) {
      if (i.product_variant_id) {
        await supabase.rpc('decrement_variant_stock', {
          variant_id: i.product_variant_id,
          qty: i.qty
        }).catch(() => {
          // fallback: fetch current stock then update
          supabase.from('product_variants')
            .select('stock')
            .eq('id', i.product_variant_id)
            .single()
            .then(({ data: v }) => {
              if (v) supabase.from('product_variants')
                .update({ stock: Math.max(0, v.stock - i.qty) })
                .eq('id', i.product_variant_id)
            })
        })
      }
    }
  }
  return sale
}

// ── Credits ────────────────────────────────────────────────────────────────
export async function getCredits(status = '') {
  let q = supabase
    .from('credits')
    .select('*, customers(name, code, segment)')
    .order('due_date')
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function createCredit(credit) {
  const { data, error } = await supabase.from('credits').insert(credit).select().single()
  if (error) throw error
  return data
}

// ── Layaways ───────────────────────────────────────────────────────────────
export async function getLayaways(status = '') {
  let q = supabase
    .from('layaways')
    .select('*, customers(name, code), layaway_items(*), layaway_payments(*)')
    .order('due_date')
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function createLayaway(layawayData, items) {
  const { data: layaway, error } = await supabase
    .from('layaways')
    .insert(layawayData)
    .select()
    .single()
  if (error) throw error

  if (items && items.length) {
    const rows = items.map(i => ({ ...i, layaway_id: layaway.id }))
    const { error: iErr } = await supabase.from('layaway_items').insert(rows)
    if (iErr) throw iErr
  }

  // insert initial down payment
  if (layawayData.down_payment > 0) {
    await supabase.from('layaway_payments').insert({
      layaway_id: layaway.id,
      amount: layawayData.down_payment,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'efectivo'
    })
  }
  return layaway
}

export async function addLayawayPayment(layawayId, amount, method) {
  const { error: pErr } = await supabase.from('layaway_payments').insert({
    layaway_id: layawayId,
    amount,
    payment_date: new Date().toISOString().split('T')[0],
    method
  })
  if (pErr) throw pErr

  const { data: lay } = await supabase.from('layaways').select('balance, total').eq('id', layawayId).single()
  if (lay) {
    const newBalance = Math.max(0, Number(lay.balance) - Number(amount))
    const newStatus = newBalance <= 0 ? 'completado' : undefined
    const upd = { balance: newBalance }
    if (newStatus) upd.status = newStatus
    await supabase.from('layaways').update(upd).eq('id', layawayId)
  }
}

// ── Payments ───────────────────────────────────────────────────────────────
export async function getPayments(method = '', status = '') {
  let q = supabase
    .from('payments')
    .select('*, customers(name, code)')
    .order('payment_date', { ascending: false })
  if (method) q = q.eq('method', method)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function createPayment(payment) {
  const { data, error } = await supabase.from('payments').insert(payment).select().single()
  if (error) throw error
  return data
}

// ── Purchases ──────────────────────────────────────────────────────────────
export async function getPurchaseOrders(status = '') {
  let q = supabase
    .from('purchase_orders')
    .select('*, suppliers(name, contact)')
    .order('order_date', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function getSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name')
  if (error) return []
  return data || []
}

export async function createPurchaseOrder(order, items) {
  const { data: po, error } = await supabase.from('purchase_orders').insert(order).select().single()
  if (error) throw error
  if (items && items.length) {
    const rows = items.map(i => ({ ...i, purchase_order_id: po.id }))
    await supabase.from('purchase_items').insert(rows)
  }
  return po
}

// ── Cash Register ──────────────────────────────────────────────────────────
export async function getTodayCashRegister() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*, cash_register_expenses(*), profiles(name)')
    .eq('register_date', today)
    .single()
  if (error && error.code !== 'PGRST116') return null
  return data || null
}

export async function createCashRegister(registerData) {
  const { data, error } = await supabase.from('cash_registers').insert(registerData).select().single()
  if (error) throw error
  return data
}

export async function updateCashRegister(id, updates) {
  const { data, error } = await supabase.from('cash_registers').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function addCashExpense(expense) {
  const { data, error } = await supabase.from('cash_register_expenses').insert(expense).select().single()
  if (error) throw error
  return data
}

export async function getCashRegisterHistory(limit = 30) {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*, profiles(name)')
    .order('register_date', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

// ── Inventory ──────────────────────────────────────────────────────────────
export async function getInventoryItems(statusFilter = '') {
  const { data, error } = await supabase.from('inventory_items').select('*').order('name')
  if (error) return []
  let items = (data || []).map(i => {
    let computedStatus = 'ok'
    if (i.stock === 0) computedStatus = 'critico'
    else if (i.stock < i.min_stock) computedStatus = 'bajo'
    return { ...i, computed_status: computedStatus }
  })
  if (statusFilter) items = items.filter(i => i.computed_status === statusFilter)
  return items
}

// ── Promotions ─────────────────────────────────────────────────────────────
export async function getPromotions(status = '') {
  let q = supabase.from('promotions').select('*').order('start_date', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function createPromotion(promo) {
  const { data, error } = await supabase.from('promotions').insert(promo).select().single()
  if (error) throw error
  return data
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*')
  if (error) return {}
  const obj = {}
  for (const row of (data || [])) obj[row.key] = row.value
  return obj
}

export async function updateSetting(key, value) {
  const { error } = await supabase.from('settings').upsert({ key, value })
  if (error) throw error
}

// ── Notifications ──────────────────────────────────────────────────────────
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('id', { ascending: false })
    .limit(20)
  if (error) return []
  return data || []
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

// ── Reports ────────────────────────────────────────────────────────────────
export async function getSalesByDay(days = 7) {
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  const fromStr = from.toISOString().split('T')[0]
  const { data } = await supabase
    .from('sales')
    .select('sale_date, total')
    .gte('sale_date', fromStr)
    .neq('status', 'cancelada')

  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = d.toISOString().split('T')[0]
    result.push({
      label: day.slice(5),
      value: (data || []).filter(s => s.sale_date === day).reduce((sum, s) => sum + Number(s.total || 0), 0)
    })
  }
  return result
}

export async function getTopProducts(limit = 10) {
  const { data, error } = await supabase
    .from('sale_items')
    .select('product_name, qty, total')
  if (error) return []
  const map = {}
  for (const row of (data || [])) {
    if (!map[row.product_name]) map[row.product_name] = { name: row.product_name, qty: 0, total: 0 }
    map[row.product_name].qty += Number(row.qty || 0)
    map[row.product_name].total += Number(row.total || 0)
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit)
}

export async function getInventoryByCategory() {
  const { data, error } = await supabase.from('inventory_items').select('category, stock, price')
  if (error) return []
  const map = {}
  for (const row of (data || [])) {
    const cat = row.category || 'Sin categoría'
    if (!map[cat]) map[cat] = { name: cat, value: 0 }
    map[cat].value += Number(row.stock || 0) * Number(row.price || 0)
  }
  return Object.values(map).sort((a, b) => b.value - a.value)
}

export async function getProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('name')
  if (error) return []
  return data || []
}
