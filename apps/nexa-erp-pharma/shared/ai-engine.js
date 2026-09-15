const money = n => `₹${Number(n || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

function normalize(data = {}) {
  return {
    medicines: Array.isArray(data.medicines) ? data.medicines : [],
    sales: Array.isArray(data.sales) ? data.sales : [],
    purchases: Array.isArray(data.purchases) ? data.purchases : [],
  };
}

export function askNexa(question, rawData = {}) {
  const data = normalize(rawData);
  const q = String(question || '').toLowerCase().trim();
  const today = new Date();
  const inDays = d => new Date(today.getTime() + d * 86400000);
  const low = data.medicines.filter(m => Number(m.stock || 0) <= Number(m.reorderLevel || 10));
  const expiring = data.medicines.filter(m => m.expiry && new Date(m.expiry) <= inDays(90));
  const salesTotal = data.sales.reduce((s,x) => s + Number(x.total || 0), 0);

  if (/low|reorder|stock/.test(q)) {
    if (!low.length) return 'NEXA checked the local inventory: no medicines are currently below their reorder level.';
    return `NEXA found ${low.length} low-stock item(s): ${low.slice(0,8).map(m => `${m.name} (${m.stock || 0})`).join(', ')}.`;
  }
  if (/expir|expire|expiry/.test(q)) {
    if (!expiring.length) return 'NEXA checked the local batches: no medicines are due to expire within 90 days.';
    return `NEXA found ${expiring.length} medicine(s) expiring within 90 days: ${expiring.slice(0,8).map(m => `${m.name} (${m.expiry})`).join(', ')}.`;
  }
  if (/sales|revenue|turnover/.test(q)) return `Recorded local sales total: ${money(salesTotal)} across ${data.sales.length} transaction(s).`;
  if (/profit|margin/.test(q)) {
    const revenue = salesTotal;
    const cost = data.sales.reduce((s,x) => s + Number(x.cost || 0), 0);
    return `Estimated recorded gross profit is ${money(revenue - cost)} (${revenue ? (((revenue-cost)/revenue)*100).toFixed(1) : '0.0'}% margin).`;
  }
  if (/hello|hi|namaste|help/.test(q)) return 'NEXA Offline Copilot is ready. Ask about stock, expiry, reorder, sales, profit or inventory.';
  return 'I am NEXA Offline Copilot. Try: “show low stock”, “what expires soon?”, “today sales”, or “estimate profit”.';
}
