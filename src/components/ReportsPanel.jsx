import { useMemo, useState } from 'react';
import { fmt, num, day } from '../lib/model.js';
import { salesCsv } from '../lib/csv.js';

// Date-range sales report + top items by qty and by gross profit.
export default function ReportsPanel({ store }) {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const cur = store.settings.currency;

  const sales = useMemo(() =>
    (store.sales || []).filter(s => { const d = day(s.at); return d >= from && d <= to; }),
    [store.sales, from, to]);

  const gross = sales.reduce((t, s) => t + num(s.total), 0);
  const paid = sales.reduce((t, s) => t + num(s.paid), 0);
  let profit = 0;
  for (const s of sales) for (const l of s.lines || []) profit += (num(l.price) - num(l.cost)) * num(l.qty);

  const byItem = {};
  for (const s of sales) for (const l of s.lines || []) {
    const k = l.itemId || l.name;
    byItem[k] = byItem[k] || { name: l.name, qty: 0, revenue: 0, profit: 0 };
    byItem[k].qty += num(l.qty);
    byItem[k].revenue += num(l.qty) * num(l.price);
    byItem[k].profit += (num(l.price) - num(l.cost)) * num(l.qty);
  }
  const topQty = Object.values(byItem).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const topProfit = Object.values(byItem).sort((a, b) => b.profit - a.profit).slice(0, 10);

  const byDay = {};
  for (const s of sales) { const d = day(s.at); byDay[d] = (byDay[d] || 0) + num(s.total); }
  const days = Object.entries(byDay).sort().slice(-14);
  const maxDay = Math.max(1, ...days.map(x => x[1]));

  const exp = (store.expenses || []).filter(e => { const d = day(e.at); return d >= from && d <= to; }).reduce((t, e) => t + num(e.amount), 0);

  return (
    <div className="panel" style={{ maxWidth: 1150 }}>
      <div className="toolbar">
        <label className="lbl" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>From <input className="in" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="lbl" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>To <input className="in" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <span className="spacer" />
        <button className="btn ghost small" onClick={() => window.api.export.text({ text: salesCsv({ sales }), suggestedName: `invutory-sales-${from}_${to}.csv` })}>Export CSV</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card"><div className="clabel">Sales</div><div className="cval">{fmt(gross, cur)}</div><div className="csub">{sales.length} receipts</div></div>
        <div className="card"><div className="clabel">Collected</div><div className="cval" style={{ color: 'var(--ok)' }}>{fmt(paid, cur)}</div><div className="csub">due {fmt(Math.max(0, gross - paid), cur)}</div></div>
        <div className="card"><div className="clabel">Gross profit</div><div className="cval">{fmt(profit, cur)}</div><div className="csub">(price − cost) × qty</div></div>
        <div className="card"><div className="clabel">Expenses</div><div className="cval" style={{ color: 'var(--danger)' }}>{fmt(exp, cur)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="clabel">Daily sales (last 14 days in range)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginTop: 10 }}>
          {days.map(([d, v]) => (
            <div key={d} title={`${d}: ${fmt(v, cur)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: 'linear-gradient(180deg,#2563eb,#38bdf8)', borderRadius: '4px 4px 0 0', height: `${Math.round(v / maxDay * 100)}%`, minHeight: v ? 3 : 0 }} />
              <span className="muted" style={{ fontSize: 9.5 }}>{d.slice(5)}</span>
            </div>
          ))}
          {!days.length && <div className="muted">No sales in this range.</div>}
        </div>
      </div>

      <div className="cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="clabel">Top items by quantity</div>
          <table className="grid" style={{ border: 0, marginTop: 6 }}>
            <thead><tr><th>Item</th><th className="num">Qty sold</th><th className="num">Revenue</th></tr></thead>
            <tbody>{topQty.map(i => <tr key={i.name}><td>{i.name}</td><td className="num"><b>{i.qty}</b></td><td className="num">{fmt(i.revenue, cur)}</td></tr>)}
            {!topQty.length && <tr><td colSpan="3" className="muted">—</td></tr>}</tbody>
          </table>
        </div>
        <div className="card">
          <div className="clabel">Top items by profit</div>
          <table className="grid" style={{ border: 0, marginTop: 6 }}>
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Profit</th></tr></thead>
            <tbody>{topProfit.map(i => <tr key={i.name}><td>{i.name}</td><td className="num">{i.qty}</td><td className="num"><b>{fmt(i.profit, cur)}</b></td></tr>)}
            {!topProfit.length && <tr><td colSpan="3" className="muted">—</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
