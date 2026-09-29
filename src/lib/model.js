// Shop document model + money helpers. All amounts are numbers in the shop's
// currency; fmt() renders them for display/print.

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 10);

export const fmt = (n, cur = 'Rs') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const day = iso => (iso || '').slice(0, 10);
export const today = () => new Date().toISOString().slice(0, 10);

export function emptyStore() {
  return {
    version: 1,
    items: [],        // {id, sku, name, urduName, category, unit, price, cost, stock, minStock}
    sales: [],        // {id, number, at, lines:[{itemId,name,qty,price,cost}], discount, total, paid, method, customer, note, user}
    stockMoves: [],   // {id, itemId, qty(+/-), reason, at, note}
    expenses: [],     // {id, at, label, amount}
    auditLog: [],
    settings: defaultSettings(),
    updatedAt: Date.now()
  };
}

export function defaultSettings() {
  return {
    shopName: '', shopAddress: '', shopPhone: '',
    currency: 'Rs',
    receiptFooter: 'Shukriya! Phir tashreef laye.',
    users: [],           // {id, name, role, pin:'s:salt:hash'}
    backupFolder: '', lastBackupAt: '',
    syncFolder: '', syncAuto: true, syncCode: '', hostOn: false,
    uiUrdu: false, receiptUrdu: true,
    firstRunDone: false, consent: null
  };
}

export function newItem(patch = {}) {
  return { id: uid('i'), sku: '', name: '', urduName: '', category: '', unit: 'pcs', price: 0, cost: 0, stock: 0, minStock: 0, ...patch };
}

export function lowStock(store) {
  return (store.items || []).filter(i => num(i.minStock) > 0 && num(i.stock) <= num(i.minStock));
}

export function saleLines(lines) {
  let total = 0;
  for (const l of lines) total += num(l.qty) * num(l.price);
  return total;
}

export function nextSaleNumber(store) {
  return (store.sales || []).reduce((m, s) => Math.max(m, num(s.number)), 0) + 1;
}

export function salesOn(store, dateStr) {
  return (store.sales || []).filter(s => day(s.at) === dateStr);
}

export function dayTotals(store, dateStr) {
  const sales = salesOn(store, dateStr);
  const gross = sales.reduce((t, s) => t + num(s.total), 0);
  const paid = sales.reduce((t, s) => t + num(s.paid), 0);
  const expenses = (store.expenses || []).filter(e => day(e.at) === dateStr);
  const exp = expenses.reduce((t, e) => t + num(e.amount), 0);
  return { sales, gross, paid, expenses, exp, net: paid - exp };
}

// Fictional sample shop so the app is usable on first launch (and screenshots).
export function sampleStore() {
  const st = emptyStore();
  const items = [
    ['Aata (chakki) 10kg', 'Grocery', 'bag', 1450, 1280, 12, 4],
    ['Basmati rice 5kg', 'Grocery', 'bag', 1850, 1600, 8, 3],
    ['Cooking oil 3L', 'Grocery', 'bottle', 1750, 1520, 15, 5],
    ['Sugar (chini) 1kg', 'Grocery', 'kg', 145, 128, 40, 10],
    ['Tea (patti) 430g', 'Grocery', 'pack', 720, 640, 22, 6],
    ['Milk (pouch) 1L', 'Dairy', 'pack', 250, 220, 30, 12],
    ['Bread (large)', 'Bakery', 'loaf', 180, 150, 18, 6],
    ['Eggs (dozen)', 'Dairy', 'tray', 340, 300, 16, 4],
    ['Matchbox (pack of 10)', 'Household', 'pack', 50, 38, 25, 5],
    ['Soap 175g', 'Household', 'bar', 160, 132, 20, 6],
    ['Toothpaste 100g', 'Household', 'tube', 320, 268, 9, 4],
    ['Dishwash bar 500g', 'Household', 'bar', 210, 170, 2, 6],
    ['Cold drink 1.5L', 'Beverages', 'bottle', 220, 185, 24, 8],
    ['Juice pack 1L', 'Beverages', 'pack', 310, 260, 0, 6],
    ['Biscuits (family pack)', 'Bakery', 'pack', 140, 112, 35, 10],
    ['Water bottle 1.5L', 'Beverages', 'bottle', 90, 68, 48, 12],
  ];
  st.items = items.map(([name, category, unit, price, cost, stock, minStock], i) =>
    newItem({ sku: 'ITM' + String(i + 1).padStart(3, '0'), name, category, unit, price, cost, stock, minStock }));

  const mk = (num_, hour, mins, lines, paid, method) => ({
    id: uid('s'), number: num_, at: new Date().toISOString().slice(0, 10) + 'T' + String(hour).padStart(2, '0') + ':' + String(mins).padStart(2, '0'),
    lines, discount: 0, total: saleLines(lines), paid, method, customer: '', note: '', user: 'Counter'
  });
  const line = (idx, qty) => ({ itemId: st.items[idx].id, name: st.items[idx].name, qty, price: st.items[idx].price, cost: st.items[idx].cost });
  st.sales = [
    mk(1, 9, 15, [line(3, 2), line(4, 1), line(14, 2)], 1860, 'cash'),
    mk(2, 10, 40, [line(0, 1), line(5, 3)], 2200, 'cash'),
    mk(3, 12, 5, [line(7, 1), line(6, 1), line(15, 2)], 700, 'cash'),
    mk(4, 14, 30, [line(2, 1), line(9, 3)], 2230, 'card'),
    mk(5, 16, 50, [line(8, 1), line(10, 1)], 370, 'cash'),
  ];
  st.expenses = [
    { id: uid('e'), at: today() + 'T08:30', label: 'Shop rent (daily share)', amount: 800 },
    { id: uid('e'), at: today() + 'T11:00', label: 'Bread supplier payment', amount: 1500 },
    { id: uid('e'), at: today() + 'T15:20', label: 'Electricity top-up', amount: 600 },
  ];
  st.stockMoves = [
    { id: uid('m'), itemId: st.items[2].id, qty: 10, reason: 'purchase', at: today() + 'T08:45', note: 'Metro supplier' },
    { id: uid('m'), itemId: st.items[0].id, qty: 5, reason: 'purchase', at: today() + 'T08:45', note: 'Metro supplier' },
    { id: uid('m'), itemId: st.items[11].id, qty: -3, reason: 'damage', at: today() + 'T13:10', note: 'Broken bottles' },
  ];
  st.settings.shopName = 'Al-Noor General Store';
  st.settings.shopAddress = 'Shop 4, Main Bazaar, Lahore';
  st.settings.shopPhone = '0300-1234567';
  return st;
}
