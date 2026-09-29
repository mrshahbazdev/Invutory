import { useState } from 'react';
import { fmt, num, uid, dayTotals } from '../lib/model.js';
import { receiptHtml } from '../lib/receiptHtml.js';

export default function DayBookPanel({ store, update }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const d = dayTotals(store, date);
  const cur = store.settings.currency;

  const addExpense = () => {
    if (!label.trim() || !num(amount)) return;
    update(s => {
      s.expenses = s.expenses || [];
      s.expenses.push({ id: uid('e'), at: date + 'T' + new Date().toTimeString().slice(0, 5), label: label.trim(), amount: num(amount) });
    }, 'expense');
    setLabel(''); setAmount('');
  };

  const printDay = () => {
    const esc = x => String(x ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const srows = d.sales.map(s => `<tr><td>#${s.number}</td><td>${esc((s.at || '').slice(11, 16))}</td><td>${esc((s.lines || []).map(l => `${l.name} x${l.qty}`).join(', '))}</td><td style="text-align:right">${num(s.total).toLocaleString()}</td><td>${esc(s.method)}</td></tr>`).join('');
    const erows = d.expenses.map(e => `<tr><td>${esc((e.at || '').slice(11, 16))}</td><td>${esc(e.label)}</td><td style="text-align:right">${num(e.amount).toLocaleString()}</td></tr>`).join('');
    window.api.export.print({ html: `<!doctype html><html><head><style>@page{size:A4;margin:14mm}body{font:10.5pt 'Segoe UI',sans-serif}table{width:100%;border-collapse:collapse;margin-top:6px}td,th{border:1px solid #e2e8f0;padding:4px 7px;text-align:left}th{background:#0c1c33;color:#fff}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:14px 0 2px}</style></head><body>
      <h1>${esc(store.settings.shopName || 'Invutory')} — Day book ${esc(date)}</h1>
      <div>Sales ${fmt(d.gross, cur)} · Collected ${fmt(d.paid, cur)} · Expenses ${fmt(d.exp, cur)} · <b>Net ${fmt(d.net, cur)}</b></div>
      <h2>Sales (${d.sales.length})</h2><table><thead><tr><th>#</th><th>Time</th><th>Items</th><th>Total</th><th>Method</th></tr></thead><tbody>${srows}</tbody></table>
      <h2>Expenses (${d.expenses.length})</h2><table><thead><tr><th>Time</th><th>Label</th><th>Amount</th></tr></thead><tbody>${erows}</tbody></table>
    </body></html>` });
  };

  return (
    <div className="panel" style={{ maxWidth: 1150 }}>
      <div className="toolbar">
        <input className="in" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn ghost small" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</button>
        <span className="spacer" />
        <button className="btn ghost small" onClick={printDay}>Print day book</button>
      </div>

      <div className="cards">
        <div className="card"><div className="clabel">Sales</div><div className="cval">{fmt(d.gross, cur)}</div><div className="csub">{d.sales.length} receipts</div></div>
        <div className="card"><div className="clabel">Expenses</div><div className="cval" style={{ color: 'var(--danger)' }}>{fmt(d.exp, cur)}</div></div>
        <div className="card"><div className="clabel">Net (paid − expenses)</div><div className="cval" style={{ color: d.net >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{fmt(d.net, cur)}</div></div>
      </div>

      <div className="form" style={{ marginBottom: 14 }}>
        <h2 className="ptitle" style={{ marginTop: 0 }}>Add expense / kharcha</h2>
        <div className="frow">
          <input className="in" style={{ flex: 1 }} placeholder="e.g. Rent, supplier payment, chai…" value={label} onChange={e => setLabel(e.target.value)} />
          <input className="in num" style={{ width: 110 }} type="number" min="0" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button className="btn small" onClick={addExpense}>+ Expense</button>
        </div>
      </div>

      <h2 className="ptitle">Sales</h2>
      <table className="grid" style={{ marginBottom: 16 }}>
        <thead><tr><th>#</th><th>Time</th><th>Items</th><th className="num">Total</th><th className="num">Paid</th><th>Method</th><th></th></tr></thead>
        <tbody>
          {[...d.sales].sort((a, b) => (a.at || '').localeCompare(b.at || '')).map(s => (
            <tr key={s.id}>
              <td>#{s.number}</td>
              <td className="muted">{(s.at || '').slice(11, 16)}</td>
              <td className="muted">{(s.lines || []).map(l => `${l.name} ×${l.qty}`).join(', ')}</td>
              <td className="num"><b>{fmt(s.total, cur)}</b></td>
              <td className="num">{fmt(s.paid, cur)}</td>
              <td className="muted">{s.method}{num(s.paid) < num(s.total) ? ' · udhaar' : ''}</td>
              <td className="acts">
                <button className="icon" title="Reprint receipt" onClick={() => window.api.export.print({ html: receiptHtml(s, store.settings) })}>🖨</button>
                <button className="icon" title="Delete sale (stock returns)" onClick={() => {
                  if (!confirm(`Delete sale #${s.number}? Its item quantities return to stock.`)) return;
                  update(st => {
                    st.sales = st.sales.filter(x => x.id !== s.id);
                    for (const l of s.lines || []) {
                      const it = st.items.find(i => i.id === l.itemId);
                      if (it) it.stock = num(it.stock) + num(l.qty);
                      st.stockMoves.push({ id: uid('m'), itemId: l.itemId, qty: num(l.qty), reason: 'sale-void', at: new Date().toISOString().slice(0, 16), note: `Void sale #${s.number}` });
                    }
                  }, `void sale #${s.number}`);
                }}>✕</button>
              </td>
            </tr>
          ))}
          {!d.sales.length && <tr><td colSpan="7" className="muted" style={{ padding: 16 }}>No sales on this date.</td></tr>}
        </tbody>
      </table>

      <h2 className="ptitle">Expenses</h2>
      <table className="grid">
        <thead><tr><th>Time</th><th>Label</th><th className="num">Amount</th><th></th></tr></thead>
        <tbody>
          {[...d.expenses].sort((a, b) => (a.at || '').localeCompare(b.at || '')).map(e => (
            <tr key={e.id}>
              <td className="muted">{(e.at || '').slice(11, 16)}</td>
              <td>{e.label}</td>
              <td className="num" style={{ color: 'var(--danger)' }}>{fmt(e.amount, cur)}</td>
              <td className="acts"><button className="icon" onClick={() => update(s => s.expenses = s.expenses.filter(x => x.id !== e.id), 'delete expense')}>✕</button></td>
            </tr>
          ))}
          {!d.expenses.length && <tr><td colSpan="4" className="muted" style={{ padding: 16 }}>No expenses on this date.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
