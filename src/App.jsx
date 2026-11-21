import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function printNdaPage(targetId, isAdmin = false) {
  if (!isAdmin) { alert('Print / PDF ki permission sirf Admin ko hai.'); return; }
  const target = document.getElementById(targetId);
  if (!target) { alert('Print page nahi mil saka. Page refresh karke dobara try karein.'); return; }
  document.querySelectorAll('.nda-print-target').forEach(node => node.classList.remove('nda-print-target'));
  const originalParent = target.parentNode;
  const originalNextSibling = target.nextSibling;
  const placeholder = document.createComment('nda-print-placeholder');
  originalParent.insertBefore(placeholder, target);
  target.classList.add('nda-print-target');
  // Print only the selected report: detach it from the long app layout so
  // hidden dashboards/tabs cannot create trailing blank pages.
  document.body.classList.add('nda-printing');
  document.body.appendChild(target);
  const images = Array.from(target.querySelectorAll('img'));
  Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }))).then(() => {
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      target.classList.remove('nda-print-target');
      document.body.classList.remove('nda-printing');
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(target, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      } else if (originalParent) {
        originalParent.insertBefore(target, originalNextSibling && originalNextSibling.parentNode === originalParent ? originalNextSibling : null);
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 30000);
  });
}

const dailyTimesheetPrintStyle = "@media print {.app-footer {\n  display: block !important;\n  visibility: visible !important;\n  position: static !important;\n  width: 100% !important;\n  text-align: center !important;\n  color: #000 !important;\n  background: #fff !important;\n  font-size: 12px !important;\n  margin-top: 20px !important;\n  padding: 10px !important;\n}\n  body * {\n    visibility: hidden !important;\n  }\n\n  .daily-timesheet-print,\n  .daily-timesheet-print * {\n    visibility: visible !important;\n  }\n\n  .daily-timesheet-print {\n    position: absolute !important;\n    left: 0 !important;\n    top: 0 !important;\n    width: 100% !important;\n    margin: 0 !important;\n    padding: 10px !important;\n    background: white !important;\n    color: black !important;\n  }\n\n  .daily-timesheet-print button {\n    display: none !important;\n  }\n\n  @page {\n    size: A4 landscape;\n    margin: 8mm;\n  }\n}";

const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'11px 12px', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', color:'#0f172a' };
const primaryStyle = { width:'100%', padding:'12px 14px', border:0, borderRadius:9, background:'#1d4ed8', color:'#fff', fontWeight:800, cursor:'pointer' };
const tableStyle = { width:'100%', borderCollapse:'collapse', fontSize:13, textAlign:'left' };
const thStyle = { padding:'10px 8px', borderBottom:'1px solid #e2e8f0', color:'#475569', whiteSpace:'nowrap' };
const tdStyle = { padding:'10px 8px', borderBottom:'1px solid #f1f5f9', verticalAlign:'top' };

// Salary period runs from the 16th of one month through the 15th of the next.
const initialPayrollPeriod = (() => {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < 16 ? 1 : 0), 1);
  return { month: base.getMonth(), year: base.getFullYear() };
})();

function dateToInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getInitialPayrollRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < 16 ? 1 : 0), 16, 12, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 15, 12, 0, 0);
  return { startDate: dateToInputValue(start), endDate: dateToInputValue(end) };
}

function getPayrollRangeFromMonth(monthStr) {
  const [y, m] = String(monthStr || '').split('-').map(Number);
  if (!y || !m) return getInitialPayrollRange();
  const start = new Date(y, m - 2, 16, 12, 0, 0);
  const end = new Date(y, m - 1, 15, 12, 0, 0);
  return { startDate: dateToInputValue(start), endDate: dateToInputValue(end) };
}

function getPayrollMonthFromEndDate(endDateStr) {
  const [y, m] = String(endDateStr || '').slice(0, 10).split('-').map(Number);
  if (!y || !m) return new Date().toISOString().slice(0, 7);
  return `${y}-${String(m).padStart(2, '0')}`;
}

function calculateUAEGratuity(joiningDate, endDate, basicSalary, unpaidAbsenceDays = 0) {
  if (!joiningDate || !endDate) return { serviceDays: 0, adjustedServiceDays: 0, serviceYears: 0, firstFiveDays: 0, additionalDays: 0, gratuityDays: 0, dailyBasic: Math.max(0, Number(basicSalary || 0)) / 30, amount: 0, capped: false };
  const start = new Date(`${String(joiningDate).slice(0,10)}T00:00:00Z`);
  const end = new Date(`${String(endDate).slice(0,10)}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return { serviceDays: 0, adjustedServiceDays: 0, serviceYears: 0, firstFiveDays: 0, additionalDays: 0, gratuityDays: 0, dailyBasic: Math.max(0, Number(basicSalary || 0)) / 30, amount: 0, capped: false };
  const serviceDays = Math.floor((end - start) / 86400000);
  const adjustedServiceDays = Math.max(0, serviceDays - Math.max(0, Math.floor(Number(unpaidAbsenceDays) || 0)));
  let wholeYears = end.getUTCFullYear() - start.getUTCFullYear();
  let anniversary = new Date(Date.UTC(start.getUTCFullYear() + wholeYears, start.getUTCMonth(), start.getUTCDate()));
  if (anniversary > end) wholeYears -= 1;
  anniversary = new Date(Date.UTC(start.getUTCFullYear() + wholeYears, start.getUTCMonth(), start.getUTCDate()));
  const nextAnniversary = new Date(Date.UTC(start.getUTCFullYear() + wholeYears + 1, start.getUTCMonth(), start.getUTCDate()));
  const yearLength = Math.max(1, (nextAnniversary - anniversary) / 86400000);
  const fraction = Math.max(0, Math.min(1, (end - anniversary) / 86400000 / yearLength));
  const rawYears = Math.max(0, wholeYears + fraction - (Math.max(0, Number(unpaidAbsenceDays) || 0) / 365.2425));
  const serviceYears = adjustedServiceDays > 0 ? Math.max(0, rawYears) : 0;
  const firstFiveDays = Math.min(serviceYears, 5) * 21;
  const additionalDays = Math.max(0, serviceYears - 5) * 30;
  const gratuityDays = serviceYears < 1 ? 0 : firstFiveDays + additionalDays;
  const dailyBasic = Math.max(0, Number(basicSalary || 0)) / 30;
  const uncappedAmount = dailyBasic * gratuityDays;
  const cap = Math.max(0, Number(basicSalary || 0)) * 24;
  return { serviceDays, adjustedServiceDays, serviceYears, firstFiveDays: serviceYears < 1 ? 0 : firstFiveDays, additionalDays: serviceYears < 1 ? 0 : additionalDays, gratuityDays, dailyBasic, amount: Math.min(cap, uncappedAmount), capped: uncappedAmount > cap && cap > 0 };
}

function shiftPayrollDateOneMonth(dateText) {
  const [year, month, day] = String(dateText || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const targetMonthIndex = month; // zero-based index for the following month
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const targetDay = Math.min(day, new Date(targetYear, targetMonth + 1, 0).getDate());
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function WaterSupplyPanel({ session, businessId, isAdmin, canAdd, canDelete }) {
  const today = new Date().toISOString().slice(0, 10);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [companyPayments, setCompanyPayments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [floor, setFloor] = useState('Ground Floor');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [tab, setTab] = useState('daily');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerFloor, setCustomerFloor] = useState('Ground Floor');
  const [rate, setRate] = useState('6');
  const [customerRemarks, setCustomerRemarks] = useState('');
  const [saleCustomer, setSaleCustomer] = useState('');
  const [bottles, setBottles] = useState('');
  const [saleRate, setSaleRate] = useState('');
  const [salePaymentType, setSalePaymentType] = useState('Cash');
  const [saleRemarks, setSaleRemarks] = useState('');
  const [editingWaterSale, setEditingWaterSale] = useState(null);
  const [payCustomer, setPayCustomer] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [deliveryType, setDeliveryType] = useState('weekly');
  const [deliveryBottles, setDeliveryBottles] = useState('');
  const [companyRate, setCompanyRate] = useState('2');
  const [companyPaymentType, setCompanyPaymentType] = useState('Credit');
  const [companyPaidNow, setCompanyPaidNow] = useState('');
  const [companyBillNo, setCompanyBillNo] = useState('');
  const [companyRemarks, setCompanyRemarks] = useState('');
  const [companyPayDate, setCompanyPayDate] = useState(today);
  const [companyPayAmount, setCompanyPayAmount] = useState('');
  const [companyPayRemarks, setCompanyPayRemarks] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [errorText, setErrorText] = useState('');
  const currency = 'AED';
  const fmt = n => `${currency} ${Number(n || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  async function refresh() {
    setBusy(true); setErrorText('');
    try {
      const [c,s,p,d,cp] = await Promise.all([
        supabase.from('water_customers').select('*').eq('business_id',businessId).order('floor').order('room_no'),
        supabase.from('water_sales').select('*').eq('business_id',businessId).order('sale_date',{ascending:false}),
        supabase.from('water_payments').select('*').eq('business_id',businessId).order('payment_date',{ascending:false}),
        isAdmin
          ? supabase.from('water_company_deliveries').select('*').eq('business_id',businessId).order('delivery_date',{ascending:false})
          : supabase.from('water_company_deliveries').select('id,delivery_date,delivery_type,bottles_received').eq('business_id',businessId).order('delivery_date',{ascending:false}),
        isAdmin
          ? supabase.from('water_company_payments').select('*').eq('business_id',businessId).order('payment_date',{ascending:false})
          : Promise.resolve({data:[],error:null})
      ]);
      for (const r of [c,s,p,d,cp]) if (r.error) throw r.error;
      setCustomers(c.data || []); setSales(s.data || []); setPayments(p.data || []);
      setDeliveries(d.data || []); setCompanyPayments(cp.data || []);
    } catch(e) { setErrorText(e?.message || String(e)); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (businessId) void refresh(); }, [businessId]);

  const customerStats = customer => {
    const cs = sales.filter(x => String(x.customer_id) === String(customer.id));
    const ps = payments.filter(x => String(x.customer_id) === String(customer.id));
    const total = cs.reduce((a,x) => a + Number(x.total_amount || 0), 0);
    const paidAtSale = cs.reduce((a,x) => a + Number(x.cash_received || 0), 0);
    const laterPaid = ps.reduce((a,x) => a + Number(x.amount || 0), 0);
    return { total, paid: paidAtSale + laterPaid, balance: Math.max(0,total-paidAtSale-laterPaid) };
  };
  const visibleCustomers = customers.filter(c => showInactive || c.active !== false);
  const floorCustomers = visibleCustomers.filter(c => c.floor === floor);
  const monthSales = sales.filter(x => String(x.sale_date || '').slice(0,7) === month);
  const monthPayments = payments.filter(x => String(x.payment_date || '').slice(0,7) === month);
  const floorIds = new Set(customers.filter(c => c.floor === floor).map(c => String(c.id)));
  const floorMonthSales = monthSales.filter(x => floorIds.has(String(x.customer_id)));
  const floorMonthPayments = monthPayments.filter(x => floorIds.has(String(x.customer_id)));
  const dailySales = sales.filter(x => x.sale_date === day);
  const dailyPayments = payments.filter(x => x.payment_date === day);
  const dailyCash = dailySales.reduce((a,x)=>a+Number(x.cash_received||0),0) + dailyPayments.reduce((a,x)=>a+Number(x.amount||0),0);
  const dailyBilled = dailySales.reduce((a,x)=>a+Number(x.total_amount||0),0);
  const dailyCredit = dailySales.reduce((a,x)=>a+Math.max(0,Number(x.total_amount||0)-Number(x.cash_received||0)),0);
  const openingStockRow = [...deliveries].filter(x=>x.delivery_type==='opening').sort((a,b)=>String(a.delivery_date).localeCompare(String(b.delivery_date)))[0];
  const stockStartDate = openingStockRow?.delivery_date || '';
  const stockDeliveries = stockStartDate ? deliveries.filter(x=>String(x.delivery_date)>=String(stockStartDate)) : deliveries;
  const stockSales = stockStartDate ? sales.filter(x=>String(x.sale_date)>=String(stockStartDate)) : sales;
  const totalStockIn = stockDeliveries.reduce((a,x)=>a+Number(x.bottles_received||0),0);
  const totalStockOut = stockSales.reduce((a,x)=>a+Number(x.bottles||0),0);
  const currentStock = totalStockIn-totalStockOut;
  const companyBillTotal = deliveries.reduce((a,x)=>a+Number(x.bill_amount||0),0);
  const companyPaidAtDelivery = deliveries.reduce((a,x)=>a+Number(x.paid_amount||0),0);
  const companyPaidLater = companyPayments.reduce((a,x)=>a+Number(x.amount||0),0);
  const companyOutstanding = Math.max(0,companyBillTotal-companyPaidAtDelivery-companyPaidLater);
  const deliveryMonth = deliveries.filter(x=>String(x.delivery_date||'').slice(0,7)===month);
  const companyPaymentMonth = companyPayments.filter(x=>String(x.payment_date||'').slice(0,7)===month);

  async function addCustomer(e) {
    e.preventDefault();
    if (!canAdd) return alert('Aapko customer add/edit karne ki permission nahi hai.');
    if (!name.trim() || !(Number(rate)>0)) return alert('Customer name aur valid rate enter karein. Room number optional hai.');
    const payload={customer_name:name.trim(),room_no:room.trim(),floor:customerFloor,rate:Number(rate),currency,remarks:customerRemarks.trim()};
    const result = editingCustomer
      ? await supabase.from('water_customers').update(payload).eq('id',editingCustomer.id).eq('business_id',businessId)
      : await supabase.from('water_customers').insert([{...payload,business_id:Number(businessId),active:true,created_by:session?.user?.email||''}]);
    if(result.error) return alert((editingCustomer?'Customer update':'Customer save')+' nahi hua: '+result.error.message);
    setName('');setRoom('');setRate('6');setCustomerRemarks('');setCustomerFloor('Ground Floor');setEditingCustomer(null);await refresh();
  }
  function startEditCustomer(c) {
    if(!canAdd)return alert('Aapko customer edit karne ki permission nahi hai.');
    setEditingCustomer(c);setName(c.customer_name||'');setRoom(c.room_no||'');setCustomerFloor(c.floor||'Ground Floor');setRate(String(c.rate||6));setCustomerRemarks(c.remarks||'');setTab('customers');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function cancelEditCustomer(){setEditingCustomer(null);setName('');setRoom('');setRate('6');setCustomerRemarks('');setCustomerFloor('Ground Floor');}
  async function addSale(e) {
    e.preventDefault();
    if (!canAdd) return alert('Aapko daily entry ki permission nahi hai.');
    const c=customers.find(x=>String(x.id)===String(saleCustomer)); const qty=Number(bottles); const r=Number(saleRate || c?.rate); const bill=qty*r;
    const cash=salePaymentType==='Cash'?bill:0;
    if(!c||!day||!Number.isInteger(qty)||qty<=0||!(r>0)) return alert('Customer, date, bottles aur rate sahi enter karein.');
    if(qty>currentStock) return alert(`Stock kam hai. Available stock sirf ${currentStock} bottles hai.`);
    const {error}=await supabase.from('water_sales').insert([{business_id:Number(businessId),customer_id:c.id,sale_date:day,bottles:qty,rate:r,total_amount:bill,cash_received:cash,payment_mode:salePaymentType,remarks:saleRemarks.trim(),created_by:session?.user?.email||''}]);
    if(error)return alert('Daily water entry save nahi hui: '+error.message);
    setBottles('');setSaleRemarks('');await refresh();alert(`Daily entry save ho gayi. ${salePaymentType==='Cash'?'Cash received':'Credit added'}: ${fmt(bill)}`);
  }
  async function addPayment(e) {
    e.preventDefault();
    if(!canAdd)return alert('Aapko credit recovery entry ki permission nahi hai.');
    const c=customers.find(x=>String(x.id)===String(payCustomer));const amount=Number(payAmount);
    if(!c||!day||!(amount>0))return alert('Customer, date aur payment amount sahi enter karein.');
    if(amount>customerStats(c).balance)return alert(`Customer ka outstanding balance ${fmt(customerStats(c).balance)} hai.`);
    const {error}=await supabase.from('water_payments').insert([{business_id:Number(businessId),customer_id:c.id,payment_date:day,amount,currency,remarks:payRemarks.trim(),received_by:session?.user?.email||''}]);
    if(error)return alert('Customer credit payment save nahi hui: '+error.message);
    setPayAmount('');setPayRemarks('');await refresh();alert('Customer ka purana credit receive ho gaya.');
  }
  function editWaterSale(row) {
    if (!isAdmin) return alert('Daily entry sirf Admin edit kar sakta hai.');
    setEditingWaterSale({ ...row, sale_date: row.sale_date || day, customer_id: String(row.customer_id || ''), bottles: String(row.bottles || ''), rate: String(row.rate || ''), payment_mode: row.payment_mode || (Number(row.cash_received) >= Number(row.total_amount) ? 'Cash' : 'Credit'), remarks: row.remarks || '' });
  }
  async function saveWaterSaleEdit() {
    if (!isAdmin || !editingWaterSale) return;
    const row = editingWaterSale;
    const customer = customers.find(c => String(c.id) === String(row.customer_id));
    const qty = Number(row.bottles), rateValue = Number(row.rate), total = qty * rateValue;
    if (!customer || !row.sale_date || !Number.isInteger(qty) || qty <= 0 || !(rateValue > 0) || !['Cash','Credit'].includes(row.payment_mode)) return alert('Customer, date, bottles, rate aur payment type sahi enter karein.');
    const availableAfterUndo = currentStock + Number(sales.find(x => String(x.id) === String(row.id))?.bottles || 0);
    if (qty > availableAfterUndo) return alert(`Stock kam hai. Is entry ko adjust karne ke baad available stock ${availableAfterUndo} bottles hai.`);
    const { error } = await supabase.from('water_sales').update({ customer_id: customer.id, sale_date: row.sale_date, bottles: qty, rate: rateValue, total_amount: total, cash_received: row.payment_mode === 'Cash' ? total : 0, payment_mode: row.payment_mode, remarks: String(row.remarks || '').trim() }).eq('id', row.id).eq('business_id', Number(businessId));
    if (error) return alert('Daily water entry update nahi hui: ' + error.message);
    setDay(row.sale_date); setEditingWaterSale(null); await refresh();
  }
  async function deleteWaterSale(row) {
    if(!isAdmin)return alert('Daily entry sirf Admin delete kar sakta hai.');
    if(!window.confirm('Kya aap ye daily water entry permanently delete karna chahte hain?'))return;
    const {error}=await supabase.from('water_sales').delete().eq('id',row.id).eq('business_id',Number(businessId));
    if(error)return alert('Daily water entry delete nahi hui: '+error.message);
    await refresh();
  }
  async function addDelivery(e) {
    e.preventDefault(); if(!isAdmin)return alert('Company delivery entry sirf Admin kar sakta hai.');
    const qty=Number(deliveryBottles), r=deliveryType==='opening'?0:Number(companyRate), bill=deliveryType==='opening'?0:qty*r;
    const paid=deliveryType==='opening'?0:(companyPaymentType==='Cash'?(companyPaidNow===''?bill:Number(companyPaidNow)):Number(companyPaidNow||0));
    if(!deliveryDate||!Number.isInteger(qty)||qty<0||(deliveryType==='weekly'&&qty<=0)||(deliveryType==='weekly'&&!(r>0))||!Number.isFinite(paid)||paid<0||paid>bill)return alert('Delivery date, bottles, company rate aur paid amount check karein.');
    if(deliveryType==='opening'&&deliveries.some(x=>x.delivery_type==='opening'))return alert('Opening Stock pehle se enter hai. Dobara opening stock add na karein; weekly delivery select karein.');
    const {error}=await supabase.from('water_company_deliveries').insert([{business_id:Number(businessId),delivery_date:deliveryDate,delivery_type:deliveryType,bottles_received:qty,company_rate:r,bill_amount:bill,paid_amount:paid,payment_mode:deliveryType==='opening'?'Credit':companyPaymentType,bill_no:companyBillNo.trim(),remarks:companyRemarks.trim(),created_by:session?.user?.email||''}]);
    if(error)return alert('Company delivery save nahi hui: '+error.message);
    setDeliveryBottles('');setCompanyPaidNow('');setCompanyBillNo('');setDeliveryType('weekly');setCompanyRemarks('');await refresh();alert('Company delivery aur stock add ho gaya.');
  }
  async function addCompanyPayment(e) {
    e.preventDefault(); if(!isAdmin)return alert('Company payment sirf Admin enter kar sakta hai.');
    const amount=Number(companyPayAmount);
    if(!companyPayDate||!(amount>0)||amount>companyOutstanding)return alert(`Valid payment enter karein. Company outstanding: ${fmt(companyOutstanding)}.`);
    const {error}=await supabase.from('water_company_payments').insert([{business_id:Number(businessId),payment_date:companyPayDate,amount,remarks:companyPayRemarks.trim(),paid_by:session?.user?.email||''}]);
    if(error)return alert('Company payment save nahi hui: '+error.message);
    setCompanyPayAmount('');setCompanyPayRemarks('');await refresh();alert('Company payment save ho gayi; outstanding update ho gaya.');
  }
  async function deleteCustomer(c) {
    if(!canDelete)return alert('Customer delete karne ki permission nahi hai.');
    const [sr,pr]=await Promise.all([
      supabase.from('water_sales').select('id',{count:'exact',head:true}).eq('customer_id',c.id),
      supabase.from('water_payments').select('id',{count:'exact',head:true}).eq('customer_id',c.id)
    ]);
    if(sr.error||pr.error)return alert('Customer history check nahi ho saki. Delete nahi kiya gaya.');
    const history=Number(sr.count||0)+Number(pr.count||0);
    if(history>0){
      if(!window.confirm(`${c.customer_name} (Room ${c.room_no}) ki ${history} sales/payment history mojood hai. Purana hisaab safe rakhne ke liye customer ko sirf inactive kiya jayega. Continue?`))return;
      const {error}=await supabase.from('water_customers').update({active:false}).eq('id',c.id).eq('business_id',businessId);
      if(error)return alert('Customer inactive nahi hua: '+error.message);
    } else {
      if(!window.confirm(`${c.customer_name} (Room ${c.room_no}) ka koi purana record nahi. Permanently delete karna hai?`))return;
      const {error}=await supabase.from('water_customers').delete().eq('id',c.id).eq('business_id',businessId);
      if(error)return alert('Customer delete nahi hua: '+error.message);
    }
    await refresh();
  }
  async function toggleCustomer(c) {
    if(!canDelete)return alert('Customer status change karne ki permission nahi hai.');
    const {error}=await supabase.from('water_customers').update({active:!c.active}).eq('id',c.id).eq('business_id',businessId);
    if(error)return alert('Status update nahi hua: '+error.message); await refresh();
  }
  const panelCard={background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:14,marginBottom:12};
  const input={width:'100%',boxSizing:'border-box',padding:10,border:'1px solid #cbd5e1',borderRadius:8};
  const btn={padding:'10px 13px',border:0,borderRadius:8,background:'#047857',color:'#fff',fontWeight:800,cursor:'pointer'};
  const printRegister = () => { if(!isAdmin)return alert('Print permission sirf Admin ko hai.'); printNdaPage('water-month-register',true); };
  return <section>
    <div style={{...panelCard,background:'#ecfdf5',borderColor:'#a7f3d0'}}><h2 style={{margin:'0 0 5px',color:'#065f46'}}>💧 Water Supply Management</h2><div style={{fontSize:13,color:'#475569'}}>Stock in / out · Customer cash & credit · Company account</div></div>
    {errorText && <div style={{...panelCard,color:'#991b1b',background:'#fef2f2'}}>Database error: {errorText}<p style={{marginBottom:0}}>Water Supply ka updated SQL setup Supabase mein run karein.</p></div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:12}}>
      {[['Available Stock',`${currentStock} Bottles`],['Total Received',`${totalStockIn} Bottles`],['Total Sold',`${totalStockOut} Bottles`],...(isAdmin?[['Company Outstanding',fmt(companyOutstanding)]]:[])].map(([l,v])=><div key={l} style={{...panelCard,margin:0}}><small style={{color:'#64748b',fontWeight:700}}>{l}</small><div style={{fontSize:20,fontWeight:900,marginTop:5}}>{v}</div></div>)}
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>{[['daily','🧾 Daily Entry'],['customers','👥 Customers'],...(isAdmin?[['company','🏭 Company Account']]:[]),['monthly','📄 Monthly Print']].map(([id,label])=><button key={id} style={{...btn,background:tab===id?'#065f46':'#64748b'}} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {tab==='customers' && <>
      {canAdd && <form onSubmit={addCustomer} style={panelCard}><h3 style={{marginTop:0}}>{editingCustomer?'✏️ Edit Water Customer':'➕ Add Water Customer'}</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
        <label>Customer Name<input style={input} value={name} onChange={e=>setName(e.target.value)} required/></label><label>Room Number<input style={input} value={room} onChange={e=>setRoom(e.target.value)} placeholder="Optional — G-01 / 101"/></label><label>Floor<select style={input} value={customerFloor} onChange={e=>setCustomerFloor(e.target.value)}><option>Ground Floor</option><option>1st Floor</option></select></label><label>Rate per Bottle (AED)<input style={input} type="number" min="0.01" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} required/></label><label>Remarks<input style={input} value={customerRemarks} onChange={e=>setCustomerRemarks(e.target.value)}/></label></div><button style={{...btn,marginTop:10}}>{editingCustomer?'Update Customer':'Save Customer'}</button>{editingCustomer&&<button type="button" onClick={cancelEditCustomer} style={{...btn,marginTop:10,marginLeft:8,background:'#64748b'}}>Cancel</button>}</form>}
      <div style={panelCard}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><h3 style={{marginTop:0}}>Customer List</h3><label><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Show inactive</label></div><div style={{display:'flex',gap:8,marginBottom:10}}><select style={input} value={floor} onChange={e=>setFloor(e.target.value)}><option>Ground Floor</option><option>1st Floor</option></select></div><div style={{overflowX:'auto'}}><table style={tableStyle}><thead><tr>{['Room','Customer','Rate','Total Bill','Received','Outstanding','Status','Action'].map(x=><th style={thStyle} key={x}>{x}</th>)}</tr></thead><tbody>{floorCustomers.map(c=>{const st=customerStats(c);return <tr key={c.id}><td style={tdStyle}>{c.room_no||'—'}</td><td style={tdStyle}>{c.customer_name}</td><td style={tdStyle}>{fmt(c.rate)}</td><td style={tdStyle}>{fmt(st.total)}</td><td style={tdStyle}>{fmt(st.paid)}</td><td style={{...tdStyle,color:st.balance?'#b91c1c':'#047857',fontWeight:800}}>{fmt(st.balance)}</td><td style={tdStyle}>{c.active===false?'Inactive':'Active'}</td><td style={tdStyle}>{canAdd&&<button type="button" onClick={()=>startEditCustomer(c)} style={{marginRight:5}}>Edit</button>}{canDelete&&<button type="button" onClick={()=>toggleCustomer(c)} style={{marginRight:5}}>{c.active===false?'Activate':'Inactive'}</button>}{canDelete&&<button type="button" onClick={()=>deleteCustomer(c)} style={{color:'#b91c1c'}}>Delete</button>}</td></tr>})}{!floorCustomers.length&&<tr><td colSpan="8" style={tdStyle}>Is floor par koi customer nahi.</td></tr>}</tbody></table></div></div>
    </>}
    {tab==='daily' && <>
      <div style={panelCard}><h3 style={{marginTop:0}}>Daily Water Sale Entry</h3><form onSubmit={addSale}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10}}><label>Date<input type="date" style={input} value={day} onChange={e=>setDay(e.target.value)}/></label><label>Customer<select style={input} value={saleCustomer} onChange={e=>{setSaleCustomer(e.target.value);const c=customers.find(x=>String(x.id)===e.target.value);setSaleRate(c?String(c.rate):'')}} required><option value="">Select customer</option>{customers.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.room_no ? c.room_no+' · ' : ''}{c.customer_name}</option>)}</select></label><label>Total Bottles<input type="number" min="1" step="1" style={input} value={bottles} onChange={e=>setBottles(e.target.value)} required/></label><label>Rate / Bottle<input type="number" min="0.01" step="0.01" style={input} value={saleRate} onChange={e=>setSaleRate(e.target.value)} required/></label><label>Payment Type<select style={input} value={salePaymentType} onChange={e=>setSalePaymentType(e.target.value)}><option value="Cash">Cash</option><option value="Credit">Credit</option></select></label><label>Remarks<input style={input} value={saleRemarks} onChange={e=>setSaleRemarks(e.target.value)}/></label></div><div style={{marginTop:10,fontWeight:800}}>Bill: {fmt(Number(bottles||0)*Number(saleRate||0))} · {salePaymentType==='Cash'?'Cash Received':'Credit Added'}: {fmt(Number(bottles||0)*Number(saleRate||0))} · Available Stock: {currentStock}</div><button style={{...btn,marginTop:10}} disabled={!canAdd||busy}>Save Daily Entry</button></form></div>
      {canAdd&&<form onSubmit={addPayment} style={panelCard}><h3 style={{marginTop:0}}>Receive Previous Customer Credit</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}><label>Date<input type="date" style={input} value={day} onChange={e=>setDay(e.target.value)}/></label><label>Customer<select style={input} value={payCustomer} onChange={e=>setPayCustomer(e.target.value)} required><option value="">Select customer</option>{customers.filter(c=>c.active!==false&&customerStats(c).balance>0).map(c=><option key={c.id} value={c.id}>{c.room_no ? c.room_no+' · ' : ''}{c.customer_name} · Due {fmt(customerStats(c).balance)}</option>)}</select></label><label>Cash Received<input type="number" min="0.01" step="0.01" style={input} value={payAmount} onChange={e=>setPayAmount(e.target.value)} required/></label><label>Remarks<input style={input} value={payRemarks} onChange={e=>setPayRemarks(e.target.value)}/></label></div><button style={{...btn,marginTop:10}}>Receive Old Credit</button></form>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>{[['Daily Bill',dailyBilled],['Daily Cash',dailyCash],['Daily Credit Added',dailyCredit]].map(([l,v])=><div key={l} style={{...panelCard,margin:0}}><div style={{fontSize:12,color:'#64748b',fontWeight:700}}>{l}</div><div style={{fontSize:21,fontWeight:900}}>{fmt(v)}</div></div>)}</div>
      <div style={panelCard}><h3 style={{marginTop:0}}>Daily Activity · {day}</h3><div style={{overflowX:'auto'}}><table style={tableStyle}><thead><tr>{['Date','Customer','Room','Bottles','Bill','Payment Type','Credit','Remarks',...(isAdmin?['Actions']:[])].map(x=><th key={x} style={thStyle}>{x}</th>)}</tr></thead><tbody>{dailySales.map(x=>{const c=customers.find(y=>String(y.id)===String(x.customer_id));const editing=String(editingWaterSale?.id)===String(x.id);const editBill=Number(editingWaterSale?.bottles||0)*Number(editingWaterSale?.rate||0);return <tr key={x.id} style={editing?{background:'#eff6ff'}:{}}><td style={tdStyle}>{editing?<input type="date" style={input} value={editingWaterSale.sale_date} onChange={e=>setEditingWaterSale(v=>({...v,sale_date:e.target.value}))}/>:x.sale_date}</td><td style={tdStyle}>{editing?<select style={input} value={editingWaterSale.customer_id} onChange={e=>setEditingWaterSale(v=>({...v,customer_id:e.target.value}))}><option value="">Select customer</option>{customers.map(y=><option key={y.id} value={y.id}>{y.room_no?y.room_no+' · ':''}{y.customer_name}</option>)}</select>:(c?.customer_name||'Deleted customer')}</td><td style={tdStyle}>{c?.room_no||'—'}</td><td style={tdStyle}>{editing?<input type="number" min="1" step="1" style={{...input,width:75}} value={editingWaterSale.bottles} onChange={e=>setEditingWaterSale(v=>({...v,bottles:e.target.value}))}/>:x.bottles}</td><td style={tdStyle}>{editing?fmt(editBill):fmt(x.total_amount)}</td><td style={tdStyle}>{editing?<><select style={input} value={editingWaterSale.payment_mode} onChange={e=>setEditingWaterSale(v=>({...v,payment_mode:e.target.value}))}><option value="Cash">Cash</option><option value="Credit">Credit</option></select><input aria-label="Rate per bottle" title="Rate per bottle" type="number" min="0.01" step="0.01" style={{...input,width:85,marginTop:4}} value={editingWaterSale.rate} onChange={e=>setEditingWaterSale(v=>({...v,rate:e.target.value}))}/></>:(x.payment_mode||(Number(x.cash_received)>=Number(x.total_amount)?'Cash':'Credit'))}</td><td style={tdStyle}>{editing?fmt(editingWaterSale.payment_mode==='Cash'?0:editBill):fmt(Number(x.total_amount)-Number(x.cash_received))}</td><td style={tdStyle}>{editing?<input style={input} value={editingWaterSale.remarks} onChange={e=>setEditingWaterSale(v=>({...v,remarks:e.target.value}))}/> : (x.remarks||'—')}</td>{isAdmin&&<td style={tdStyle}>{editing?<><button type="button" onClick={saveWaterSaleEdit} style={{marginRight:5}}>Save</button><button type="button" onClick={()=>setEditingWaterSale(null)}>Cancel</button></>:<><button type="button" onClick={()=>editWaterSale(x)} style={{marginRight:5}}>Edit</button><button type="button" onClick={()=>deleteWaterSale(x)} style={{color:'#b91c1c'}}>Delete</button></>}</td>}</tr>})}{!dailySales.length&&<tr><td colSpan={isAdmin?9:8} style={tdStyle}>No daily entries.</td></tr>}</tbody></table></div><h4>Old Credit Received Today</h4>{dailyPayments.map(p=><div key={p.id} style={{padding:8,borderTop:'1px solid #eee'}}>{customers.find(c=>String(c.id)===String(p.customer_id))?.customer_name||'Customer'} · {fmt(p.amount)} · {p.remarks||'—'}</div>)}{!dailyPayments.length&&<small>No previous credit received today.</small>}</div>
    </>}
    {tab==='company' && <>
      <div style={{...panelCard,background:'#eff6ff'}}><h3 style={{marginTop:0}}>Company Stock & Account Summary</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}><div><small>Total Stock Received</small><h2>{totalStockIn} Bottles</h2></div><div><small>Total Bottles Sold</small><h2>{totalStockOut} Bottles</h2></div><div><small>Available Stock</small><h2 style={{color:currentStock<0?'#b91c1c':'#047857'}}>{currentStock} Bottles</h2></div><div><small>Total Company Bill</small><h2>{fmt(companyBillTotal)}</h2></div><div><small>Total Paid</small><h2 style={{color:'#047857'}}>{fmt(companyPaidAtDelivery+companyPaidLater)}</h2></div><div><small>Company Outstanding</small><h2 style={{color:'#b91c1c'}}>{fmt(companyOutstanding)}</h2></div></div></div>
      {isAdmin&&<form onSubmit={addDelivery} style={panelCard}><h3 style={{marginTop:0}}>＋ Add Weekly Company Delivery / Opening Stock</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}><label>Entry Type<select style={input} value={deliveryType} onChange={e=>setDeliveryType(e.target.value)}><option value="weekly">Weekly Company Delivery</option><option value="opening">Opening Stock (existing bottles)</option></select></label><label>Delivery Date<input type="date" style={input} value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} required/></label><label>Bottles Received<input type="number" min={deliveryType==='opening'?0:1} step="1" style={input} value={deliveryBottles} onChange={e=>setDeliveryBottles(e.target.value)} required/></label><label>Company Rate / Bottle (AED)<input type="number" min="0.01" step="0.01" style={input} value={companyRate} onChange={e=>setCompanyRate(e.target.value)} disabled={deliveryType==='opening'} required={deliveryType==='weekly'}/></label><label>Payment Type<select style={input} value={companyPaymentType} disabled={deliveryType==='opening'} onChange={e=>{setCompanyPaymentType(e.target.value);if(e.target.value==='Cash')setCompanyPaidNow('')}}><option value="Cash">Cash</option><option value="Credit">Credit</option></select></label><label>Paid Now (AED)<input type="number" min="0" step="0.01" style={input} value={companyPaidNow} disabled={deliveryType==='opening'} onChange={e=>setCompanyPaidNow(e.target.value)} placeholder={companyPaymentType==='Cash'?'Full bill by default':'0 = full credit'}/></label><label>Bill / Invoice No.<input style={input} value={companyBillNo} onChange={e=>setCompanyBillNo(e.target.value)}/></label><label>Remarks<input style={input} value={companyRemarks} onChange={e=>setCompanyRemarks(e.target.value)}/></label></div><div style={{marginTop:10,fontWeight:800}}>Company Bill: {fmt(deliveryType==='opening'?0:Number(deliveryBottles||0)*Number(companyRate||0))} · Unpaid: {fmt(deliveryType==='opening'?0:Math.max(0,Number(deliveryBottles||0)*Number(companyRate||0)-(companyPaymentType==='Cash'?(companyPaidNow===''?Number(deliveryBottles||0)*Number(companyRate||0):Number(companyPaidNow)):Number(companyPaidNow||0))))}</div><button style={{...btn,marginTop:10}}>Save Company Delivery & Add Stock</button></form>}
      {isAdmin&&<form onSubmit={addCompanyPayment} style={panelCard}><h3 style={{marginTop:0}}>Pay Company Outstanding Bill</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}><label>Payment Date<input type="date" style={input} value={companyPayDate} onChange={e=>setCompanyPayDate(e.target.value)}/></label><label>Payment Amount<input type="number" min="0.01" step="0.01" style={input} value={companyPayAmount} onChange={e=>setCompanyPayAmount(e.target.value)} required/></label><label>Remarks / Bill Reference<input style={input} value={companyPayRemarks} onChange={e=>setCompanyPayRemarks(e.target.value)}/></label></div><div style={{marginTop:8}}>Current Company Outstanding: <b>{fmt(companyOutstanding)}</b></div><button style={{...btn,marginTop:10}}>Save Company Payment</button></form>}
      <div style={panelCard}><h3 style={{marginTop:0}}>Company Delivery History</h3><div style={{overflowX:'auto'}}><table style={tableStyle}><thead><tr>{['Date','Entry Type','Bottles In','Rate','Bill','Paid at Delivery','Payment Type','Bill No.','Unpaid'].map(x=><th key={x} style={thStyle}>{x}</th>)}</tr></thead><tbody>{deliveries.map(d=><tr key={d.id}><td style={tdStyle}>{d.delivery_date}</td><td style={tdStyle}>{d.delivery_type==='opening'?'Opening Stock':'Weekly Delivery'}</td><td style={tdStyle}>{d.bottles_received}</td><td style={tdStyle}>{fmt(d.company_rate)}</td><td style={tdStyle}>{fmt(d.bill_amount)}</td><td style={tdStyle}>{fmt(d.paid_amount)}</td><td style={tdStyle}>{d.payment_mode}</td><td style={tdStyle}>{d.bill_no||'—'}</td><td style={tdStyle}>{fmt(Number(d.bill_amount)-Number(d.paid_amount))}</td></tr>)}{!deliveries.length&&<tr><td colSpan="9" style={tdStyle}>Abhi company delivery record nahi.</td></tr>}</tbody></table></div></div>
      <div style={panelCard}><h3 style={{marginTop:0}}>Company Payments History</h3>{companyPayments.map(p=><div key={p.id} style={{padding:8,borderTop:'1px solid #eee'}}>{p.payment_date} · {fmt(p.amount)} · {p.remarks||'Company bill payment'}</div>)}{!companyPayments.length&&<small>Abhi company ko payment record nahi hui.</small>}</div>
    </>}
    {tab==='monthly' && <>
      <div style={{...panelCard,display:'flex',gap:12,alignItems:'end',flexWrap:'wrap'}}><label>Month<input type="month" style={input} value={month} onChange={e=>setMonth(e.target.value)}/></label><label>Floor<select style={input} value={floor} onChange={e=>setFloor(e.target.value)}><option>Ground Floor</option><option>1st Floor</option></select></label><button style={btn} onClick={printRegister}>🖨️ Print Monthly Page</button><button style={{...btn,background:'#64748b'}} onClick={refresh}>Refresh</button></div>
      <div id="water-month-register" style={panelCard}><div className="business-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK" style={{width:95,height:58,objectFit:"contain"}}/><div><strong>NDA.PK BUSINESS SYSTEM</strong><div>Water Supply Monthly Collection · {month}</div></div></div><h2 style={{textAlign:'center',margin:'4px 0'}}>WATER SUPPLY · MONTHLY COLLECTION</h2><h3 style={{textAlign:'center',margin:'4px 0'}}>{floor} · {month}</h3><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr>{['Room No.','Customer Name','Rate','Total Bottles','Previous Balance','Current Bill','Cash Received','Total Due / Credit','Remarks','Signature'].map(x=><th style={{border:'1px solid #94a3b8',padding:7,textAlign:'left'}} key={x}>{x}</th>)}</tr></thead><tbody>{customers.filter(c=>c.floor===floor&&c.active!==false).map(c=>{const ss=floorMonthSales.filter(x=>String(x.customer_id)===String(c.id));const pp=floorMonthPayments.filter(x=>String(x.customer_id)===String(c.id));const qty=ss.reduce((a,x)=>a+Number(x.bottles||0),0);const bill=ss.reduce((a,x)=>a+Number(x.total_amount||0),0);const openingSales=sales.filter(x=>String(x.customer_id)===String(c.id)&&String(x.sale_date)<month+'-01').reduce((a,x)=>a+Number(x.total_amount||0)-Number(x.cash_received||0),0);const openingPayments=payments.filter(x=>String(x.customer_id)===String(c.id)&&String(x.payment_date)<month+'-01').reduce((a,x)=>a+Number(x.amount||0),0);const opening=Math.max(0,openingSales-openingPayments);const paid=ss.reduce((a,x)=>a+Number(x.cash_received||0),0)+pp.reduce((a,x)=>a+Number(x.amount||0),0);const due=Math.max(0,opening+bill-paid);return <tr key={c.id}><td style={{border:'1px solid #94a3b8',padding:7}}>{c.room_no}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{c.customer_name}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{Number(c.rate).toFixed(2)}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{qty}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{opening.toFixed(2)}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{bill.toFixed(2)}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{paid.toFixed(2)}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{due.toFixed(2)}</td><td style={{border:'1px solid #94a3b8',padding:7}}>{c.remarks||''}</td><td style={{border:'1px solid #94a3b8',padding:7,minWidth:65}}></td></tr>})}</tbody></table><div style={{display:'flex',justifyContent:'space-between',marginTop:28,fontSize:12}}><span>Cash Collected By: __________________</span><span>Checked By: __________________</span></div></div>
      <div style={{...panelCard,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}><div><small>Total Bill (month)</small><h3>{fmt(floorMonthSales.reduce((a,x)=>a+Number(x.total_amount||0),0))}</h3></div><div><small>Cash Received (month)</small><h3 style={{color:'#047857'}}>{fmt(floorMonthSales.reduce((a,x)=>a+Number(x.cash_received||0),0)+floorMonthPayments.reduce((a,x)=>a+Number(x.amount||0),0))}</h3></div><div><small>Credit / Balance</small><h3 style={{color:'#b91c1c'}}>{fmt(Math.max(0,floorMonthSales.reduce((a,x)=>a+Number(x.total_amount||0)-Number(x.cash_received||0),0)-floorMonthPayments.reduce((a,x)=>a+Number(x.amount||0),0)))}</h3></div></div>
      <div style={panelCard}><h3>Company Account · {month}</h3><p>Deliveries: {fmt(deliveryMonth.reduce((a,x)=>a+Number(x.bill_amount||0),0))} · Payments: {fmt(companyPaymentMonth.reduce((a,x)=>a+Number(x.amount||0),0))} · Current Outstanding: <b>{fmt(companyOutstanding)}</b></p></div>
    </>}
    {busy&&<div style={{padding:8,color:'#64748b'}}>Loading water records...</div>}
  </section>;
}

function PersonalNotebookPanel({ session, businessId, isAdmin }) {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState('');
  const [entries, setEntries] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileCurrency, setNewFileCurrency] = useState('AED');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0,10));
  const [entryType, setEntryType] = useState('income');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDetails, setEntryDetails] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const activeFile = files.find(f => String(f.id) === String(activeFileId));
  const currency = activeFile?.currency || 'AED';
  const fmt = n => `${currency} ${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  async function loadFiles(preferred) {
    if (!businessId) return;
    setLoading(true); setErrorText('');
    const query = supabase.from('business_notebook_files').select('*').order('created_at',{ascending:true});
    const {data,error} = await (isAdmin ? query : query.eq('business_id',businessId));
    if (error) { setErrorText(error.message); setLoading(false); return; }
    const rows=data||[]; setFiles(rows);
    const next=String(preferred === '' ? (rows[0]?.id || '') : (preferred||activeFileId||rows[0]?.id||'')); setActiveFileId(next);
    setLoading(false);
  }
  async function loadEntries(fileId=activeFileId) {
    if (!fileId) { setEntries([]); return; }
    const {data,error}=await supabase.from('business_notebook_entries').select('*').eq('file_id',fileId).order('entry_date',{ascending:false}).order('created_at',{ascending:false});
    if(error){setErrorText(error.message);return;} setEntries(data||[]);
  }
  useEffect(()=>{ if(isAdmin || businessId) void loadFiles(); },[businessId,isAdmin]);
  useEffect(()=>{ if(activeFileId) void loadEntries(activeFileId); else setEntries([]); },[activeFileId]);

  async function createFile(e) {
    e.preventDefault(); if(!isAdmin) return;
    if(!newFileName.trim()) return alert('File ka naam likhein.');
    const {data,error}=await supabase.from('business_notebook_files').insert([{business_id:Number(businessId),file_name:newFileName.trim(),currency:newFileCurrency,owner_email:session?.user?.email||'',created_by:session?.user?.email||''}]).select('*').single();
    if(error) return alert('Notebook file save nahi hui: '+error.message);
    setNewFileName(''); await loadFiles(data.id); setActiveFileId(String(data.id));
  }
  async function addEntry(e) {
    e.preventDefault(); if(!isAdmin) return;
    const value=Number(entryAmount); if(!activeFileId||!entryDate||!Number.isFinite(value)||value<=0||!entryDetails.trim()) return alert('Date, details aur valid amount enter karein.');
    const {error}=await supabase.from('business_notebook_entries').insert([{file_id:Number(activeFileId),business_id:Number(activeFile.business_id),entry_date:entryDate,entry_type:entryType,amount:value,details:entryDetails.trim(),notes:entryNotes.trim(),created_by:session?.user?.email||''}]);
    if(error) return alert('Entry save nahi hui: '+error.message);
    setEntryAmount('');setEntryDetails('');setEntryNotes('');await loadEntries();
  }
  async function editEntry(row) {
    if(!isAdmin) return;
    const d=window.prompt('Date (YYYY-MM-DD)',row.entry_date); if(d===null)return;
    const details=window.prompt('Details',row.details||''); if(details===null)return;
    const amount=Number(window.prompt('Amount',String(row.amount))); if(!Number.isFinite(amount)||amount<=0)return alert('Valid amount enter karein.');
    const notes=window.prompt('Remarks / Notes',row.notes||''); if(notes===null)return;
    const {error}=await supabase.from('business_notebook_entries').update({entry_date:d,details,amount,notes}).eq('id',row.id).eq('file_id',Number(activeFileId));
    if(error)return alert(error.message); await loadEntries();
  }
  async function deleteEntry(row) {
    if(!isAdmin||!window.confirm('Is notebook entry ko permanently delete karna hai?'))return;
    const {error}=await supabase.from('business_notebook_entries').delete().eq('id',row.id).eq('file_id',Number(activeFileId));
    if(error)return alert(error.message); await loadEntries();
  }
  async function deleteFile() {
    if(!isAdmin||!activeFile)return;
    if(!window.confirm(`"${activeFile.file_name}" aur iski tamam entries permanently delete karni hain?`))return;
    const {error}=await supabase.from('business_notebook_files').delete().eq('id',Number(activeFileId)).eq('business_id',Number(activeFile.business_id));
    if(error)return alert(error.message); setActiveFileId(''); await loadFiles('');
  }
  const received=entries.filter(x=>x.entry_type==='income').reduce((a,x)=>a+Number(x.amount||0),0);
  const spent=entries.filter(x=>x.entry_type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
  const balance=received-spent;
  const panel={background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:14,marginBottom:12};
  const input={width:'100%',boxSizing:'border-box',padding:10,border:'1px solid #cbd5e1',borderRadius:8};
  return <section style={{background:'#f8fafc',borderRadius:14,padding:14}}>
    <div style={{...panel,background:'#eff6ff'}}><h2 style={{margin:'0 0 4px'}}>📒 Naveed Docs / Hisab Kitab</h2><div style={{fontSize:13,color:'#475569'}}>Engineer Account, Udhaar, Ghar ke Akhrajat aur apni zaroorat ke mutabiq unlimited files.</div></div>
    {errorText&&<div style={{...panel,color:'#991b1b'}}>Database error: {errorText}. Notebook SQL setup run karein.</div>}
    {isAdmin&&<form onSubmit={createFile} style={{...panel,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}><input style={input} value={newFileName} onChange={e=>setNewFileName(e.target.value)} placeholder="New file name (e.g. Engineer Account)" required/><select style={input} value={newFileCurrency} onChange={e=>setNewFileCurrency(e.target.value)}><option value="AED">AED</option><option value="PKR">PKR</option></select><button style={{...primaryStyle,background:'#1d4ed8'}}>＋ Create Notebook File</button></form>}
    <div style={{...panel,display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}}><label style={{flex:'1 1 220px'}}>Open Notebook File<select style={{...input,marginTop:5}} value={activeFileId} onChange={e=>setActiveFileId(e.target.value)}><option value="">Select file</option>{files.map(f=><option key={f.id} value={f.id}>{f.file_name} ({f.currency})</option>)}</select></label>{activeFile&&isAdmin&&<button onClick={deleteFile} style={{...primaryStyle,width:'auto',background:'#b91c1c'}}>Delete File</button>}</div>
    {activeFile&&<>
      <div style={{...panel,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}><div><small>Received Amount</small><h2 style={{margin:'5px 0',color:'#047857'}}>{fmt(received)}</h2></div><div><small>Total Expenses</small><h2 style={{margin:'5px 0',color:'#b91c1c'}}>{fmt(spent)}</h2></div><div><small>Remaining Balance</small><h2 style={{margin:'5px 0',color:balance<0?'#b91c1c':'#1d4ed8'}}>{fmt(balance)}</h2></div></div>
      {isAdmin&&<form onSubmit={addEntry} style={panel}><h3 style={{marginTop:0}}>＋ New Amount / Expense</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10}}><label>Date<input type="date" style={input} value={entryDate} onChange={e=>setEntryDate(e.target.value)} required/></label><label>Entry Type<select style={input} value={entryType} onChange={e=>setEntryType(e.target.value)}><option value="income">Received / Income (+)</option><option value="expense">Expense (-)</option></select></label><label>Amount<input type="number" min="0.01" step="0.01" style={input} value={entryAmount} onChange={e=>setEntryAmount(e.target.value)} required/></label><label>Details<input style={input} value={entryDetails} onChange={e=>setEntryDetails(e.target.value)} placeholder="Material bill / payment received" required/></label><label>Remarks<input style={input} value={entryNotes} onChange={e=>setEntryNotes(e.target.value)} placeholder="Optional notes"/></label></div><button style={{...primaryStyle,marginTop:10}}>Save Entry</button></form>}
      <div style={panel}><h3 style={{marginTop:0}}>{activeFile.file_name} · Entry History</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Date','Details','Income (+)','Expense (-)','Balance','Remarks',...(isAdmin?['Actions']:[])].map(h=><th key={h} style={{padding:8,borderBottom:'1px solid #cbd5e1',textAlign:'left'}}>{h}</th>)}</tr></thead><tbody>{[...entries].reverse().map((r,i)=>{const running=[...entries].reverse().slice(0,i+1).reduce((a,x)=>a+(x.entry_type==='income'?1:-1)*Number(x.amount||0),0);return <tr key={r.id}><td style={{padding:8,borderBottom:'1px solid #eee'}}>{r.entry_date}</td><td style={{padding:8,borderBottom:'1px solid #eee'}}>{r.details}</td><td style={{padding:8,color:'#047857'}}>{r.entry_type==='income'?fmt(r.amount):'—'}</td><td style={{padding:8,color:'#b91c1c'}}>{r.entry_type==='expense'?fmt(r.amount):'—'}</td><td style={{padding:8,fontWeight:700}}>{fmt(running)}</td><td style={{padding:8}}>{r.notes||'—'}</td>{isAdmin&&<td style={{padding:8,whiteSpace:'nowrap'}}><button onClick={()=>editEntry(r)} style={{marginRight:5}}>Edit</button><button onClick={()=>deleteEntry(r)} style={{color:'#b91c1c'}}>Delete</button></td>}</tr>})}{!entries.length&&<tr><td colSpan={isAdmin?7:6} style={{padding:12}}>Is file mein abhi koi entry nahi.</td></tr>}</tbody></table></div></div>
    </>}
    {!files.length&&!loading&&!errorText&&<div style={panel}>Abhi koi notebook file nahi bani. Upar se pehli file create karein.</div>}
    {loading&&<div>Loading notebook...</div>}
  </section>;
}

function BusinessWorkspace({ session, userRole, onLogout, onSwitchSystem }) {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState(() => { try { return localStorage.getItem('nda_business_selected_id') || sessionStorage.getItem('nda_business_selected_id') || ''; } catch { return ''; } });
  const [activeVehicleId, setActiveVehicleId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [people, setPeople] = useState([]);
  const [entries, setEntries] = useState([]);
  const [accessRows, setAccessRows] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem('nda_business_last_view') || sessionStorage.getItem('nda_business_last_view') || 'dashboard'; } catch { return 'dashboard'; } });
  const [workspaceSection, setWorkspaceSection] = useState(() => { try { return localStorage.getItem('nda_business_last_section') || sessionStorage.getItem('nda_business_last_section') || 'dashboard'; } catch { return 'dashboard'; } });
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cleanupMonth, setCleanupMonth] = useState(() => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [cleanupPreview, setCleanupPreview] = useState(null);

  // New Business Form
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessKind, setNewBusinessKind] = useState('transport');

  // New Vehicle File Form
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');

  // Staff / Driver Profile Form
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('Driver');
  const [personPhone, setPersonPhone] = useState('');
  const [payType, setPayType] = useState('fixed');
  const [payAmount, setPayAmount] = useState('');
  const [profitPercent, setProfitPercent] = useState('30');

  // Daily Entry Form
  const [entryKind, setEntryKind] = useState('income');
  const [category, setCategory] = useState('Daily Trip / Income');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [editingDailyEntry, setEditingDailyEntry] = useState(null);

  // Staff Login & Permissions Form
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessBusinessId, setAccessBusinessId] = useState('');
  const [accessFilterBusinessId, setAccessFilterBusinessId] = useState('');
  const [accessSelectedKind, setAccessSelectedKind] = useState('');
  const [accessFlags, setAccessFlags] = useState({
    can_view: true,
    can_view_daily: true,
    can_add: true,
    can_edit: false,
    can_delete: false,
    can_view_vehicles: true,
    can_manage_vehicles: false,
    can_view_workers: false,
    can_manage_workers: false,
    can_view_monthly: false,
    can_manage_access: false
  });
  const [editingAccessRow, setEditingAccessRow] = useState(null);
  const [currency, setCurrency] = useState('AED');

  const admin = !!userRole?.is_admin;
  const can = (key) => admin || !!access?.[key];
  const isWaterBusinessRecord = (b) => !!b && (String(b.business_kind || '').toLowerCase() === 'water' || /water|drinking|pani/i.test(String(b.name || '')));
  const isTransportBusinessRecord = (b) => !!b && (String(b.business_kind || '').toLowerCase() === 'transport' || /transport|vehicle|truck/i.test(String(b.name || '')));
  const currentBusiness = businesses.find(b => String(b.id) === String(businessId));
  // Business identity, not the permission checkbox combination, decides which system a staff login can see.
  const waterOnlyStaff = !admin && (isWaterBusinessRecord(currentBusiness) || (!currentBusiness && isWaterBusinessRecord(access?.business_profiles)));
  const transportOnlyStaff = !admin && (isTransportBusinessRecord(currentBusiness) || (!currentBusiness && isTransportBusinessRecord(access?.business_profiles)));
  const isTransportBusiness = !isWaterBusinessRecord(currentBusiness);
  const money = n => `${currency} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#fff',
    color: '#0f172a',
    fontSize: 15
  };
  const btn = {
    padding: '12px 16px',
    border: 0,
    borderRadius: 10,
    background: '#047857',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  };
  const card = {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 4px 18px #0f172a0d',
    border: '1px solid #e2e8f0',
    minWidth: 0
  };

  const quickIncomeCategories = isTransportBusiness
    ? ['Daily Trip / Income', 'Contract / Monthly Rent', 'Extra Trip', 'Other Income']
    : ['Daily Sales / Income', 'Client Payment', 'Service Fee', 'Other Income'];

  const quickExpenseCategories = isTransportBusiness
    ? ['Fuel', 'Maintenance', 'Other Expense']
    : ['Stock / Material', 'Shop Rent / Bills', 'Staff Expense', 'Maintenance / Repair', 'Transport / Delivery', 'Other Expense'];

  function resolveFirstAllowedView(accRow, isAdminUser) {
    if (isAdminUser) return 'daily';
    if (!accRow) return 'daily';
    const onlyWater = accRow.can_view && !accRow.can_view_daily && !accRow.can_edit && !accRow.can_delete && !accRow.can_view_vehicles && !accRow.can_manage_vehicles && !accRow.can_view_workers && !accRow.can_manage_workers && !accRow.can_view_monthly && !accRow.can_manage_access;
    if (onlyWater) return 'water';
    if (accRow.can_view_daily || accRow.can_add || accRow.can_edit || accRow.can_delete) return 'daily';
    if (accRow.can_view_vehicles || accRow.can_manage_vehicles) return 'vehicles';
    if (accRow.can_view_monthly) return 'monthly';
    if (accRow.can_view_workers || accRow.can_manage_workers) return 'workers';
    if (accRow.can_manage_access) return 'access';
    if (accRow.can_view) return 'water';
    return 'daily';
  }

  async function loadBusinesses(preferredId) {
    setLoading(true);
    try {
      if (admin) {
        const { data, error } = await supabase.from('business_profiles').select('*').order('name');
        if (error) throw error;
        const rows = data || [];
        setBusinesses(rows);
        if (!accessFilterBusinessId) setAccessFilterBusinessId(String(businessId || rows[0]?.id || ''));
        const requestedId = preferredId === '' ? '' : (preferredId || businessId || '');
        const next = String(rows.some(r => String(r.id) === String(requestedId)) ? requestedId : (rows[0]?.id || ''));
        setBusinessId(next);
        if (next) {
          setAccess({
            can_view: true, can_view_daily: true, can_add: true, can_edit: true, can_delete: true,
            can_view_vehicles: true, can_manage_vehicles: true, can_view_workers: true,
            can_manage_workers: true, can_view_monthly: true, can_manage_access: true
          });
        }
        const { data: ar, error: ae } = await supabase.from('business_access').select('*,business_profiles(name)').order('user_email');
        if (!ae) setAccessRows(ar || []);
      } else {
        const { data: ar, error: ae } = await supabase
          .from('business_access')
          .select('*,business_profiles(*)')
          .ilike('user_email', session?.user?.email || '')
          .eq('active', true)
          .eq('can_view', true);
        if (ae) throw ae;
        const allRows = ar || [];
        const waterBusinessRows = allRows.filter(r => isWaterBusinessRecord(r.business_profiles));
        const transportBusinessRows = allRows.filter(r => isTransportBusinessRecord(r.business_profiles));
        const isLegacyWaterPermissionRow = r => r.can_view && !r.can_view_daily && !r.can_edit && !r.can_delete && !r.can_view_vehicles && !r.can_manage_vehicles && !r.can_view_workers && !r.can_manage_workers && !r.can_view_monthly && !r.can_manage_access;
        // First trust the assigned business record. Permissions alone are not reliable because Water staff may also have daily/add/edit flags enabled.
        const rows = waterBusinessRows.length ? waterBusinessRows : transportBusinessRows.length ? transportBusinessRows : (allRows.some(isLegacyWaterPermissionRow) ? allRows.filter(isLegacyWaterPermissionRow) : allRows);
        setAccessRows(rows);
        setBusinesses(rows.map(r => r.business_profiles).filter(Boolean));
        const requestedId = preferredId || businessId || '';
        const next = String(rows.some(r => String(r.business_id) === String(requestedId)) ? requestedId : (rows[0]?.business_id || ''));
        setBusinessId(next);
        const row = rows.find(r => String(r.business_id) === next) || rows[0] || null;
        setAccess(row);
        if (row) {
          const assignedWater = isWaterBusinessRecord(row.business_profiles);
          const firstView = assignedWater ? 'water' : resolveFirstAllowedView(row, false);
          setView(firstView);
          setWorkspaceSection(assignedWater || firstView === 'water' ? 'water' : firstView === 'access' ? 'access' : 'transport');
        }
      }
    } catch (e) {
      alert('Failed to load business list: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinessData(id = businessId, options = {}) {
    if (!id) return;
    if (waterOnlyStaff) { setVehicles([]); setPeople([]); setEntries([]); return; }
    const silent = !!options.silent;
    if (!silent) setLoading(true);
    try {
      // Always fetch current rows from Supabase; staff devices must not rely on an old in-memory list.
      const [v, p, e] = await Promise.all([
        supabase.from('business_vehicles').select('*').eq('business_id', id).eq('active', true).order('plate_number'),
        supabase.from('business_people').select('*').eq('business_id', id).eq('active', true).order('person_name'),
        supabase.from('business_entries').select('*').eq('business_id', id).order('entry_date', { ascending: false }).order('created_at', { ascending: false })
      ]);
      const loadError = v.error || p.error || e.error;
      if (loadError) throw loadError;
      setVehicles(v.data || []);
      setPeople(p.data || []);
      setEntries(e.data || []);
      if ((v.data || []).length === 1) setVehicleId(String(v.data[0].id));
    } catch (e) {
      if (silent) console.warn('Background business data refresh failed:', e?.message || e);
      else alert('Failed to load business details: ' + (e?.message || e));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { loadBusinesses(businessId); }, [session?.user?.email, admin]);
  useEffect(() => {
    try {
      if (businessId) {
        localStorage.setItem('nda_business_selected_id', String(businessId));
        sessionStorage.setItem('nda_business_selected_id', String(businessId));
      } else {
        localStorage.removeItem('nda_business_selected_id');
        sessionStorage.removeItem('nda_business_selected_id');
      }
      localStorage.setItem('nda_business_last_view', view || 'dashboard');
      localStorage.setItem('nda_business_last_section', workspaceSection || 'dashboard');
      sessionStorage.setItem('nda_business_last_view', view || 'dashboard');
      sessionStorage.setItem('nda_business_last_section', workspaceSection || 'dashboard');
    } catch (e) { console.warn('Business workspace state could not be saved:', e); }
  }, [businessId, view, workspaceSection]);
  useEffect(() => { if (businessId) loadBusinessData(businessId); else { setVehicles([]); setPeople([]); setEntries([]); } }, [businessId]);

  // Staff mobiles automatically re-fetch shared Business records so Admin changes appear without logout.
  useEffect(() => {
    if (admin || !businessId || waterOnlyStaff) return;
    const refreshStaffData = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        // Re-check access on staff devices too, so a removed login cannot keep using an old session.
        const { data: assignments, error: accessCheckError } = await supabase
          .from('business_access')
          .select('business_id')
          .ilike('user_email', session?.user?.email || '')
          .eq('active', true)
          .eq('can_view', true);
        if (!accessCheckError) {
          if (!assignments?.length) {
            alert('Aapka Business access Admin ne remove kar diya hai.');
            onLogout?.();
            return;
          }
          if (!assignments.some(a => String(a.business_id) === String(businessId))) {
            await loadBusinesses();
            return;
          }
        }
      } catch (accessRefreshError) {
        console.warn('Staff access refresh failed:', accessRefreshError?.message || accessRefreshError);
      }
      void loadBusinessData(businessId, { silent: true });
    };
    const timer = window.setInterval(refreshStaffData, 12000);
    window.addEventListener('focus', refreshStaffData);
    document.addEventListener('visibilitychange', refreshStaffData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshStaffData);
      document.removeEventListener('visibilitychange', refreshStaffData);
    };
  }, [businessId, admin, waterOnlyStaff]);

  async function addBusiness(e) {
    e.preventDefault();
    if (!admin) return;
    const name = newBusinessName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from('business_profiles')
      .insert([{ name, business_kind: newBusinessKind, active: true, created_by: session?.user?.email || '' }])
      .select('*')
      .single();
    if (error) return alert('Could not create business: ' + error.message);
    setNewBusinessName('');
    await loadBusinesses(data.id);
    setBusinessId(String(data.id));
    alert('New business created successfully.');
  }

  async function deleteBusinessRecord(b) {
    if (!admin || !b) return;
    const checks = await Promise.all([
      supabase.from('business_vehicles').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('business_people').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('business_entries').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('water_customers').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('water_sales').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('water_payments').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('business_access').select('id',{count:'exact',head:true}).eq('business_id',b.id),
      supabase.from('business_notebook_files').select('id',{count:'exact',head:true}).eq('business_id',b.id)
    ]);
    const count=checks.reduce((n,r)=>n+Number(r.count||0),0);
    if(checks.some(r=>r.error)) return alert('Business records check nahi ho saka. Delete nahi kiya gaya. '+checks.find(r=>r.error)?.error?.message);
    if(count>0) {
      if(!window.confirm(`"${b.name}" ke saath ${count} related record(s) mojood hain. Data delete nahi hoga. Business ko sirf inactive kiya jayega aur list se hide ho jayega. Continue?`)) return;
      const {error}=await supabase.from('business_profiles').update({active:false}).eq('id',b.id);
      if(error)return alert('Business inactive nahi hua: '+error.message);
      if(String(businessId)===String(b.id)){setBusinessId('');setVehicles([]);setPeople([]);setEntries([]);}
      await loadBusinesses('');
      alert('Business inactive kar diya gaya. Purana data safe hai.');
    } else {
      if(!window.confirm(`"${b.name}" ka koi linked business data nahi mila. Kya aap is business ko permanently delete karna chahte hain?`)) return;
      const {error}=await supabase.from('business_profiles').delete().eq('id',b.id);
      if(error)return alert('Business delete nahi hua: '+error.message);
      if(String(businessId)===String(b.id))setBusinessId('');
      await loadBusinesses(''); alert('Business permanently delete ho gaya.');
    }
  }

  async function deleteVehicleFile(v) {
    if(!admin||!v)return;
    const {count,error:countError}=await supabase.from('business_entries').select('id',{count:'exact',head:true}).eq('business_id',Number(businessId)).eq('vehicle_id',v.id);
    if(countError)return alert('Vehicle records check nahi ho sake. Delete nahi kiya gaya: '+countError.message);
    if(Number(count||0)>0){
      if(!window.confirm(`${v.plate_number} ke ${count} purane entry record(s) mojood hain. Purana data safe rakhne ke liye vehicle ko sirf inactive karna hai. Continue?`))return;
      const {error}=await supabase.from('business_vehicles').update({active:false}).eq('id',v.id).eq('business_id',Number(businessId));
      if(error)return alert(error.message); alert('Vehicle inactive ho gaya; purani entries safe hain.');
    } else {
      if(!window.confirm(`${v.plate_number} ko permanently delete karna hai?`))return;
      const {error}=await supabase.from('business_vehicles').delete().eq('id',v.id).eq('business_id',Number(businessId));
      if(error)return alert('Vehicle delete nahi hua: '+error.message); alert('Vehicle file delete ho gayi.');
    }
    if(String(activeVehicleId)===String(v.id)){setActiveVehicleId('');setVehicleId('');}
    await loadBusinessData();
  }

  async function previewMonthCleanup() {
    if(!admin||!cleanupMonth)return;
    const now=new Date(); const maxMonth=new Date(Date.UTC(now.getFullYear(),now.getMonth()-1,1)).toISOString().slice(0,7);
    if(cleanupMonth>maxMonth)return alert('Sirf previous ya us se purana month select kar sakte hain.');
    const start=cleanupMonth+'-01'; const [y,m]=cleanupMonth.split('-').map(Number); const end=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
    const queries=await Promise.all([
      supabase.from('business_entries').select('id,amount,entry_kind').eq('business_id',Number(businessId)).gte('entry_date',start).lt('entry_date',end),
      supabase.from('water_sales').select('id,total_amount,cash_received').eq('business_id',Number(businessId)).gte('sale_date',start).lt('sale_date',end),
      supabase.from('water_payments').select('id,amount').eq('business_id',Number(businessId)).gte('payment_date',start).lt('payment_date',end)
    ]);
    const failed=queries.find(x=>x.error); if(failed)return alert('Month preview load nahi hua: '+failed.error.message);
    setCleanupPreview({month:cleanupMonth,entries:queries[0].data||[],sales:queries[1].data||[],payments:queries[2].data||[]});
  }
  async function deleteMonthData() {
    if(!admin||!cleanupPreview||cleanupPreview.month!==cleanupMonth)return;
    const total=cleanupPreview.entries.length+cleanupPreview.sales.length+cleanupPreview.payments.length;
    if(!total)return alert('Is month mein delete karne ke liye koi record nahi mila.');
    if(!window.confirm(`${cleanupMonth} ke ${total} Business records permanently delete honge: daily entries ${cleanupPreview.entries.length}, water sales ${cleanupPreview.sales.length}, water payments ${cleanupPreview.payments.length}. Customers, notebook files aur HR data delete nahi hoga. Kya aap sure hain?`))return;
    const [y,m]=cleanupMonth.split('-').map(Number); const start=cleanupMonth+'-01'; const end=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
    const ops=await Promise.all([
      supabase.from('business_entries').delete().eq('business_id',Number(businessId)).gte('entry_date',start).lt('entry_date',end),
      supabase.from('water_sales').delete().eq('business_id',Number(businessId)).gte('sale_date',start).lt('sale_date',end),
      supabase.from('water_payments').delete().eq('business_id',Number(businessId)).gte('payment_date',start).lt('payment_date',end)
    ]);
    const failed=ops.find(x=>x.error); if(failed)return alert('Kuch records delete nahi ho sake: '+failed.error.message);
    setCleanupPreview(null); await loadBusinessData(); alert(`${cleanupMonth} ka selected Business data delete ho gaya. HR System untouched hai.`);
  }

  async function addVehicle(e) {
    e.preventDefault();
    if (!can('can_manage_vehicles')) return alert('You do not have permission to add vehicles.');
    if (!vehiclePlate.trim()) return alert('Please enter the vehicle plate number.');
    const { error } = await supabase.from('business_vehicles').insert([{
      business_id: Number(businessId),
      plate_number: vehiclePlate.trim().toUpperCase(),
      vehicle_name: vehicleName.trim(),
      notes: vehicleNotes.trim(),
      active: true
    }]);
    if (error) return alert('Could not save vehicle file: ' + error.message);
    setVehiclePlate('');
    setVehicleName('');
    setVehicleNotes('');
    await loadBusinessData();
    alert('Vehicle file created successfully.');
  }

  async function addPerson(e) {
    e.preventDefault();
    if (!can('can_manage_workers')) return alert('You do not have permission to add drivers/staff.');
    if (!personName.trim()) return alert('Please enter driver or staff name.');
    const payload = {
      business_id: Number(businessId),
      person_name: personName.trim(),
      job_title: personRole.trim() || 'Driver',
      phone: personPhone.trim(),
      pay_type: payType,
      monthly_salary: payType === 'fixed' ? (Number(payAmount) || 0) : 0,
      profit_percent: payType === 'profit_percent' ? (Number(profitPercent) || 0) : 0,
      active: true
    };
    if (payload.profit_percent < 0 || payload.profit_percent > 100) {
      return alert('Profit percentage must be between 0 and 100.');
    }
    const existingPercent = people.filter(p => p.pay_type === 'profit_percent').reduce((n, p) => n + Number(p.profit_percent || 0), 0);
    if (payload.pay_type === 'profit_percent' && existingPercent + payload.profit_percent > 100) {
      return alert('Combined profit share of all drivers cannot exceed 100%.');
    }
    const { error } = await supabase.from('business_people').insert([payload]);
    if (error) return alert('Could not save driver/staff: ' + error.message);
    setPersonName('');
    setPersonPhone('');
    setPayAmount('');
    await loadBusinessData();
    alert('Driver / Staff added successfully.');
  }

  async function addEntry(e) {
    e.preventDefault();
    if (!can('can_add')) return alert('You do not have permission to add entries.');
    const val = Number(amount);
    if (!entryDate || !Number.isFinite(val) || val <= 0) return alert('Please enter a valid date and amount.');
    if (isTransportBusiness && !vehicleId) {
      return alert('Please select a vehicle first (or ask Admin to add the vehicle in Vehicle Files).');
    }
    const isMaintenanceEntry = /maintenance|garage|repair|workshop/i.test(`${category} ${description} ${remarks}`);
    if (entryKind === 'income' && isMaintenanceEntry) {
      return alert('Do not enter Income on a Maintenance / Garage day. Save only Expense entries.');
    }
    if (entryKind === 'income' && entries.some(r =>
      r.entry_date === entryDate &&
      String(r.vehicle_id || '') === String(vehicleId || '') &&
      r.entry_kind === 'expense' &&
      /maintenance|garage|repair|workshop/i.test(`${r.category || ''} ${r.description || ''} ${r.remarks || ''}`)
    )) {
      return alert('Maintenance expense is already recorded for this vehicle today. Keep income zero on garage days.');
    }
    if (entryKind === 'expense' && isMaintenanceEntry && entries.some(r =>
      r.entry_date === entryDate &&
      String(r.vehicle_id || '') === String(vehicleId || '') &&
      r.entry_kind === 'income'
    )) {
      return alert('Income is already saved for this vehicle today. Delete/edit the income entry first if today is a garage/maintenance day.');
    }

    let billUrl = '';
    if (billFile) {
      const safeName = `${businessId}/${entryDate}/${Date.now()}-${billFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('business-bills').upload(safeName, billFile, { upsert: false });
      if (upErr) return alert('Bill upload failed: ' + upErr.message);
      const { data } = supabase.storage.from('business-bills').getPublicUrl(safeName);
      billUrl = data?.publicUrl || '';
    }

    const payload = {
      business_id: Number(businessId),
      entry_date: entryDate,
      entry_kind: entryKind,
      category: category.trim() || 'General',
      amount: val,
      payment_mode: paymentMode,
      vehicle_id: vehicleId ? Number(vehicleId) : null,
      driver_id: driverId ? Number(driverId) : null,
      description: description.trim() || category.trim(),
      remarks: remarks.trim(),
      bill_url: billUrl,
      created_by: session?.user?.email || ''
    };
    const { error } = await supabase.from('business_entries').insert([payload]);
    if (error) return alert('Could not save daily entry: ' + error.message);

    setAmount('');
    setDescription('');
    setRemarks('');
    setBillFile(null);
    await loadBusinessData();
    alert('Saved! Daily record updated.');
  }

  async function deleteEntry(row) {
    if (!admin) return alert('Daily entry sirf Admin delete kar sakta hai.');
    if (!window.confirm('Delete this entry permanently?')) return;
    const { error } = await supabase.from('business_entries').delete().eq('id', row.id).eq('business_id', Number(businessId));
    if (error) return alert(error.message);
    await loadBusinessData();
  }

  function editEntry(row) {
    if (!admin) return alert('Daily entry sirf Admin edit kar sakta hai.');
    setEditingDailyEntry({ ...row, entry_date: row.entry_date || entryDate, amount: String(row.amount || ''), vehicle_id: String(row.vehicle_id || ''), driver_id: String(row.driver_id || ''), category: row.category || 'General', payment_mode: row.payment_mode || 'Cash', description: row.description || '', remarks: row.remarks || '' });
  }
  async function saveDailyEntryEdit() {
    if (!admin || !editingDailyEntry) return;
    const r = editingDailyEntry, value = Number(r.amount);
    if (!r.entry_date || !String(r.category || '').trim() || !Number.isFinite(value) || value <= 0) return alert('Date, category aur amount sahi enter karein.');
    if (isTransportBusiness && !r.vehicle_id) return alert('Please select a vehicle.');
    const isMaintenanceEntry = /maintenance|garage|repair|workshop/i.test(`${r.category} ${r.description} ${r.remarks}`);
    if (r.entry_kind === 'income' && isMaintenanceEntry) return alert('Maintenance / Garage day par Income entry nahi ho sakti.');
    const { error } = await supabase.from('business_entries').update({ entry_date:r.entry_date, entry_kind:r.entry_kind, category:String(r.category).trim(), amount:value, payment_mode:r.payment_mode, vehicle_id:r.vehicle_id?Number(r.vehicle_id):null, driver_id:r.driver_id?Number(r.driver_id):null, description:String(r.description||'').trim(), remarks:String(r.remarks||'').trim() }).eq('id',r.id).eq('business_id',Number(businessId));
    if (error) return alert('Could not update entry: ' + error.message);
    setEntryDate(r.entry_date); setEditingDailyEntry(null); await loadBusinessData();
  }

  async function saveAccess(e) {
    e.preventDefault();
    if (!can('can_manage_access')) return alert('Only Admin or authorized manager can manage staff logins.');
    const email = accessEmail.trim().toLowerCase();
    const password = accessPassword;
    if (!email || !accessBusinessId) return alert('Please enter Staff Login ID (Email) and select a Business.');
    if (password && password.length < 6) return alert('Password must be at least 6 characters.');
    if (!editingAccessRow && !password) return alert('Please create a password for the new staff account.');
    const { data, error } = await supabase.functions.invoke('manage-business-staff', {
      body: {
        action: 'save',
        oldEmail: editingAccessRow?.user_email || null,
        email,
        password: password || null,
        businessId: Number(accessBusinessId),
        permissions: accessFlags
      }
    });
    if (error || data?.error) return alert('Could not save staff account: ' + (data?.error || error?.message || 'Unknown error'));
    setAccessEmail('');
    setAccessPassword('');
    setEditingAccessRow(null);
    setAccessFlags({
      can_view: true, can_view_daily: true, can_add: true, can_edit: false, can_delete: false,
      can_view_vehicles: true, can_manage_vehicles: false, can_view_workers: false,
      can_manage_workers: false, can_view_monthly: false, can_manage_access: false
    });
    await loadBusinesses(businessId);
    alert(data?.message || 'Staff ID, password and permissions saved.');
  }

  function startEditAccess(row) {
    setEditingAccessRow(row);
    setAccessEmail(row.user_email || '');
    setAccessPassword('');
    setAccessBusinessId(String(row.business_id));
    setAccessFilterBusinessId(String(row.business_id));
    const editBusiness = businesses.find(b => String(b.id) === String(row.business_id));
    setAccessSelectedKind(editBusiness && (editBusiness.business_kind === 'water' || /water|drinking|pani/i.test(editBusiness.name || '')) ? 'water' : 'transport');
    setAccessFlags({
      can_view: !!row.can_view,
      can_view_daily: !!row.can_view_daily,
      can_add: !!row.can_add,
      can_edit: !!row.can_edit,
      can_delete: !!row.can_delete,
      can_view_vehicles: !!row.can_view_vehicles,
      can_manage_vehicles: !!row.can_manage_vehicles,
      can_view_workers: !!row.can_view_workers,
      can_manage_workers: !!row.can_manage_workers,
      can_view_monthly: !!row.can_view_monthly,
      can_manage_access: !!row.can_manage_access
    });
  }

  function cancelEditAccess() {
    setEditingAccessRow(null);
    setAccessEmail('');
    setAccessPassword('');
    setAccessFlags({
      can_view: true, can_view_daily: true, can_add: true, can_edit: false, can_delete: false,
      can_view_vehicles: true, can_manage_vehicles: false, can_view_workers: false,
      can_manage_workers: false, can_view_monthly: false, can_manage_access: false
    });
  }

  async function deleteAccessStaff(row) {
    if (!can('can_manage_access')) return alert('Only Admin can delete staff access.');
    const email = String(row.user_email || '').trim().toLowerCase();
    if (!email) return alert('Staff email/login ID nahi mila.');
    const ok = window.confirm(`${email} ko tamam Business staff permissions se permanently remove karna hai? Is ke baad staff Business system access nahi kar sakega.`);
    if (!ok) return;

    // The Edge Function is responsible for deleting the Supabase Auth user (service-role action).
    const edge = await supabase.functions.invoke('manage-business-staff', { body: { action: 'delete', email } });

    // Also physically remove every access row, including inactive/duplicate assignments.
    // This guarantees the staff member cannot regain Business access from a stale assignment.
    const { data: removedRows, error: accessDeleteError } = await supabase
      .from('business_access')
      .delete()
      .ilike('user_email', email)
      .select('id');

    if (editingAccessRow?.user_email?.toLowerCase() === email) cancelEditAccess();
    await loadBusinesses(businessId);

    if (accessDeleteError) {
      const edgeMessage = edge.error?.message || edge.data?.error || 'Edge Function failed';
      return alert(`Staff access database se remove nahi ho saka.\nEdge Function: ${edgeMessage}\nDatabase: ${accessDeleteError.message}\nSupabase Edge Function/RLS policy ko check karna hoga.`);
    }

    const edgeFailed = !!(edge.error || edge.data?.error);
    if (edgeFailed) {
      return alert(`Business access permanently revoke kar diya gaya (${(removedRows || []).length} assignment(s) removed). Lekin Supabase Auth login account delete nahi ho saka. Edge Function error: ${edge.data?.error || edge.error?.message || 'Unknown error'}. User Business system mein dobara access nahi le sakta jab tak Admin nayi permission na de.`);
    }
    alert(edge.data?.message || `Staff login aur Business access permanently remove ho gaya. (${(removedRows || []).length} assignment(s) removed)`);
  }

  function selectAccessBusiness(found, kind) {
    if (!found) return;
    setAccessBusinessId(String(found.id));
    setAccessFilterBusinessId(String(found.id));
    setAccessSelectedKind(kind);
    if (editingAccessRow && String(editingAccessRow.business_id) !== String(found.id)) cancelEditAccess();
    setAccessFlags(kind === 'water' ? {
      can_view:true, can_view_daily:true, can_add:true, can_edit:false, can_delete:false,
      can_view_vehicles:false, can_manage_vehicles:false, can_view_workers:false,
      can_manage_workers:false, can_view_monthly:true, can_manage_access:false
    } : {
      can_view:true, can_view_daily:true, can_add:true, can_edit:false, can_delete:false,
      can_view_vehicles:true, can_manage_vehicles:false, can_view_workers:false,
      can_manage_workers:false, can_view_monthly:false, can_manage_access:false
    });
  }

  function applyStaffPreset(preset) {
    if (preset === 'driver_entry') {
      setAccessFlags({
        can_view: true, can_view_daily: true, can_add: true, can_edit: false, can_delete: false,
        can_view_vehicles: true, can_manage_vehicles: false, can_view_workers: false,
        can_manage_workers: false, can_view_monthly: false, can_manage_access: false
      });
    } else if (preset === 'supervisor') {
      setAccessFlags({
        can_view: true, can_view_daily: true, can_add: true, can_edit: true, can_delete: false,
        can_view_vehicles: true, can_manage_vehicles: true, can_view_workers: true,
        can_manage_workers: false, can_view_monthly: true, can_manage_access: false
      });
    } else if (preset === 'view_only') {
      setAccessFlags({
        can_view: true, can_view_daily: true, can_add: false, can_edit: false, can_delete: false,
        can_view_vehicles: true, can_manage_vehicles: false, can_view_workers: false,
        can_manage_workers: false, can_view_monthly: true, can_manage_access: false
      });
    } else if (preset === 'water_only') {
      setAccessFlags({
        can_view: true, can_view_daily: false, can_add: true, can_edit: false, can_delete: false,
        can_view_vehicles: false, can_manage_vehicles: false, can_view_workers: false,
        can_manage_workers: false, can_view_monthly: false, can_manage_access: false
      });
    }
  }

  const vehicleFilter = row => !activeVehicleId || String(row.vehicle_id || '') === String(activeVehicleId);
  const selectedEntries = entries.filter(r => r.entry_date === entryDate && vehicleFilter(r));
  const monthEntries = entries.filter(r => String(r.entry_date || '').slice(0, 7) === month && vehicleFilter(r));
  const sum = (rows, kind, mode = null) =>
    rows
      .filter(r => (!kind || r.entry_kind === kind) && (!mode || String(r.payment_mode || '').toLowerCase() === String(mode).toLowerCase()))
      .reduce((n, r) => n + Number(r.amount || 0), 0);

  const income = sum(selectedEntries, 'income');
  const expense = sum(selectedEntries, 'expense');
  const net = income - expense;
  const mIncome = sum(monthEntries, 'income');
  const mExpense = sum(monthEntries, 'expense');
  const mNet = mIncome - mExpense;
  const mCashIncome = sum(monthEntries, 'income', 'Cash');
  const mCreditIncome = sum(monthEntries, 'income', 'Credit');

  const labelForVehicle = id => vehicles.find(v => String(v.id) === String(id))?.plate_number || '—';
  const labelForPerson = id => people.find(p => String(p.id) === String(id))?.person_name || '—';

  const profitShare = people.map(p => ({
    ...p,
    share: p.pay_type === 'profit_percent' ? Math.max(0, mNet) * Number(p.profit_percent || 0) / 100 : Number(p.monthly_salary || 0)
  }));
  const totalDriverPay = profitShare.reduce((n, p) => n + Number(p.share || 0), 0);
  const ownerMonthlyProfit = mNet - totalDriverPay;

  const selectedDayHasMaintenance = selectedEntries.some(r => /maintenance|garage|repair|workshop/i.test(`${r.category || ''} ${r.description || ''} ${r.remarks || ''}`));
  const selectedDayStatus = !selectedEntries.length ? 'OFF' : selectedDayHasMaintenance ? 'MAINTENANCE' : 'WORKING';

  const [monthYear, monthNumber] = String(month || '').split('-').map(Number);
  const monthDayCount = monthYear && monthNumber ? new Date(monthYear, monthNumber, 0).getDate() : 0;
  const todayText = dateToInputValue(new Date());
  const monthLastVisible = month > todayText.slice(0, 7) ? 0 : (month === todayText.slice(0, 7) ? Number(todayText.slice(8, 10)) : monthDayCount);
  const monthlyDayRows = Array.from({ length: Math.max(0, Math.min(monthLastVisible, monthDayCount)) }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const date = `${month}-${day}`;
    const rows = monthEntries.filter(r => r.entry_date === date);
    const dayIncome = sum(rows, 'income');
    const dayExpense = sum(rows, 'expense');
    const maintenance = rows.some(r => /maintenance|garage|repair|workshop/i.test(`${r.category || ''} ${r.description || ''} ${r.remarks || ''}`));
    const status = !rows.length ? 'OFF' : maintenance ? 'MAINTENANCE' : 'WORKING';
    const reason = dayIncome === 0 && dayExpense > 0
      ? `No income received; expenses ${money(dayExpense)} deducted`
      : dayIncome > 0 && dayExpense > dayIncome
        ? `Expenses exceeded income by ${money(dayExpense - dayIncome)}`
        : '';
    return { date, rows, income: dayIncome, expense: dayExpense, net: dayIncome - dayExpense, status, reason };
  });

  const panelTitle = view === 'dashboard' ? 'Dashboard' : view === 'notebook' ? 'Naveed Docs' : currentBusiness?.name || 'Business Management';

  useEffect(() => {
    if (!admin && waterOnlyStaff && (workspaceSection !== 'water' || view !== 'water')) {
      setWorkspaceSection('water');
      setView('water');
    } else if (!admin && transportOnlyStaff && (workspaceSection !== 'transport' || view === 'water' || view === 'dashboard')) {
      const safeTransportView = resolveFirstAllowedView(access, false);
      setWorkspaceSection('transport');
      setView(safeTransportView === 'water' ? 'daily' : safeTransportView);
    }
  }, [admin, waterOnlyStaff, transportOnlyStaff, workspaceSection, view, access]);

  const navTabs = workspaceSection === 'dashboard'
    ? [...(admin ? [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }] : []), ...(admin ? [{ id: 'notebook', icon: '📒', label: 'Naveed Docs' }, { id: 'access', icon: '🔐', label: 'Staff Access' }] : [])]
    : workspaceSection === 'transport'
      ? [...(admin ? [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }] : []), ...(admin || access?.can_view_daily || (!waterOnlyStaff && (can('can_add') || can('can_edit') || can('can_delete'))) ? [{ id: 'daily', icon: '📝', label: 'Daily Entry' }] : []), ...(admin || access?.can_view_vehicles || can('can_manage_vehicles') ? [{ id: 'vehicles', icon: '🚚', label: 'Vehicle Files' }] : []), ...(admin || access?.can_view_monthly ? [{ id: 'monthly', icon: '📊', label: 'Monthly Sheet' }] : []), ...(admin || access?.can_view_workers || can('can_manage_workers') ? [{ id: 'workers', icon: '👷', label: 'Drivers & Pay' }] : []), ...(admin ? [{ id: 'cleanup', icon: '🧹', label: 'Month Data Delete' }] : [])]
      : workspaceSection === 'water'
        ? [...(admin ? [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }] : []), ...(admin || access?.can_view || can('can_add') ? [{ id: 'water', icon: '💧', label: 'Drinking Water' }] : [])]
        : workspaceSection === 'notebook' ? [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }, { id: 'notebook', icon: '📒', label: 'Naveed Docs' }]
        : [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }, ...(can('can_manage_access') ? [{ id: 'access', icon: '🔐', label: 'Staff Access' }] : [])];

  return (
    <div className="business-workspace" style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif", color: '#0f172a' }}>
      <style>{`
        @media(max-width:700px){
          .business-workspace>header{padding:12px!important;align-items:flex-start!important}
          .business-workspace>header>div:first-child{width:100%!important;min-width:0!important}
          .business-workspace>header h1{font-size:20px!important;overflow-wrap:anywhere}
          .business-workspace>header>div:last-child{width:100%!important;justify-content:flex-start!important}
          .business-workspace main{padding:10px!important}
          .business-workspace main>section{min-width:0!important}
          .business-workspace input,.business-workspace select,.business-workspace textarea,.business-workspace button{max-width:100%;box-sizing:border-box}
          .business-workspace input,.business-workspace select,.business-workspace textarea{font-size:16px!important}
          .business-workspace table{display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
          .business-workspace th,.business-workspace td{white-space:nowrap}
          .business-workspace img{max-width:100%;height:auto}
          .business-workspace button{min-height:42px;touch-action:manipulation}
          .business-workspace label{line-height:1.35}
          .business-workspace main>div,.business-workspace main>section{min-width:0!important;max-width:100%!important}
          .business-workspace [style*="grid-template-columns"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        }
        @media(max-width:420px){
          .business-workspace header h1{font-size:18px!important}
          .business-workspace main{padding:8px!important}
          .business-workspace [style*="grid-template-columns"]{grid-template-columns:minmax(0,1fr)!important}
          .business-workspace button{font-size:13px!important}
        }
      `}</style>
      <style>{`@media print {
        @page { size:A4 landscape; margin:8mm; }
        body * { visibility:hidden !important; }
        .nda-print-target, .nda-print-target * { visibility:visible !important; }
        .nda-print-target { position:relative !important; left:auto !important; top:auto !important; width:100% !important; padding:25mm 0 0 !important; margin:0 !important; overflow:visible !important; background:#fff !important; color:#000 !important; box-shadow:none !important; }
        .nda-print-target table{page-break-inside:auto!important;break-inside:auto!important}
        .nda-print-target thead{display:table-header-group!important}
        .nda-print-target tr{page-break-inside:avoid!important;break-inside:avoid!important}
        .nda-print-target .business-no-print, .nda-print-target button, .nda-print-target input, .nda-print-target select, .nda-print-target textarea, .nda-print-target form { display:none !important; }
        .business-print-brand { display:flex !important; position:fixed !important; top:0 !important; left:0 !important; right:0 !important; z-index:9999 !important; align-items:center !important; gap:14px !important; height:21mm !important; box-sizing:border-box !important; background:#fff !important; border-bottom:2px solid #c69227 !important; padding-bottom:8px !important; margin:0 !important; color:#064e3b !important; }
        .business-print-brand img { width:95px !important; height:58px !important; object-fit:contain !important; }
      } .business-print-brand{display:none;}`}</style>

      {/* HEADER */}
      <header style={{ padding: '16px clamp(14px,3vw,30px)', background: 'linear-gradient(115deg,#064e3b,#047857)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 82, height: 60, background: '#fff', borderRadius: 10, padding: 3, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <img src="/nda-naveed-logo.png" alt="NDA Naveed logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 800, color: '#a7f3d0' }}>NDA.PK BUSINESS SYSTEM</div>
            <h1 style={{ margin: '4px 0', fontSize: 24 }}>{panelTitle}</h1>
            <div style={{ fontSize: 12, color: '#d1fae5' }}>
              {admin ? 'Admin Full Access' : 'Staff Access'} · {session?.user?.email}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!waterOnlyStaff && <button onClick={onSwitchSystem} style={{ ...btn, background: '#fff', color: '#065f46' }}>← Switch System</button>}
          <button onClick={onLogout} style={{ ...btn, background: '#b91c1c' }}>Logout</button>
        </div>
      </header>

      <main style={{ padding: '16px clamp(12px,2vw,26px)', maxWidth: 1450, margin: '0 auto' }}>
        {/* TOP CONTROL BAR: BIG EASY TABS + QUICK FILTERS */}
        <section style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 8, marginBottom: 12 }}>
            {navTabs.map(tab => {
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { if (tab.id === 'dashboard') { setWorkspaceSection('dashboard'); setView('dashboard'); } else if (tab.id === 'notebook') { setWorkspaceSection('notebook'); setView('notebook'); } else if (tab.id === 'access') { setWorkspaceSection('access'); setView('access'); } else setView(tab.id); }}
                  style={{
                    ...btn,
                    padding: '13px 12px',
                    background: active ? '#047857' : '#f1f5f9',
                    color: active ? '#fff' : '#0f172a',
                    border: active ? '2px solid #065f46' : '1px solid #cbd5e1',
                    fontSize: 15,
                    fontWeight: 800
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {view !== 'dashboard' && view !== 'notebook' && view !== 'access' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, alignItems: 'end' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              🏢 Active Business
              <select
                style={{ ...inputStyle, marginTop: 4 }}
                value={businessId}
                onChange={e => {
                  const nextId = e.target.value;
                  setBusinessId(nextId);
                  setActiveVehicleId('');
                  setVehicleId('');
                  if (!admin) {
                    const row = accessRows.find(r => String(r.business_id) === String(nextId));
                    setAccess(row || null);
                    const assignedBusiness = businesses.find(b => String(b.id) === String(nextId));
                    const assignedWater = isWaterBusinessRecord(assignedBusiness);
                    const firstView = assignedWater ? 'water' : resolveFirstAllowedView(row, false);
                    setView(firstView);
                    setWorkspaceSection(assignedWater || firstView === 'water' ? 'water' : firstView === 'access' ? 'access' : 'transport');
                  }
                }}
              >
                <option value="">Select Business</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>

            {vehicles.length > 0 && (
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                🚚 Filter Vehicle
                <select
                  style={{ ...inputStyle, marginTop: 4 }}
                  value={activeVehicleId}
                  onChange={e => {
                    setActiveVehicleId(e.target.value);
                    if (e.target.value) setVehicleId(e.target.value);
                  }}
                >
                  <option value="">All Vehicles ({vehicles.length})</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} {v.vehicle_name || ''}</option>)}
                </select>
              </label>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              📅 Selected Date
              <input type="date" style={{ ...inputStyle, marginTop: 4 }} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </label>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              🗓️ Report Month
              <input type="month" style={{ ...inputStyle, marginTop: 4 }} value={month} onChange={e => setMonth(e.target.value)} />
            </label>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              💱 Currency
              <select style={{ ...inputStyle, marginTop: 4 }} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="AED">AED</option>
                <option value="PKR">PKR</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>}

          {admin && view !== 'dashboard' && view !== 'notebook' && view !== 'access' && (
            <details style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#047857', fontSize: 14 }}>
                ＋ Add New Business (Transport / Drinking Water)
              </summary>
              <form onSubmit={addBusiness} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, marginTop: 10 }}>
                <input
                  style={inputStyle}
                  value={newBusinessName}
                  onChange={e => setNewBusinessName(e.target.value)}
                  placeholder="Business Name (e.g. Al Noor Transport, Grocery Shop)"
                  required
                />
                <select style={inputStyle} value={newBusinessKind} onChange={e => setNewBusinessKind(e.target.value)}>
                  <option value="transport">Transport</option>
                  <option value="water">Drinking Water</option>
                  <option value="other">General / Other Business</option>
                </select>
                <button type="submit" style={btn}>Create Business</button>
                <div style={{gridColumn:'1 / -1',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <label style={{fontSize:12,fontWeight:700}}>Delete / Deactivate Business
                    <select id="business-delete-select" style={{...inputStyle,marginTop:4}} defaultValue=""><option value="">Select business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
                  </label>
                  <button type="button" style={{...btn,background:'#b91c1c',marginTop:18}} onClick={()=>{const id=document.getElementById('business-delete-select')?.value;const b=businesses.find(x=>String(x.id)===String(id));if(b)void deleteBusinessRecord(b);else alert('Pehle business select karein.');}}>Delete Business</button>
                </div>
              </form>
            </details>
          )}
        </section>

        {view === 'dashboard' && admin ? (
          <section style={{...card, padding:24}}>
            <h2 style={{marginTop:0,marginBottom:8}}>NDA.PK Business Dashboard</h2>
            <p style={{color:'#64748b',marginTop:0}}>Apna business section select karein.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18,marginTop:20}}>
              <button type="button" onClick={() => { const b=businesses.find(x=>x.business_kind==='transport') || businesses.find(x=>/transport|vehicle|truck/i.test(x.name||'')) || (businesses.filter(x=>x.business_kind!=='water' && !/water|pani/i.test(x.name||'')).length===1 ? businesses.find(x=>x.business_kind!=='water' && !/water|pani/i.test(x.name||'')) : null); if(!b){alert(businesses.length ? 'Transport business identify nahi ho raha. Existing business ka naam aur type check karein; naya business banane ki zaroorat nahi jab tak confirm na ho.' : 'Abhi koi active business load nahi hua. Refresh ke baad list dobara check karein.');return;} setBusinessId(String(b.id));setWorkspaceSection('transport');setView('daily'); }} style={{minHeight:190,border:0,borderRadius:20,padding:26,textAlign:'left',background:'linear-gradient(135deg,#064e3b,#059669)',color:'#fff',cursor:'pointer',boxShadow:'0 8px 24px #064e3b30'}}>
                <div style={{fontSize:46}}>🚚</div><div style={{fontSize:28,fontWeight:900,marginTop:10}}>Transport</div><div style={{fontSize:14,opacity:.9,marginTop:6}}>Daily Entry · Vehicle Files · Monthly Sheet · Drivers & Pay</div>
              </button>
              <button type="button" onClick={() => { const waterMatch=businesses.find(x=>x.business_kind==='water'||/water|drinking|pani/i.test(x.name||'')); const transportMatch=businesses.find(x=>x.business_kind==='transport'||/transport|vehicle|truck/i.test(x.name||'')); const b=waterMatch || (businesses.length===2 && transportMatch ? businesses.find(x=>String(x.id)!==String(transportMatch.id)) : null); if(!b){alert('Existing business list mein Drinking Water ki file identify nahi ho rahi. Koi nayi file create na karein; Admin se business names/types verify karwayein.');return;} setBusinessId(String(b.id));setWorkspaceSection('water');setView('water'); }} style={{minHeight:190,border:0,borderRadius:20,padding:26,textAlign:'left',background:'linear-gradient(135deg,#075985,#0ea5e9)',color:'#fff',cursor:'pointer',boxShadow:'0 8px 24px #07598530'}}>
                <div style={{fontSize:46}}>💧</div><div style={{fontSize:28,fontWeight:900,marginTop:10}}>Drinking Water</div><div style={{fontSize:14,opacity:.9,marginTop:6}}>Daily Entry · Monthly Sheet · Customer Files · Company Account · Water Stock</div>
              </button>
            </div>
            <details style={{marginTop:18}}><summary style={{cursor:'pointer',fontWeight:800,color:'#047857'}}>＋ Create Transport / Drinking Water Business</summary><form onSubmit={addBusiness} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginTop:12}}><input style={inputStyle} value={newBusinessName} onChange={e=>setNewBusinessName(e.target.value)} placeholder="Business Name" required/><select style={inputStyle} value={newBusinessKind} onChange={e=>setNewBusinessKind(e.target.value)}><option value="transport">Transport</option><option value="water">Drinking Water</option></select><button type="submit" style={btn}>Create Business</button></form></details>
          </section>
        ) : !businessId && view !== 'notebook' && view !== 'access' ? (
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>No Business Selected</h3>
            <p style={{ color: '#475569' }}>
              {admin
                ? 'Click "+ Add New Business" above to create your first business, then add your vehicle file in Vehicle Files.'
                : 'No business is assigned to your account yet. Please contact Admin.'}
            </p>
          </section>
        ) : (
          <>
            {admin && (
              <div className="business-no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button type="button" onClick={() => printNdaPage('business-current-print', true)} style={{ ...btn, background: '#b45309' }}>
                  🖨️ Print Current Page
                </button>
              </div>
            )}

            <div id="business-current-print">
              <div className="business-print-brand">
                <img src="/nda-naveed-logo.png" alt="NDA-PK" />
                <div>
                  <strong>NDA-PK BUSINESS SYSTEM</strong>
                  <div>{panelTitle} · {view.toUpperCase()}</div>
                </div>
              </div>

              {/* 1. DAILY ENTRY & LEDGER */}
              {view === 'daily' && (admin || access?.can_view_daily || (!waterOnlyStaff && (can('can_add') || can('can_edit') || can('can_delete')))) && (
                <>
                  {/* Color-Coded Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, padding: 14, color: '#166534' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>🟢 CASH INCOME</div>
                      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{money(sum(selectedEntries, 'income', 'Cash'))}</div>
                    </div>
                    <div style={{ background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 12, padding: 14, color: '#5b21b6' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>🟣 CREDIT INCOME</div>
                      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{money(sum(selectedEntries, 'income', 'Credit'))}</div>
                    </div>
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: 14, color: '#991b1b' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>🔴 TOTAL EXPENSE</div>
                      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{money(expense)}</div>
                    </div>
                    <div style={{ background: net >= 0 ? '#dbeafe' : '#fef3c7', border: `1px solid ${net >= 0 ? '#93c5fd' : '#fcd34d'}`, borderRadius: 12, padding: 14, color: net >= 0 ? '#1e40af' : '#92400e' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>🔵 NET TODAY ({selectedDayStatus})</div>
                      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{money(net)}</div>
                    </div>
                  </div>

                  {/* Simple Easy Form for Driver / Staff */}
                  {can('can_add') && (
                    <form onSubmit={addEntry} style={{ ...card, marginBottom: 14 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>➕ Add Daily Record — {entryDate}</h3>

                      {/* Big Green / Red Toggle Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <button
                          type="button"
                          onClick={() => { setEntryKind('income'); setCategory(quickIncomeCategories[0]); }}
                          style={{
                            ...btn,
                            padding: '14px',
                            fontSize: 16,
                            background: entryKind === 'income' ? '#16a34a' : '#f1f5f9',
                            color: entryKind === 'income' ? '#fff' : '#334155',
                            border: entryKind === 'income' ? '2px solid #15803d' : '1px solid #cbd5e1'
                          }}
                        >
                          🟢 INCOME (Cash / Trip In)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEntryKind('expense'); setCategory(quickExpenseCategories[0]); }}
                          style={{
                            ...btn,
                            padding: '14px',
                            fontSize: 16,
                            background: entryKind === 'expense' ? '#dc2626' : '#f1f5f9',
                            color: entryKind === 'expense' ? '#fff' : '#334155',
                            border: entryKind === 'expense' ? '2px solid #b91c1c' : '1px solid #cbd5e1'
                          }}
                        >
                          🔴 EXPENSE (Fuel / Garage / Bill)
                        </button>
                      </div>

                      {/* Quick One-Tap Category Chips */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {(entryKind === 'income' ? quickIncomeCategories : quickExpenseCategories).map(item => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCategory(item)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 20,
                              border: category === item ? '2px solid #0f172a' : '1px solid #cbd5e1',
                              background: category === item ? '#0f172a' : '#f8fafc',
                              color: category === item ? '#fff' : '#334155',
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer'
                            }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                        {isTransportBusiness && (
                          <label style={{ fontSize: 12, fontWeight: 700 }}>
                            🚚 Vehicle *
                            <select style={{ ...inputStyle, marginTop: 4 }} value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                              <option value="">Select Vehicle</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} {v.vehicle_name}</option>)}
                            </select>
                          </label>
                        )}

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          🏷️ Category *
                          <input style={{ ...inputStyle, marginTop: 4 }} value={category} onChange={e => setCategory(e.target.value)} placeholder="Type or select above" required />
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          💵 Amount ({currency}) *
                          <input style={{ ...inputStyle, marginTop: 4, fontWeight: 800 }} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          💳 Payment Mode
                          <select style={{ ...inputStyle, marginTop: 4 }} value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                            <option value="Cash">Cash</option>
                            <option value="Credit">Credit / Udhaar</option>
                            <option value="Bank">Bank / Transfer</option>
                          </select>
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          👷 Driver / Staff
                          <select style={{ ...inputStyle, marginTop: 4 }} value={driverId} onChange={e => setDriverId(e.target.value)}>
                            <option value="">Select Driver / Staff (Optional)</option>
                            {people.map(p => <option key={p.id} value={p.id}>{p.person_name} ({p.job_title})</option>)}
                          </select>
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          📝 Note / Trip Details
                          <input style={{ ...inputStyle, marginTop: 4 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Sharjah to Dubai trip / Diesel bill" />
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 700 }}>
                          📎 Receipt / Bill Photo (Optional)
                          <input style={{ ...inputStyle, marginTop: 4, padding: 9 }} type="file" accept="image/*,.pdf" onChange={e => setBillFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>

                      <button
                        type="submit"
                        style={{
                          ...btn,
                          width: '100%',
                          marginTop: 14,
                          padding: '14px',
                          fontSize: 16,
                          background: entryKind === 'income' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        ✅ Save {entryKind === 'income' ? 'Income' : 'Expense'} Entry
                      </button>
                    </form>
                  )}

                  {/* Daily Entries Table */}
                  <section style={{ ...card, overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ margin: 0 }}>📒 Daily Entries — {entryDate}</h3>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        background: selectedDayStatus === 'OFF' ? '#e2e8f0' : selectedDayStatus === 'MAINTENANCE' ? '#fef3c7' : '#dcfce7',
                        color: selectedDayStatus === 'OFF' ? '#475569' : selectedDayStatus === 'MAINTENANCE' ? '#b45309' : '#166534'
                      }}>
                        Status: {selectedDayStatus}
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Type', 'Category', 'Vehicle', 'Driver / Staff', 'Details', 'Mode', 'Amount', 'Date / Bill / Remarks', ...(admin ? ['Actions'] : [])].map(h => (
                            <th key={h} style={{ padding: 10, borderBottom: '2px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntries.map(r => {
                          const isInc = r.entry_kind === 'income';
                          const editing = String(editingDailyEntry?.id) === String(r.id);
                          const cell = { padding: 10, borderBottom: '1px solid #e2e8f0' };
                          return (
                            <tr key={r.id} style={{ background: editing ? '#eff6ff' : (isInc ? '#f0fdf4' : '#fef2f2') }}>
                              <td style={{ ...cell, fontWeight: 800, color: isInc ? '#15803d' : '#b91c1c' }}>{editing ? <select style={{...inputStyle,minWidth:105}} value={editingDailyEntry.entry_kind} onChange={e=>setEditingDailyEntry(v=>({...v,entry_kind:e.target.value}))}><option value="income">INCOME</option><option value="expense">EXPENSE</option></select> : (isInc ? '🟢 INCOME' : '🔴 EXPENSE')}</td>
                              <td style={cell}>{editing ? <input style={{...inputStyle,minWidth:120}} value={editingDailyEntry.category} onChange={e=>setEditingDailyEntry(v=>({...v,category:e.target.value}))}/> : <b>{r.category}</b>}</td>
                              <td style={cell}>{editing ? <select style={{...inputStyle,minWidth:120}} value={editingDailyEntry.vehicle_id} onChange={e=>setEditingDailyEntry(v=>({...v,vehicle_id:e.target.value}))}><option value="">Select Vehicle</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number} {v.vehicle_name}</option>)}</select> : labelForVehicle(r.vehicle_id)}</td>
                              <td style={cell}>{editing ? <select style={{...inputStyle,minWidth:120}} value={editingDailyEntry.driver_id} onChange={e=>setEditingDailyEntry(v=>({...v,driver_id:e.target.value}))}><option value="">Select Driver / Staff</option>{people.map(p=><option key={p.id} value={p.id}>{p.person_name}</option>)}</select> : labelForPerson(r.driver_id)}</td>
                              <td style={cell}>{editing ? <input style={{...inputStyle,minWidth:140}} value={editingDailyEntry.description} onChange={e=>setEditingDailyEntry(v=>({...v,description:e.target.value}))}/> : (r.description || r.remarks || '—')}</td>
                              <td style={cell}>{editing ? <select style={{...inputStyle,minWidth:105}} value={editingDailyEntry.payment_mode} onChange={e=>setEditingDailyEntry(v=>({...v,payment_mode:e.target.value}))}><option value="Cash">Cash</option><option value="Credit">Credit / Udhaar</option><option value="Bank">Bank / Transfer</option></select> : r.payment_mode}</td>
                              <td style={{...cell,fontWeight:900,color:isInc?'#15803d':'#b91c1c'}}>{editing ? <input type="number" min="0.01" step="0.01" style={{...inputStyle,width:105}} value={editingDailyEntry.amount} onChange={e=>setEditingDailyEntry(v=>({...v,amount:e.target.value}))}/> : `${isInc?'+':'-'}${money(r.amount)}`}</td>
                              <td style={cell}>{editing ? <><input type="date" style={{...inputStyle,minWidth:130}} value={editingDailyEntry.entry_date} onChange={e=>setEditingDailyEntry(v=>({...v,entry_date:e.target.value}))}/><input placeholder="Remarks" style={{...inputStyle,minWidth:130,marginTop:4}} value={editingDailyEntry.remarks} onChange={e=>setEditingDailyEntry(v=>({...v,remarks:e.target.value}))}/></> : (r.bill_url ? <a href={r.bill_url} target="_blank" rel="noreferrer" style={{color:'#1d4ed8',fontWeight:700}}>View Bill</a> : '—')}</td>
                              {admin && <td style={cell}>{editing ? <><button type="button" onClick={saveDailyEntryEdit} style={{...btn,background:'#15803d',padding:'6px 10px',fontSize:12,marginRight:5}}>Save</button><button type="button" onClick={()=>setEditingDailyEntry(null)} style={{...btn,background:'#64748b',padding:'6px 10px',fontSize:12}}>Cancel</button></> : <><button type="button" onClick={()=>editEntry(r)} style={{...btn,background:'#1d4ed8',padding:'6px 10px',fontSize:12,marginRight:5}}>Edit</button><button type="button" onClick={()=>deleteEntry(r)} style={{...btn,background:'#b91c1c',padding:'6px 10px',fontSize:12}}>Delete</button></>}</td>}
                            </tr>
                          );
                        })}
                        {!selectedEntries.length && (
                          <tr>
                            <td colSpan={admin ? 9 : 8} style={{ padding: 16, color: '#64748b', textAlign: 'center' }}>
                              No entries recorded for {entryDate}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </>
              )}

              {/* 2. VEHICLE FILES */}
              {view === 'vehicles' && (admin || access?.can_view_vehicles || can('can_manage_vehicles')) && (
                <>
                  {can('can_manage_vehicles') && (
                    <section style={{ ...card, marginBottom: 14 }}>
                      <h3 style={{ marginTop: 0 }}>🚚 Create New Vehicle File</h3>
                      <form onSubmit={addVehicle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
                        <input style={inputStyle} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="Plate Number (e.g. SHJ 12345)" required />
                        <input style={inputStyle} value={vehicleName} onChange={e => setVehicleName(e.target.value)} placeholder="Vehicle Model / Type (e.g. Toyota Hiace)" />
                        <input style={inputStyle} value={vehicleNotes} onChange={e => setVehicleNotes(e.target.value)} placeholder="Notes (Mulkiya expiry, insurance, route)" />
                        <button type="submit" style={btn}>➕ Save Vehicle File</button>
                      </form>
                    </section>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                    {vehicles.map(v => {
                      const vEntries = entries.filter(r => String(r.vehicle_id) === String(v.id));
                      const vInc = sum(vEntries, 'income');
                      const vExp = sum(vEntries, 'expense');
                      return (
                        <section key={v.id} style={card}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 19 }}>🚚 {v.plate_number}</h3>
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>ACTIVE</span>
                          </div>
                          <div style={{ fontWeight: 700, color: '#334155', marginTop: 4 }}>{v.vehicle_name || 'Transport Vehicle'}</div>
                          <p style={{ color: '#64748b', fontSize: 13, minHeight: 20 }}>{v.notes || 'No extra notes'}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 12 }}>
                            <div><span style={{ color: '#15803d', fontWeight: 700 }}>Total Income:</span><br /><strong>{money(vInc)}</strong></div>
                            <div><span style={{ color: '#b91c1c', fontWeight: 700 }}>Total Expense:</span><br /><strong>{money(vExp)}</strong></div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap:'wrap' }}>
                            {admin && <button type="button" style={{...btn,background:'#b91c1c'}} onClick={()=>void deleteVehicleFile(v)}>🗑️ Delete Vehicle</button>}
                            <button
                              type="button"
                              style={{ ...btn, flex: 1 }}
                              onClick={() => { setActiveVehicleId(String(v.id)); setVehicleId(String(v.id)); setView('daily'); }}
                            >
                              📝 Daily Entries
                            </button>
                            {(admin || access?.can_view_monthly) && (
                              <button
                                type="button"
                                style={{ ...btn, flex: 1, background: '#1d4ed8' }}
                                onClick={() => { setActiveVehicleId(String(v.id)); setView('monthly'); }}
                              >
                                📊 Monthly Sheet
                              </button>
                            )}
                          </div>
                        </section>
                      );
                    })}
                    {!vehicles.length && (
                      <section style={card}>No vehicle files created yet. Add your first vehicle above.</section>
                    )}
                  </div>
                </>
              )}

              {/* 3. DRIVERS & SALARY / PROFIT SHARE */}
              {view === 'workers' && (admin || access?.can_view_workers || can('can_manage_workers')) && (
                <>
                  {can('can_manage_workers') && (
                    <section style={{ ...card, marginBottom: 14 }}>
                      <h3 style={{ marginTop: 0 }}>👷 Add Driver / Business Staff Profile</h3>
                      <form onSubmit={addPerson} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 10 }}>
                        <input style={inputStyle} value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Full Name" required />
                        <input style={inputStyle} value={personRole} onChange={e => setPersonRole(e.target.value)} placeholder="Role (Driver, Helper, Manager)" />
                        <input style={inputStyle} value={personPhone} onChange={e => setPersonPhone(e.target.value)} placeholder="Mobile Number" />
                        <select style={inputStyle} value={payType} onChange={e => setPayType(e.target.value)}>
                          <option value="fixed">Fixed Monthly Salary</option>
                          <option value="profit_percent">Net Profit Percentage (%)</option>
                        </select>
                        {payType === 'fixed' ? (
                          <input style={inputStyle} type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Monthly Salary (${currency})`} />
                        ) : (
                          <input style={inputStyle} type="number" min="0" max="100" step="0.01" value={profitPercent} onChange={e => setProfitPercent(e.target.value)} placeholder="Profit Share (%)" />
                        )}
                        <button type="submit" style={btn}>➕ Add Driver / Staff</button>
                      </form>
                    </section>
                  )}

                  <section style={{ ...card, overflowX: 'auto' }}>
                    <h3 style={{ marginTop: 0 }}>Drivers & Staff Pay Structure ({month})</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Name', 'Role', 'Phone', 'Pay System', 'Fixed Salary', 'Profit %', 'Earned This Month'].map(h => (
                            <th key={h} style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {profitShare.map(p => (
                          <tr key={p.id}>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{p.person_name}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{p.job_title}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{p.phone || '—'}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{p.pay_type === 'fixed' ? 'Fixed Salary' : 'Profit Share'}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{money(p.monthly_salary)}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{p.pay_type === 'profit_percent' ? `${p.profit_percent || 0}%` : '—'}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', fontWeight: 900, color: '#047857' }}>{money(p.share)}</td>
                          </tr>
                        ))}
                        {!people.length && (
                          <tr><td colSpan="7" style={{ padding: 14, color: '#64748b' }}>No drivers or staff added yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </>
              )}

              {/* 4. MONTHLY SHEET (DRIVER + OWNER) */}
              {view === 'monthly' && (admin || access?.can_view_monthly) && (
                <>
                  {admin && (
                    <div className="business-no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button type="button" onClick={() => printNdaPage('business-driver-monthly-print', true)} style={{ ...btn, background: '#1d4ed8' }}>
                        🖨️ Print Driver Monthly Sheet
                      </button>
                      <button type="button" onClick={() => printNdaPage('business-owner-monthly-print', true)} style={{ ...btn, background: '#047857' }}>
                        🖨️ Print Owner Monthly Sheet
                      </button>
                    </div>
                  )}

                  {/* Monthly Summary Boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#dcfce7', borderRadius: 12, padding: 14, color: '#166534' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>TOTAL INCOME</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{money(mIncome)}</div>
                    </div>
                    <div style={{ background: '#fee2e2', borderRadius: 12, padding: 14, color: '#991b1b' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>TOTAL EXPENSES</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{money(mExpense)}</div>
                    </div>
                    <div style={{ background: '#e0f2fe', borderRadius: 12, padding: 14, color: '#075985' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>NET BEFORE DRIVER</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{money(mNet)}</div>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 12, padding: 14, color: '#92400e' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>DRIVER PAY / SHARE</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{money(totalDriverPay)}</div>
                    </div>
                    <div style={{ background: ownerMonthlyProfit >= 0 ? '#d1fae5' : '#fee2e2', borderRadius: 12, padding: 14, color: ownerMonthlyProfit >= 0 ? '#065f46' : '#991b1b' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>OWNER FINAL PROFIT</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{money(ownerMonthlyProfit)}</div>
                    </div>
                  </div>

                  {/* Driver Monthly Sheet */}
                  <section id="business-driver-monthly-print" style={{ ...card, overflowX: 'auto', marginBottom: 14 }}>
                    <div className="business-print-brand">
                      <img src="/nda-naveed-logo.png" alt="NDA-PK" />
                      <div><strong>NDA.PK BUSINESS SYSTEM</strong><div>Driver Monthly Sheet · {month}</div></div>
                    </div>
                    <h3 style={{ marginTop: 0 }}>👷 Driver Monthly Sheet — {month}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Driver / Staff', 'Pay Type', 'Fixed Salary', 'Profit %', 'Total Payable'].map(h => (
                            <th key={h} style={{ padding: 9, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {profitShare.map(p => (
                          <tr key={p.id}>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{p.person_name}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{p.pay_type === 'profit_percent' ? 'Profit Share' : 'Fixed Salary'}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{money(p.monthly_salary)}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{p.pay_type === 'profit_percent' ? `${p.profit_percent || 0}%` : '—'}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', fontWeight: 900, color: '#047857' }}>{money(p.share)}</td>
                          </tr>
                        ))}
                        {!profitShare.length && (
                          <tr><td colSpan="5" style={{ padding: 12, color: '#64748b' }}>No drivers added in Drivers & Pay section.</td></tr>
                        )}
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan="4" style={{ padding: 9, fontWeight: 900, textAlign: 'right' }}>Total Driver Salary / Share:</td>
                          <td style={{ padding: 9, fontWeight: 900 }}>{money(totalDriverPay)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h4 style={{ marginBottom: 8 }}>Driver-Wise Daily Entries</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Date', 'Driver', 'Vehicle', 'Type', 'Category', 'Details', 'Amount'].map(h => (
                            <th key={h} style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthEntries.filter(r => r.driver_id).map(r => (
                          <tr key={`drv-${r.id}`}>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.entry_date}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{labelForPerson(r.driver_id)}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{labelForVehicle(r.vehicle_id)}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', color: r.entry_kind === 'income' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{r.entry_kind.toUpperCase()}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.category}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.description || r.remarks || '—'}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>{money(r.amount)}</td>
                          </tr>
                        ))}
                        {!monthEntries.some(r => r.driver_id) && (
                          <tr><td colSpan="7" style={{ padding: 10, color: '#64748b' }}>No entries linked to a driver this month.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>

                  {/* Day-by-Day Monthly Sheet */}
                  <section style={{ ...card, overflowX: 'auto', marginBottom: 14 }}>
                    <h3 style={{ marginTop: 0 }}>📅 Date-Wise Monthly Summary — {month}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Date', 'Status', 'Cash Income', 'Credit Income', 'Expense', 'Daily Net', 'Notes'].map(h => (
                            <th key={h} style={{ padding: 9, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyDayRows.map(d => (
                          <tr key={d.date}>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{d.date}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: d.status === 'OFF' ? '#64748b' : d.status === 'MAINTENANCE' ? '#b45309' : '#047857' }}>{d.status}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{money(sum(d.rows, 'income', 'Cash'))}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{money(sum(d.rows, 'income', 'Credit'))}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{money(d.expense)}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: d.net < 0 ? '#b91c1c' : '#047857' }}>{money(d.net)}</td>
                            <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{d.reason || (d.status === 'OFF' ? 'OFF Day' : 'Working Day')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  {/* Owner Monthly Sheet */}
                  <section id="business-owner-monthly-print" style={{ ...card, overflowX: 'auto' }}>
                    <div className="business-print-brand">
                      <img src="/nda-naveed-logo.png" alt="NDA-PK" />
                      <div><strong>NDA.PK BUSINESS SYSTEM</strong><div>Owner Monthly Sheet · {month}</div></div>
                    </div>
                    <h3 style={{ marginTop: 0 }}>🏢 Owner Monthly Ledger — {month}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Date', 'Vehicle', 'Category & Details', 'Income', 'Expense', 'Net'].map(h => (
                            <th key={h} style={{ padding: 9, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthEntries.map(r => {
                          const isExp = r.entry_kind === 'expense';
                          return (
                            <tr key={r.id}>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{r.entry_date}</td>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>{labelForVehicle(r.vehicle_id)}</td>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9' }}>
                                <strong>{r.category}:</strong> {r.description || r.remarks || '—'} {r.bill_url ? <a href={r.bill_url} target="_blank" rel="noreferrer">[Bill]</a> : ''}
                              </td>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', color: '#15803d', fontWeight: 700 }}>{!isExp ? money(r.amount) : '—'}</td>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', color: '#b91c1c', fontWeight: 700 }}>{isExp ? money(r.amount) : '—'}</td>
                              <td style={{ padding: 9, borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: isExp ? '#b91c1c' : '#047857' }}>{isExp ? `-${money(r.amount)}` : money(r.amount)}</td>
                            </tr>
                          );
                        })}
                        {!monthEntries.length && (
                          <tr><td colSpan="6" style={{ padding: 12, color: '#64748b' }}>No entries recorded for {month}.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </>
              )}

              {/* WATER SUPPLY CUSTOMER KHATA — BUSINESS SYSTEM ONLY */}
              {view === 'water' && (admin || access?.can_view || can('can_add')) && (
                <WaterSupplyPanel session={session} businessId={businessId} isAdmin={admin} canAdd={admin || can('can_add')} canDelete={admin || can('can_delete')} />
              )}

              {view === 'notebook' && admin && (
                <PersonalNotebookPanel session={session} businessId={businessId} isAdmin={admin} />
              )}

              {view === 'cleanup' && admin && (
                <section style={card}>
                  <h2 style={{marginTop:0}}>🧹 Previous Month Business Data Delete</h2>
                  <p style={{color:'#475569',fontSize:13}}>Pehle month select karke preview dekhein. Delete karne se sirf is Business ke daily entries, Water Supply sales aur payments delete honge. Customer profiles, notebook aur HR System ka data safe rahega.</p>
                  <div style={{display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}}><label>Previous Month<input type="month" style={{...inputStyle,marginTop:4}} value={cleanupMonth} max={new Date(Date.UTC(new Date().getFullYear(),new Date().getMonth()-1,1)).toISOString().slice(0,7)} onChange={e=>{setCleanupMonth(e.target.value);setCleanupPreview(null);}} /></label><button type="button" style={btn} onClick={previewMonthCleanup}>Preview Month Data</button></div>
                  {cleanupPreview&&<div style={{marginTop:14,padding:14,border:'1px solid #fbbf24',background:'#fffbeb',borderRadius:10}}><h3 style={{marginTop:0}}>Preview · {cleanupPreview.month}</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}><div><b>Business Entries</b><div>{cleanupPreview.entries.length}</div></div><div><b>Water Sales</b><div>{cleanupPreview.sales.length}</div></div><div><b>Water Payments</b><div>{cleanupPreview.payments.length}</div></div><div><b>Total Records</b><div>{cleanupPreview.entries.length+cleanupPreview.sales.length+cleanupPreview.payments.length}</div></div></div><button type="button" style={{...btn,background:'#b91c1c',marginTop:12}} onClick={deleteMonthData}>Permanently Delete This Month</button></div>}
                </section>
              )}

              {/* 5. STAFF ACCESS & PERMISSIONS */}
              {view === 'access' && can('can_manage_access') && (
                <section style={card}>
                  <h3 style={{ marginTop: 0 }}>🔐 Staff Login ID, Password & Permissions</h3>
                  <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
                    Create login ID and password for your drivers or staff. Choose exactly which business and functions they can view or enter.
                  </p>

                  <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>Sirf Transport ya Drinking Water select karein. Har business ki permissions alag rahengi.</p>

                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:14}}>
                    {[
                      {kind:'transport',label:'🚚 Transport',match:b=>b.business_kind==='transport'||/transport|vehicle|truck/i.test(b.name||''),fallback:()=>businesses.filter(b=>b.business_kind!=='water'&&!/water|pani/i.test(b.name||'')).length===1?businesses.find(b=>b.business_kind!=='water'&&!/water|pani/i.test(b.name||'')):null},
                      {kind:'water',label:'💧 Drinking Water',match:b=>b.business_kind==='water'||/water|drinking|pani/i.test(b.name||''),fallback:()=>{const t=businesses.find(b=>b.business_kind==='transport'||/transport|vehicle|truck/i.test(b.name||''));return businesses.length===2&&t?businesses.find(b=>String(b.id)!==String(t.id)):null}}
                    ].map(opt=>{const found=businesses.find(opt.match)||opt.fallback();const selected=accessSelectedKind===opt.kind;return <button key={opt.kind} type="button" disabled={!found} onClick={()=>selectAccessBusiness(found,opt.kind)} style={{padding:14,borderRadius:12,border:selected?'2px solid #047857':'1px solid #cbd5e1',background:selected?'#ecfdf5':'#fff',color:'#0f172a',fontWeight:800,cursor:found?'pointer':'not-allowed',opacity:found?1:.5,textAlign:'left'}}><div style={{fontSize:18}}>{opt.label}</div><div style={{fontSize:11,fontWeight:500,color:'#64748b',marginTop:4}}>{found?found.name:'Business record not found'}</div></button>})}
                  </div>

                  {accessSelectedKind && (accessBusinessId||accessFilterBusinessId) && <form onSubmit={saveAccess} style={{ padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#f8fafc', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: editingAccessRow ? '#b45309' : '#047857', marginBottom: 10 }}>{editingAccessRow ? `✏️ Editing Staff: ${editingAccessRow.user_email}` : '➕ Create New Staff Login'}</div>
                    <div style={{fontSize:12,color:'#475569',fontWeight:700,marginBottom:10}}>Selected: {businesses.find(b=>String(b.id)===String(accessBusinessId||accessFilterBusinessId))?.name||'Business'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700 }}>Login ID (Email) *<input style={{ ...inputStyle, marginTop: 4 }} type="email" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} placeholder="staff@nda.pk" autoComplete="username" required /></label>
                      <label style={{ fontSize: 12, fontWeight: 700 }}>Password *<input style={{ ...inputStyle, marginTop: 4 }} type="password" value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder={editingAccessRow ? 'Blank = keep old password' : 'Min 6 characters'} autoComplete="new-password" minLength={6} required={!editingAccessRow} /></label>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,marginBottom:8,color:'#334155'}}>Permissions — {(()=>{const b=businesses.find(x=>String(x.id)===String(accessBusinessId||accessFilterBusinessId));return b&&(b.business_kind==='water'||/water|drinking|pani/i.test(b.name||''))?'Drinking Water':'Transport'})()}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                      {Object.entries((()=>{const b=businesses.find(x=>String(x.id)===String(accessBusinessId||accessFilterBusinessId));const water=!!(b&&(b.business_kind==='water'||/water|drinking|pani/i.test(b.name||'')));return water?{can_view:'Allow Water Login',can_view_daily:'View Daily Water Entries',can_add:'Add Daily Water Entries',can_edit:'Edit Water Entries',can_delete:'Delete Water Entries',can_view_monthly:'View Water Monthly Sheet'}:{can_view:'Allow Transport Login',can_view_daily:'View Daily Entries',can_add:'Add New Daily Entries',can_edit:'Edit Entries',can_delete:'Delete Entries',can_view_vehicles:'View Vehicle Files',can_manage_vehicles:'Add / Manage Vehicle Files',can_view_workers:'View Drivers & Pay',can_manage_workers:'Add / Manage Drivers',can_view_monthly:'View Monthly Sheets'};})()).map(([key,label])=><label key={key} style={{display:'flex',gap:8,alignItems:'center',fontSize:13,fontWeight:600,cursor:'pointer'}}><input type="checkbox" checked={!!accessFlags[key]} onChange={e=>setAccessFlags(old=>({...old,[key]:e.target.checked}))}/><span>{label}</span></label>)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="submit" style={btn}>{editingAccessRow ? '✅ Save Changes' : '✅ Create Staff Login'}</button>{editingAccessRow&&<button type="button" onClick={cancelEditAccess} style={{...btn,background:'#64748b'}}>Cancel</button>}</div>
                  </form>}

                  {accessSelectedKind && (accessFilterBusinessId||accessBusinessId) && <div style={{margin:'12px 0 8px',fontWeight:800,color:'#334155'}}>Selected business staff logins</div>}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Staff Login ID', 'Assigned Business', 'Allowed Functions', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {accessRows.filter(r => String(r.business_id) === String(accessFilterBusinessId || accessBusinessId || '')).map(r => (
                          <tr key={r.id}>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{r.user_email}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{r.business_profiles?.name || businesses.find(b => String(b.id) === String(r.business_id))?.name || `Business #${r.business_id}`}</td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', maxWidth: 340, whiteSpace: 'normal' }}>
                              {r.can_view && !r.can_view_daily && !r.can_edit && !r.can_delete && !r.can_view_vehicles && !r.can_manage_vehicles && !r.can_view_workers && !r.can_manage_workers && !r.can_view_monthly && !r.can_manage_access
                                ? 'Water Supply Only'
                                : ([
                                  r.can_view_daily && 'View Daily',
                                  r.can_add && 'Add Entry',
                                  r.can_edit && 'Edit',
                                  r.can_delete && 'Delete',
                                  r.can_view_vehicles && 'View Vehicles',
                                  r.can_manage_vehicles && 'Manage Vehicles',
                                  r.can_view_workers && 'View Drivers',
                                  r.can_manage_workers && 'Manage Drivers',
                                  r.can_view_monthly && 'Monthly Sheet',
                                  r.can_manage_access && 'Staff Access'
                                ].filter(Boolean).join(' · ') || 'Login Only')}
                            </td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: r.active ? '#15803d' : '#b91c1c' }}>
                              {r.active ? 'Active' : 'Disabled'}
                            </td>
                            <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                              <button type="button" onClick={() => startEditAccess(r)} style={{ ...btn, padding: '6px 10px', fontSize: 12, marginRight: 6, background: '#2563eb' }}>Edit</button>
                              <button type="button" onClick={() => deleteAccessStaff(r)} style={{ ...btn, padding: '6px 10px', fontSize: 12, background: '#dc2626' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                        {!accessRows.some(r => String(r.business_id) === String(accessFilterBusinessId || accessBusinessId || '')) && (
                          <tr><td colSpan="5" style={{ padding: 14, color: '#64748b' }}>Is business ke liye abhi koi staff login nahi banaya gaya.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {loading && (
          <div style={{ position: 'fixed', bottom: 14, right: 14, background: '#0f172a', color: '#fff', padding: '8px 14px', borderRadius: 10, fontWeight: 700 }}>
            Loading…
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  // Keep the authenticated app session across page refreshes. It is removed only
  // by the explicit Logout action; sessionStorage is used only as a migration fallback.
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('nda_user_session') || sessionStorage.getItem('nda_user_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed?.user?.email && parsed?.role) return parsed;
      localStorage.removeItem('nda_user_session');
      sessionStorage.removeItem('nda_user_session');
      return null;
    } catch { return null; }
  });
  // Restore the exact workspace after refresh instead of returning to the system picker.
  const [selectedSystem, setSelectedSystem] = useState(() => {
    try {
      const savedSystem = localStorage.getItem('nda_selected_system') || sessionStorage.getItem('nda_selected_system');
      if (savedSystem === 'none') return null;
      if (savedSystem === 'hr' || savedSystem === 'business') return savedSystem;
      const savedSession = JSON.parse(localStorage.getItem('nda_user_session') || sessionStorage.getItem('nda_user_session') || 'null');
      if (savedSession?.system_scope === 'business') return 'business';
      if (savedSession?.user?.email && savedSession?.role) return 'hr';
      return null;
    } catch { return null; }
  }); // 'hr' | 'business'
  const [sessionRestoreReady, setSessionRestoreReady] = useState(false);
  const [businessType, setBusinessType] = useState(() => {
    try { return localStorage.getItem('nda_business_type') || 'transport'; } catch { return 'transport'; }
  });
  const [businessTransactions, setBusinessTransactions] = useState([]);
  const [businessWorkers, setBusinessWorkers] = useState([]);
  const [businessSalaryPayments, setBusinessSalaryPayments] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0,10));
  const [businessMonth, setBusinessMonth] = useState(new Date().toISOString().slice(0,7));
  const [businessTxnKind, setBusinessTxnKind] = useState('income');
  const [businessTxnCategory, setBusinessTxnCategory] = useState('Daily income');
  const [businessTxnDescription, setBusinessTxnDescription] = useState('');
  const [businessTxnAmount, setBusinessTxnAmount] = useState('');
  const [businessTxnPaymentMode, setBusinessTxnPaymentMode] = useState('Cash');
  const [businessWorkerName, setBusinessWorkerName] = useState('');
  const [businessWorkerJob, setBusinessWorkerJob] = useState('Driver');
  const [businessWorkerPhone, setBusinessWorkerPhone] = useState('');
  const [businessWorkerSalary, setBusinessWorkerSalary] = useState('');
  const [businessSalaryWorkerId, setBusinessSalaryWorkerId] = useState('');
  const [businessSalaryAmount, setBusinessSalaryAmount] = useState('');
  const [businessSalaryPaymentMode, setBusinessSalaryPaymentMode] = useState('Cash');
  const [businessSalaryDate, setBusinessSalaryDate] = useState(new Date().toISOString().slice(0,10));
  const [businessCurrency, setBusinessCurrency] = useState('AED');
  const [businessTxnVehicle, setBusinessTxnVehicle] = useState('');
  const [businessTxnRemarks, setBusinessTxnRemarks] = useState('');
  const [businessAccess, setBusinessAccess] = useState(null);
  const [businessAccessList, setBusinessAccessList] = useState([]);
  const [businessAccessEmail, setBusinessAccessEmail] = useState('');
  const [businessAccessType, setBusinessAccessType] = useState('transport');
  const [businessAccessFlags, setBusinessAccessFlags] = useState({ can_view: true, can_add: false, can_edit: false, can_delete: false, can_manage_workers: false, can_manage_access: false });
  const [email, setEmail] = useState(() => { try { return sessionStorage.getItem('nda_last_hr_email') || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  // Short-lived server-issued token for private HR worker documents (custom HR login).
  const [workerDocToken, setWorkerDocToken] = useState(() => { try { return sessionStorage.getItem('nda_worker_docs_token') || ''; } catch { return ''; } });
  const [authLoading, setAuthLoading] = useState(false);
  // Admin starts in safe read-only mode; editing is enabled explicitly from the header.
 // Monthly Timesheet Modal & Date Selection States
  const [showMonthlyTimesheetModal, setShowMonthlyTimesheetModal] = useState(false);
  const [payrollStartDate, setPayrollStartDate] = useState(() => getInitialPayrollRange().startDate);
  const [payrollEndDate, setPayrollEndDate] = useState(() => getInitialPayrollRange().endDate);
  const [payrollMonth, setPayrollMonth] = useState(() => getPayrollMonthFromEndDate(payrollEndDate));

  function handlePayrollMonthChange(e) {
    const val = e.target.value;
    setPayrollMonth(val);
    const range = getPayrollRangeFromMonth(val);
    setPayrollStartDate(range.startDate);
    setPayrollEndDate(range.endDate);
  }
  const [savingPayrollPeriodSettings, setSavingPayrollPeriodSettings] = useState(false);
  const [closedPayrollPeriods, setClosedPayrollPeriods] = useState([]);
  const [closingPayrollPeriod, setClosingPayrollPeriod] = useState(false);
  const [monthlyDepartmentFilter, setMonthlyDepartmentFilter] = useState('All');
  const [timesheetSearchQuery, setTimesheetSearchQuery] = useState(''); // 
  const [viewingWorkerTimesheet, setViewingWorkerTimesheet] = useState(null);
  // Annual Leave Tracking & Penalty States
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [annualManagementView, setAnnualManagementView] = useState('annual');
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [leaveSalaryRecords, setLeaveSalaryRecords] = useState([]);
  const [employmentEdit, setEmploymentEdit] = useState({});
  const [leaveSalaryWorkerId, setLeaveSalaryWorkerId] = useState('');
  const [leaveSalaryLastDate, setLeaveSalaryLastDate] = useState('');
  const [leaveSalaryAmount, setLeaveSalaryAmount] = useState('');
  const [finalCalcWorkerId, setFinalCalcWorkerId] = useState('');
  const [finalCalcDate, setFinalCalcDate] = useState(new Date().toISOString().slice(0,10));
  const [gratuityViewWorkerId, setGratuityViewWorkerId] = useState(null);
  const [lastReturnDateEdit, setLastReturnDateEdit] = useState({});
  
  // Manual & Custom Deduction States
  const [hasDeduction, setHasDeduction] = useState(true);
  const [manualDeductionDays, setManualDeductionDays] = useState('');
  const [deductionBreakdownText, setDeductionBreakdownText] = useState('');
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5);
  const [selectedDesignationStatus, setSelectedDesignationStatus] = useState({});
  
  // 12 Months dynamic deduction days state
  const [monthlyDeductions, setMonthlyDeductions] = useState({});
  
  // Password and administrator login settings
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [newLoginEmailInput, setNewLoginEmailInput] = useState('');
  const [cleanupMode, setCleanupMode] = useState('day');
  const [cleanupSelectedDate, setCleanupSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupMonth, setCleanupMonth] = useState(new Date().toISOString().slice(0,7));
  const [cleanupStartDate, setCleanupStartDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupEndDate, setCleanupEndDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupAttendance, setCleanupAttendance] = useState(true);
  const [cleanupDailyDetails, setCleanupDailyDetails] = useState(true);
  const [cleanupAnnualLeaves, setCleanupAnnualLeaves] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [userRole, setUserRole] = useState(() => session?.role || ({
    is_admin: true,
    assigned_department: 'All',
    assigned_site: 'All',
    can_view_dashboard: true,
    can_use_bulk: true,
    can_view_workers: true,
    can_add_workers: true,
    can_edit_workers: true,
    can_delete_workers: true,
    can_view_timesheet: true,
    can_edit_timesheet: true,
    can_view_payroll: true
  }));

  const [selectedCurrency, setSelectedCurrency] = useState('AED');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workerDirectoryFilter, setWorkerDirectoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [modalDepartment, setModalDepartment] = useState(null);
  const [modalLocationTab, setModalLocationTab] = useState('All');
  const [attendanceListModal, setAttendanceListModal] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);
  const [activityNotifications, setActivityNotifications] = useState([]);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationLoadError, setNotificationLoadError] = useState('');
  const [notificationSaveError, setNotificationSaveError] = useState('');
  const isHolidayDate = dateStr => Boolean(dateStr && (new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).getDay() === 0 || holidayDates.some(h => String(h.holiday_date || '').slice(0, 10) === String(dateStr).slice(0, 10))));
  // Admin Edit Mode has been removed. Existing role-based permission checks remain active.
  function requireHrEditMode(_actionLabel = 'change') { return true; }


  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [workerDocuments, setWorkerDocuments] = useState([]);
  const [sitesList, setSitesList] = useState(['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown']);
  const [departmentsList, setDepartmentsList] = useState(['Plumbing', 'Electrical', 'Civil', 'Mustafa', 'Drivers']);

  // Edit / Add Worker Form States
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [designation, setDesignation] = useState('Plumber');
  const [designationsList, setDesignationsList] = useState([
  'Carpenter',
  'Carpenter Helper',
  'Steel Fixer',
  'Steel Fixer Helper',
  'Plumber',
  'Mason',
  'Electrician',
  'Painter',
  'Helper',
  'Foreman',
  'Driver',
  'Office Boy',
  'Timekeeper'
]);
const [newDesignation, setNewDesignation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('0');

  // File Upload URL States
  const [passportFileUrl, setPassportFileUrl] = useState('');
  const [idCardFileUrl, setIdCardFileUrl] = useState('');
  const [medicalCardFileUrl, setMedicalCardFileUrl] = useState('');
  const [visaFileUrl, setVisaFileUrl] = useState('');
  const [labourCardFileUrl, setLabourCardFileUrl] = useState('');

  // Personal Docs & New Site/Dept Form
  const [personalDocTitle, setPersonalDocTitle] = useState('');
  const [personalDocCategory, setPersonalDocCategory] = useState('Visa');
  const [personalFileUrl, setPersonalFileUrl] = useState('');
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newDeptInput, setNewDeptInput] = useState('');

  // OCR Photo Scanner States
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Permission Creation States & Staff ID Input
  const [targetStaffId, setTargetStaffId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [targetDept, setTargetDept] = useState('All');
  const [targetSite, setTargetSite] = useState('Sharjah Mamzar');
  
  const [permDashboard, setPermDashboard] = useState(true);
  const [permBulk, setPermBulk] = useState(false);
  const [permViewWorkers, setPermViewWorkers] = useState(true);
  const [permAddWorkers, setPermAddWorkers] = useState(false);
  const [permEditWorkers, setPermEditWorkers] = useState(false);
  const [permDeleteWorkers, setPermDeleteWorkers] = useState(false);
  const [permTimesheetView, setPermTimesheetView] = useState(true);
  const [permDailyTimesheetView, setPermDailyTimesheetView] = useState(false);
  const [permTimesheetEdit, setPermTimesheetEdit] = useState(true);
  const [permPayroll, setPermPayroll] = useState(false);

  // Date and Bulk States with Designation
  const today = new Date().toISOString().split('T')[0];
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState(today);
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkDesignation, setBulkDesignation] = useState('All');
  const [bulkSite, setBulkSite] = useState('Sharjah Mamzar');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');
  const [bulkContractOT, setBulkContractOT] = useState('0');
  const [bulkContractOnlyDesignations, setBulkContractOnlyDesignations] = useState(['Steel Fixer']);
  const [bulkContractOnlyHours, setBulkContractOnlyHours] = useState('10');
  const [bulkContractOnlySite, setBulkContractOnlySite] = useState('Sharjah Mamzar');
  const [bulkContractOnlySaving, setBulkContractOnlySaving] = useState(false);
  // Management Extra OT: assign by department/designation or exact worker IDs.
  const [bulkExtraOTDepartment, setBulkExtraOTDepartment] = useState('All');
  const [bulkExtraOTDesignation, setBulkExtraOTDesignation] = useState('All');
  const [bulkExtraOTSite, setBulkExtraOTSite] = useState('Sharjah Mamzar');
  const [bulkExtraOTHours, setBulkExtraOTHours] = useState('2');
  const [bulkExtraOTWorkerIds, setBulkExtraOTWorkerIds] = useState('');
  const [bulkExtraOTSaving, setBulkExtraOTSaving] = useState(false);
  
  // Quick Attendance States
  const [quickWorkerId, setQuickWorkerId] = useState('');
  const [quickSite, setQuickSite] = useState('Sharjah Mamzar');
  const [quickOTType, setQuickOTType] = useState('Normal OT');
  const [quickHours, setQuickHours] = useState('2');
  const [quickSaving, setQuickSaving] = useState(false);
  const [siteAttendanceIds, setSiteAttendanceIds] = useState('');
  const [siteAttendanceSite, setSiteAttendanceSite] = useState('Sharjah Mamzar');
  const [siteAttendanceDepartment, setSiteAttendanceDepartment] = useState('Mustafa');
  const [siteAttendanceSaving, setSiteAttendanceSaving] = useState(false);
  // Bulk attendance by site + department + designation (separate from OT controls).
  const [bulkMarkSite, setBulkMarkSite] = useState('Sharjah Mamzar');
  const [bulkMarkDepartment, setBulkMarkDepartment] = useState('All');
  const [bulkMarkDesignation, setBulkMarkDesignation] = useState('All');
  const [bulkMarkStatus, setBulkMarkStatus] = useState('Present');
  const [bulkMarkSaving, setBulkMarkSaving] = useState(false);
  const [bulkOpenSection, setBulkOpenSection] = useState('designationAttendance');
  const [siteHolidayNormalOT, setSiteHolidayNormalOT] = useState('2');
  const [siteHolidayContractOT, setSiteHolidayContractOT] = useState('0');
  
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
 const [dailyTimesheetSite, setDailyTimesheetSite] = useState('All Workers');
 const [dailyTimesheetDepartment, setDailyTimesheetDepartment] = useState('All');
 const [dailyWorkDetailRows, setDailyWorkDetailRows] = useState([]);
 const [dailyWorkDetailDraft, setDailyWorkDetailDraft] = useState('');
 const [dailyWorkDetailSite, setDailyWorkDetailSite] = useState('Sharjah Mamzar');
 const [dailyWorkDetailDepartment, setDailyWorkDetailDepartment] = useState('Mustafa');
 const [payrollDepartment, setPayrollDepartment] = useState('All');
  useEffect(() => {
    if (userRole?.is_admin) {
      setDailyTimesheetDepartment(selectedDeptFilter);
      setBulkMarkDepartment(selectedDeptFilter);
      setBulkDepartment(selectedDeptFilter);
      setPayrollDepartment(selectedDeptFilter);
      setDailyTimesheetSite(selectedSiteFilter === 'All' ? 'All Workers' : selectedSiteFilter);
    } else {
      if (userRole?.assigned_department) {
        setDailyTimesheetDepartment(userRole.assigned_department);
        setBulkMarkDepartment(userRole.assigned_department);
        setBulkDepartment(userRole.assigned_department);
        setPayrollDepartment(userRole.assigned_department);
      }
      if (userRole?.assigned_site) {
        setDailyTimesheetSite(userRole.assigned_site === 'All' ? 'All Workers' : userRole.assigned_site);
      }
    }
  }, [selectedDeptFilter, selectedSiteFilter, userRole?.is_admin, userRole?.assigned_department, userRole?.assigned_site]);
 const [savedDailyWorkDetails, setSavedDailyWorkDetails] = useState('');
 const [dailyWorkDetailsLoadError, setDailyWorkDetailsLoadError] = useState('');
 const [dailyWorkDetailsSaving, setDailyWorkDetailsSaving] = useState(false);
  async function fetchBusinessData(type = businessType) {
    if (!session) return;
    setBusinessLoading(true);
    const dbBusinessType = type === 'other' ? 'dairy' : type; // keep compatibility with older records stored as dairy
    try {
      const [tx, ws, pay] = await Promise.all([
        supabase.from('business_transactions').select('*').eq('business_type', dbBusinessType).order('transaction_date', { ascending: false }),
        supabase.from('business_workers').select('*').eq('business_type', dbBusinessType).order('worker_name', { ascending: true }),
        supabase.from('business_salary_payments').select('*').eq('business_type', dbBusinessType).order('payment_date', { ascending: false })
      ]);
      const firstError = tx.error || ws.error || pay.error;
      if (firstError) throw firstError;
      setBusinessTransactions(tx.data || []);
      setBusinessWorkers(ws.data || []);
      setBusinessSalaryPayments(pay.data || []);
      if (userRole.is_admin) {
        setBusinessAccess({ can_view: true, can_add: true, can_edit: true, can_delete: true, can_manage_workers: true, can_manage_access: true });
        const { data: accessRows, error: accessError } = await supabase.from('business_user_permissions').select('*').eq('business_type', type).order('user_email', { ascending: true });
        if (!accessError) setBusinessAccessList(accessRows || []);
      } else {
        const { data: accessRow, error: accessError } = await supabase.from('business_user_permissions').select('*').eq('business_type', type).ilike('user_email', session?.user?.email || '').maybeSingle();
        setBusinessAccess(!accessError && accessRow ? accessRow : { can_view: false, can_add: false, can_edit: false, can_delete: false, can_manage_workers: false, can_manage_access: false });
      }
    } catch (e) {
      console.error('Business data load error:', e);
      if (!userRole.is_admin) setBusinessAccess({ can_view: false, can_add: false, can_edit: false, can_delete: false, can_manage_workers: false, can_manage_access: false });
      alert('Business tables load nahi huay. Pehle business SQL setup run karein. Detail: ' + (e?.message || e));
    } finally { setBusinessLoading(false); }
  }

  useEffect(() => {
    if (session && selectedSystem === 'business') fetchBusinessData(businessType);
  }, [session, selectedSystem, businessType]);

  useEffect(() => {
    if (session && selectedSystem === 'hr') fetchHolidayDates();
  }, [session, selectedSystem]);

  async function handleSaveBusinessTransaction(e) {
    e.preventDefault();
    if (!userRole.is_admin && !businessAccess?.can_add) return alert('Aap ko business entry add karne ki permission nahi hai.');
    const amount = Number(businessTxnAmount);
    if (!businessDate || !Number.isFinite(amount) || amount <= 0) return alert('Date aur amount sahi enter karein.');
    const payload = {
      business_type: businessType === 'other' ? 'dairy' : businessType,
      transaction_date: businessDate,
      transaction_kind: businessTxnKind,
      category: businessTxnCategory.trim() || (businessTxnKind === 'income' ? 'Daily Income' : 'Other Business Expense'),
      description: businessTxnDescription.trim(),
      remarks: businessTxnRemarks.trim(),
      vehicle_number: businessTxnVehicle.trim(),
      amount,
      currency: businessCurrency,
      payment_mode: businessTxnPaymentMode,
      created_by: session?.user?.email || ''
    };
    const { error } = await supabase.from('business_transactions').insert([payload]);
    if (error) return alert('Entry save nahi hui: ' + error.message + '\nBusiness SQL setup run kiya hai?');
    void logActivity('Business entry', `${payload.transaction_date}: ${payload.transaction_kind} ${payload.category}, ${payload.amount} ${payload.currency}${payload.vehicle_number ? ', vehicle ' + payload.vehicle_number : ''}`);
    setBusinessTxnAmount(''); setBusinessTxnDescription(''); setBusinessTxnRemarks(''); setBusinessTxnVehicle('');
    await fetchBusinessData();
    alert('Business entry save ho gayi.');
  }

  async function handleAddBusinessWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin && !businessAccess?.can_manage_workers) return alert('Drivers/staff add karne ki permission nahi hai.');
    if (!businessWorkerName.trim()) return alert('Worker/driver ka naam likhein.');
    const payload = { business_type: businessType === 'other' ? 'dairy' : businessType, worker_name: businessWorkerName.trim(), job_title: businessWorkerJob.trim() || (businessType === 'transport' ? 'Driver' : 'Staff'), phone: businessWorkerPhone.trim(), monthly_salary: Number(businessWorkerSalary) || 0, currency: businessCurrency, active: true };
    const { error } = await supabase.from('business_workers').insert([payload]);
    if (error) return alert('Worker save nahi hua: ' + error.message);
    setBusinessWorkerName(''); setBusinessWorkerPhone(''); setBusinessWorkerSalary('');
    await fetchBusinessData(); alert('Driver/staff add ho gaya.');
  }

  async function handleEditBusinessWorker(worker) {
    if (!userRole.is_admin && !businessAccess?.can_manage_workers) return alert('Drivers/staff modify karne ki permission nahi hai.');
    const workerName = window.prompt('Name', worker.worker_name || '');
    if (workerName === null) return;
    if (!workerName.trim()) return alert('Name khali nahi ho sakta.');
    const phone = window.prompt('Phone number', worker.phone || '');
    if (phone === null) return;
    const jobTitle = window.prompt('Role / designation', worker.job_title || '');
    if (jobTitle === null) return;
    const salaryText = window.prompt('Monthly salary', String(worker.monthly_salary || 0));
    if (salaryText === null) return;
    const salary = Number(salaryText);
    if (!Number.isFinite(salary) || salary < 0) return alert('Salary sahi enter karein.');
    const { error } = await supabase.from('business_workers').update({ worker_name: workerName.trim(), phone: phone.trim(), job_title: jobTitle.trim(), monthly_salary: salary, currency: businessCurrency }).eq('id', worker.id).eq('business_type', businessType === 'other' ? 'dairy' : businessType);
    if (error) return alert('Worker details update nahi huin: ' + error.message);
    await fetchBusinessData();
  }

  async function handlePayBusinessSalary(e) {
    e.preventDefault();
    if (!userRole.is_admin && !businessAccess?.can_add) return alert('Salary payment add karne ki permission nahi hai.');
    const worker = businessWorkers.find(w => String(w.id) === String(businessSalaryWorkerId));
    const amount = Number(businessSalaryAmount);
    if (!worker || !businessSalaryDate || !Number.isFinite(amount) || amount <= 0) return alert('Worker, date aur salary amount sahi select karein.');
    const { error } = await supabase.from('business_salary_payments').insert([{ business_type: businessType === 'other' ? 'dairy' : businessType, worker_id: worker.id, payment_date: businessSalaryDate, amount, currency: businessCurrency, payment_mode: businessSalaryPaymentMode, notes: 'Salary payment' }]);
    if (error) return alert('Salary payment save nahi hui: ' + error.message);
    setBusinessSalaryAmount(''); await fetchBusinessData(); alert('Salary payment save ho gayi.');
  }

  async function handleDeleteBusinessTransaction(id) {
    if (!userRole.is_admin && !businessAccess?.can_delete) return alert('Delete permission nahi hai.');
    if (!window.confirm('Kya aap is financial entry ko permanently delete karna chahte hain?')) return;
    const { error } = await supabase.from('business_transactions').delete().eq('id', id).eq('business_type', businessType === 'other' ? 'dairy' : businessType);
    if (error) return alert('Delete error: ' + error.message);
    await fetchBusinessData();
  }

  async function handleEditBusinessTransaction(t) {
    if (!userRole.is_admin && !businessAccess?.can_edit) return alert('Edit permission nahi hai.');
    const newDate = window.prompt('Transaction date (YYYY-MM-DD)', t.transaction_date || businessDate);
    if (newDate === null) return;
    const newCategory = window.prompt('Category', t.category || '');
    if (newCategory === null) return;
    const newAmountText = window.prompt('Amount', String(t.amount ?? ''));
    if (newAmountText === null) return;
    const newAmount = Number(newAmountText);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !Number.isFinite(newAmount) || newAmount <= 0) return alert('Date ya amount sahi nahi.');
    const newDescription = window.prompt('Details', t.description || '');
    if (newDescription === null) return;
    const newRemarks = window.prompt('Remarks', t.remarks || '');
    if (newRemarks === null) return;
    const newVehicle = window.prompt('Vehicle number / reference', t.vehicle_number || '');
    if (newVehicle === null) return;
    const newPaymentMode = window.prompt('Payment mode: Cash, Credit, or Bank', t.payment_mode || 'Cash');
    if (newPaymentMode === null) return;
    if (!['Cash','Credit','Bank'].includes(newPaymentMode)) return alert('Payment mode sirf Cash, Credit, ya Bank ho sakta hai.');
    const newCurrency = window.prompt('Currency: PKR, AED, or SAR', t.currency || 'AED');
    if (newCurrency === null) return;
    if (!['PKR','AED','SAR'].includes(newCurrency)) return alert('Currency PKR, AED, ya SAR honi chahiye.');
    const { error } = await supabase.from('business_transactions').update({ transaction_date: newDate, category: newCategory, amount: newAmount, description: newDescription, remarks: newRemarks, vehicle_number: newVehicle, payment_mode: newPaymentMode, currency: newCurrency }).eq('id', t.id).eq('business_type', businessType === 'other' ? 'dairy' : businessType);
    if (error) return alert('Edit save nahi hua: ' + error.message);
    await fetchBusinessData();
  }

  async function handleSaveBusinessAccess(e) {
    e.preventDefault();
    if (!userRole.is_admin && !businessAccess?.can_manage_access) return alert('Staff access manage karne ki permission nahi hai.');
    const cleanEmail = businessAccessEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return alert('Staff ka valid email enter karein.');
    const payload = { user_email: cleanEmail, business_type: businessAccessType, ...businessAccessFlags, updated_by: session?.user?.email || '', updated_at: new Date().toISOString() };
    const { error } = await supabase.from('business_user_permissions').upsert([payload], { onConflict: 'user_email,business_type' });
    if (error) return alert('Access save nahi hua: ' + error.message + '. Pehle SQL setup run karein.');
    setBusinessAccessEmail('');
    await fetchBusinessData();
    alert('Business staff permissions save ho gayi hain.');
  }

  async function handleDeleteBusinessAccess(row) {
    if (!userRole.is_admin && !businessAccess?.can_manage_access) return alert('Access manage karne ki permission nahi hai.');
    if (!window.confirm(`${row.user_email} ka ${row.business_type} access remove karna hai?`)) return;
    const { error } = await supabase.from('business_user_permissions').delete().eq('user_email', row.user_email).eq('business_type', row.business_type);
    if (error) return alert('Access remove nahi hua: ' + error.message);
    await fetchBusinessData();
  }

  async function handleSaveDailyWorkDetails(e) {
    e?.preventDefault?.();
    if (!userRole.is_admin && !userRole.can_use_bulk && !userRole.can_edit_timesheet) return alert('Aapko Daily Work Details save karne ki permission nahi hai.');
    const workDate = selectedTimesheetDate;
    const workSite = !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All' ? userRole.assigned_site : dailyWorkDetailSite;
    const workDepartment = !userRole.is_admin && userRole.assigned_department && userRole.assigned_department !== 'All' ? userRole.assigned_department : dailyWorkDetailDepartment;
    const workDetails = dailyWorkDetailDraft.trim();
    if (!workDate || !workSite || !workDepartment || workDepartment === 'All') return alert('Date, working site aur ek specific department select karein.');
    if (!workDetails) return alert('Daily work details likhein.');
    setDailyWorkDetailsSaving(true);
    try {
      const { data: existingRows, error: findError } = await supabase.from('daily_work_details').select('work_date,work_site,work_department').eq('work_date', workDate).eq('work_site', workSite).eq('work_department', workDepartment);
      if (findError) throw findError;
      if ((existingRows || []).length) {
        const { error } = await supabase.from('daily_work_details').update({ work_details: workDetails }).eq('work_date', workDate).eq('work_site', workSite).eq('work_department', workDepartment);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_work_details').insert([{ work_date: workDate, work_site: workSite, work_department: workDepartment, work_details: workDetails }]);
        if (error && error.code === '23505') {
          const retry = await supabase.from('daily_work_details').update({ work_details: workDetails }).eq('work_date', workDate).eq('work_site', workSite).eq('work_department', workDepartment);
          if (retry.error) throw retry.error;
        } else if (error) throw error;
      }
      setDailyWorkDetailDraft('');
      alert(`Daily Work Details ${workDate} / ${workSite} / ${workDepartment} ke liye save ho gayi hain.`);
      // Refresh the existing date/site/department view without changing any other records.
      const { data, error } = await supabase.from('daily_work_details').select('work_date,work_site,work_department,work_details').eq('work_date', workDate);
      if (!error) setDailyWorkDetailRows(data || []);
    } catch (err) {
      alert('Daily Work Details save nahi hui: ' + (err?.message || String(err)));
    } finally { setDailyWorkDetailsSaving(false); }
  }

  async function editDailyWorkDetail(row) {
    if (!userRole.is_admin) return alert('Daily work details edit sirf Admin kar sakta hai. Staff sirf nayi entry kar sakta hai.');
    const next = window.prompt('Daily Work Details edit karein:', row.work_details || '');
    if (next === null) return;
    if (!next.trim()) return alert('Details khali nahi ho sakti.');
    const { error } = await supabase.from('daily_work_details').update({ work_details: next.trim() }).eq('work_date', row.work_date).eq('work_site', row.work_site).eq('work_department', row.work_department);
    if (error) return alert('Details update nahi hui: ' + error.message);
    setDailyWorkDetailRows(rows => rows.map(x => x.work_date === row.work_date && x.work_site === row.work_site && x.work_department === row.work_department ? {...x, work_details: next.trim()} : x));
  }

  async function deleteDailyWorkDetail(row) {
    if (!userRole.is_admin) return alert('Daily work details delete sirf Admin kar sakta hai.');
    if (!window.confirm(`${row.work_date} / ${row.work_site} / ${row.work_department} ki details delete karni hain?`)) return;
    const { error } = await supabase.from('daily_work_details').delete().eq('work_date', row.work_date).eq('work_site', row.work_site).eq('work_department', row.work_department);
    if (error) return alert('Details delete nahi hui: ' + error.message);
    setDailyWorkDetailRows(rows => rows.filter(x => !(x.work_date === row.work_date && x.work_site === row.work_site && x.work_department === row.work_department)));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDailyWorkDetails() {
      if (!selectedTimesheetDate) {
        setDailyWorkDetailRows([]);
        setSavedDailyWorkDetails('');
        setDailyWorkDetailsLoadError('');
        return;
      }
      setDailyWorkDetailsLoadError('');
      // Staff are scoped at the database query as well as in the UI. Never fetch
      // another department's work details into a staff browser session.
      const assignedDepartment = String(userRole.assigned_department || '').trim();
      const assignedSite = String(userRole.assigned_site || '').trim();
      let detailsQuery = supabase
        .from('daily_work_details')
        .select('work_date,work_site,work_department,work_details')
        .eq('work_date', selectedTimesheetDate);
      if (!userRole.is_admin && assignedDepartment && assignedDepartment !== 'All') {
        detailsQuery = detailsQuery.ilike('work_department', assignedDepartment);
      }
      if (!userRole.is_admin && assignedSite && assignedSite !== 'All') {
        detailsQuery = detailsQuery.ilike('work_site', assignedSite);
      }
      const { data, error } = await detailsQuery;
      if (cancelled) return;
      if (error) {
        console.error('Daily Work Details load error:', error.message);
        setSavedDailyWorkDetails('');
        setDailyWorkDetailsLoadError(error.message || 'Database read failed');
        return;
      }
      setDailyWorkDetailRows(data || []);
      const norm = value => String(value || '').trim().toLowerCase();
      const effectiveDepartment = !userRole.is_admin && userRole.assigned_department && userRole.assigned_department !== 'All'
        ? userRole.assigned_department : selectedDeptFilter;
      const effectiveSite = !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
        ? userRole.assigned_site : dailyTimesheetSite;
      const allRows = (data || []).filter(item => {
        if (!String(item.work_details || '').trim()) return false;
        const siteMatches = effectiveSite === 'All Workers' || effectiveSite === 'All' || norm(item.work_site) === norm(effectiveSite);
        const deptMatches = effectiveDepartment === 'All' || norm(item.work_department) === norm(effectiveDepartment);
        return siteMatches && deptMatches;
      });
      let rows = allRows;
      // Legacy 'All' remarks are an admin-only fallback; never expose them to staff.
      if (userRole.is_admin && effectiveDepartment !== 'All') {
        const exactSites = new Set(rows.map(item => norm(item.work_site)));
        rows = rows.concat(allRows.filter(item => norm(item.work_department) === 'all' && !exactSites.has(norm(item.work_site))));
      }
      // De-duplicate legacy rows with the same site + department, keeping the latest row.
      const uniqueRows = new Map();
      rows.forEach(item => uniqueRows.set(`${norm(item.work_site)}|${norm(item.work_department)}`, item));
      const visibleRows = Array.from(uniqueRows.values());
      const combined = userRole.is_admin && effectiveDepartment === 'All'
        ? visibleRows.map(item => `${item.work_site || 'Site'} / ${item.work_department || 'Department'}: ${item.work_details}`).join('\n')
        : visibleRows.map(item => item.work_details).join('\n');
      setSavedDailyWorkDetails(combined);
    }
    loadDailyWorkDetails();
    return () => { cancelled = true; };
  }, [selectedTimesheetDate, dailyTimesheetSite, selectedDeptFilter, selectedSiteFilter, userRole.is_admin, userRole.assigned_department, userRole.assigned_site]);


  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const totalDaysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Persist login and workspace across refreshes. Only handleLogout clears these keys.
  useEffect(() => {
    try {
      if (session?.user?.email && session?.role) {
        const serialized = JSON.stringify(session);
        localStorage.setItem('nda_user_session', serialized);
        sessionStorage.setItem('nda_user_session', serialized); // compatibility with older build
      } else {
        localStorage.removeItem('nda_user_session');
        sessionStorage.removeItem('nda_user_session');
      }
    } catch (err) { console.warn('App session could not be saved:', err); }
  }, [session]);

  // Restore Supabase's real Business Auth tokens before mounting either workspace.
  // The previous build restored only the app's display session; it did not explicitly
  // restore the Supabase access/refresh tokens needed by Business database requests.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        if (session?.system_scope === 'business') {
          let savedAuth = null;
          try { savedAuth = JSON.parse(localStorage.getItem('nda_business_auth_session') || 'null'); } catch {}
          let restored = false;
          if (savedAuth?.access_token && savedAuth?.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: savedAuth.access_token,
              refresh_token: savedAuth.refresh_token
            });
            restored = !error && !!data?.session;
            if (error) console.warn('Business auth restore failed:', error.message);
          }
          if (!restored) {
            const { data, error } = await supabase.auth.getSession();
            restored = !error && !!data?.session;
            if (restored) {
              try { localStorage.setItem('nda_business_auth_session', JSON.stringify(data.session)); } catch {}
            }
          }
          if (!restored && active) {
            // Old saved app sessions did not contain Supabase tokens. Ask for one fresh login.
            setSession(null);
            setSelectedSystem('business');
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
        if (session?.system_scope === 'business' && active) {
          setSession(null);
          setSelectedSystem('business');
        }
      } finally {
        if (active) setSessionRestoreReady(true);
      }
    };
    restore();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, authSession) => {
      try {
        if (authSession?.access_token && authSession?.refresh_token) {
          localStorage.setItem('nda_business_auth_session', JSON.stringify(authSession));
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('nda_business_auth_session');
        }
      } catch (err) { console.warn('Business auth token could not be saved:', err); }
    });
    return () => {
      active = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    try {
      if (selectedSystem === 'hr' || selectedSystem === 'business') {
        localStorage.setItem('nda_selected_system', selectedSystem);
        sessionStorage.setItem('nda_selected_system', selectedSystem);
        if (selectedSystem === 'business') localStorage.setItem('nda_business_type', businessType || 'transport');
      } else if (selectedSystem === null && !session) {
        localStorage.removeItem('nda_selected_system');
        sessionStorage.removeItem('nda_selected_system');
      } else if (selectedSystem === null && session) {
        localStorage.setItem('nda_selected_system', 'none');
        sessionStorage.setItem('nda_selected_system', 'none');
      }
    } catch (err) { console.warn('Selected system could not be saved:', err); }
  }, [selectedSystem, session, businessType]);

 useEffect(() => {
  if (session) {
    fetchWorkers();
    fetchAttendance();
    fetchPermissionsList();
    fetchPersonalDocs();
    fetchAnnualLeaves();
    fetchEmploymentRecords();
    fetchLeaveSalaryRecords();
    fetchDesignations();
    fetchSystemLists();
  }
}, [session]);

 useEffect(() => {
   if (session) {
     fetchClosedPayrollPeriods();
     fetchPayrollPeriodSettings();
   }
 }, [session]);

  async function fetchPayrollPeriodSettings() {
    const { data, error } = await supabase
      .from('payroll_period_settings')
      .select('start_date,end_date')
      .eq('setting_key', 'global')
      .maybeSingle();
    if (error) {
      console.warn('Payroll date settings table is not ready yet. Run payroll_period_setup.sql:', error.message);
      return;
    }
    if (data?.start_date && data?.end_date) {
      const savedStart = String(data.start_date).slice(0, 10);
      const savedEnd = String(data.end_date).slice(0, 10);
      setPayrollStartDate(savedStart);
      setPayrollEndDate(savedEnd);
      setPayrollMonth(getPayrollMonthFromEndDate(savedEnd));
    }
  }

  async function savePayrollPeriodSettings(startDate = payrollStartDate, endDate = payrollEndDate, showMessage = true) {
  if (!requireHrEditMode('Payroll period settings')) return;

    if (!startDate || !endDate || startDate > endDate) {
      if (showMessage) alert('Start Date aur End Date sahi select karein.');
      return false;
    }
    if (!userRole.is_admin) {
      if (showMessage) alert('Sirf Admin payroll dates change kar sakta hai.');
      return false;
    }
    setSavingPayrollPeriodSettings(true);
    try {
      const payload = {
        setting_key: 'global',
        start_date: startDate,
        end_date: endDate,
        updated_by: session?.user?.email || '',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('payroll_period_settings').upsert([payload], { onConflict: 'setting_key' });
      if (error) throw error;
      setPayrollStartDate(startDate);
      setPayrollEndDate(endDate);
      setPayrollMonth(getPayrollMonthFromEndDate(endDate));
      void logActivity('Payroll period changed', `${startDate} to ${endDate}`);
      if (showMessage) alert(`Payroll period save ho gaya: ${startDate} se ${endDate}. HR payroll reports ab isi date range ke mutabiq hain.`);
      return true;
    } catch (err) {
      if (showMessage) alert('Payroll dates save nahi huin: ' + (err?.message || String(err)) + '\nSupabase mein payroll_period_settings table ka SQL setup chalayein.');
      return false;
    } finally {
      setSavingPayrollPeriodSettings(false);
    }
  }

  async function fetchClosedPayrollPeriods() {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) {
      console.warn('Payroll closing table is not ready yet. Run the supplied SQL setup:', error.message);
      return;
    }
    setClosedPayrollPeriods(data || []);
  }

  function isPayrollDateClosed(dateStr) {
    const date = String(dateStr || '').slice(0, 10);
    if (!date) return false;
    return closedPayrollPeriods.some(period =>
      period.status === 'closed' && date >= String(period.start_date).slice(0, 10) && date <= String(period.end_date).slice(0, 10)
    );
  }

  async function closeSelectedPayrollPeriod() {
    if (!requireHrEditMode('Salary period close')) return;

    if (!userRole.is_admin) return alert('Sirf Admin salary month close kar sakta hai.');
    if (!payrollStartDate || !payrollEndDate || payrollStartDate > payrollEndDate) return alert('Pehle valid Start Date aur End Date select karein.');
    if (currentPayrollPeriodClosed) return alert('Yeh salary period pehle se close hai.');
    const overlapsClosed = closedPayrollPeriods.some(period => period.status === 'closed' && payrollPeriodStartDate <= String(period.end_date).slice(0, 10) && payrollPeriodEndDate >= String(period.start_date).slice(0, 10));
    if (overlapsClosed) return alert('Selected date range kisi pehle se closed payroll period se overlap kar rahi hai. Pehle us closed period ko reopen karein, phir closing karein.');
    const confirmed = window.confirm(`Salary period ${payrollPeriodStartDate} se ${payrollPeriodEndDate} tak close karna hai?\n\nIs period ki attendance / overtime entries app se edit nahi ho sakein gi. Close hone ke baad agla salary period khul jayega.`);
    if (!confirmed) return;
    setClosingPayrollPeriod(true);
    try {
      const payload = {
        start_date: payrollPeriodStartDate,
        end_date: payrollPeriodEndDate,
        status: 'closed',
        closed_by: session?.user?.email || '',
        closed_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('payroll_periods')
        .upsert([payload], { onConflict: 'start_date,end_date' })
        .select()
        .single();
      if (error) throw error;
      setClosedPayrollPeriods(prev => [...prev.filter(x => !(x.start_date === payload.start_date && x.end_date === payload.end_date)), data || payload]);
      const nextStartDate = shiftPayrollDateOneMonth(payrollPeriodStartDate);
      const nextEndDate = shiftPayrollDateOneMonth(payrollPeriodEndDate);
      setPayrollStartDate(nextStartDate);
      setPayrollEndDate(nextEndDate);
      setPayrollMonth(getPayrollMonthFromEndDate(nextEndDate));
      setSelectedTimesheetDate(nextStartDate);
      const settingsSaved = await savePayrollPeriodSettings(nextStartDate, nextEndDate, false);
      alert(`Salary period close ho gaya: ${payload.start_date} se ${payload.end_date}. Agla period ${nextStartDate} se ${nextEndDate} set kar diya hai.${settingsSaved ? '' : '\nNote: dates is session mein set hain, lekin global settings save nahi huin. SQL/table permission check karein.'}`);
    } catch (err) {
      alert('Salary period close nahi hua: ' + (err?.message || String(err)) + '\nPehle business/HR SQL setup mein payroll_periods table banayein.');
    } finally {
      setClosingPayrollPeriod(false);
    }
  }

  async function reopenSelectedPayrollPeriod() {
    if (!requireHrEditMode('Salary period reopen')) return;

    if (!userRole.is_admin) return alert('Sirf Admin salary period reopen kar sakta hai.');
    if (!currentPayrollPeriodClosed) return;
    const confirmed = window.confirm(`Kya ${payrollPeriodStartDate} se ${payrollPeriodEndDate} ka closed salary period dobara open karna hai?`);
    if (!confirmed) return;
    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ status: 'open', reopened_by: session?.user?.email || '', reopened_at: new Date().toISOString() })
      .eq('start_date', payrollPeriodStartDate)
      .eq('end_date', payrollPeriodEndDate)
      .select()
      .single();
    if (error) return alert('Period reopen nahi hua: ' + error.message);
    setClosedPayrollPeriods(prev => prev.map(x => x.start_date === data.start_date && x.end_date === data.end_date ? data : x));
    alert('Salary period dobara open ho gaya.');
  }

  async function fetchAnnualLeaves() {
    const { data, error } = await supabase.from('annual_leaves').select('*').order('id', { ascending: false });
    if (error) {
      console.error('Error fetching annual leaves:', error.message);
    } else if (data) {
      setAnnualLeaveList(data);
    }
  }

  async function fetchEmploymentRecords() {
    const { data: workerRows, error: workerError } = await supabase
      .from('workers').select('id,joining_date,cancellation_date,basic_salary,unpaid_absence_days');
    const { data: legacyRows, error: legacyError } = await supabase.from('worker_employment_records').select('*');
    if (!workerError && workerRows) {
      const legacyByWorker = Object.fromEntries((legacyRows || []).map(r => [String(r.worker_id), r]));
      setEmploymentRecords(workerRows.map(w => {
        const old = legacyByWorker[String(w.id)] || {};
        return {
          ...old, worker_id: String(w.id),
          joining_date: w.joining_date || old.joining_date || '',
          cancellation_date: w.cancellation_date || old.cancellation_date || '',
          basic_salary: w.basic_salary ?? old.basic_salary ?? '',
          unpaid_absence_days: w.unpaid_absence_days ?? old.unpaid_absence_days ?? 0
        };
      }));
      if (legacyError) console.info('Legacy employment table not available; using workers table fields.');
      return;
    }
    // Keep older installations readable until the workers-column migration is applied.
    if (legacyError) console.warn('Employment details load failed:', workerError?.message || legacyError.message);
    else setEmploymentRecords(legacyRows || []);
  }

  async function fetchLeaveSalaryRecords() {
    const { data, error } = await supabase.from('worker_leave_salary_records').select('*').order('leave_salary_last_date', { ascending: false });
    if (error) { console.warn('Leave salary records table not ready:', error.message); return; }
    setLeaveSalaryRecords(data || []);
  }

  async function saveEmploymentRecord(workerId) {
    if (!requireHrEditMode('Employment record save')) return;

    if (!userRole.is_admin) return alert('Sirf admin employment details update kar sakta hai.');
    const row = employmentEdit[String(workerId)] || {};
    if (!row.joining_date) return alert('Worker ki joining/start date enter karein.');
    const payload = {
      joining_date: row.joining_date,
      cancellation_date: row.cancellation_date || null,
      basic_salary: Number(row.basic_salary || 0),
      unpaid_absence_days: Math.max(0, Math.floor(Number(row.unpaid_absence_days || 0)))
    };
    const { error } = await supabase.from('workers').update(payload).eq('id', workerId);
    if (error) return alert('Employment details save nahi huin: ' + error.message + '\nSupabase SQL migration file run karein; workers table mein joining_date, cancellation_date, basic_salary aur unpaid_absence_days columns required hain.');
    await fetchWorkers();
    await fetchEmploymentRecords();
    void logActivity('Employment record updated', `Worker #${workerId}, joining date ${row.joining_date}, basic salary AED ${payload.basic_salary}`);
    alert('Joining date, cancellation date, basic salary aur unpaid absence details save ho gayi hain.');
  }

  async function saveLastVacationReturnDate(workerId) {
    if (!userRole.is_admin) return alert('Sirf Admin last vacation return date save kar sakta hai.');
    const dateValue = lastReturnDateEdit[String(workerId)] ?? workers.find(w => String(w.id) === String(workerId))?.last_return_date ?? '';
    if (!dateValue) return alert('Last vacation se wapsi ki date select karein.');
    const { error } = await supabase.from('workers').update({ last_return_date: dateValue }).eq('id', workerId);
    if (error) return alert('Last vacation return date save nahi hui: ' + error.message + '\nSupabase SQL migration run karein: ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS last_return_date date;');
    setWorkers(prev => prev.map(w => String(w.id) === String(workerId) ? { ...w, last_return_date: dateValue } : w));
    void logActivity('Last vacation return date saved', `Worker #${workerId}, return date ${dateValue}`);
    alert('Last vacation se wapsi ki date save ho gayi. Leave count dobara calculate ho gaya.');
  }

  async function saveLeaveSalaryReceived(e) {
    if (!requireHrEditMode('Leave salary save')) return;

    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin leave salary received record kar sakta hai.');
    if (!leaveSalaryWorkerId || !leaveSalaryLastDate) return alert('Worker aur leave salary ki last date select karein.');
    const { error } = await supabase.from('worker_leave_salary_records').insert([{ worker_id: String(leaveSalaryWorkerId), leave_salary_last_date: leaveSalaryLastDate, amount: Number(leaveSalaryAmount || 0), received_at: new Date().toISOString() }]);
    if (error) return alert('Leave salary record save nahi hua: ' + error.message + '\nPehle neeche diya SQL Supabase mein run karein.');
    void logActivity('Leave salary recorded', `Worker #${leaveSalaryWorkerId}, paid up to ${leaveSalaryLastDate}, amount ${Number(leaveSalaryAmount || 0)} AED`);
    setLeaveSalaryWorkerId(''); setLeaveSalaryLastDate(''); setLeaveSalaryAmount('');
    await fetchLeaveSalaryRecords();
    alert('Leave salary received save ho gayi. Is date ke baad leave balance dobara accrue hoga.');
  }
    // Check whether a worker is on annual leave on a selected date
function getAnnualLeaveForWorker(workerId, date) {
    if (!workerId || !date) return null;

    const leaveRecord = annualLeaveList.find(leave => {
      const sameWorker =
        String(leave.worker_id) === String(workerId);

      const startDate = leave.start_date;
      const actualReturn = leave.actual_return;

      const hasStarted = Boolean(startDate && String(date).slice(0, 10) >= String(startDate).slice(0, 10));

      // A future leave must not affect today's status. The actual return date is the first date back at work.
      const hasNotActuallyReturned =
        !actualReturn ||
        actualReturn === 'On Leave' ||
        String(date).slice(0, 10) < String(actualReturn).slice(0, 10);

      return (
        sameWorker &&
        hasStarted &&
        hasNotActuallyReturned
      );
    });

    return leaveRecord || null;
  }

// Overtime is counted on normal Present days and on workers who actually worked on a holiday.
function isPresentAttendanceStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  return value === 'present' || value === 'holiday present';
}

async function fetchDesignations() {
  const defaultNames = [
    'Carpenter', 'Carpenter Helper', 'Steel Fixer', 'Steel Fixer Helper',
    'Plumber', 'Mason', 'Electrician', 'Painter', 'Helper', 'Foreman',
    'Driver', 'Office Boy', 'Timekeeper'
  ];
  const { data: allRows, error: readError } = await supabase
    .from('designations').select('id,name,is_active').order('name', { ascending: true });
  if (readError) {
    console.error('Error fetching designations:', readError.message);
    alert('Designations database setup check karein: ' + readError.message);
    return;
  }
  const existingNames = new Set((allRows || []).map(x => String(x.name || '').trim().toLowerCase()));
  const missing = defaultNames.filter(name => !existingNames.has(name.toLowerCase())).map(name => ({ name, is_active: true }));
  if (missing.length) {
    const { error } = await supabase.from('designations').insert(missing);
    if (error) console.error('Default designation seed failed:', error.message);
  }
  const { data, error } = await supabase.from('designations').select('name,is_active').eq('is_active', true).order('name', { ascending: true });
  if (error) {
    alert('Designations load nahi huin: ' + error.message);
    return;
  }
  const names = [...new Set((data || []).map(x => String(x.name || '').trim()).filter(Boolean))];
  setDesignationsList(names);
  if (names.length && !names.some(x => x.toLowerCase() === String(designation || '').trim().toLowerCase())) setDesignation(names[0]);
}

async function fetchSystemLists() {
  const defaults = {
    site: ['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown'],
    department: ['Plumbing', 'Electrical', 'Civil', 'Mustafa', 'Drivers']
  };
  const { data: rows, error } = await supabase.from('system_lists').select('id,list_type,name,is_active').order('name', { ascending: true });
  if (error) {
    console.error('System lists load failed:', error.message);
    alert('Department/Site database setup required: ' + error.message);
    return;
  }
  const existing = new Set((rows || []).map(r => `${r.list_type}|${String(r.name || '').trim().toLowerCase()}`));
  const missing = Object.entries(defaults).flatMap(([type, names]) => names
    .filter(name => !existing.has(`${type}|${name.toLowerCase()}`))
    .map(name => ({ list_type: type, name, is_active: true })));
  if (missing.length) {
    const { error: seedError } = await supabase.from('system_lists').insert(missing);
    if (seedError) console.error('System list seed failed:', seedError.message);
  }
  const { data: active, error: activeError } = await supabase.from('system_lists').select('list_type,name,is_active').eq('is_active', true).order('name', { ascending: true });
  if (activeError) {
    alert('Department/Site list load nahi hui: ' + activeError.message);
    return;
  }
  const sites = (active || []).filter(r => r.list_type === 'site').map(r => r.name);
  const depts = (active || []).filter(r => r.list_type === 'department').map(r => r.name);
  if (sites.length) setSitesList([...new Set(sites)]);
  if (depts.length) setDepartmentsList([...new Set(depts)]);
}

async function addSystemListItem(type, value) {
  if (!requireHrEditMode('System list update')) return;

  const name = String(value || '').trim();
  if (!name) return { error: { message: 'Name enter karein.' } };
  const { data: existing, error: findError } = await supabase.from('system_lists')
    .select('id,name,is_active').eq('list_type', type).ilike('name', name).limit(1);
  if (findError) return { error: findError };
  if (existing && existing.length) {
    if (existing[0].is_active) return { error: { message: 'Yeh naam pehle se mojood hai.' } };
    const { error } = await supabase.from('system_lists').update({ is_active: true }).eq('id', existing[0].id);
    return { error };
  }
  const { error } = await supabase.from('system_lists').insert([{ list_type: type, name, is_active: true }]);
  return { error };
}

async function deleteSystemListItem(type, name) {
  if (!requireHrEditMode('System list delete')) return;

  const { data: rows, error } = await supabase.from('system_lists')
    .update({ is_active: false }).eq('list_type', type).ilike('name', name).select('id');
  if (error) return { error };
  if (!rows || !rows.length) {
    const { error: insertError } = await supabase.from('system_lists').insert([{ list_type: type, name, is_active: false }]);
    if (insertError) return { error: insertError };
  }
  return { error: null };
}

async function handleAddDesignation() {
  if (!requireHrEditMode('Designation add')) return;

  if (!userRole.is_admin) return alert('Sirf admin designation manage kar sakta hai.');
  const value = newDesignation.trim();
  if (!value) return alert('Designation ka naam enter karein.');
  const existing = designationsList.find(d => d.toLowerCase() === value.toLowerCase());
  if (existing) return alert('Designation already exists!');
  const { data: oldRows, error: lookupError } = await supabase.from('designations').select('id,name,is_active').ilike('name', value).limit(1);
  if (lookupError) return alert('Designation check nahi hui: ' + lookupError.message);
  let error = null;
  if (oldRows && oldRows.length) {
    if (oldRows[0].is_active) return alert('Designation already exists!');
    ({ error } = await supabase.from('designations').update({ is_active: true, name: value }).eq('id', oldRows[0].id));
  } else {
    ({ error } = await supabase.from('designations').insert([{ name: value, is_active: true }]));
  }
  if (error) return alert('Designation save nahi hui: ' + error.message);
  await fetchDesignations();
  setDesignation(value);
  setNewDesignation('');
  void logActivity('Designation added', value);
  alert('Designation successfully saved!');
}

async function handleDeleteDesignation() {
  if (!requireHrEditMode('Designation delete')) return;

  if (!userRole.is_admin) return alert('Sirf admin designation delete kar sakta hai.');
  const selected = String(designation || '').trim();
  if (!selected) return alert('Pehle designation select karein.');
  if (!window.confirm(`Designation "${selected}" ko active list se permanently hatana hai? Purane workers ke records nahi mitaye jayenge.`)) return;
  const { data: rows, error } = await supabase.from('designations')
    .update({ is_active: false }).ilike('name', selected).select('id');
  if (error) return alert('Delete fail hui; database ne error diya: ' + error.message);
  if (!rows || !rows.length) {
    const { error: tombstoneError } = await supabase.from('designations').insert([{ name: selected, is_active: false }]);
    if (tombstoneError) return alert('Delete save nahi hui: ' + tombstoneError.message);
  }
  await fetchDesignations();
  void logActivity('Designation deleted', selected);
  alert(`Designation "${selected}" active list se delete ho gayi. Refresh ke baad wapas nahi aani chahiye.`);
}

 async function handleSaveAnnualLeave(e) {
  if (!requireHrEditMode('Annual Leave save')) return;

    e.preventDefault();
     if (!userRole.is_admin) return alert('Sirf admin annual leave records manage kar sakta hai.');
    if (!leaveWorkerId || !leaveStartDate || !leaveExpectedReturnDate) {
      return alert('Mukammal details enter karein!');
    }

    let finalDeductionDays = 0;
    let breakdownSummary = 'No Deduction';

    if (hasDeduction) {
      let breakdownArr = [];
      for (const [monthKey, days] of Object.entries(monthlyDeductions)) {
        const d = Number(days) || 0;
        if (d > 0) {
          finalDeductionDays += d;
          breakdownArr.push(`${monthKey}: ${d} days`);
        }
      }
      if (breakdownArr.length > 0) {
        breakdownSummary = breakdownArr.join(', ');
      }
    }

    const leaveData = {
      worker_id: leaveWorkerId,
      start_date: leaveStartDate,
      expected_return: leaveExpectedReturnDate,
      actual_return: leaveActualReturnDate || 'On Leave',
      has_deduction: hasDeduction,
      deduction_breakdown: breakdownSummary,
      deduction_days: finalDeductionDays.toFixed(1),
      status: leaveActualReturnDate ? 'Returned' : 'On Leave'
    };

    let error;
    if (targetStaffId) {
      const res = await supabase.from('annual_leaves').update(leaveData).eq('id', targetStaffId);
      error = res.error;
    } else {
      const res = await supabase.from('annual_leaves').insert([leaveData]);
      error = res.error;
    }

    if (error) {
      alert('Error saving leave record: ' + error.message);
    } else {
      void logActivity(targetStaffId ? 'Annual leave updated' : 'Annual leave added', `Worker #${leaveWorkerId}, ${leaveStartDate} to ${leaveExpectedReturnDate}`);
      alert('Leave record successfully save ho gaya!');
      setLeaveModalOpen(false);
      setTargetStaffId('');
      setMonthlyDeductions({});
      fetchAnnualLeaves();
    }
  }
  async function fetchPersonalDocs() {
    const { data } = await supabase.from('personal_docs').select('*').order('id', { ascending: false });
    setPersonalDocs(data || []);
  }

  async function callWorkerDocuments(action, extra = {}) {
    if (!workerDocToken) throw new Error('Private documents session missing. Logout karke dobara login karein.');
    const { data, error } = await supabase.functions.invoke('worker-documents', {
      body: { action, token: workerDocToken, ...extra }
    });
    if (error) throw new Error(error.message || 'Worker documents service error');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function fetchWorkerDocuments() {
    if (!workerDocToken) { setWorkerDocuments([]); return; }
    try {
      const data = await callWorkerDocuments('list');
      setWorkerDocuments(data.documents || []);
    } catch (error) {
      // Keep the last successfully loaded document list visible if the private
      // document session temporarily expires or the service is unavailable.
      console.warn('Private worker documents load failed; keeping cached list:', error.message);
    }
  }

  async function fileToBase64(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function uploadWorkerDocument(worker, file) {
    if (!file) return;
    if (!requireHrEditMode('Worker document upload')) return;
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Aapko worker documents upload karne ki permission nahi hai.');
    if (file.size > 12 * 1024 * 1024) return alert('File 12 MB se chhoti honi chahiye.');
    const title = window.prompt('Document ka naam likhein (e.g. Emirates ID, Insurance, Certificate):', file.name.replace(/\.[^.]+$/, ''));
    if (title === null || !title.trim()) return;
    const category = window.prompt('Category likhein (Passport / Visa / ID Card / Medical / Other):', 'Other');
    if (category === null) return;
    try {
      const file_base64 = await fileToBase64(file);
      await callWorkerDocuments('upload', {
        worker_id: worker.id,
        document_title: title.trim(),
        category: category.trim() || 'Other',
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        file_base64
      });
      await fetchWorkerDocuments();
      alert('Worker document securely upload aur save ho gaya.');
    } catch (err) {
      alert('Document upload nahi hua: ' + (err?.message || err));
    }
  }

  async function openWorkerDocument(doc, download = false) {
    try {
      const result = await callWorkerDocuments('open', { document_id: doc.id, download });
      if (!result?.signed_url) throw new Error('Secure document link nahi mila.');
      const link = document.createElement('a');
      link.href = result.signed_url;
      if (download) { link.download = doc.file_name || doc.document_title || 'worker-document'; }
      else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Document open nahi hua: ' + error.message);
    }
  }

  async function deleteWorkerDocument(doc) {
    if (!requireHrEditMode('Worker document delete')) return;
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Aapko document delete karne ki permission nahi hai.');
    if (!window.confirm(`"${doc.document_title}" delete karna hai?`)) return;
    try {
      await callWorkerDocuments('delete', { document_id: doc.id });
      await fetchWorkerDocuments();
      alert('Document delete ho gaya.');
    } catch (error) {
      alert('Document delete nahi hua: ' + error.message);
    }
  }

  function printWorkerDocument(doc) {
    void openWorkerDocument(doc, false);
  }

  async function fetchPermissionsList() {
    const { data } = await supabase.from('user_permissions').select('*');
    setPermissionsList(data || []);
  }

  async function fetchWorkers() {
    setLoading(true);
    let query = supabase.from('workers').select('*').order('id', { ascending: true });
    // Limit the staff browser's data query to its assigned scope (admin remains unrestricted).
    if (!userRole.is_admin) {
      const dept = String(userRole.assigned_department || 'Unassigned').trim();
      const site = String(userRole.assigned_site || 'All').trim();
      if (dept !== 'All') query = query.eq('department', dept);
      if (site !== 'All') query = query.eq('work_site', site);
    }
    const { data, error } = await query;
    if (error) console.error('Workers load error:', error.message);
    setWorkers(data || []);
    setLoading(false);
  }

async function fetchAttendance() {
  // Supabase/PostgREST commonly returns at most 1,000 rows per request.
  // Attendance grows every day (workers x dates); a single select silently
  // omitted older rows, making dates such as the 16th appear to disappear.
  // Fetch every page so the full attendance history remains visible.
  const pageSize = 1000;
  let offset = 0;
  let allRows = [];

  try {
    while (true) {
      let query = supabase
        .from('attendance')
        .select('*')
        // Stable ordering is important when paging through rows.
        .order('date', { ascending: false })
        .order('worker_id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      // Keep staff timesheet/dashboard data within their authorized department/site.
      if (!userRole.is_admin) {
        const dept = String(userRole.assigned_department || 'Unassigned').trim();
        const site = String(userRole.assigned_site || 'All').trim();
        if (dept !== 'All') query = query.eq('department', dept);
        if (site !== 'All') query = query.eq('work_site', site);
      }

      const { data, error } = await query;
      if (error) throw error;

      const pageRows = data || [];
      allRows = allRows.concat(pageRows);
      if (pageRows.length < pageSize) break;
      offset += pageSize;
    }

    // Normalize date values so a timestamp-shaped value cannot create a
    // separate date-map key from the YYYY-MM-DD value used by date inputs.
    allRows = allRows.map(record => ({
      ...record,
      date: String(record.date || '').slice(0, 10)
    }));

    setAttendance(allRows);

    // Dashboard and Timesheet state is rebuilt from the complete DB history.
    const dateMap = {};
    allRows.forEach(record => {
      if (!record.date) return;
      if (!dateMap[record.date]) dateMap[record.date] = {};
      dateMap[record.date][record.worker_id] = {
        status: record.status,
        ot: Number(record.overtime_hours) || 0,
        contract_ot: Number(record.contract_overtime_hours) || 0,
        contract_overtime_hours: Number(record.contract_overtime_hours) || 0,
        extra_ot_hours: Number(record.extra_ot_hours) || 0,
        site: record.work_site || '',
        work_site: record.work_site || ''
      };
    });

    setAttendanceData(dateMap);
  } catch (err) {
    console.error('Attendance load error:', err);
    alert('Attendance load nahi hui: ' + (err?.message || String(err)));
  }
}

async function fetchHolidayDates() {
  const { data, error } = await supabase.from('attendance_holidays').select('holiday_date, description').order('holiday_date', { ascending: true });
  if (error) {
    // Holiday support is optional until the one-time SQL setup below is applied.
    console.warn('Holiday calendar not loaded:', error.message);
    return;
  }
  setHolidayDates(data || []);
}

// Staff activity notifications are stored in Supabase so the admin can see events
// even when they were created on another device. Configure the SQL table/policies
// supplied with this code before relying on notifications.
async function logActivity(action, details = '', actorEmailOverride = '') {
  const actorEmail = String(actorEmailOverride || session?.user?.email || email || 'unknown').trim().toLowerCase();
  if (!actorEmail || actorEmail === 'unknown') {
    const message = 'Login email nahi mil rahi; notification insert se pehle session/email check karein.';
    setNotificationSaveError(message);
    console.warn('Activity notification save failed:', message);
    return false;
  }
  const { error } = await supabase.from('activity_notifications').insert([{
    actor_email: actorEmail,
    actor_name: actorEmail.split('@')[0],
    action: String(action || 'Activity').slice(0, 100),
    details: String(details || '').slice(0, 500),
    is_read: false
  }]);
  if (error) {
    const message = [error.code, error.message, error.details, error.hint].filter(Boolean).join(' | ');
    setNotificationSaveError(message || 'Supabase ne notification insert reject kar di.');
    console.warn('Activity notification save failed:', error);
    return false;
  }
  setNotificationSaveError('');
  return true;
}

async function testActivityNotification() {
  if (!userRole.is_admin) return;
  setNotificationSaveError('');
  const saved = await logActivity('Notification test', 'Admin ne notification system test kiya.');
  if (!saved) {
    alert('Test notification save nahi hui. Neeche Staff Activity panel mein exact Supabase error diya gaya hai.');
    return;
  }
  await fetchActivityNotifications();
  alert('Test notification save ho gayi. Staff Activity list check karein.');
}

async function fetchActivityNotifications() {
  if (!userRole.is_admin || !session) return;
  const { data, error } = await supabase.from('activity_notifications')
    .select('id,actor_email,actor_name,action,details,created_at,is_read')
    .order('created_at', { ascending: false }).limit(50);
  if (error) {
    setNotificationLoadError(error.message);
    console.warn('Activity notifications are not configured:', error.message);
    return;
  }
  setNotificationLoadError('');
  setActivityNotifications(data || []);
}

async function markActivityNotificationsRead() {
  const unreadIds = activityNotifications.filter(n => !n.is_read).map(n => n.id);
  if (!unreadIds.length) return;
  const { error } = await supabase.from('activity_notifications').update({ is_read: true }).in('id', unreadIds);
  if (error) { console.warn('Notifications could not be marked read:', error.message); return; }
  setActivityNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
}

function toggleActivityNotification(id, checked) {
  setSelectedNotificationIds(prev => checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id));
}

async function deleteSelectedActivityNotifications() {
  if (!userRole.is_admin) return alert('Notifications sirf Admin delete kar sakta hai.');
  const ids = selectedNotificationIds.filter(Boolean);
  if (!ids.length) return alert('Pehle notifications select karein.');
  if (!window.confirm(`${ids.length} selected notification(s) delete karni hain?`)) return;
  const { error } = await supabase.from('activity_notifications').delete().in('id', ids);
  if (error) return alert('Notifications delete nahi huin: ' + error.message);
  setActivityNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  setSelectedNotificationIds([]);
}

useEffect(() => {
  const staffMode = Boolean(session && !userRole.is_admin);
  document.body.classList.toggle('nda-staff-mode', staffMode);
  if (!staffMode) return () => document.body.classList.remove('nda-staff-mode');
  const blockPrintShortcut = event => {
    const key = String(event.key || '').toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'p') {
      event.preventDefault(); event.stopPropagation();
      alert('Print / PDF sirf Admin ke liye allowed hai.');
    }
  };
  const blockContextMenu = event => event.preventDefault();
  document.addEventListener('keydown', blockPrintShortcut, true);
  document.addEventListener('contextmenu', blockContextMenu, true);
  return () => {
    document.body.classList.remove('nda-staff-mode');
    document.removeEventListener('keydown', blockPrintShortcut, true);
    document.removeEventListener('contextmenu', blockContextMenu, true);
  };
}, [session, userRole.is_admin]);

useEffect(() => {
  if (!session || !userRole.is_admin || selectedSystem !== 'hr') return;
  fetchActivityNotifications();
  const timer = setInterval(fetchActivityNotifications, 12000);
  return () => clearInterval(timer);
}, [session, userRole.is_admin, selectedSystem]);

async function handleToggleHolidayDate() {
  if (!requireHrEditMode('Holiday calendar update')) return;

  if (!userRole.is_admin) return alert('Sirf Admin holiday dates manage kar sakta hai.');
  if (!selectedTimesheetDate) return alert('Pehle date select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Pehle period reopen karein.');
  if (new Date(`${selectedTimesheetDate}T12:00:00`).getDay() === 0) {
    return alert('Sunday pehle se automatic holiday hai.');
  }
  const existing = holidayDates.find(h => h.holiday_date === selectedTimesheetDate);
  if (existing) {
    const { error } = await supabase.from('attendance_holidays').delete().eq('holiday_date', selectedTimesheetDate);
    if (error) return alert('Holiday remove nahi hui: ' + error.message);
    setHolidayDates(prev => prev.filter(h => h.holiday_date !== selectedTimesheetDate));
    alert(`${selectedTimesheetDate} holiday list se remove ho gayi.`);
  } else {
    const description = window.prompt('Holiday ka naam/reason likhein:', 'Public Holiday');
    if (description === null) return;
    const { error } = await supabase.from('attendance_holidays').upsert([{ holiday_date: selectedTimesheetDate, description: description.trim() || 'Holiday' }], { onConflict: 'holiday_date' });
    if (error) return alert('Holiday save nahi hui: ' + error.message);
    setHolidayDates(prev => [...prev.filter(h => h.holiday_date !== selectedTimesheetDate), { holiday_date: selectedTimesheetDate, description: description.trim() || 'Holiday' }]);
    alert(`${selectedTimesheetDate} holiday mark ho gayi.`);
  }
}

  async function handleUpdateExtension(workerId, newExtensionDays) {
    if (!requireHrEditMode('Leave extension update')) return;

    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const { error } = await supabase
      .from('workers')
      .update({ extension_days: parseInt(newExtensionDays) || 0 })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating extension: ' + error.message);
    } else {
      fetchWorkers();
    }
  }

  async function handleMarkReturned(workerId) {
    if (!requireHrEditMode('Leave return update')) return;

    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const todayDate = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('workers')
      .update({ 
        on_leave: false, 
        actual_return_date: todayDate,
        extension_days: 0,
        late_days: 0 
      })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating return status: ' + error.message);
    } else {
      fetchWorkers();
      alert('Worker marked as returned successfully!');
    }
  }

  async function handleDeleteUserPermission(emailToDelete) {
    if (!requireHrEditMode('User permission delete')) return;

    if (!userRole.is_admin) return;
    if (window.confirm(`Delete access for ${emailToDelete}?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', emailToDelete);
      if (error) alert('Error: ' + error.message);
      else fetchPermissionsList();
    }
  }
  
  async function handleDeleteSite(siteToDelete) {
    if (!requireHrEditMode('Working site delete')) return;

    if (!userRole.is_admin) return alert('Access Denied!');
    if (sitesList.length <= 1) return alert('Kam az kam ek working site rehni chahiye.');
    if (!window.confirm(`Kya aap '${siteToDelete}' site ko permanently active list se hatana chahte hain?`)) return;
    const { error } = await deleteSystemListItem('site', siteToDelete);
    if (error) return alert('Site delete nahi hui: ' + error.message);
    const updated = sitesList.filter(x => x.toLowerCase() !== siteToDelete.toLowerCase());
    setSitesList(updated);
    if (selectedSiteFilter === siteToDelete) setSelectedSiteFilter('All');
    void logActivity('Working site deleted', siteToDelete);
    alert(`Site '${siteToDelete}' delete ho gayi aur database mein save kar di gayi.`);
  }

  async function handleAddNewSite(e) {
    if (!requireHrEditMode('Working site add')) return;

    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    const value = newSiteInput.trim();
    if (!value) return alert('Site name enter karein!');
    const result = await addSystemListItem('site', value);
    if (result.error) return alert('Site save nahi hui: ' + result.error.message);
    await fetchSystemLists();
    setNewSiteInput('');
    void logActivity('Working site added', value);
    alert(`Working site '${value}' saved successfully!`);
  }

  async function handleAddNewDepartment(e) {
    if (!requireHrEditMode('Department add')) return;

    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    const value = newDeptInput.trim();
    if (!value) return alert('Department name enter karein!');
    const result = await addSystemListItem('department', value);
    if (result.error) return alert('Department save nahi hua: ' + result.error.message);
    await fetchSystemLists();
    setNewDeptInput('');
    void logActivity('Department added', value);
    alert(`Department '${value}' saved successfully!`);
  }

  async function handleDeleteDepartment(deptToDelete) {
    if (!requireHrEditMode('Department delete')) return;

    if (!userRole.is_admin) return alert('Access Denied!');
    if (uniqueDepartments.length <= 1) return alert('Kam az kam ek department rehna chahiye.');
    if (!window.confirm(`Kya aap '${deptToDelete}' department ko permanently active list se hatana chahte hain?`)) return;
    const { error } = await deleteSystemListItem('department', deptToDelete);
    if (error) return alert('Department delete nahi hua: ' + error.message);
    const updated = uniqueDepartments.filter(x => x.toLowerCase() !== deptToDelete.toLowerCase());
    setDepartmentsList(updated);
    if (selectedDeptFilter === deptToDelete) setSelectedDeptFilter('All');
    if (department === deptToDelete) setDepartment(updated[0] || '');
    void logActivity('Department deleted', deptToDelete);
    alert(`Department '${deptToDelete}' delete ho gaya aur database mein save kar diya gaya.`);
  }

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();

    if (!session?.user?.email) return alert('Please login again.');
    if (!currentPassInput.trim()) return alert('Current password enter karein.');

    const currentEmail = session.user.email.trim().toLowerCase();
    const { data: accounts, error: accountError } = await supabase
      .from('user_permissions')
      .select('*')
      .ilike('user_email', currentEmail);

    if (accountError) return alert('Account check error: ' + accountError.message);
    const accountRows = accounts || [];
    const account = accountRows.find(row => String(row.user_password) === currentPassInput.trim()) || null;
    if (!account) {
      return alert('Current password ghalat hai.');
    }

    const isAdminAccount = userRole.is_admin && (account.is_admin === true || account.is_admin === 'true');
    if (userRole.is_admin && !isAdminAccount) {
      return alert('Admin account database mein verify nahi hua. Default admin credentials ko pehle database mein initialize karna zaroori hai.');
    }

    const nextEmail = isAdminAccount && newLoginEmailInput.trim()
      ? newLoginEmailInput.trim().toLowerCase()
      : currentEmail;
    const nextPassword = newPassInput.trim();

    if (!nextEmail) return alert('Login ID / email enter karein.');
    if (!nextPassword) return alert('Naya password lazmi enter karein.');
    if (nextPassword.length < 6) return alert('Password kam az kam 6 characters ka hona chahiye.');
    if (nextPassword === currentPassInput.trim()) return alert('Naya password purane password se different hona chahiye.');

    if (nextEmail !== currentEmail) {
      const { data: emailCollision, error: collisionError } = await supabase
        .from('user_permissions')
        .select('user_email')
        .ilike('user_email', nextEmail);
      if (collisionError) return alert('New login ID check nahi ho saka: ' + collisionError.message);
      if ((emailCollision || []).length) return alert('Yeh new login ID pehle se database mein mojood hai. Koi doosri email use karein.');
    }

    const changes = { user_email: nextEmail, user_password: nextPassword };
    // All duplicate rows for this account must be updated; otherwise a stale row could still accept the old password.
    const { data: updatedRows, error: updateError } = await supabase
      .from('user_permissions')
      .update(changes)
      .ilike('user_email', currentEmail)
      .select('user_email,user_password');

    if (updateError) return alert('Login ID / password update nahi hua: ' + updateError.message);
    if (!updatedRows || updatedRows.length < accountRows.length || updatedRows.some(row => String(row.user_password) !== nextPassword || String(row.user_email).toLowerCase() !== nextEmail)) {
      return alert('Database ne tamam duplicate login records update karne ki tasdeeq nahi ki. Password change complete nahi hua. Supabase user_permissions ki UPDATE policy check karein.');
    }

    const updatedSession = {
      ...session,
      user: { ...session.user, email: nextEmail },
      role: userRole
    };

    setSession(updatedSession);
    setCurrentPassInput('');
    setNewPassInput('');
    setNewLoginEmailInput('');
    alert('Login ID / password database mein update ho gaya. Security ke liye ab dobara nayi details se login karein.');
    handleLogout();
  }

  async function handleDeleteOldRecords() {
    if (!requireHrEditMode('Data cleanup')) return;

    if (!userRole.is_admin) return alert('Sirf admin timesheet records delete kar sakta hai.');
    let startDate = cleanupSelectedDate;
    let endDate = cleanupSelectedDate;
    if (cleanupMode === 'month') {
      if (!/^\d{4}-\d{2}$/.test(cleanupMonth)) return alert('Month select karein.');
      const [yy, mm] = cleanupMonth.split('-').map(Number);
      startDate = `${cleanupMonth}-01`;
      endDate = `${yy}-${String(mm).padStart(2, '0')}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    } else if (cleanupMode === 'range') {
      startDate = cleanupStartDate; endDate = cleanupEndDate;
      if (!startDate || !endDate || startDate > endDate) return alert('Date range sahi select karein.');
    if (closedPayrollPeriods.some(period => period.status === 'closed' && startDate <= String(period.end_date).slice(0,10) && endDate >= String(period.start_date).slice(0,10))) return alert('Selected range mein closed salary period ke records hain. Pehle period reopen karein.');
    }
    const selectedTables = [];
    if (cleanupAttendance) selectedTables.push('Timesheet / attendance');
    if (cleanupDailyDetails) selectedTables.push('Daily work details');
    if (cleanupAnnualLeaves) selectedTables.push('Completed annual leave records');
    if (!selectedTables.length) return alert('Kam az kam ek record type select karein.');
    const confirmed = window.confirm(`PERMANENT DELETE\nRange: ${startDate} se ${endDate} tak (dono dates shamil)\n\n${selectedTables.join('\n')}\n\nIs range ke tamam matching records delete honge. Yeh undo nahi ho sakta. Continue?`);
    if (!confirmed) return;
    setCleanupLoading(true);
    const results = [];
    try {
      if (cleanupAttendance) {
        const { data, error } = await supabase.from('attendance').delete().gte('date', startDate).lte('date', endDate).select('worker_id,date');
        if (error) results.push('Attendance error: ' + error.message); else results.push(`Timesheet records deleted: ${(data || []).length}`);
      }
      if (cleanupDailyDetails) {
        const { data, error } = await supabase.from('daily_work_details').delete().gte('work_date', startDate).lte('work_date', endDate).select('work_date,work_site');
        if (error) results.push('Daily work details error: ' + error.message); else results.push(`Daily work details deleted: ${(data || []).length}`);
      }
      if (cleanupAnnualLeaves) {
        const { data, error } = await supabase.from('annual_leaves').delete().gte('start_date', startDate).lte('start_date', endDate).neq('actual_return', 'On Leave').select('id');
        if (error) results.push('Annual leave error: ' + error.message); else results.push(`Annual leave records deleted: ${(data || []).length}`);
      }
      await fetchAttendance(); await fetchAnnualLeaves();
      alert(results.join('\n'));
    } catch (err) { alert('Record cleanup error: ' + (err?.message || String(err))); }
    finally { setCleanupLoading(false); }
  }

  async function handleScanPaperSheet(event) {
    if (!requireHrEditMode('OCR attendance import')) return;
    if (!userRole.is_admin && !userRole.can_use_bulk) {
      return alert('Aapko Bulk/OCR ki permission nahi hai!');
    }
    if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. OCR se bhi is date ki entry nahi ho sakti. Admin pehle period reopen kare.');

    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo scan ho rahi hai...');

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OCR API key missing. Configure VITE_OPENAI_API_KEY in Vercel Environment Variables. For security, move OCR calls to a server-side API route.');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract table data from attendance sheet. Return ONLY valid JSON with key 'rows' containing objects with: 'id_no' (number), 'working_days' (number), and 'overtime' (number)."
                },
                {
                  type: "image_url",
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const parsedContent = JSON.parse(data.choices[0].message.content);
      const rows = parsedContent.rows || parsedContent;

      const recordsToInsert = rows.map((item) => ({
        worker_id: Number(item.id_no),
        date: selectedTimesheetDate,
        status: item.working_days > 0 ? 'Present' : 'Absent',
        overtime_hours: Number(item.overtime || 0),
        work_site: bulkSite
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToInsert, { onConflict: 'worker_id,date' });

      if (error) throw error;

      setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data scan ho gaya.`);
      fetchAttendance();

    } catch (err) {
      setScanStatus('Error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // BUSINESS LOGIN: the shared Admin account is verified against the existing
      // HR Admin record. All other Business users authenticate only with their
      // own Supabase Auth account and business_access row; no HR staff record is
      // required or used for them.
      if (selectedSystem === 'business') {
        let isAdminForBusiness = false;
        const { data: adminRows, error: adminLookupError } = await supabase
          .from('user_permissions')
          .select('user_email,user_password,is_admin')
          .ilike('user_email', cleanEmail)
          .eq('is_admin', true);

        if (!adminLookupError) {
          isAdminForBusiness = (adminRows || []).some(row =>
            String(row.user_password ?? '') === cleanPassword &&
            (row.is_admin === true || row.is_admin === 'true')
          );
        }

        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        // Only the verified shared Admin may initialize its own Business Auth
        // identity. Business staff accounts are created by Admin in Staff Access.
        if (authError && isAdminForBusiness) {
          const { data: createdAuth, error: createAuthError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword
          });
          if (!createAuthError && createdAuth?.session) {
            authData = createdAuth;
            authError = null;
          } else if (!createAuthError && createdAuth?.user && !createdAuth?.session) {
            alert('Admin ka Business secure account ban gaya hai, lekin Supabase email confirmation enabled hai. Email confirm karke dobara Business login karein.');
            return;
          } else if (createAuthError) {
            authError = createAuthError;
          }
        }

        if (authError || !authData?.user?.email) {
          const message = isAdminForBusiness
            ? 'Admin ki same ID/password ka Business secure login verify nahi ho saka. Agar pehle se Auth account hai to us ka password HR Admin password ke barabar hona chahiye.'
            : 'Business Login ID ya password ghalat hai. Business Admin se apna Business login banwayein.';
          alert(message + ' Details: ' + (authError?.message || 'Authentication session nahi mila.'));
          return;
        }

        if (!isAdminForBusiness) {
          const { data: accessRows, error: accessError } = await supabase
            .from('business_access')
            .select('*')
            .ilike('user_email', cleanEmail)
            .eq('active', true)
            .eq('can_view', true);

          if (accessError || !accessRows?.length) {
            await supabase.auth.signOut();
            alert(accessError
              ? ('Business permission check nahi ho saka: ' + accessError.message)
              : 'Is Business Login ID ko access nahi mila. Business Admin se permission lein.');
            return;
          }
        }

        const businessRole = isAdminForBusiness
          ? { is_admin: true, assigned_department: 'All', assigned_site: 'All', can_view_business: true, can_manage_business: true }
          : { is_admin: false, business_only: true, can_view_business: true };
        // Save the actual Supabase auth tokens synchronously so a browser refresh
        // cannot leave the custom app session without database authorization.
        if (authData?.session?.access_token && authData?.session?.refresh_token) {
          try { localStorage.setItem('nda_business_auth_session', JSON.stringify(authData.session)); } catch (storageError) {
            console.warn('Business auth session could not be saved:', storageError);
          }
        }
        const businessSession = { user: { email: cleanEmail }, role: businessRole, system_scope: 'business' };
        try {
          localStorage.setItem('nda_user_session', JSON.stringify(businessSession));
          localStorage.setItem('nda_selected_system', 'business');
        } catch (storageError) { console.warn('Business app session could not be saved:', storageError); }
        setSession(businessSession);
        setUserRole(businessRole);
        setSelectedSystem('business');
        setBusinessType('transport');
        void logActivity('Login', 'Business system login', cleanEmail);
        return;
      }

      // HR LOGIN: unchanged HR-only authentication. Business-only staff are not
      // accepted as HR users and there is no Business-login fallback here.
      const { data: accounts, error: accountError } = await supabase
        .from('user_permissions')
        .select('*')
        .ilike('user_email', cleanEmail);
      if (accountError) {
        alert('Login database error: ' + accountError.message);
        return;
      }
      const accountRows = accounts || [];
      const distinctPasswords = [...new Set(accountRows.map(row => String(row.user_password ?? '')))];
      if (distinctPasswords.length > 1) {
        alert('Is login ID ke duplicate records mein mukhtalif passwords hain. Security ke liye login roka gaya hai. Admin ko password change dobara save karna hoga taa-ke tamam duplicate records update ho jayein.');
        return;
      }
      const account = accountRows.find(row => String(row.user_password) === cleanPassword) || null;
      let resolvedAccount = account;

      // First-time setup for the legacy default administrator.
      // Once the admin row exists, the hard-coded default login is no longer accepted.
      if (!resolvedAccount && accountRows.length === 0 && cleanEmail === 'admin@nda.pk' && cleanPassword === '123456') {
        const initialAdmin = {
          staff_id: 'ADMIN',
          user_email: 'admin@nda.pk',
          user_password: '123456',
          assigned_department: 'All',
          assigned_site: 'All',
          can_view_dashboard: true,
          can_use_bulk: true,
          can_view_workers: true,
          can_add_workers: true,
          can_edit_workers: true,
          can_delete_workers: true,
          can_view_timesheet: true,
          can_edit_timesheet: true,
          can_view_payroll: true,
          is_admin: true
        };

        const { data: insertedAdmin, error: insertError } = await supabase
          .from('user_permissions')
          .insert([initialAdmin])
          .select('*')
          .maybeSingle();

        if (insertError) {
          alert('Default admin login database mein save nahi ho saka: ' + insertError.message +
            '\nLogin access temporary milega, lekin password change ke liye database write access theek karni hogi.');
          resolvedAccount = initialAdmin;
        } else {
          resolvedAccount = insertedAdmin || initialAdmin;
        }
      }

      if (!resolvedAccount || String(resolvedAccount.user_password) !== cleanPassword) {
        alert('Invalid Email or Password!');
        return;
      }
      try { sessionStorage.setItem('nda_last_hr_email', cleanEmail); } catch {}

      const isAdminAccount = resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true';

      // Keep the existing HR document-session flow unchanged.
      try {
        const { data: docAuth, error: docAuthError } = await supabase.functions.invoke('worker-documents', {
          body: { action: 'session', email: cleanEmail, password: cleanPassword }
        });
        if (docAuthError || !docAuth?.token) {
          console.warn('Private document session was not issued:', docAuthError?.message || docAuth?.error || 'Unknown error');
          setWorkerDocToken('');
          sessionStorage.removeItem('nda_worker_docs_token');
        } else {
          setWorkerDocToken(docAuth.token);
          sessionStorage.setItem('nda_worker_docs_token', docAuth.token);
        }
      } catch (docAuthError) {
        console.warn('Private document service is not configured yet:', docAuthError?.message || docAuthError);
        setWorkerDocToken('');
        sessionStorage.removeItem('nda_worker_docs_token');
      }

      if (isAdminAccount) {
        const adminRole = {
          is_admin: true,
          assigned_department: 'All',
          assigned_site: 'All',
          can_view_dashboard: true,
          can_use_bulk: true,
          can_view_workers: true,
          can_add_workers: true,
          can_edit_workers: true,
          can_delete_workers: true,
          can_view_timesheet: true,
          can_edit_timesheet: true,
          can_view_payroll: true
        };
        const sessionObj = { user: { email: cleanEmail }, role: adminRole };
        setSession(sessionObj);
        setUserRole(adminRole);
        void logActivity('Login', 'Administrator login', cleanEmail);
        setActiveTab('dashboard');
        return;
      }

      const staffRole = {
        is_admin: false,
        staff_id: resolvedAccount.staff_id || '',
        assigned_department: String(resolvedAccount.assigned_department || '').trim() || 'Unassigned',
        assigned_site: resolvedAccount.assigned_site || 'All',
        can_view_dashboard: resolvedAccount.can_view_dashboard ?? true,
        can_use_bulk: false,
        can_view_workers: resolvedAccount.can_view_workers ?? true,
        can_add_workers: false,
        can_edit_workers: false,
        can_delete_workers: false,
        can_view_timesheet: resolvedAccount.can_view_timesheet ?? true,
        can_view_daily_timesheet: resolvedAccount.can_view_daily_timesheet ?? resolvedAccount.can_view_timesheet ?? false,
        can_edit_timesheet: resolvedAccount.can_edit_timesheet ?? false,
        can_view_payroll: resolvedAccount.can_view_payroll ?? false
      };
      const sessionObj = { user: { email: cleanEmail }, role: staffRole };
      setSession(sessionObj);
      setUserRole(staffRole);
      void logActivity('Login', `Staff login — ${staffRole.assigned_department} / ${staffRole.assigned_site}`, cleanEmail);
      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
        setBulkDepartment(staffRole.assigned_department);
        setDailyTimesheetDepartment(staffRole.assigned_department);
      } else {
        setDailyTimesheetDepartment('All');
      }
      if (staffRole.assigned_site !== 'All') {
        setDailyTimesheetSite(staffRole.assigned_site);
        setSelectedSiteFilter(staffRole.assigned_site);
        setBulkSite(staffRole.assigned_site);
        setQuickSite(staffRole.assigned_site);
      }
      if (staffRole.can_view_dashboard) setActiveTab('dashboard');
      else if (staffRole.can_view_timesheet) setActiveTab('attendance');
      else if (staffRole.can_view_daily_timesheet) setActiveTab('daily-timesheet');
      else if (staffRole.can_view_workers) setActiveTab('workers');
      else setActiveTab('dashboard');
    } catch (err) {
      alert('Login error: ' + (err?.message || String(err)));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    try {
      supabase.auth.signOut().catch(() => {});
      sessionStorage.removeItem('nda_user_session');
      sessionStorage.removeItem('nda_selected_system');
      sessionStorage.removeItem('nda_worker_docs_token');
      localStorage.removeItem('nda_user_session');
      localStorage.removeItem('nda_selected_system');
      localStorage.removeItem('nda_business_auth_session');
      setWorkerDocToken('');
    } catch (err) {
      console.warn('Could not clear saved session:', err);
    }
    setSession(null);
    setSelectedSystem(null);
  }

  async function handleDeleteWorker(id) {
    if (!requireHrEditMode('Worker delete')) return;

    if (!userRole.is_admin && !userRole.can_delete_workers) {
      return alert('Permission denied!');
    }
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(id))) {
      return alert('Aap sirf apne assigned department/site ke workers delete kar sakte hain.');
    }
    if (window.confirm(`Delete Worker #${id}?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchWorkers();
    }
  }

  function handleStartEditWorker(worker) {
    if (!userRole.is_admin && !userRole.can_edit_workers) {
      return alert('Permission denied!');
    }
    setEditingWorkerId(worker.id);
    void logActivity('Viewed worker record', `Worker #${worker.worker_id || worker.id} — ${worker.name || 'Unnamed'}, ${worker.department || ''} / ${worker.designation || ''}`);
    setWorkerIdInput(worker.id);
    setJoiningDate(worker.joining_date || '');
    setName(worker.name);
    setDepartment(worker.department || departmentsList[0]);
    const workerDesignation = String(worker.designation || 'Worker').trim() || 'Worker';
    setDesignation(workerDesignation);
    // Do not re-add deleted designations to the global active list. The worker's
    // legacy designation is shown as a one-off option in the edit form below.
    setMonthlySalary(worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth) || '');
    setReligion(worker.religion || 'Muslim');
    setLastReturnDate(worker.last_return_date || '');
    setAnnualLeaveRate(worker.annual_leave_rate || '30');
    setAnnualLeaveBalance(String(worker.annual_leave_balance ?? 0));
    setPassportFileUrl(worker.passport_file_url || '');
    setIdCardFileUrl(worker.id_card_file_url || '');
    setMedicalCardFileUrl(worker.medical_card_file_url || '');
    setVisaFileUrl(worker.visa_file_url || '');
    setLabourCardFileUrl(worker.labour_card_file_url || '');
  }

  function resetWorkerForm() {
    setEditingWorkerId(null);
    setWorkerIdInput('');
    setJoiningDate('');
    setName('');
    setDepartment(departmentsList[0]);
    setDesignation('Worker');
    setMonthlySalary('');
    setReligion('Muslim');
    setLastReturnDate('');
    setAnnualLeaveRate('30');
    setAnnualLeaveBalance('0');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    if (!requireHrEditMode('Worker save')) return;

    e.preventDefault();
    if (!userRole.is_admin) {
      if (editingWorkerId && !userRole.can_edit_workers) return alert('Permission denied: worker edit allowed nahi.');
      if (!editingWorkerId && !userRole.can_add_workers) return alert('Permission denied: worker add allowed nahi.');
      if (userRole.assigned_department && userRole.assigned_department !== 'All' &&
          department.toLowerCase() !== userRole.assigned_department.toLowerCase()) {
        return alert('Aap sirf apne assigned department mein worker add/edit kar sakte hain.');
      }
    }
    if (!name.trim() || !monthlySalary) return alert('Name and Salary required!');

    const monthlyNum = Number(monthlySalary);
    const dailyRateCalc = monthlyNum / totalDaysInCurrentMonth;

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      monthly_salary: monthlyNum,
      daily_rate: dailyRateCalc,
      religion,
      joining_date: joiningDate || null,
      last_return_date: lastReturnDate || null,
      annual_leave_rate: Number(annualLeaveRate || 30),
      annual_leave_balance: Number(annualLeaveBalance || 0),
      currency: selectedCurrency,
      passport_file_url: passportFileUrl,
      id_card_file_url: idCardFileUrl,
      medical_card_file_url: medicalCardFileUrl,
      visa_file_url: visaFileUrl,
      labour_card_file_url: labourCardFileUrl
    };

    if (editingWorkerId) {
      const targetWorkerId = editingWorkerId;
      const { data: updatedRows, error } = await supabase
        .from('workers')
        .update(workerData)
        .eq('id', targetWorkerId)
        .select('id, name, designation');

      if (error) {
        alert('Worker update nahi hua: ' + error.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        alert('Worker update confirm nahi hua. ID ' + targetWorkerId + ' par database row nahi mili ya update permission nahi hai. Supabase RLS/policies check karein.');
        await fetchWorkers();
      } else {
        const savedWorker = updatedRows[0];
        if (String(savedWorker.designation || '').trim().toLowerCase() !== String(workerData.designation || '').trim().toLowerCase()) {
          alert('Designation database mein expected value se different save hui. Selected: ' + workerData.designation + ', Database: ' + (savedWorker.designation || 'blank'));
          await fetchWorkers();
        } else {
          setWorkers(prev => prev.map(w => String(w.id) === String(targetWorkerId) ? { ...w, ...workerData } : w));
          alert('Worker #' + targetWorkerId + ' updated successfully. Designation: ' + savedWorker.designation);
          void logActivity('Worker updated', `Worker #${targetWorkerId}: ${workerData.name}, ${workerData.department}, designation ${workerData.designation}`);
          resetWorkerForm();
          await fetchWorkers();
        }
      }
    } else {
      const nextAutoId = workers.length > 0 ? Math.max(...workers.map(w => Number(w.id) || 0)) + 1 : 1;
      const finalWorkerId = workerIdInput ? Number(workerIdInput) : nextAutoId;

      const { error } = await supabase.from('workers').insert([{ id: finalWorkerId, ...workerData }]);
      if (error) alert('Error: ' + error.message);
      else {
        alert('New Worker added successfully!');
        void logActivity('Worker added', `Worker #${finalWorkerId}: ${workerData.name}, ${workerData.department}, designation ${workerData.designation}`);
        resetWorkerForm();
        fetchWorkers();
      }
    }
  }

   // Print Individual Worker Monthly Report
  function handlePrintWorkerMonthlyReport(worker) {
    if (!userRole.is_admin) { alert('Worker monthly report Print / PDF sirf Admin kar sakta hai.'); return; }
    const workerJoinDate = String(worker.joining_date || '').slice(0, 10);
    const reportAsOfDate = formatPayrollDate(new Date());
    const reportEndDate = payrollPeriodEndDate < reportAsOfDate ? payrollPeriodEndDate : reportAsOfDate;
    const existingRows = attendance.filter(a => {
      const d = String(a.date || '').slice(0, 10);
      return String(a.worker_id) === String(worker.id) && d >= payrollPeriodStartDate && d <= reportEndDate && (!workerJoinDate || d >= workerJoinDate);
    });
    const attendanceByDate = new Map(existingRows.map(a => [String(a.date || '').slice(0, 10), a]));
    const reportDates = [];
    if (payrollPeriodStartDate && reportEndDate && payrollPeriodStartDate <= reportEndDate) {
      const cursor = new Date(`${payrollPeriodStartDate}T12:00:00`);
      const end = new Date(`${reportEndDate}T12:00:00`);
      while (cursor <= end && reportDates.length < 400) {
        reportDates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const workerAttendance = reportDates.filter(d => (!workerJoinDate || d >= workerJoinDate) && (attendanceByDate.has(d) || isHolidayDate(d) || getAnnualLeaveForWorker(worker.id, d))).map(d => {
      const row = attendanceByDate.get(d) || { worker_id: worker.id, date: d, overtime_hours: 0, contract_overtime_hours: 0, extra_ot_hours: 0, work_site: '' };
      const annualLeave = getAnnualLeaveForWorker(worker.id, d);
      const status = annualLeave ? 'Annual Leave' : (isHolidayDate(d) ? (isPresentAttendanceStatus(row.status) ? 'Holiday Present' : 'Holiday') : (row.status || '—'));
      const canCountOT = isPresentAttendanceStatus(status);
      return { ...row, date: d, status, overtime_hours: canCountOT ? (Number(row.overtime_hours) || 0) : 0, contract_overtime_hours: canCountOT ? (Number(row.contract_overtime_hours) || 0) : 0, extra_ot_hours: canCountOT ? (Number(row.extra_ot_hours) || 0) : 0 };
    });

    // Per-worker summary for the individual Monthly Timesheet print page.
    // Keep the same report-period rows and include all three OT categories.
    const workerPresentRows = workerAttendance.filter(att => isPresentAttendanceStatus(att.status));
    const workerAbsentDays = workerAttendance.filter(att => String(att.status || '').trim().toLowerCase() === 'absent').length;
    const workerZeroOTDays = workerPresentRows.filter(att =>
      (Number(att.overtime_hours) || 0) +
      (Number(att.contract_overtime_hours) || 0) +
      (Number(att.extra_ot_hours) || 0) <= 0
    ).length;
    const workerMonthlyOT = workerAttendance.reduce((sum, att) => sum +
      (Number(att.overtime_hours) || 0) +
      (Number(att.contract_overtime_hours) || 0) +
      (Number(att.extra_ot_hours) || 0), 0);

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Print window blocked. Please allow pop-ups and try again.');
      return;
    }

    const currency = worker.currency || 'AED';
    const monthlySalary =
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * Number(totalDaysInCurrentMonth || 0));

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Monthly Report - #${worker.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              padding: 0;
              color: #111;
              margin: 0;
            }

            .report-brand { display:flex; align-items:center; gap:14px; border-bottom:2px solid #c69227; padding-bottom:10px; margin-bottom:16px; color:#0b2853; }
            .report-brand img { width:100px; height:62px; object-fit:contain; }
            .report-brand strong { display:block; font-size:19px; }
            .report-brand span { display:block; font-size:13px; margin-top:3px; }
            h2 {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 8px;
              color: #1e293b;
              font-size: 20px;
            }

            .box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: left;
            }

            th {
              background: #e2e8f0;
            }

            .worker-summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 9px;
              margin-top: 18px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .worker-summary-card {
              border: 1px solid #cbd5e1;
              border-left: 4px solid #2563eb;
              border-radius: 7px;
              padding: 11px;
              background: #f8fafc;
              min-width: 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .worker-summary-label { font-size: 10px; font-weight: 800; color: #475569; margin-bottom: 7px; }
            .worker-summary-value { font-size: 21px; font-weight: 900; color: #0b2853; }
            .worker-summary-note { font-size: 9px; color: #64748b; margin-top: 5px; }
            @media print {
              .worker-summary-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            .report-footer {
              display: block !important;
              width: 100%;
              text-align: center;
              margin-top: 30px;
              padding: 12px 0;
              border-top: 1px solid #94a3b8;
              color: #111 !important;
              background: #fff !important;
              font-family: Arial, sans-serif;
              font-size: 12px;
              font-weight: bold;
              visibility: visible !important;
            }

            @media print {
              .report-footer {
                display: block !important;
                visibility: visible !important;
                color: #111 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"><div><strong>NDA-PK SYSTEM</strong><span>Individual Worker Monthly Report</span></div></div>

          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name || ''}</p>
            <p><strong>Department:</strong> ${worker.department || 'N/A'}</p>
            <p><strong>Monthly Salary:</strong>
              ${monthlySalary} ${currency}</p>
          </div>

          <h3>Daily Attendance &amp; Overtime Record</h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Normal OT</th>
<th>Contract OT</th>
<th>Extra OT</th>
<th>Extra OT Site</th>
<th>Total OT</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              ${
                workerAttendance.length === 0
                  ? '<tr><td colspan="4">No attendance records found.</td></tr>'
                  : workerAttendance.map(att => `
                      <tr style="${['annual leave','sick leave','leave','other leave'].includes(String(att.status || '').trim().toLowerCase()) ? 'background:#ffedd5;color:#9a3412;font-weight:bold;' : String(att.status || '').trim().toLowerCase() === 'absent' ? 'background:#fee2e2;color:#991b1b;font-weight:bold;' : ['holiday','holiday present'].includes(String(att.status || '').trim().toLowerCase()) ? 'background:#fef08a;font-weight:bold;' : String(att.status || '').trim().toLowerCase() === 'present' ? 'background:#dcfce7;' : ''}">
                        <td>${att.date || ''}</td>
                        <td>${att.status || ''}</td>                       
<td>${Number(att.overtime_hours) || 0} Hours</td>
<td>${Number(att.contract_overtime_hours) || 0} Hours</td>
<td>${Number(att.extra_ot_hours) || 0} Hours</td>
<td>${att.extra_ot_site || (Number(att.extra_ot_hours) > 0 ? (att.work_site || 'N/A') : '—')}</td>
<td>${(Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0) + (Number(att.extra_ot_hours) || 0)} Hours</td>
                        <td>${att.work_site || 'N/A'}</td>
                      </tr>
                    `).join('')
              }
            </tbody>
          </table>

          <section class="worker-summary">
            <div class="worker-summary-card" style="border-left-color:#047857">
              <div class="worker-summary-label">TOTAL PRESENT DAYS</div>
              <div class="worker-summary-value" style="color:#047857">${workerPresentRows.length}</div>
              <div class="worker-summary-note">Present + Holiday Present</div>
            </div>
            <div class="worker-summary-card" style="border-left-color:#b91c1c">
              <div class="worker-summary-label">TOTAL ABSENT DAYS</div>
              <div class="worker-summary-value" style="color:#b91c1c">${workerAbsentDays}</div>
              <div class="worker-summary-note">Recorded absent entries</div>
            </div>
            <div class="worker-summary-card" style="border-left-color:#b45309">
              <div class="worker-summary-label">0 OVERTIME DAYS</div>
              <div class="worker-summary-value" style="color:#b45309">${workerZeroOTDays}</div>
              <div class="worker-summary-note">Present days with zero OT</div>
            </div>
            <div class="worker-summary-card" style="border-left-color:#1d4ed8">
              <div class="worker-summary-label">MONTHLY TOTAL OT</div>
              <div class="worker-summary-value" style="color:#1d4ed8">${workerMonthlyOT.toFixed(2)} HRS</div>
              <div class="worker-summary-note">Normal + Contract + Extra OT</div>
            </div>
          </section>

          <div class="report-footer">
          </div>

          <script>
            window.onload = function() {
              var logo = document.querySelector('.report-brand img');
              var go = function() { setTimeout(function() { window.focus(); window.print(); }, 250); };
              if (logo && !logo.complete) { logo.onload = go; logo.onerror = go; } else { go(); }
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. Handle Bulk Attendance & Overtime (Supports 'All' Departments & Designations)
 async function handleBulkAttendance() {
  if (!requireHrEditMode('Bulk attendance / OT save')) return;

  if (!userRole.is_admin && !userRole.can_use_bulk) return alert('Aapko Bulk Attendance ki permission nahi hai.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Is date ki attendance/OT edit nahi ho sakti. Admin pehle period reopen kare.');

  const normalizeDesignation = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const steelDesignationAliases = ['steel fixer', 'steel fixer helper', 'steel labour', 'steel labor', 'steel fixer labour', 'steel fixer labor', 'steel foreman', 'steel fixer foreman', 'steel fixer forman', 'steel forman'];
  const carpenterDesignationAliases = ['carpenter', 'carpenter helper', 'carpenter foreman', 'carpenter forman'];
  const selectedDesignationKey = normalizeDesignation(bulkDesignation);
  const selectedDesignations = selectedDesignationKey === 'all'
    ? ['All']
    : selectedDesignationKey === 'steel fixer'
      ? steelDesignationAliases
      : selectedDesignationKey === 'carpenter'
        ? carpenterDesignationAliases
        : [selectedDesignationKey];

  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const effectiveBulkSite = userRole.is_admin || userRole.assigned_site === 'All' ? bulkSite : userRole.assigned_site;
  const normalizeSite = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const existingByWorker = new Map(attendance
    .filter(a => String(a.date || '').slice(0, 10) === selectedTimesheetDate)
    .map(a => [String(a.worker_id), a]));

  // Site is a daily attendance value, not a permanent Workers Directory restriction.
  // Only workers already marked Present at the selected site receive bulk OT.
  const deptWorkers = allowedWorkers.filter(w => {
    const matchDept = bulkDepartment === 'All' || (w.department && w.department.toLowerCase() === bulkDepartment.toLowerCase());
    const workerDesignation = normalizeDesignation(w.designation);
    const matchDesig = selectedDesignations.includes('All') || selectedDesignations.includes(workerDesignation);
    const row = existingByWorker.get(String(w.id));
    const rowSite = normalizeSite(row?.work_site || row?.site);
    const matchDailySite = row && rowSite === normalizeSite(effectiveBulkSite);
    const matchGlobalSite = selectedSiteFilter === 'All' || rowSite === normalizeSite(selectedSiteFilter);
    const eligibleStatus = row && isPresentAttendanceStatus(row.status) && !getAnnualLeaveForWorker(w.id, selectedTimesheetDate);
    return matchDept && matchDesig && matchDailySite && matchGlobalSite && eligibleStatus;
  });

  if (deptWorkers.length === 0) {
    return alert(`Selected date (${selectedTimesheetDate}), site (${effectiveBulkSite}) aur designation (${bulkDesignation}) par koi Present worker nahi mila. Pehle Site Attendance / individual entry mein isi site ke naam se attendance save karein.`);
  }

  const records = deptWorkers.map(w => {
    const old = existingByWorker.get(String(w.id));
    return {
      worker_id: old.worker_id,
      date: selectedTimesheetDate,
      status: old.status,
      overtime_hours: Number(bulkOT) || 0,
      contract_overtime_hours: Number(bulkContractOT) || 0,
      department: old.department || w.department || '',
      work_site: effectiveBulkSite
    };
  });

  const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'worker_id,date' });

  if (attendanceError) {
    alert('Attendance save error: ' + attendanceError.message);
    return;
  }

  setAttendanceData(prev => {
    const updated = { ...prev };
    if (!updated[selectedTimesheetDate]) updated[selectedTimesheetDate] = {};
    deptWorkers.forEach(w => {
      const old = existingByWorker.get(String(w.id));
      updated[selectedTimesheetDate][w.id] = {
        status: old.status,
        ot: Number(bulkOT) || 0,
        contract_ot: Number(bulkContractOT) || 0,
        contract_overtime_hours: Number(bulkContractOT) || 0,
        site: effectiveBulkSite,
        work_site: effectiveBulkSite
      };
    });
    return updated;
  });


  void logActivity('Overtime entry', `${selectedTimesheetDate}: ${deptWorkers.length} workers; department ${bulkDepartment}; site ${effectiveBulkSite}; normal OT ${bulkOT}; contract OT ${bulkContractOT}`);
  alert(
    `Overtime updated for ${selectedTimesheetDate}: ${deptWorkers.length} workers. Existing attendance status was preserved.`
  );

  fetchAttendance();
}

  
// Bulk Contract OT: updates only the contract OT field for existing Present / Holiday Present rows.
async function handleBulkContractOnlyOT(e) {
  e.preventDefault();
  if (!userRole.is_admin) return alert('Bulk Contract OT sirf Admin save kar sakta hai.');
  if (!requireHrEditMode('Bulk Contract OT save')) return;
  if (!selectedTimesheetDate || !bulkContractOnlySite) return alert('Date aur working site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  const hours = Number(bulkContractOnlyHours);
  if (!Number.isFinite(hours) || hours < 0) return alert('Contract OT hours sahi enter karein.');
  const chosen = [...new Set((bulkContractOnlyDesignations || []).map(x => String(x).trim().toLowerCase()).filter(Boolean))];
  if (!chosen.length) return alert('Kam az kam aik designation select karein.');
  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const siteKey = normalize(bulkContractOnlySite);
  const existingByWorker = new Map(attendance
    .filter(a => String(a.date || '').slice(0, 10) === selectedTimesheetDate)
    .map(a => [String(a.worker_id), a]));
  const selectedWorkers = workers.filter(w => {
    const row = existingByWorker.get(String(w.id));
    return chosen.includes(normalize(w.designation)) && row && normalize(row.work_site || row.site) === siteKey;
  });
  if (!selectedWorkers.length) return alert('Is date par selected site ki attendance mein koi worker nahi mila. Workers Directory ki default site nahi, attendance ki daily site check ki gayi hai.');
  const eligible = selectedWorkers.filter(w => {
    const row = existingByWorker.get(String(w.id));
    return row && isPresentAttendanceStatus(row.status) && !getAnnualLeaveForWorker(w.id, selectedTimesheetDate);
  });
  if (!eligible.length) return alert('Is date aur selected daily site par koi Present / Holiday Present worker nahi mila. Attendance create ya status change nahi kiya gaya.');
  const records = eligible.map(w => {
    const old = existingByWorker.get(String(w.id));
    return {
      worker_id: old.worker_id,
      date: selectedTimesheetDate,
      status: old.status,
      overtime_hours: Number(old.overtime_hours) || 0,
      contract_overtime_hours: hours,
      department: old.department || w.department || '',
      work_site: bulkContractOnlySite
    };
  });
  setBulkContractOnlySaving(true);
  try {
    // Chunk requests to avoid request-size limits on large sites.
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.from('attendance').upsert(records.slice(i, i + 500), { onConflict: 'worker_id,date' });
      if (error) throw error;
    }
    void logActivity('Bulk Contract OT', `${selectedTimesheetDate}: ${eligible.length} workers; site ${bulkContractOnlySite}; designations ${chosen.join(', ')}; ${hours} contract OT hours`);
    await fetchAttendance();
    alert(`Contract OT save ho gaya: ${eligible.length} Present / Holiday Present workers ko ${hours} hours. Attendance status aur Normal OT mehfooz rakha gaya.`);
  } catch (err) {
    alert('Bulk Contract OT save nahi hua: ' + (err?.message || String(err)));
  } finally {
    setBulkContractOnlySaving(false);
  }
}

 // 3. Handle Single Attendance & OT Change (Auto-saves to DB and updates Monthly Timesheet)
async function handleSingleAttendanceChange(
  workerId,
  dateStr,
  newStatus,
  newOt,
  newSite,
  newContractOT = 0,
  newExtraOT = null,
  newExtraOTSite = null
) {
  if (!requireHrEditMode('Attendance / OT update')) throw new Error('Admin Edit Mode OFF hai.');
  if (isPayrollDateClosed(dateStr)) throw new Error('Yeh salary period close hai. Is date ki attendance/OT edit nahi ho sakti. Admin pehle period reopen kare.');
  if (!userRole.is_admin && !userRole.can_edit_timesheet) {
    throw new Error('Aapko timesheet edit karne ki permission nahi hai.');
  }
  if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) {
    throw new Error('Yeh worker aapki assigned department/site mein nahi hai.');
  }
  const previousRecord = attendanceData[dateStr]?.[workerId] || {};
  const existingDbRecord = attendance.find(a => String(a.worker_id) === String(workerId) && String(a.date).slice(0,10) === String(dateStr).slice(0,10));
  if (!userRole.is_admin && existingDbRecord) {
    throw new Error('Staff sirf nayi entry kar sakta hai. Is worker ki is date ki entry pehle se mojood hai; edit permission admin ke paas hai.');
  }
  const worker = workers.find(w => String(w.id) === String(workerId));

  const assignedSite =
    !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
      ? userRole.assigned_site
      : (newSite || previousRecord.site || worker?.work_site || sitesList[0] || 'Sharjah Mamzar');

  const savedStatus = isHolidayDate(dateStr) ? (String(newStatus).toLowerCase() === 'present' ? 'Holiday Present' : (String(newStatus).toLowerCase() === 'absent' ? 'Holiday' : newStatus)) : newStatus;
  const canCountOT = isPresentAttendanceStatus(savedStatus) && !getAnnualLeaveForWorker(workerId, dateStr);
  const savedNormalOT = canCountOT ? (Number(newOt) || 0) : 0;
  const savedContractOT = canCountOT ? (Number(newContractOT) || 0) : 0;
  // Extra OT is a separate management-awarded amount; preserve it unless explicitly supplied.
  const savedExtraOT = canCountOT ? (newExtraOT === null ? (Number(existingDbRecord?.extra_ot_hours ?? previousRecord.extra_ot_hours) || 0) : (Number(newExtraOT) || 0)) : 0;
  const savedExtraOTSite = savedExtraOT > 0 ? (newExtraOTSite || existingDbRecord?.extra_ot_site || previousRecord.extra_ot_site || assignedSite) : '';
  const updatedRecord = {
    ...previousRecord,
    status: savedStatus,
    ot: savedNormalOT,
    contract_ot: savedContractOT,
    contract_overtime_hours: savedContractOT,
    extra_ot_hours: savedExtraOT,
    extra_ot_site: savedExtraOTSite,
    site: assignedSite
  };

  setAttendanceData(prev => ({
    ...prev,
    [dateStr]: {
      ...(prev[dateStr] || {}),
      [workerId]: updatedRecord
    }
  }));

  try {
    const { error } = await supabase
      .from('attendance')
      .upsert([{
        worker_id: workerId,
        date: dateStr,
        status: savedStatus,
        overtime_hours: savedNormalOT,
        contract_overtime_hours: savedContractOT,
        extra_ot_hours: savedExtraOT,
        extra_ot_site: savedExtraOTSite,
        department: worker?.department,
        work_site: assignedSite
      }], { onConflict: 'worker_id,date' });

    
if (error) {
  throw new Error(error.message);
}
    void logActivity('Attendance entry', `${dateStr}: worker #${workerId}, status ${newStatus}, normal OT ${Number(newOt) || 0}, contract OT ${Number(newContractOT) || 0}, extra OT ${savedExtraOT}`);

  } catch (err) {
    alert('Save karte waqt error: ' + err.message);
  }
}
  
async function handleSaveSiteAttendance(e) {
  if (!requireHrEditMode('Site attendance save')) return;

  e.preventDefault();
  if (!userRole.is_admin) return alert('Staff ko bulk overwrite ki permission nahi hai. Nayi entry Quick Entry se karein; existing records admin update karega.');
  if (!selectedTimesheetDate || !siteAttendanceSite) return alert('Date aur site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  if (!siteAttendanceDepartment || siteAttendanceDepartment === 'All') return alert('Ek specific department select karein.');

  const allowedWorkers = workers;
  const enteredIds = [...new Set(siteAttendanceIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  if (!enteredIds.length) return alert('Kam az kam aik worker ID enter karein.');
  const normalizeWorkerId = value => String(value ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const normalizeDepartment = value => normalizeWorkerId(value).replace(/\s+/g, ' ');
  const getPublicWorkerIds = w => [w.worker_id, w.id, w.employee_id, w.id_no, w.worker_no, w.employee_no]
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(normalizeWorkerId);
  const departmentWorkers = allowedWorkers.filter(w => normalizeDepartment(w.department) === normalizeDepartment(siteAttendanceDepartment));
  const presentWorkers = enteredIds.map(id => departmentWorkers.find(w => getPublicWorkerIds(w).includes(normalizeWorkerId(id))));
  const missingIds = enteredIds.filter((id, i) => !presentWorkers[i]);
  if (missingIds.length) {
    const details = missingIds.map(id => {
      const worker = allowedWorkers.find(w => getPublicWorkerIds(w).includes(normalizeWorkerId(id)));
      return worker ? `${id} (${worker.name || 'Worker'} — ${worker.department || 'No department'})` : `${id} (Workers Directory mein ID nahi mili)`;
    });
    return alert('Yeh IDs selected department mein nahi milin: ' + details.join('; ') + '. Site matching ab Workers Directory ki default site se nahi hoti. Department aur worker ID verify karein.');
  }

  // Save only the IDs entered for this site. Other workers are left untouched,
  // because workers can move between sites on different days and their master
  // Workers Directory site is not their daily attendance location.
  const selectedWorkers = [...new Map(presentWorkers.filter(Boolean).map(w => [String(w.id), w])).values()];
  setSiteAttendanceSaving(true);
  try {
    const siteDateIsHoliday = isHolidayDate(selectedTimesheetDate);
    const records = selectedWorkers.map(w => {
      const old = attendance.find(a => String(a.worker_id) === String(w.id) && String(a.date || '').slice(0, 10) === selectedTimesheetDate);
      const activeAnnualLeave = getAnnualLeaveForWorker(w.id, selectedTimesheetDate);
      const status = activeAnnualLeave ? 'Annual Leave' : (siteDateIsHoliday ? 'Holiday Present' : 'Present');
      const canCountOT = isPresentAttendanceStatus(status);
      return {
        worker_id: w.id,
        date: selectedTimesheetDate,
        status,
        overtime_hours: canCountOT ? (siteDateIsHoliday ? (Number(siteHolidayNormalOT) || 0) : (Number(old?.overtime_hours) || 0)) : 0,
        contract_overtime_hours: canCountOT ? (siteDateIsHoliday ? (Number(siteHolidayContractOT) || 0) : (Number(old?.contract_overtime_hours) || 0)) : 0,
        department: w.department || '',
        work_site: siteAttendanceSite
      };
    });
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) throw error;
    setSiteAttendanceIds('');
    void logActivity('Site attendance entry', `${selectedTimesheetDate}: ${records.length} entered workers at ${siteAttendanceSite}; department ${siteAttendanceDepartment}; holiday ${siteDateIsHoliday ? 'yes' : 'no'}`);
    await fetchAttendance();
    alert(siteDateIsHoliday
      ? `Holiday attendance save ho gayi (${siteAttendanceSite}): ${records.filter(r => r.status === 'Holiday Present').length} duty workers. Doosre workers ka record change nahi hua.`
      : `Attendance save ho gayi (${siteAttendanceSite}): ${records.filter(r => r.status === 'Present').length} Present workers. Doosre workers ka record change nahi hua.`);
  } catch (err) {
    alert('Attendance save nahi hui: ' + (err?.message || String(err)));
  } finally {
    setSiteAttendanceSaving(false);
  }
}

async function handleBulkDesignationAttendance(e) {
  e.preventDefault();
  if (!userRole.is_admin) return alert('Bulk Present / Absent attendance sirf Admin save kar sakta hai.');
  if (!requireHrEditMode('Bulk designation attendance save')) return;
  if (!selectedTimesheetDate || !bulkMarkSite) return alert('Date aur working site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  if (bulkMarkSaving) return;

  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const chosenDesignation = normalize(bulkMarkDesignation);
  const carpenterAliases = ['carpenter', 'carpenter helper', 'carpenter foreman', 'carpenter forman'];
  const steelAliases = ['steel fixer', 'steel fixer helper', 'steel labour', 'steel labor', 'steel fixer labour', 'steel fixer labor', 'steel foreman', 'steel fixer foreman', 'steel fixer forman', 'steel forman'];
  const designationMatches = w => {
    const actual = normalize(w.designation);
    if (!chosenDesignation || chosenDesignation === 'all') return true;
    if (chosenDesignation === 'carpenter') return carpenterAliases.includes(actual);
    if (chosenDesignation === 'steel fixer') return steelAliases.includes(actual);
    return actual === chosenDesignation;
  };
  const departmentMatches = w => normalize(bulkMarkDepartment) === 'all' || normalize(w.department) === normalize(bulkMarkDepartment);
  const globalSiteMatches = () => {
    const scope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
    return !scope || normalize(scope) === 'all' || normalize(bulkMarkSite) === normalize(scope);
  };
  const candidates = workers.filter(w => departmentMatches(w) && designationMatches(w) && globalSiteMatches(w));
  if (!candidates.length) return alert('Selected department/designation mein koi worker nahi mila. Workers Directory mein designation check karein.');

  const dateRows = attendance.filter(a => String(a.date || '').slice(0, 10) === selectedTimesheetDate);
  const existingByWorker = new Map(dateRows.map(a => [String(a.worker_id), a]));
  const selectedSiteKey = normalize(bulkMarkSite);
  const skippedOtherSite = [];
  const skippedLeave = [];
  const eligible = candidates.filter(w => {
    const old = existingByWorker.get(String(w.id));
    // Never silently move a worker who is already recorded at another site on this date.
    if (old && normalize(old.work_site || old.site) !== selectedSiteKey) {
      skippedOtherSite.push(w);
      return false;
    }
    if (getAnnualLeaveForWorker(w.id, selectedTimesheetDate)) {
      skippedLeave.push(w);
      return false;
    }
    return true;
  });
  if (!eligible.length) {
    return alert(`Is selection mein save karne ke liye worker nahi mila. ${skippedOtherSite.length} worker(s) ki isi date par doosri site attendance mojood hai aur ${skippedLeave.length} Annual Leave par hain; unka record change nahi kiya.`);
  }

  const holiday = isHolidayDate(selectedTimesheetDate);
  const records = eligible.map(w => {
    const old = existingByWorker.get(String(w.id));
    let status = bulkMarkStatus;
    if (holiday) status = bulkMarkStatus === 'Present' ? 'Holiday Present' : 'Holiday';
    const present = isPresentAttendanceStatus(status);
    return {
      worker_id: w.id,
      date: selectedTimesheetDate,
      status,
      overtime_hours: present ? (Number(old?.overtime_hours) || 0) : 0,
      contract_overtime_hours: present ? (Number(old?.contract_overtime_hours) || 0) : 0,
      department: w.department || old?.department || '',
      work_site: bulkMarkSite
    };
  });

  setBulkMarkSaving(true);
  try {
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.from('attendance').upsert(records.slice(i, i + 500), { onConflict: 'worker_id,date' });
      if (error) throw error;
    }
    void logActivity('Bulk designation attendance', `${selectedTimesheetDate}: ${records.length} workers; site ${bulkMarkSite}; department ${bulkMarkDepartment}; designation ${bulkMarkDesignation}; status ${holiday ? (bulkMarkStatus === 'Present' ? 'Holiday Present' : 'Holiday') : bulkMarkStatus}`);
    await fetchAttendance();
    const savedStatus = holiday ? (bulkMarkStatus === 'Present' ? 'Holiday Present' : 'Holiday (absent count nahi hoga)') : bulkMarkStatus;
    alert(`${savedStatus} attendance save ho gayi: ${records.length} workers. Site: ${bulkMarkSite}. ${skippedOtherSite.length} worker(s) doosri site par pehle se recorded thay aur ${skippedLeave.length} Annual Leave par thay; unka record change nahi kiya.`);
  } catch (err) {
    alert('Bulk attendance save nahi hui: ' + (err?.message || String(err)));
  } finally {
    setBulkMarkSaving(false);
  }
}

async function handleBulkExtraOT(e) {
  e.preventDefault();
  if (!userRole.is_admin) return alert('Bulk Extra OT sirf Admin save kar sakta hai.');
  if (!requireHrEditMode('Bulk Extra OT save')) return;
  if (!selectedTimesheetDate || !bulkExtraOTSite) return alert('Date aur Extra OT site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  const hours = Number(bulkExtraOTHours);
  if (!Number.isFinite(hours) || hours <= 0) return alert('Extra OT hours zero se zyada enter karein.');
  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const enteredIds = [...new Set(bulkExtraOTWorkerIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  const idSet = new Set(enteredIds.map(normalize));
  const chosenDepartment = normalize(bulkExtraOTDepartment);
  const chosenDesignation = normalize(bulkExtraOTDesignation);
  const candidates = workers.filter(w => {
    if (enteredIds.length) return idSet.has(normalize(w.worker_id)) || idSet.has(normalize(w.id));
    const deptMatch = chosenDepartment === 'all' || normalize(w.department) === chosenDepartment;
    const designationMatch = chosenDesignation === 'all' || normalize(w.designation) === chosenDesignation;
    return deptMatch && designationMatch;
  });
  if (!candidates.length) return alert('Selected Department / Designation ya Worker ID ke mutabiq koi worker nahi mila.');
  const existingByWorker = new Map(attendance.filter(a => String(a.date || '').slice(0, 10) === selectedTimesheetDate).map(a => [String(a.worker_id), a]));
  const selectedSiteKey = normalize(bulkExtraOTSite);
  const eligible = candidates.filter(w => {
    const row = existingByWorker.get(String(w.id));
    // Site is a mandatory scope, even when Worker IDs are entered.
    const workerAttendanceSite = normalize(row?.work_site || row?.site);
    const sameSite = workerAttendanceSite === selectedSiteKey;
    return sameSite && row && isPresentAttendanceStatus(row.status) && !getAnnualLeaveForWorker(w.id, selectedTimesheetDate);
  });
  const skipped = candidates.length - eligible.length;
  if (!eligible.length) return alert('Selected date par in workers ki Present attendance nahi mili. Pehle attendance save karein; Extra OT sirf Present / Holiday Present workers ko diya jayega.');
  const records = eligible.map(w => {
    const old = existingByWorker.get(String(w.id));
    return {
      worker_id: w.id, date: selectedTimesheetDate, status: old.status,
      overtime_hours: Number(old.overtime_hours) || 0,
      contract_overtime_hours: Number(old.contract_overtime_hours) || 0,
      extra_ot_hours: hours, extra_ot_site: bulkExtraOTSite,
      department: old.department || w.department || '',
      work_site: old.work_site || old.site || ''
    };
  });
  setBulkExtraOTSaving(true);
  try {
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.from('attendance').upsert(records.slice(i, i + 500), { onConflict: 'worker_id,date' });
      if (error) throw error;
    }
    void logActivity('Bulk Extra OT', `${selectedTimesheetDate}: ${eligible.length} workers; extra OT ${hours} hours; OT site ${bulkExtraOTSite}; department ${bulkExtraOTDepartment}; designation ${bulkExtraOTDesignation}; IDs ${enteredIds.join(', ')}`);
    await fetchAttendance();
    alert(`Extra OT save ho gaya: ${eligible.length} workers × ${hours} hours. Extra OT Site: ${bulkExtraOTSite}. ${skipped} worker(s) skip huay kyun ke unki selected date par Present attendance nahi thi.`);
  } catch (err) {
    alert('Bulk Extra OT save nahi hua: ' + (err?.message || String(err)));
  } finally { setBulkExtraOTSaving(false); }
}

// Correct accidental cross-site Extra OT assignments without touching the selected site's valid workers.
async function handleRemoveExtraOTFromOtherSites() {
  if (!userRole.is_admin) return alert('Extra OT remove sirf Admin kar sakta hai.');
  if (!requireHrEditMode('Remove Extra OT from other sites')) return;
  if (!selectedTimesheetDate || !bulkExtraOTSite) return alert('Date aur Extra OT site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const enteredIds = [...new Set(bulkExtraOTWorkerIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  const idSet = new Set(enteredIds.map(normalize));
  const chosenDepartment = normalize(bulkExtraOTDepartment);
  const chosenDesignation = normalize(bulkExtraOTDesignation);
  const selectedSiteKey = normalize(bulkExtraOTSite);
  const candidates = workers.filter(w => {
    if (enteredIds.length) return idSet.has(normalize(w.worker_id)) || idSet.has(normalize(w.id));
    const deptMatch = chosenDepartment === 'all' || normalize(w.department) === chosenDepartment;
    const designationMatch = chosenDesignation === 'all' || normalize(w.designation) === chosenDesignation;
    return deptMatch && designationMatch;
  });
  const rowsByWorker = new Map(attendance.filter(a => String(a.date || '').slice(0, 10) === selectedTimesheetDate).map(a => [String(a.worker_id), a]));
  const toRemove = candidates.map(w => ({ worker: w, row: rowsByWorker.get(String(w.id)) })).filter(({ row }) => {
    if (!row || !(Number(row.extra_ot_hours) > 0)) return false;
    const awardedSite = normalize(row.extra_ot_site || row.work_site || row.site);
    const actualAttendanceSite = normalize(row.work_site || row.site);
    return awardedSite === selectedSiteKey && actualAttendanceSite !== selectedSiteKey;
  });
  if (!toRemove.length) return alert('Is date par selected OT site ke naam se doosri sites ke workers ko koi Extra OT nahi mila.');
  if (!window.confirm(`${toRemove.length} worker(s) ke doosri sites wale Extra OT ko remove karna hai? Selected ${bulkExtraOTSite} site ke workers ka OT safe rahega.`)) return;
  setBulkExtraOTSaving(true);
  try {
    const records = toRemove.map(({ worker, row }) => ({
      worker_id: worker.id,
      date: selectedTimesheetDate,
      status: row.status,
      overtime_hours: Number(row.overtime_hours) || 0,
      contract_overtime_hours: Number(row.contract_overtime_hours) || 0,
      extra_ot_hours: 0,
      extra_ot_site: '',
      department: row.department || worker.department || '',
      work_site: row.work_site || row.site || ''
    }));
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.from('attendance').upsert(records.slice(i, i + 500), { onConflict: 'worker_id,date' });
      if (error) throw error;
    }
    void logActivity('Remove cross-site Extra OT', `${selectedTimesheetDate}: removed ${records.length} worker(s); Extra OT site ${bulkExtraOTSite}; department ${bulkExtraOTDepartment}; designation ${bulkExtraOTDesignation}; IDs ${enteredIds.join(', ')}`);
    await fetchAttendance();
    alert(`Doosri sites ke ${records.length} worker(s) ka Extra OT remove ho gaya. ${bulkExtraOTSite} site ke workers ka Extra OT change nahi kiya.`);
  } catch (err) {
    alert('Extra OT remove nahi hua: ' + (err?.message || String(err)));
  } finally { setBulkExtraOTSaving(false); }
}

async function handleQuickAttendance(e) {
  if (!requireHrEditMode('Quick attendance save')) return;

  e.preventDefault();

  if (quickSaving) return;

  const enteredId = quickWorkerId.trim();

  const worker = workers.find(w =>
    String(w.worker_id ?? '').trim().toLowerCase() === enteredId.toLowerCase() ||
    String(w.id).trim().toLowerCase() === enteredId.toLowerCase()
  );

  if (!worker || (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(worker.id)))) {
    alert('Worker ID nahi mila ya yeh worker aapke assigned department/site mein nahi hai.');
    return;
  }

  const hours = Number(quickHours);

  if (!Number.isFinite(hours) || hours < 0) {
    alert('OT hours sahi enter karein.');
    return;
  }

  const existingQuickAttendance = attendance.find(a => String(a.worker_id) === String(worker.id) && String(a.date).slice(0, 10) === String(selectedTimesheetDate).slice(0, 10));
  const normalOT = quickOTType === 'Normal OT' ? hours : (Number(existingQuickAttendance?.overtime_hours) || 0);
  const contractOT = quickOTType === 'Contract OT' ? hours : (Number(existingQuickAttendance?.contract_overtime_hours) || 0);
  const extraOT = quickOTType === 'Extra OT' ? hours : (Number(existingQuickAttendance?.extra_ot_hours) || 0);

  setQuickSaving(true);

  try {
    await handleSingleAttendanceChange(
      worker.id,
      selectedTimesheetDate,
      'Present',
      normalOT,
      quickSite,
      contractOT,
      extraOT,
      quickOTType === 'Extra OT' ? quickSite : null
    );

    setQuickWorkerId('');
    setQuickHours('2');

    document.getElementById('quick-worker-id')?.focus();
 
} catch (err) {
  alert('Save karte waqt error: ' + err.message);
  throw err;
} finally {
    setQuickSaving(false);
  }
}

  // 4. Handle Mark Single Attendance (For timesheet table)
  async function handleMarkAttendance(workerId, status) {
    if (!requireHrEditMode('Attendance update')) return;

    if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return alert('Aapko timesheet edit karne ki permission nahi hai.');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Yeh worker aapke assigned scope mein nahi hai.');
    const existingAttendanceRow = attendance.find(a => String(a.worker_id) === String(workerId) && String(a.date).slice(0,10) === String(selectedTimesheetDate).slice(0,10));
    if (!userRole.is_admin && existingAttendanceRow) return alert('Staff sirf nayi entry kar sakta hai. Is date ki attendance pehle se mojood hai; edit admin karega.');
    const worker = workers.find(w => String(w.id) === String(workerId));
  const oldRecord = attendanceData[selectedTimesheetDate]?.[workerId] || {};

const assignedSiteForToday =
  !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
    ? userRole.assigned_site
    : (timesheetSiteInputs[workerId] ||
       oldRecord.site ||
       oldRecord.work_site ||
       worker?.work_site ||
       sitesList[0]);

const otHours = Number(
  overtimeInputs[workerId] ??
  oldRecord.ot ??
  oldRecord.overtime_hours ??
  0
);
    
    const contractOtHours = Number(oldRecord.contract_ot ?? oldRecord.contract_overtime_hours ?? attendance.find(a => String(a.worker_id) === String(workerId) && a.date === selectedTimesheetDate)?.contract_overtime_hours ?? 0) || 0;
    const savedStatus = isHolidayDate(selectedTimesheetDate) ? (String(status).toLowerCase() === 'present' ? 'Holiday Present' : (String(status).toLowerCase() === 'absent' ? 'Holiday' : status)) : status;
    const canCountOT = isPresentAttendanceStatus(savedStatus) && !getAnnualLeaveForWorker(workerId, selectedTimesheetDate);
    const { error } = await supabase.from('attendance').upsert([
      { worker_id: workerId, date: selectedTimesheetDate, status: savedStatus, overtime_hours: canCountOT ? otHours : 0, contract_overtime_hours: canCountOT ? contractOtHours : 0, department: worker?.department, work_site: assignedSiteForToday }
    ], { onConflict: 'worker_id,date' });

    if (error) alert('Error: ' + error.message);
    else { void logActivity('Attendance entry', `${selectedTimesheetDate}: worker #${workerId}, status ${status}`); fetchAttendance(); }
  }

  // 5. Handle Save Staff Permissions
  async function handleSavePermission(e) {
    if (!requireHrEditMode('User permission save')) return;

    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin staff permissions change kar sakta hai.');
    if (!targetEmail || !targetPassword) return alert('Staff email aur password enter karein.');
    if (targetEmail.trim().toLowerCase() === session?.user?.email?.toLowerCase()) return alert('Admin apna account staff permission form se edit nahi kar sakta.');

    const permData = {
      staff_id: targetStaffId.trim(),
      user_email: targetEmail.trim().toLowerCase(),
      user_password: targetPassword.trim(),
      assigned_department: targetDept,
      assigned_site: targetSite,
      can_view_dashboard: permDashboard,
      can_use_bulk: false,
      can_view_workers: permViewWorkers,
      can_add_workers: false,
      can_edit_workers: false,
      can_delete_workers: false,
      can_view_timesheet: permTimesheetView,
      can_view_daily_timesheet: permDailyTimesheetView,
      can_edit_timesheet: permTimesheetEdit,
      can_view_payroll: permPayroll,
      is_admin: false
    };

    const { error } = await supabase.from('user_permissions').upsert([permData], { onConflict: 'user_email' });
    if (error) alert('Error: ' + error.message);
    else {
      void logActivity('Staff permissions changed', `${targetEmail.trim().toLowerCase()}, department ${targetDept}, site ${targetSite}`);
      alert('Staff permission saved successfully!');
      setTargetStaffId('');
      setTargetEmail('');
      setTargetPassword('');
      setTargetDept('All');
      fetchPermissionsList();
    }
  }

  // Deduplicate department names case-insensitively for every dropdown and department card.
  const uniqueDepartments = Array.from(new Map((departmentsList || []).map(value => {
    const label = String(value || '').trim();
    return [label.toLowerCase(), label];
  }).filter(([key, label]) => key && label)).values());

  const visibleDepartments = userRole.is_admin
    ? uniqueDepartments
    : uniqueDepartments.filter(d => userRole.assigned_department === 'All' &&
        (userRole.can_view_workers || userRole.can_view_timesheet || userRole.can_view_payroll) ||
        String(d).trim().toLowerCase() === String(userRole.assigned_department || '').trim().toLowerCase());

  // Workers are not permanently assigned to a site. Site selection applies only
  // to daily attendance / overtime records, never to the Workers Dictionary.
  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    return !userDeptScope || userDeptScope === 'All' || String(w.department || '').trim().toLowerCase() === String(userDeptScope).trim().toLowerCase();
  });

  // Annual Leave records follow the worker's department scope.
  const annualLeaveScopedWorkerIds = new Set(filteredWorkers.map(w => String(w.id)));
  const annualLeaveScopedList = annualLeaveList.filter(leave => annualLeaveScopedWorkerIds.has(String(leave.worker_id)));

  const attendanceEligibleWorkers = filteredWorkers.filter(w => !w.joining_date || String(selectedTimesheetDate || '').slice(0, 10) >= String(w.joining_date).slice(0, 10));
  const activeWorkerIds = new Set(attendanceEligibleWorkers.map(w => w.id));
  const selectedDateAttendance = attendance.filter(a => a.date === selectedTimesheetDate && activeWorkerIds.has(a.worker_id));
  
  const latestAttendanceMap = {};
  selectedDateAttendance.forEach(a => { latestAttendanceMap[a.worker_id] = a; });

 

const presentCountForDate = attendanceEligibleWorkers.filter(worker => {
  const attendanceRecord = latestAttendanceMap[worker.id];
  const status = (attendanceRecord?.status || '').trim().toLowerCase();

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  return status === 'present' && !onAnnualLeave;
}).length;

const annualLeaveCountForDate = filteredWorkers.filter(worker => {
  const record = annualLeaveList.find(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  const attendanceRecord = latestAttendanceMap[worker.id];
  return record || (
    (attendanceRecord?.status || '').toLowerCase() === 'annual leave'
  );
}).length;
const absentCountForDate = Object.values(latestAttendanceMap).filter(
  a => (a.status || '').toLowerCase() === 'absent'
).length;
 
  const salaryDataMap = {};

  // Global HR payroll period is selected by Admin from the Dashboard.
  const formatPayrollDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const payrollPeriodStartDate = String(payrollStartDate || '').slice(0, 10);
  const payrollPeriodEndDate = String(payrollEndDate || '').slice(0, 10);
  const payrollPeriodStart = payrollPeriodStartDate ? new Date(`${payrollPeriodStartDate}T12:00:00`) : new Date();
  const payrollPeriodEnd = payrollPeriodEndDate ? new Date(`${payrollPeriodEndDate}T12:00:00`) : new Date();
  // Salary is always calculated for the calendar month containing the OT closing date.
  // The configured 16th-to-15th dates remain the separate OT / attendance closing window.
  const salaryMonthStart = new Date(payrollPeriodEnd.getFullYear(), payrollPeriodEnd.getMonth(), 1, 12, 0, 0);
  const salaryMonthEnd = new Date(payrollPeriodEnd.getFullYear(), payrollPeriodEnd.getMonth() + 1, 0, 12, 0, 0);
  const salaryMonthStartDate = formatPayrollDate(salaryMonthStart);
  const salaryMonthEndDate = formatPayrollDate(salaryMonthEnd);
  const salaryMonthDays = salaryMonthEnd.getDate();
  const salaryMonthLabel = salaryMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentPayrollPeriodClosed = closedPayrollPeriods.some(period => period.status === 'closed' && String(period.start_date).slice(0, 10) === payrollPeriodStartDate && String(period.end_date).slice(0, 10) === payrollPeriodEndDate);

  // Admin ko tamam sites ke workers dikhayein
  // Staff ko sirf apni permitted workers list dikhayein
  const payrollWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(worker => {
    const workerDepartment = String(worker.department || '').trim().toLowerCase();
    const selectedPayrollDepartment = String(payrollDepartment || 'All').trim().toLowerCase();
    const assignedDept = String(userRole.assigned_department || 'All').trim().toLowerCase();
    const assignedSite = String(userRole.assigned_site || 'All').trim().toLowerCase();
    const siteScope = String(userRole.is_admin ? selectedSiteFilter : userRole.assigned_site || 'All').trim().toLowerCase();
    const payrollDeptMatch = selectedPayrollDepartment === 'all' || workerDepartment === selectedPayrollDepartment;
    const staffDeptMatch = userRole.is_admin || assignedDept === 'all' || workerDepartment === assignedDept;
    // Site access is checked against the worker's attendance rows in the OT
    // closing period, because workers can move between sites day by day.
    const siteAttendanceMatch = siteScope === 'all' || attendance.some(a =>
      String(a.worker_id) === String(worker.id) &&
      String(a.date || '').slice(0, 10) >= payrollPeriodStartDate &&
      String(a.date || '').slice(0, 10) <= payrollPeriodEndDate &&
      String(a.work_site || a.site || '').trim().toLowerCase() === siteScope
    );
    return payrollDeptMatch && staffDeptMatch && siteAttendanceMatch;
  });

  payrollWorkers.forEach(worker => {
    const workerJoinDate = String(worker.joining_date || '').slice(0, 10);
    const payrollAsOfDate = formatPayrollDate(new Date());
    const effectiveOTEndDate = payrollPeriodEndDate < payrollAsOfDate ? payrollPeriodEndDate : payrollAsOfDate;

    // The existing 16th-to-15th closing range is used for absence deductions
    // as well as all overtime categories. Only explicit Absent records deduct days.
    const otRecordsByDate = new Map();
    attendance.forEach(a => {
      const recordDate = String(a.date || '').slice(0, 10);
      if (String(a.worker_id) === String(worker.id) && recordDate >= payrollPeriodStartDate && recordDate <= effectiveOTEndDate && (!workerJoinDate || recordDate >= workerJoinDate)) {
        otRecordsByDate.set(recordDate, a);
      }
    });
    const otRecords = Array.from(otRecordsByDate.values());

    // Payable days are the full calendar salary-month days minus unique Absent
    // dates in the 16th-to-15th closing period. Joining date is respected.
    const salaryEligibleDays = workerJoinDate && workerJoinDate > salaryMonthStartDate
      ? Math.max(0, Math.floor((salaryMonthEnd - new Date(`${workerJoinDate}T12:00:00`)) / 86400000) + 1)
      : salaryMonthDays;
    const absentDays = new Set(
      otRecords
        .filter(a => String(a.status || '').trim().toLowerCase() === 'absent')
        .map(a => String(a.date || '').slice(0, 10))
    ).size;
    const presentDays = Math.max(0, salaryEligibleDays - absentDays);

    // Normal OT + Contract OT + Extra OT use the independent 16th-to-15th closing period.
    const totalOT = otRecords.reduce((total, record) => {
      if (!isPresentAttendanceStatus(record.status) || getAnnualLeaveForWorker(worker.id, record.date)) return total;
      const normalOT = Number(record.overtime_hours) || 0;
      const contractOT = Number(record.contract_overtime_hours) || 0;
      const extraOT = Number(record.extra_ot_hours) || 0;
      return total + normalOT + contractOT + extraOT;
    }, 0);

    const normalOTTotal = otRecords.reduce((total, record) => total + (isPresentAttendanceStatus(record.status) && !getAnnualLeaveForWorker(worker.id, record.date) ? (Number(record.overtime_hours) || 0) : 0), 0);
    const contractOTTotal = otRecords.reduce((total, record) => total + (isPresentAttendanceStatus(record.status) && !getAnnualLeaveForWorker(worker.id, record.date) ? (Number(record.contract_overtime_hours) || 0) : 0), 0);

    const extraOTTotal = otRecords.reduce((total, record) => {
      if (!isPresentAttendanceStatus(record.status) || getAnnualLeaveForWorker(worker.id, record.date)) return total;
      return total + (Number(record.extra_ot_hours) || 0);
    }, 0);

    const monthlySal = Number(
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * salaryMonthDays) ||
      0
    );

    const dailyRateNum = monthlySal / salaryMonthDays;
    const hourlyRate = dailyRateNum / 8;

    const baseSalary = dailyRateNum * presentDays;
    const otSalary = totalOT * (hourlyRate * 1.25);
    const totalPayable = baseSalary + otSalary;

    salaryDataMap[worker.id] = {
      presentDays,
      totalOT,
      normalOT: normalOTTotal,
      contractOT: contractOTTotal,
      extraOT: extraOTTotal,
      baseSalary,
      otSalary,
      totalPayable,
      monthlySal
    };
  });

  const salaryData = payrollWorkers.map(worker => ({
    ...worker,
    ...(salaryDataMap[worker.id] || {
      presentDays: 0,
      totalOT: 0,
      baseSalary: 0,
      otSalary: 0,
      totalPayable: 0,
      monthlySal: 0
    })
  }));

  const grandTotalPayroll = salaryData.reduce(
    (total, worker) => total + worker.totalPayable,
    0
  );

  // Print a professional, single-worker payroll slip using the same payroll calculations.
  function handlePrintWorkerPayrollSlip(worker) {
    if (!userRole.is_admin) { alert('Payroll Print / PDF sirf Admin kar sakta hai.'); return; }
    const payroll = salaryDataMap[worker.id] || {};
    const normalOT = Number(payroll.normalOT || 0);
    const contractOT = Number(payroll.contractOT || 0);
    const extraOT = Number(payroll.extraOT || 0);
    const currency = selectedCurrency || worker.currency || 'AED';
    const monthlySalary = Number(payroll.monthlySal || worker.monthly_salary || 0);
    const payableDays = Number(payroll.presentDays || 0);
    const basicPay = Number(payroll.baseSalary || 0);
    const totalOT = normalOT + contractOT + extraOT;
    const overtimePay = Number(payroll.otSalary || 0);
    const totalPay = Number(payroll.totalPayable || (basicPay + overtimePay));
    const dailyRate = salaryMonthDays ? monthlySalary / salaryMonthDays : 0;
    const hourlyRate = dailyRate / 8;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const moneyText = value => `${Math.round(Number(value) || 0).toLocaleString('en-US')} ${esc(currency)}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Print window blocked. Please allow pop-ups and try again.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Salary Slip - ${esc(worker.name)} - ${esc(salaryMonthLabel)}</title>
      <style>
        @page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;background:#fff}
        .brand{display:flex;align-items:center;gap:16px;border-bottom:3px solid #c69227;padding:0 0 13px;margin-bottom:18px}
        .brand img{width:105px;height:66px;object-fit:contain}.brand h1{font-size:21px;color:#0b2853;margin:0 0 5px}.brand p{font-size:12px;color:#475569;margin:0}
        .heading{display:flex;justify-content:space-between;align-items:center;margin:16px 0}.heading h2{margin:0;font-size:20px;color:#0f172a}.period{font-size:11px;color:#475569;text-align:right;line-height:1.6}
        .employee{display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;padding:14px 16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:18px;font-size:13px}.employee b{color:#334155}
        table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #cbd5e1;padding:11px 12px;font-size:13px}th{background:#eaf0f7;text-align:left;color:#24364b}.amount{text-align:right;font-weight:700;white-space:nowrap}
        .total td{background:#eaf7ef;font-weight:800;font-size:15px}.section-title{font-size:14px;color:#0b2853;margin:18px 0 7px}.note{font-size:11px;color:#64748b;margin-top:12px}
        .signatures{display:grid;grid-template-columns:1fr 1fr;gap:55px;margin-top:58px}.sign{border-top:1px solid #64748b;text-align:center;padding-top:8px;font-size:12px;color:#475569}
        .footer{border-top:1px solid #cbd5e1;margin-top:28px;padding-top:9px;text-align:center;font-size:10px;color:#64748b}
      </style></head><body>
        <div class="brand"><img src="/nda-naveed-logo.png" alt="Company Logo"><div><h1>NDA-PK</h1><p>Payroll & Human Resources Department</p><p>Individual Employee Salary Statement</p></div></div>
        <div class="heading"><h2>SALARY SLIP</h2><div class="period"><b>Salary Month:</b> ${esc(salaryMonthLabel)}<br><b>OT Closing Period:</b> ${esc(payrollPeriodStartDate)} to ${esc(payrollPeriodEndDate)}</div></div>
        <div class="employee">
          <div><b>Employee Name:</b> ${esc(worker.name || '—')}</div><div><b>Employee ID:</b> #${esc(worker.id)}</div>
          <div><b>Department:</b> ${esc(worker.department || '—')}</div><div><b>Designation:</b> ${esc(worker.designation || '—')}</div>
          <div><b>Currency:</b> ${esc(currency)}</div>
          <div><b>Monthly Basic Salary:</b> ${moneyText(monthlySalary)}</div><div><b>Payable Days:</b> ${payableDays} / ${salaryMonthDays}</div>
        </div>
        <div class="section-title">Salary & Overtime Breakdown</div>
        <table><thead><tr><th>Description</th><th>Hours / Days</th><th class="amount">Amount (${esc(currency)})</th></tr></thead><tbody>
          <tr><td>Basic Salary (${payableDays} payable days)</td><td>${payableDays} days</td><td class="amount">${moneyText(basicPay)}</td></tr>
          <tr><td>Normal Overtime</td><td>${normalOT.toFixed(2)} hrs</td><td class="amount">—</td></tr>
          <tr><td>Contract Overtime</td><td>${contractOT.toFixed(2)} hrs</td><td class="amount">—</td></tr>
          <tr><td>Extra Overtime</td><td>${extraOT.toFixed(2)} hrs</td><td class="amount">—</td></tr>
          <tr><td><b>Total Overtime</b></td><td><b>${totalOT.toFixed(2)} hrs</b></td><td class="amount">—</td></tr>
          <tr><td>Overtime Pay (1.25 × hourly rate)</td><td>${hourlyRate.toFixed(2)} ${esc(currency)}/hr × 1.25</td><td class="amount">${moneyText(overtimePay)}</td></tr>
          <tr class="total"><td colspan="2">NET TOTAL PAYABLE</td><td class="amount">${moneyText(totalPay)}</td></tr>
        </tbody></table>
        <p class="note">Overtime includes Normal OT, Contract OT and Extra OT recorded within the stated OT closing period. Basic salary is calculated using the salary month's calendar days and payable days.</p>
        <div class="signatures"><div class="sign">Prepared By</div><div class="sign">Employee Signature</div></div>
        <div class="footer">Computer-generated salary slip · ${esc(salaryMonthLabel)} · ${esc(worker.name || '')}</div>
        <script>window.onload=function(){var logo=document.querySelector('.brand img');var go=function(){setTimeout(function(){window.focus();window.print();},250);};if(logo&&!logo.complete){logo.onload=go;logo.onerror=go;}else{go();}};<\/script>
      </body></html>`);
    printWindow.document.close();
  }

  if (!sessionRestoreReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontFamily: "'Segoe UI', sans-serif", padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Restoring Secure Session…</div>
          <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 8 }}>Please wait. Aap ka login aur data access verify ho raha hai.</div>
        </div>
      </div>
    );
  }

  if (!selectedSystem) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #164e63 0, #0f172a 48%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
            <div style={{display:'inline-flex',justifyContent:'center',background:'#fff',borderRadius:18,padding:'8px 18px',marginBottom:12,boxShadow:'0 12px 35px rgba(0,0,0,.22)'}}>
              <img src="/nda-naveed-logo.png" alt="NDA Naveed logo" style={{display:'block',width:'min(100%,340px)',height:'auto',maxHeight:235,objectFit:'contain'}} />
            </div>
            <h1 style={{ fontSize: 'clamp(25px,4vw,38px)', margin: '8px 0' }}>Choose Your System</h1>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Apna system select karein jahan aap kaam karna chahte hain.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <button onClick={() => { setSession(null); setSelectedSystem('hr'); }} style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', padding: 28, minHeight: 270, borderRadius: 22, border: '1px solid #38bdf8', color: '#fff', background: 'linear-gradient(145deg,#075985,#1e3a8a)', boxShadow: '0 18px 50px #0005', cursor: 'pointer', isolation: 'isolate' }}>
              <img src="/nda-naveed-logo.png" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.22, padding: 8, boxSizing: 'border-box', pointerEvents: 'none', zIndex: 0 }} />
              <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,rgba(7,89,133,.78),rgba(30,58,138,.84))', zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 40 }}>👷</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK HR SYSTEM</h2><p style={{ color: '#dbeafe', lineHeight: 1.6 }}>Workers, attendance, timesheet, overtime, payroll, annual leave, permissions aur HR reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#1d4ed8', borderRadius: 10, fontWeight: 800 }}>Open HR System →</span>
              </div>
            </button>
            <button onClick={() => { setSession(null); setSelectedSystem('business'); setBusinessType('transport'); setPassword(''); }} style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', padding: 28, minHeight: 270, borderRadius: 22, border: '1px solid #34d399', color: '#fff', background: 'linear-gradient(145deg,#065f46,#14532d)', boxShadow: '0 18px 50px #0005', cursor: 'pointer', isolation: 'isolate' }}>
              <img src="/nda-naveed-logo.png" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.22, padding: 8, boxSizing: 'border-box', pointerEvents: 'none', zIndex: 0 }} />
              <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,rgba(6,95,70,.80),rgba(20,83,45,.86))', zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 40 }}>📈</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK BUSINESS</h2><p style={{ color: '#d1fae5', lineHeight: 1.6 }}>Transport aur aap ke banaye huay kisi bhi business ka daily roznamcha, vehicle files, workers salary/profit share, bills aur monthly reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#047857', borderRadius: 10, fontWeight: 800 }}>Open Business →</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{background:'#fff',borderRadius:12,padding:8,margin:'0 auto 12px',maxWidth:245}}>
              <img src="/nda-naveed-logo.png" alt="NDA Naveed logo" style={{display:'block',width:'100%',height:'auto'}} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>{selectedSystem === 'hr' ? 'HR SYSTEM · Sites & Staff Login' : 'BUSINESS MANAGEMENT LOGIN'}</p>
            <button type="button" onClick={() => setSelectedSystem(null)} style={{ marginTop: 8, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>← Change System</button>
          </div>
          <form onSubmit={handleLogin}>
            {selectedSystem === 'hr' ? (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nda.pk" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
            ) : (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Business Login ID / Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="business@example.com" autoComplete="username" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
                <div style={{ color: '#a7f3d0', fontSize: 11, marginTop: 6 }}>Business Admin ki shared Admin ID ya apni Business staff ID enter karein.</div>
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {authLoading ? 'Verifying...' : 'Login Now'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (selectedSystem === 'business') {
    return <BusinessWorkspace session={session} userRole={userRole} onLogout={handleLogout} onSwitchSystem={() => setSelectedSystem(null)} />;
  }

  return (
    <>
    <style>{`@media print { body.nda-staff-mode * { display: none !important; visibility: hidden !important; } body.nda-staff-mode::after { content: 'STAFF PRINTING DISABLED — ADMIN ONLY'; display: block !important; visibility: visible !important; font: bold 24px Arial; padding: 40px; color: #b91c1c; } } .nda-staff-watermark { position: fixed; inset: 0; z-index: 9990; pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden; opacity: .075; color: #0f172a; font-size: clamp(24px, 5vw, 58px); font-weight: 900; transform: rotate(-28deg); text-align: center; }`}</style>
    {!userRole.is_admin && session && <div className="nda-staff-watermark">CONFIDENTIAL · {session.user?.email || 'STAFF'} · NDA-PK</div>}
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f4f7fc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
     {/* Compact top bar: system identity lives here; dashboard banner below is the only dashboard hero */}
      <header className="nda-hr-header" style={{ background: 'linear-gradient(115deg,#0b1f46 0%,#123d78 58%,#087e8b 100%)', color: '#ffffff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #0b355f', boxShadow: '0 5px 18px rgba(15,47,99,.22)' }}>
        <div style={{display:'flex',alignItems:'center',gap:12,minWidth:230}}>
          <div style={{width:74,height:56,borderRadius:8,background:'#fff',padding:3,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <img src="/nda-naveed-logo.png" alt="NDA Naveed logo" style={{width:'100%',height:'100%',objectFit:'contain'}} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, color: '#ffffff', fontWeight:900 }}>Workforce Management</h2>
            <span style={{ fontSize: '11px', color: '#dbeafe' }}>Attendance · Timesheet · Payroll</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <div style={{fontSize:12,color:'#e0f2fe',padding:'8px 10px',borderRight:'1px solid #7dd3fc55'}}>📅 {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</div>
          <div style={{display:'flex',alignItems:'center',gap:9,padding:'5px 10px',borderRadius:10,background:'rgba(255,255,255,.13)'}}>
            <img src="/muhammad-naveed-profile.jpg" alt="Muhammad Naveed" style={{width:48,height:48,objectFit:"cover",borderRadius:"50%",border:"2px solid #2563eb",boxShadow:"0 2px 8px rgba(37,99,235,.25)"}}/><div><div style={{fontSize:13,fontWeight:800,color:"#ffffff"}}>Muhammad Naveed</div><div style={{fontSize:10,color:'#dbeafe'}}>Administrator</div></div>
          </div>
          {userRole.is_admin && selectedSystem === 'hr' && <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setNotificationPanelOpen(v => !v); if (!notificationPanelOpen) void markActivityNotificationsRead(); }} style={{ position: 'relative', padding: '8px 11px', background: notificationPanelOpen ? '#f8fafc' : 'rgba(255,255,255,.14)', color: notificationPanelOpen ? '#0f172a' : '#fff', border: '1px solid rgba(255,255,255,.35)', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 800 }} title="Staff activity notifications">🔔 Notifications {activityNotifications.filter(n => !n.is_read).length > 0 ? `(${activityNotifications.filter(n => !n.is_read).length})` : ''}</button>
            {notificationPanelOpen && <div style={{ position: 'absolute', right: 0, top: '44px', width: 'min(390px, 88vw)', maxHeight: 420, overflowY: 'auto', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,.25)', zIndex: 10001, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><b>Staff Activity</b><div style={{display:'flex',gap:6}}><button type="button" onClick={() => void testActivityNotification()} style={{ border: 0, background: '#dbeafe', color:'#1d4ed8', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontWeight:700 }}>Test</button><button type="button" onClick={() => fetchActivityNotifications()} style={{ border: 0, background: '#e2e8f0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>Refresh</button></div></div>
              {notificationLoadError && <div style={{ padding: 9, color: '#991b1b', background: '#fee2e2', borderRadius: 6, fontSize: 12 }}>Notifications database setup required: {notificationLoadError}</div>}
              {notificationSaveError && <div style={{ padding: 9, color: '#991b1b', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, fontSize: 12, marginTop: 6 }}><b>Notification INSERT error:</b><br/>{notificationSaveError}</div>}
              {!!activityNotifications.length && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 4 }}><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}><input type="checkbox" checked={activityNotifications.length > 0 && activityNotifications.every(n => selectedNotificationIds.includes(n.id))} onChange={e => setSelectedNotificationIds(e.target.checked ? activityNotifications.map(n => n.id) : [])} /> Select All</label><button type="button" disabled={!selectedNotificationIds.length} onClick={deleteSelectedActivityNotifications} style={{ border: 0, background: selectedNotificationIds.length ? '#dc2626' : '#e2e8f0', color: selectedNotificationIds.length ? '#fff' : '#64748b', borderRadius: 6, padding: '6px 9px', cursor: selectedNotificationIds.length ? 'pointer' : 'not-allowed', fontWeight: 700 }}>Delete Selected ({selectedNotificationIds.length})</button></div>}
              {!activityNotifications.length && !notificationLoadError && <p style={{ fontSize: 13, color: '#64748b' }}>Abhi koi activity notification nahi.</p>}
              {activityNotifications.map(n => <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 4px', borderBottom: '1px solid #e2e8f0', background: selectedNotificationIds.includes(n.id) ? '#fee2e2' : (n.is_read ? '#fff' : '#eff6ff') }}><input type="checkbox" checked={selectedNotificationIds.includes(n.id)} onChange={e => toggleActivityNotification(n.id, e.target.checked)} style={{ marginTop: 2 }} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 800, fontSize: 12 }}>{n.actor_name || n.actor_email} — {n.action}</div><div style={{ fontSize: 12, marginTop: 3 }}>{n.details || ''}</div><div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{n.actor_email} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div></div></div>)}
            </div>}
          </div>}
          <button onClick={() => setSelectedSystem(null)} style={{ padding: '8px 11px', backgroundColor: 'rgba(255,255,255,.14)', color: '#ffffff', border: '1px solid rgba(255,255,255,.35)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Switch System</button>
          <button onClick={handleLogout} style={{ padding: '8px 11px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* NDA-PK CORPORATE SIDEBAR — existing tabs and handlers are retained */}
      <aside className="nda-sidebar" style={{background:'linear-gradient(180deg,#071d3d 0%,#0b2b55 100%)',color:'#fff',padding:'18px 14px',display:'flex',flexDirection:'column',gap:7,position:'fixed',left:0,top:86,bottom:0,width:278,overflowY:'auto',zIndex:30,boxSizing:'border-box',boxShadow:'5px 0 20px #071d3d18'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 7px 18px',borderBottom:'1px solid #ffffff35',marginBottom:8}}><img src="/nda-naveed-logo.png" alt="NDA-PK" style={{width:62,height:52,objectFit:'contain',background:'#fff',borderRadius:8}}/><div><b style={{fontSize:20,letterSpacing:1}}>NDA-PK</b><div style={{fontSize:11,color:'#dbeafe'}}>HR Management System</div></div></div>
        {[["dashboard","⌂","Dashboard",true],["bulk","⚡","Bulk & OCR",userRole.is_admin||userRole.can_use_bulk],["workers","♙","Workers Directory",userRole.is_admin||userRole.can_view_workers],["attendance","▣","Timesheet Entry",userRole.is_admin||userRole.can_view_timesheet],["daily-timesheet","▤","Daily Timesheet",userRole.is_admin||userRole.can_view_daily_timesheet],["monthly-timesheet","▦","Monthly Timesheet",userRole.is_admin||userRole.can_view_timesheet||userRole.can_view_payroll],["changepass","⚿","Change Password",userRole.is_admin],["sites","⌖","Working Sites",userRole.is_admin],["departments","▥","Departments",userRole.is_admin],["designations","⚒","Designations",userRole.is_admin],["payroll","＄","Payroll",userRole.is_admin||userRole.can_view_payroll],["permissions","♙","Permissions",userRole.is_admin],["annualLeave","🌴","Annual Leave",userRole.is_admin],["data-cleanup","▧","Data Cleanup",userRole.is_admin]].filter(x=>x[3]).map(([id,ico,label])=><button key={id} onClick={()=>{setActiveTab(id);if(!userRole.is_admin) void logActivity('Viewed module', `Staff opened ${label}`);if(id==='monthly-timesheet')setShowMonthlyTimesheetModal(true);}} style={{display:'flex',alignItems:'center',gap:13,textAlign:'left',padding:'12px 14px',border:0,borderRadius:10,background:activeTab===id?'linear-gradient(90deg,#0878f9,#1762d6)':'transparent',color:'#fff',fontWeight:activeTab===id?800:600,fontSize:14,cursor:'pointer',boxShadow:activeTab===id?'0 5px 14px #001b4b55':'none'}}><span style={{fontSize:21,width:25,textAlign:'center'}}>{ico}</span>{label}</button>)}
        <div style={{flex:1,minHeight:12}}/>
        <button onClick={handleLogout} style={{padding:'13px',background:'#dc2626',color:'#fff',border:0,borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer'}}>⇥ Logout</button>
      </aside>

      <main className="nda-main" style={{ flex: 1, padding: '20px 24px', marginLeft: 278, minWidth: 0, boxSizing: 'border-box' }}>
        <style>{`
          .nda-sidebar button:hover{background:#ffffff1c!important}
          .nda-main{background:#f4f7fc}
          .nda-print-brand{display:none}
          .nda-page-print-brand{display:none}
          @media print {
            @page { size:A4 landscape; margin:8mm; }
            body * { visibility:hidden !important; }
            .nda-print-target, .nda-print-target * { visibility:visible !important; }
            .nda-print-target { position:relative !important; left:auto !important; top:auto !important; width:100% !important; max-width:100% !important; margin:0 !important; padding:25mm 0 0 !important; background:#fff !important; color:#000 !important; box-shadow:none !important; border:0 !important; overflow:visible !important; }
            html, body, #root { height:auto !important; min-height:0 !important; overflow:visible !important; }
            .nda-print-target table { page-break-inside:auto !important; break-inside:auto !important; }
            .nda-print-target thead { display:table-header-group !important; }
            .nda-print-target tfoot { display:table-footer-group !important; }
            .nda-print-target tr { page-break-inside:avoid !important; break-inside:avoid !important; }
            .nda-print-target h1, .nda-print-target h2, .nda-print-target h3 { page-break-after:avoid !important; break-after:avoid-page !important; }
            .nda-print-target .no-print, .nda-print-target button, .nda-print-target input, .nda-print-target select, .nda-print-target textarea { display:none !important; }
            .nda-page-print-brand { display:flex !important; position:fixed !important; top:0 !important; left:0 !important; right:0 !important; z-index:9999 !important; align-items:center !important; justify-content:center !important; gap:14px !important; text-align:left !important; border-bottom:2px solid #c69227 !important; padding:0 0 8px !important; margin:0 !important; height:21mm !important; box-sizing:border-box !important; background:#fff !important; color:#0b2853 !important; }
            .nda-page-print-brand img { display:block !important; width:95px !important; height:58px !important; object-fit:contain !important; }
            .nda-page-print-brand .brand-title { font-size:18px !important; font-weight:800 !important; }
            .nda-page-print-brand .brand-subtitle { font-size:10px !important; }
            .nda-print-target table { width:100% !important; min-width:0 !important; }
            #hr-workers-print th:last-child, #hr-workers-print td:last-child { display:none !important; }
            .nda-print-target * { print-color-adjust:exact !important; -webkit-print-color-adjust:exact !important; }
          }
          @media(max-width:850px){
            .nda-hr-header{padding:10px 12px!important;gap:9px!important}
            .nda-hr-header>div{min-width:0!important}
            .nda-sidebar{position:relative!important;top:auto!important;bottom:auto!important;left:auto!important;width:100%!important;max-height:none!important;min-height:0!important;flex-direction:row!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:6px!important;padding:8px 10px!important;scrollbar-width:thin}
            .nda-sidebar>div:first-child{display:none!important}
            .nda-sidebar>button{flex:0 0 auto!important;white-space:nowrap!important;padding:12px 14px!important;min-height:46px!important;touch-action:manipulation}
            .nda-main{margin-left:0!important;padding:12px!important;width:100%!important;max-width:100%!important;overflow-x:hidden!important}
            .nda-hr-footer{margin-left:0!important;width:100%!important}
          }
          @media(max-width:600px){
            .nda-hr-header{align-items:flex-start!important}
            .nda-hr-header>div:first-child{width:100%!important}
            .nda-hr-header>div:first-child img{max-width:58px!important}
            .nda-hr-header h2{font-size:16px!important}
            .nda-hr-header>div:nth-child(2){width:100%!important;justify-content:flex-start!important;gap:7px!important}
            .nda-hr-header>div:nth-child(2)>div{font-size:11px!important}
            .nda-main{padding:9px!important}
            .nda-main>div{max-width:100%!important}
            .nda-main input,.nda-main select,.nda-main textarea,.nda-main button{max-width:100%;box-sizing:border-box}
            .nda-main input,.nda-main select,.nda-main textarea{font-size:16px!important}
            .nda-main table{display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
            .nda-main th,.nda-main td{white-space:nowrap}
            .nda-main img{max-width:100%;height:auto}
            .nda-main button{min-height:40px;touch-action:manipulation}
            .nda-main>div{min-width:0!important}
            .nda-hr-header button{min-height:40px!important}
            .nda-main [role="dialog"]>div{width:calc(100vw - 20px)!important;max-width:calc(100vw - 20px)!important;max-height:88vh!important;padding:14px!important;box-sizing:border-box!important;overflow:auto!important}
          }
          @media print{.nda-sidebar,header,.no-print{display:none!important}.nda-main{margin:0!important;padding:0!important;background:#fff!important}.nda-print-brand{display:block!important;text-align:center!important;border-bottom:3px solid #c69227!important;padding:8px!important;margin-bottom:12px!important}.nda-print-brand img{height:48px!important;object-fit:contain!important}.nda-main *{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
        `}</style>
        <div className="nda-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"/><div style={{fontWeight:800,color:'#0b2853'}}>NDA-PK HR &amp; BUSINESS SYSTEM</div><div style={{fontSize:11}}>Together for a Better Workplace</div></div>
        
        {/* Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
          {!['changepass', 'sites', 'departments', 'designations', 'permissions'].includes(activeTab) && (userRole.is_admin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginRight: '5px' }}>Dept:</label>
                <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #2563eb' }}>
                  <option value="All">All Depts</option>
                  {uniqueDepartments.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginRight: '5px' }}>Site:</label>
                <select value={selectedSiteFilter} onChange={e => setSelectedSiteFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #059669' }}>
                  <option value="All">All Sites</option>
                  {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ) : (
            !['changepass', 'sites', 'departments', 'designations', 'permissions'].includes(activeTab) && <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Site: {userRole.assigned_site} | Dept: {userRole.assigned_department}</span>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED</option>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>

          </div>
        </div>
        
{/* TAB 1: DASHBOARD */}
{activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
  <>
    <section style={{background:'linear-gradient(120deg,#0f172a 0%,#1d4ed8 65%,#0e7490 100%)',borderRadius:18,padding:'24px clamp(16px,3vw,30px)',color:'#fff',marginBottom:20,boxShadow:'0 12px 30px #1e3a8a20',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:18,minWidth:260}}><img src="/muhammad-naveed-profile.jpg" alt="Muhammad Naveed" style={{width:112,height:112,borderRadius:'50%',objectFit:'cover',border:'5px solid #d9a62d',boxShadow:'0 5px 18px #0003'}}/><div><div style={{fontSize:11,letterSpacing:3,fontWeight:800,color:'#f7d77b'}}>NDA-PK · HR CONTROL CENTER</div><h2 style={{fontSize:'clamp(23px,3vw,32px)',margin:'8px 0'}}>Welcome Back,<br/>Muhammad Naveed</h2><p style={{margin:0,color:'#dbeafe',fontSize:14}}>NDA-PK HR &amp; Business System · Administrator</p><p style={{margin:'8px 0 0',color:'#f8d77c',fontStyle:'italic',fontWeight:700}}>Together for a Better Workplace</p></div></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
        <label style={{fontSize:12,color:'#dbeafe'}}>Dashboard Date<input type="date" value={selectedTimesheetDate} onChange={e=>setSelectedTimesheetDate(e.target.value)} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label>
        <label style={{fontSize:12,color:'#dbeafe'}}>Payroll Month
          <input type="month" value={payrollMonth} onChange={handlePayrollMonthChange} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/>
        </label>
        <div style={{fontSize:12,color:'#dbeafe',padding:'8px 10px',border:'1px solid #93c5fd',borderRadius:8,background:'#ffffff18'}}>
          Salary Period: <b>{payrollStartDate} to {payrollEndDate}</b>
        </div>

      </div>
    </section>
    {/* Stats Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #2563eb'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>Total Workers</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
          {filteredWorkers.length}
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #16a34a'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          Present on {selectedTimesheetDate}
        </span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>
          {presentCountForDate}
        </div>
      </div>

      {(userRole.is_admin || userRole.can_view_payroll) && (
        <div style={{
          backgroundColor: '#fff',
          padding: '18px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '5px solid #0891b2'
        }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
            {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
          </div>
        </div>
      )}
    </div>

    {(userRole.is_admin || userRole.can_view_workers || userRole.can_view_timesheet) && <>
    {/* Department & Designation Attendance Breakdown */}
    <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#1e293b' }}>
      Workers by Trade & Site — {selectedTimesheetDate}
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
      gap: '20px'
    }}>
     {(userRole.is_admin
  ? uniqueDepartments
  : uniqueDepartments.filter(dept =>
      !userRole.assigned_department ||
      userRole.assigned_department === 'All' ||
      dept.toLowerCase() === userRole.assigned_department.toLowerCase()
    )
).map(dept => {
  const deptWorkers = filteredWorkers.filter(
    w => w.department?.toLowerCase() === dept.toLowerCase()
  );
        // Workers who have an attendance record for the selected date
        const deptAttendanceWorkers = deptWorkers.filter(w =>
          Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
        );

        const totalAttendanceCount = deptAttendanceWorkers.length;

        // Group designations case-insensitively so 'steel fixer' and 'STEEL FIXER' are one trade.
        const normaliseTradeName = value =>
          String(value || 'Worker').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
        const designationLabelsByKey = new Map();
        deptWorkers.forEach(worker => {
          const rawName = String(worker.designation || 'Worker').normalize('NFKC').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
          const key = normaliseTradeName(rawName);
          if (key && !designationLabelsByKey.has(key)) designationLabelsByKey.set(key, rawName.toUpperCase());
        });
        const designationsInDept = Array.from(designationLabelsByKey.values());

        return (
          <div
            key={dept}
            onClick={() => setModalDepartment(dept)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '20px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{
              margin: '0 0 5px 0',
              color: '#1e293b',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '6px'
            }}>
              🏢 {dept}
            </h3>

            <p style={{ margin: '6px 0 12px 0', color: '#0f172a', fontSize: '14px' }}>
              Total Workers: <strong>{deptWorkers.length}</strong>
              <span style={{ color: '#64748b', fontSize: '12px' }}> · Attendance saved: {totalAttendanceCount}</span>
            </p>

            <hr style={{
              border: '0',
              borderTop: '1px solid #e2e8f0',
              margin: '10px 0'
            }} />

            {designationsInDept.map(desig => {
              const desigWorkers = deptWorkers.filter(
                w => normaliseTradeName(w.designation || 'Worker') === normaliseTradeName(desig)
              );

              const desigAttendanceWorkers = desigWorkers.filter(w =>
                Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
              );
            const getAttendanceStatus = worker =>
              attendanceData[selectedTimesheetDate]?.[worker.id]?.status || '';
            const normaliseDashboardStatus = value =>
              String(value || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
            const isWorkerOnAnnualLeave = worker => {
              const workerKey = String(worker.id);
              return annualLeaveList.some(leave => {
                const sameWorker = String(leave.worker_id) === workerKey;
                const start = String(leave.start_date || '').slice(0, 10);
                const actualReturn = String(leave.actual_return || '');
                return sameWorker && start && start <= selectedTimesheetDate &&
                  leave.status !== 'Returned' &&
                  (!actualReturn || actualReturn === 'On Leave' || selectedTimesheetDate < actualReturn.slice(0, 10));
              });
            };
            const statusWorkers = {
              Present: desigWorkers.filter(w => normaliseDashboardStatus(getAttendanceStatus(w)) === 'present' && !isWorkerOnAnnualLeave(w)),
              // In this system, workers entered by ID are Present; workers with no
              // attendance row for the selected date are Absent unless they are on leave.
              Absent: desigWorkers.filter(w => {
                const status = normaliseDashboardStatus(getAttendanceStatus(w));
                const onAnnualLeave = isWorkerOnAnnualLeave(w) || status === 'annual leave';
                const onOtherLeave = ['leave', 'sick leave', 'other leave'].includes(status);
                const noAttendanceRow = !attendanceData[selectedTimesheetDate]?.[w.id];
                return !onAnnualLeave && !onOtherLeave && (status === 'absent' || noAttendanceRow);
              }),
              'Annual Leave': desigWorkers.filter(w => normaliseDashboardStatus(getAttendanceStatus(w)) === 'annual leave' || isWorkerOnAnnualLeave(w)),
              'Other Leave': desigWorkers.filter(w => ['leave', 'sick leave', 'other leave'].includes(normaliseDashboardStatus(getAttendanceStatus(w))))
            };
            const presentCount = statusWorkers.Present.length;
            const absentCount = statusWorkers.Absent.length;
            const annualLeaveCount = statusWorkers['Annual Leave'].length;
            const otherLeaveCount = statusWorkers['Other Leave'].length;

              return (
                <div
                  key={desig}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#f8fafc',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '6px'
                  }}>
                    <span>🛠️ {desig}</span>
                    <span style={{
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}>
                      {desigWorkers.length} Workers
                    </span>
                  </div>

                  {sitesList.map(site => {
                    const siteWorkersCount = desigWorkers.filter(w => {
                      const attendanceRecord =
                        attendanceData[selectedTimesheetDate]?.[w.id];

                      const workerSite = attendanceRecord?.site || attendanceRecord?.work_site;
                      return String(workerSite || '').trim().toLowerCase() === String(site || '').trim().toLowerCase();
                    }).length;

                    if (siteWorkersCount === 0) return null;

                    return (
                      <div
                        key={site}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '12px',
                          paddingLeft: '8px',
                          color: '#334155',
                          margin: '5px 0',
                          borderLeft: '3px solid #0ea5e9'
                        }}
                      >
                        <span>📍 {site}</span>
                        <strong style={{ color: '#0284c7', fontSize: '13px' }}>
                          {siteWorkersCount} Workers
                        </strong>
                      </div>
                    );
                  })}

                  <div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '10px',
  marginBottom: '10px'
}}>
  <button type="button" onClick={() => setAttendanceListModal({ title: `${desig} — Present`, workers: statusWorkers['Present'] })} style={{
    background: '#dcfce7',
    color: '#166534',
    padding: '5px 8px',
    border: '1px solid transparent',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }}>
    Present: {presentCount} · View workers
  </button>

  <button type="button" onClick={() => setAttendanceListModal({ title: `${desig} — Absent`, workers: statusWorkers['Absent'] })} style={{
    background: '#fee2e2',
    color: '#991b1b',
    padding: '5px 8px',
    border: '1px solid transparent',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }}>
    Absent: {absentCount} · View workers
  </button>

  <button type="button" onClick={() => setAttendanceListModal({ title: `${desig} — Annual Leave`, workers: statusWorkers['Annual Leave'] })} style={{
    background: '#fef3c7',
    color: '#92400e',
    padding: '5px 8px',
    border: '1px solid transparent',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }}>
    Annual Leave: {annualLeaveCount} · View workers
  </button>

  <button type="button" onClick={() => setAttendanceListModal({ title: `${desig} — Other Leave`, workers: statusWorkers['Other Leave'] })} style={{
    background: '#dbeafe',
    color: '#1e40af',
    padding: '5px 8px',
    border: '1px solid transparent',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }}>
    Other Leave: {otherLeaveCount} · View workers
  </button>
</div>
                  {desigAttendanceWorkers.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                      No attendance saved for this date
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>

    </>}

{attendanceListModal && (
         <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
           <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: 'min(850px, 96vw)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
               <h3 style={{ margin: 0 }}>{attendanceListModal.title} — {selectedTimesheetDate}</h3>
               <button onClick={() => setAttendanceListModal(null)} style={{ padding: '8px 12px', border: 0, borderRadius: 7, background: '#e2e8f0', cursor: 'pointer' }}>Close</button>
             </div>
             {attendanceListModal.workers.length === 0 ? <p>{isHolidayDate(selectedTimesheetDate) ? 'Holiday hai; is date par Present/Absent/Leave count nahi hota.' : 'Is status mein koi worker nahi.'}</p> : (
               <div style={{ overflowX: 'auto', marginTop: 14 }}><table style={tableStyle}><thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Worker Name</th><th style={thStyle}>Designation</th><th style={thStyle}>Department</th><th style={thStyle}>Site</th></tr></thead><tbody>
                 {attendanceListModal.workers.map(w => <tr key={w.id}><td style={tdStyle}>{w.worker_id || w.employee_id || w.id_no || w.id}</td><td style={tdStyle}>{w.name || w.worker_name || '—'}</td><td style={tdStyle}>{w.designation || '—'}</td><td style={tdStyle}>{w.department || '—'}</td><td style={tdStyle}>{attendanceData[selectedTimesheetDate]?.[w.id]?.site || attendanceData[selectedTimesheetDate]?.[w.id]?.work_site || '—'}</td></tr>)}
               </tbody></table></div>
             )}
           </div>
         </div>
       )}
  </>
)}

{/* Modal / Popup for Specific Department Workers */}
{modalDepartment && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <div style={{
      background: '#fff',
      padding: '25px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '750px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>
          {modalDepartment} - Workers Detail
        </h2>

        <button
          onClick={() => setModalDepartment(null)}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Close X
        </button>
      </div>

      {/* Filtered Workers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>ID</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Name</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Designation</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Site / Location</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => w.department?.toLowerCase() === modalDepartment?.toLowerCase())
              .filter(w => {
                if (modalLocationTab === 'All') return true;

                const attendanceRecord =
                  attendanceData[selectedTimesheetDate]?.[w.id];

                return (attendanceRecord?.site || attendanceRecord?.work_site) === modalLocationTab;
              })
              
.map(worker => {
  const attendanceRecord =
    attendanceData[selectedTimesheetDate]?.[worker.id];

  const annualLeave = getAnnualLeaveForWorker(
    worker.id,
    selectedTimesheetDate
  );

  return (
           
<tr
  key={worker.id}
style={{
  backgroundColor: annualLeave ? '#dcfce7' : '#ffffff',
  color: annualLeave ? '#166534' : '#111827',
  fontWeight: annualLeave ? 'bold' : 'normal'
}}
>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      #{worker.worker_id || worker.id}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.name}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.designation || 'N/A'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {attendanceRecord?.site || attendanceRecord?.work_site || 'No attendance'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

{/* Print Styles */}
<style>{`
  @media print {
    .print-signature {
      display: block !important;
    }
  }
`}</style>
   
{/* TAB 2: BULK & OCR */}
{activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <div style={{ marginBottom: 16, padding: 14, border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff' }}>
      <label htmlFor="bulk-tool-select" style={{ display: 'block', marginBottom: 7, color: '#1e3a8a', fontSize: 13, fontWeight: 800 }}>Select Bulk Function</label>
      <select id="bulk-tool-select" value={bulkOpenSection} onChange={e => setBulkOpenSection(e.target.value)} style={{ ...fieldStyle, fontWeight: 700, border: '1px solid #93c5fd', background: '#fff' }}>
        <option value="designationAttendance">👷 Bulk Present / Absent — By Designation</option>
        <option value="ocrScanner">📸 OCR Scanner</option>
        <option value="quickAttendance">⚡ Quick Bulk Attendance</option>
        <option value="contractOT">🧾 Bulk Contract OT — Site + Multiple Designations</option>
        <option value="extraOT">🎁 Bulk Extra OT — Department / Designation / Worker IDs</option>
        <option value="bulkOT">⏱️ Bulk Overtime Only — Department / Designation</option>
        <option value="siteAttendance">🟢 Site Attendance by Worker ID</option>
        <option value="individualAttendance">👥 Individual Attendance List</option>
      </select>
      <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 11 }}>Dropdown se function select karein. Sirf selected function ka working page khulega; baqi options band rahenge.</p>
    </div>
    <div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'designationAttendance' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'designationAttendance' ? '' : 'designationAttendance')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'designationAttendance' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>👷 Bulk Present / Absent — By Designation</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'designationAttendance' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'designationAttendance' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}><div style={{ marginTop: '20px', padding: '18px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '10px' }}>
      <h3 style={{ margin: '0 0 8px', color: '#075985' }}>👷 Bulk Present / Absent — By Designation</h3>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#334155' }}>Date, site, department aur designation select karein. Misal: Carpenter select karne se selected group ke tamam Carpenters ki attendance ek sath save hogi. Workers Directory ki default site ko ignore karke selected daily site save hogi. Jo worker isi date par pehle se kisi doosri site par recorded hai, usay automatically move/overwrite nahi kiya jayega.</p>
      <form onSubmit={handleBulkDesignationAttendance}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px' }}>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Attendance Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Working Site</label><select value={bulkMarkSite} onChange={e => setBulkMarkSite(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Department (Top Filter)</label><div style={{ ...fieldStyle, marginTop: 5, background: '#f8fafc' }}>{userRole.is_admin ? selectedDeptFilter : userRole.assigned_department}</div></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Designation</label><select value={bulkMarkDesignation} onChange={e => setBulkMarkDesignation(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}><option value="All">All Designations</option>{designationsList.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Attendance Status</label><select value={bulkMarkStatus} onChange={e => setBulkMarkStatus(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}><option value="Present">Present</option><option value="Absent">Absent</option></select></div>
        </div>
        {isHolidayDate(selectedTimesheetDate) && <p style={{ margin: '10px 0 0', padding: 10, background: '#fffbeb', borderRadius: 7, color: '#92400e', fontSize: 12 }}>Selected date holiday/Sunday hai: Present save karne par Holiday Present hoga; Absent select karne par Holiday save hoga aur absent count nahi hoga.</p>}
        <button type="submit" disabled={bulkMarkSaving || !userRole.is_admin} style={{ marginTop: 12, padding: '10px 16px', border: 0, borderRadius: 7, background: bulkMarkStatus === 'Present' ? '#15803d' : '#b91c1c', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: bulkMarkSaving || !userRole.is_admin ? .55 : 1 }}>{bulkMarkSaving ? 'Saving Attendance…' : `Mark All Selected Workers ${bulkMarkStatus}`}</button>
        </form>
    </div></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'ocrScanner' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'ocrScanner' ? '' : 'ocrScanner')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'ocrScanner' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>📸 OCR Scanner</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'ocrScanner' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'ocrScanner' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}><div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
      <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Scanner (For Date: {selectedTimesheetDate})</h4>
      <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
      {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
      {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
    </div></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'quickAttendance' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'quickAttendance' ? '' : 'quickAttendance')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'quickAttendance' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>⚡ Quick Bulk Attendance</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'quickAttendance' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'quickAttendance' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}>{/* QUICK ATTENDANCE BOX */}
<div style={{
  marginTop: '20px',
  padding: '18px',
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '10px'
}}>
  <h3 style={{ margin: '0 0 15px', color: '#1d4ed8' }}>
    ⚡ Quick Bulk Attendance
  </h3>

  <form onSubmit={handleQuickAttendance}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      alignItems: 'end'
    }}>
      <div>
        <label>Worker ID No.</label>
        <input
          id="quick-worker-id"
          value={quickWorkerId}
          onChange={e => setQuickWorkerId(e.target.value)}
          placeholder="Enter Worker ID"
          autoComplete="off"
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <div>
        <label>Working Site</label>
        <select
          value={quickSite}
          onChange={e => setQuickSite(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          {sitesList.map(site => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>
      </div>

      <div>
        <label>OT Type</label>
        <select
          value={quickOTType}
          onChange={e => setQuickOTType(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          <option value="Normal OT">Normal OT</option>
          <option value="Contract OT">Contract OT</option>
          <option value="Extra OT">Extra OT (Management)</option>
        </select>
      </div>

      <div>
        <label>{quickOTType === 'Extra OT' ? 'Extra OT Hours' : 'OT Hours'}</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={quickHours}
          onChange={e => setQuickHours(e.target.value)}
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={quickSaving}
        style={{
          padding: '11px',
          backgroundColor: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        {quickSaving ? 'Saving...' : 'Save & Enter'}
      </button>
    </div>

    <p style={{ fontSize: '12px', color: '#475569' }}>
      Date: {selectedTimesheetDate} | Status: Present
    </p>
  </form>
</div></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'contractOT' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'contractOT' ? '' : 'contractOT')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'contractOT' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>🧾 Bulk Contract OT — Site + Multiple Designations</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'contractOT' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'contractOT' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}><form onSubmit={handleBulkContractOnlyOT} style={{ marginBottom: 22, padding: 16, border: '2px solid #93c5fd', borderRadius: 10, background: '#eff6ff' }}>
      <h3 style={{ margin: '0 0 6px', color: '#1e3a8a' }}>🧾 Bulk Contract OT — Site + Multiple Designations</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#334155' }}>Site ka match Workers Directory ki default site se nahi, us date ki saved attendance site se hoga. Pehle Site Attendance by Worker ID mein worker ko selected site par save karein. Phir sirf usi site ke saved Present / Holiday Present workers ka Contract OT update hoga; status aur Normal OT mehfooz rahenge.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Attendance / OT Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }} /></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Working Site</label><select value={bulkContractOnlySite} onChange={e => setBulkContractOnlySite(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Contract OT Hours (per worker)</label><input type="number" min="0" step="0.25" value={bulkContractOnlyHours} onChange={e => setBulkContractOnlyHours(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 7 }}>Select Designation(s) — multiple allowed</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', padding: 10, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7 }}>{designationsList.map(d => <label key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input type="checkbox" checked={bulkContractOnlyDesignations.includes(d)} onChange={e => setBulkContractOnlyDesignations(old => e.target.checked ? [...old, d] : old.filter(x => x !== d))} />{d}</label>)}</div></div>
      </div>
      <button type="submit" disabled={bulkContractOnlySaving || !userRole.is_admin} style={{ marginTop: 12, padding: '10px 16px', border: 0, borderRadius: 7, background: '#1d4ed8', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: bulkContractOnlySaving || !userRole.is_admin ? .55 : 1 }}>{bulkContractOnlySaving ? 'Saving Contract OT…' : 'Apply Contract OT to Present Workers'}</button>
    </form></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'extraOT' ? 'block' : 'none' }}>
  {bulkOpenSection === 'extraOT' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}>
    <form onSubmit={handleBulkExtraOT} style={{ padding: 16, border: '2px solid #c4b5fd', borderRadius: 10, background: '#f5f3ff' }}>
      <h3 style={{ margin: '0 0 7px', color: '#5b21b6' }}>🎁 Management Extra OT — Department / Designation / Worker IDs</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#475569' }}>Department aur Designation select karke poore group ko Extra OT dein, ya Worker IDs box mein IDs likhein. Site lazmi match hogi: sirf selected date ki attendance mein isi site par Present / Holiday Present workers update honge; doosri sites ke workers skip honge. Worker IDs dene par bhi site restriction apply rahegi. Normal OT aur Contract OT alag mehfooz rahenge.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 12 }}>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Extra OT Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Extra OT Site</label><select value={bulkExtraOTSite} onChange={e => setBulkExtraOTSite(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Department</label><select value={bulkExtraOTDepartment} onChange={e => setBulkExtraOTDepartment(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}><option value="All">All Departments</option>{departmentsList.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Designation</label><select value={bulkExtraOTDesignation} onChange={e => setBulkExtraOTDesignation(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}><option value="All">All Designations</option>{designationsList.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        <div><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Extra OT Hours (per worker)</label><input type="number" min="0.25" step="0.25" value={bulkExtraOTHours} onChange={e => setBulkExtraOTHours(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Worker ID(s) — optional, multiple IDs allowed</label><textarea value={bulkExtraOTWorkerIds} onChange={e => setBulkExtraOTWorkerIds(e.target.value)} placeholder="Example: 101, 105, 118 (ya har ID alag line mein)" rows={2} style={{ ...fieldStyle, width: '100%', boxSizing: 'border-box', marginTop: 5, resize: 'vertical' }} /></div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <button type="submit" disabled={bulkExtraOTSaving || !userRole.is_admin} style={{ padding: '10px 16px', border: 0, borderRadius: 7, background: '#6d28d9', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: bulkExtraOTSaving || !userRole.is_admin ? .55 : 1 }}>{bulkExtraOTSaving ? 'Saving Extra OT…' : 'Apply Extra OT — Selected Site Only'}</button>
        <button type="button" onClick={handleRemoveExtraOTFromOtherSites} disabled={bulkExtraOTSaving || !userRole.is_admin} style={{ padding: '10px 16px', border: '1px solid #b91c1c', borderRadius: 7, background: '#fff', color: '#b91c1c', fontWeight: 800, cursor: 'pointer', opacity: bulkExtraOTSaving || !userRole.is_admin ? .55 : 1 }}>{bulkExtraOTSaving ? 'Please wait…' : 'Remove Extra OT from Other Sites'}</button>
      </div>
    </form>
  </div>}
</div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'bulkOT' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'bulkOT' ? '' : 'bulkOT')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'bulkOT' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>⏱️ Bulk Overtime Only — Department / Designation</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'bulkOT' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'bulkOT' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}><h3 style={{ margin: '0 0 10px 0' }}>⚡ Bulk Overtime Only — Department / Designation</h3>
    <p style={{ margin: '0 0 12px', fontSize: 12, color: '#475569' }}>Yeh option bhi selected date ki attendance mein saved daily site aur Present / Holiday Present status ko check karta hai. Workers Directory ki default site ko daily site nahi samjha jayega.</p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Date</label>
        <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Department (Top Filter)</label>
        <div style={{ width: '100%', boxSizing: 'border-box', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>{userRole.is_admin ? selectedDeptFilter : userRole.assigned_department}</div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Designation (Steel, Carpenter etc)</label>      
<select
  value={bulkDesignation}
  onChange={e => setBulkDesignation(e.target.value)}
  style={{
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1'
  }}
>
  <option value="All">All Designations</option>
  {editingWorkerId && designation && !designationsList.some(d => String(d).trim().toLowerCase() === String(designation).trim().toLowerCase()) && (
    <option value={designation}>{designation} (existing worker record)</option>
  )}
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Site</label>
        <select value={bulkSite} onChange={e => setBulkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Overtime Hours</label>
        <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>
      
<div>
  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Contract OT Hours</label>
  <input
    type="number"
    min="0"
    value={bulkContractOT}
    onChange={e => setBulkContractOT(e.target.value)}
    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
  />
</div>


      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button onClick={handleBulkAttendance} style={{ width: '100%', padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply OT to Selected Workers</button>
      </div>
    </div></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'siteAttendance' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'siteAttendance' ? '' : 'siteAttendance')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'siteAttendance' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>🟢 Site Attendance by Worker ID</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'siteAttendance' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'siteAttendance' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}><div style={{ marginTop: '20px', padding: '18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
      <h3 style={{ margin: '0 0 8px', color: '#166534' }}>🟢 Site Attendance by Worker ID</h3>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534' }}>Date, site aur department select karein. Entered worker IDs selected daily site par Present save honge. Workers Directory ki default site restriction nahi hogi. Jo IDs enter nahi ki jayengi unka purana record bilkul change nahi hoga; is tarah doosri sites ke workers ghalti se Absent nahi honge. Sunday/holiday par entered IDs Holiday Present hongi aur sirf unka OT save hoga.</p>
      <form onSubmit={handleSaveSiteAttendance}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Attendance Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Working Site</label><select value={siteAttendanceSite} onChange={e => setSiteAttendanceSite(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Department</label><select value={siteAttendanceDepartment} onChange={e => setSiteAttendanceDepartment(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}>{visibleDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select></div>
        </div>
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginTop: 12 }}>{isHolidayDate(selectedTimesheetDate) ? 'Holiday Duty Workers — ID No.' : 'Present Workers — ID No.'}</label>
        <textarea value={siteAttendanceIds} onChange={e => setSiteAttendanceIds(e.target.value)} rows={3} placeholder={'Example: 101, 102, 108\n109\n115'} style={{ ...fieldStyle, marginTop: 5, resize: 'vertical' }} />
        {isHolidayDate(selectedTimesheetDate) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 10, padding: 12, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8 }}>
            <div><label style={{ fontWeight: 'bold', fontSize: 12 }}>Normal OT Hours (per entered ID)</label><input type="number" min="0" step="0.25" value={siteHolidayNormalOT} onChange={e => setSiteHolidayNormalOT(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }} /></div>
            <div><label style={{ fontWeight: 'bold', fontSize: 12 }}>Contract OT Hours (per entered ID)</label><input type="number" min="0" step="0.25" value={siteHolidayContractOT} onChange={e => setSiteHolidayContractOT(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }} /></div>
          </div>
        )}
        <button type="submit" disabled={siteAttendanceSaving} style={{ ...primaryStyle, marginTop: 12, background: '#15803d', opacity: siteAttendanceSaving ? .7 : 1 }}>{siteAttendanceSaving ? 'Saving Attendance…' : (isHolidayDate(selectedTimesheetDate) ? 'Save Holiday Duty by Worker ID' : 'Save Present Workers by ID')}</button>
      </form>
    </div></div>}
    </div>

<div style={{ marginBottom: 10, border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#fff', display: bulkOpenSection === 'individualAttendance' ? 'block' : 'none' }}>
      <button type="button" onClick={() => setBulkOpenSection(bulkOpenSection === 'individualAttendance' ? '' : 'individualAttendance')} style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: bulkOpenSection === 'individualAttendance' ? '#eaf2ff' : '#f8fafc', color: '#12345a', fontWeight: 800, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
        <span>👥 Individual Attendance List</span><span style={{ fontSize: 18, transform: bulkOpenSection === 'individualAttendance' ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {bulkOpenSection === 'individualAttendance' && <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}>{/* Individual Worker Attendance List */}
    <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>
        👥 Individual Attendance ({bulkDepartment} - {selectedTimesheetDate})
      </h4>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>ID</th>
              <th style={{ padding: '8px' }}>Worker Name</th>
              <th style={{ padding: '8px' }}>Designation</th>
              <th style={{ padding: '8px' }}>Site</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>OT Hours</th>
              <th style={{ padding: '8px' }}>Contract OT</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => {
                const deptMatch = bulkDepartment === 'All' || String(w.department || '').toLowerCase() === String(bulkDepartment).toLowerCase();
                return deptMatch;
              })
              .map((worker) => {
                const record = attendanceData[selectedTimesheetDate]?.[worker.id] || { status: 'Present', ot: 0 };
                const currentSite = record.site || record.work_site || sitesList[0] || 'Sharjah Mamzar';

                return (
                  <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{worker.worker_id || worker.id}</td>
                    <td style={{ padding: '8px' }}>{worker.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{worker.designation || '-'}</td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={currentSite}
                        onChange={(e) => {
                          const selectedSite = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                site: selectedSite
                              }
                            }
                          }));
                        }}
                        style={{ padding: '6px', borderRadius: '4px', minWidth: '130px' }}
                      >
                        {sitesList.map((site) => (
                          <option key={site} value={site}>{site}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={record.status}
                        onChange={(e) => {
                          const selectedStatus = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                status: selectedStatus
                              }
                            }
                          }));
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: record.status === 'Present' ? '#16a34a' : record.status === 'Absent' ? '#dc2626' : '#d97706' }}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        value={record.ot || 0}
                        onChange={(e) => {
                          const selectedOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                ot: selectedOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={record.contract_ot ?? record.contract_overtime_hours ?? 0}
                        onChange={(e) => {
                          const selectedContractOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                contract_ot: selectedContractOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '75px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>

                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={async () => {
                          const latestRecord = attendanceData[selectedTimesheetDate]?.[worker.id] || record;
                          const siteToSave = latestRecord.site || latestRecord.work_site || sitesList[0] || 'Sharjah Mamzar';

                         
await handleSingleAttendanceChange(
  worker.id,
  selectedTimesheetDate,
  latestRecord.status || 'Present',
  latestRecord.ot ?? 0,
  siteToSave,
  latestRecord.contract_ot ?? latestRecord.contract_overtime_hours ?? 0
);

                          alert('Update Successful! Site, Status, OT aur Contract OT save kar diye gaye.');
                        }}
                        style={{
                          padding: '7px 11px',
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div></div>}
    </div>
  </div>
)}

       {/* TAB 3: WORKERS DIRECTORY */}
{activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
  <div>
    {(userRole.is_admin || userRole.can_add_workers || userRole.can_edit_workers) && (
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>{editingWorkerId ? `✏️ Edit Worker #${editingWorkerId}` : '➕ Add New Worker'}</h3>
        <form onSubmit={handleSaveWorker}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Worker ID</label>
              <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="e.g. 101" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Joining Date (Optional)</label>
              <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department</label>
              <select value={userRole.is_admin ? department : userRole.assigned_department} onChange={e => setDepartment(e.target.value)} disabled={!userRole.is_admin} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {visibleDepartments.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Designation</label>
           
<select
  value={designation}
  onChange={e => setDesignation(e.target.value)}
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
>
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>

            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Monthly Salary *</label>
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Annual Leave Balance (Days)</label>
              <input type="number" min="0" step="0.5" value={annualLeaveBalance} onChange={e => setAnnualLeaveBalance(e.target.value)} placeholder="e.g. 30" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
      
          {/* PRIVATE DOCUMENT UPLOADS: upload after saving the worker, from Workers Directory. */}
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1e293b' }}>📁 Worker Documents</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              Passport, ID Card, Visa, Medical Card aur doosre documents worker ko save karne ke baad Workers Directory ke “＋ Add Photo / Document” option se upload karein. Documents private storage mein save honge.
            </p>
          </div>

          <button type="submit" style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {editingWorkerId ? 'Update Worker' : 'Save Worker'}
          </button>
        </form>
      </div>
    )}

    {/* WORKERS DIRECTORY TABLE */}
    <div id="hr-workers-print" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <div className="nda-page-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"/><div><div className="brand-title">NDA-PK — Workers Directory</div><div className="brand-subtitle">Workforce Management System</div></div></div>
      <h3 style={{ margin: '0 0 15px 0' }}>👷 Workers Dictionary</h3>
      <div className="no-print" style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
        {[['all','All Workers'],['steel','All Steel Fixers'],['carpenter','All Carpenters'],['departments','All Departments']].map(([key,label])=><button key={key} type="button" onClick={()=>setWorkerDirectoryFilter(key)} style={{padding:'9px 13px',border:0,borderRadius:8,background:workerDirectoryFilter===key?'#0b2d5c':'#e8eef8',color:workerDirectoryFilter===key?'#fff':'#17345f',fontWeight:800,cursor:'pointer'}}>{label}</button>)}
        {userRole.is_admin && <button type="button" onClick={()=>printNdaPage('hr-workers-print', userRole.is_admin)} style={{padding:'9px 14px',border:0,borderRadius:8,background:'#b98519',color:'#fff',fontWeight:800,cursor:'pointer'}}>🖨️ Print / Save PDF</button>}
      </div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>Selected list: <b>{({all:'All Workers',steel:'All Steel Fixers',carpenter:'All Carpenters',departments:'All Departments'})[workerDirectoryFilter]}</b> · {(userRole.is_admin&&workerDirectoryFilter==='departments'?workers:filteredWorkers).filter(w=>{const d=(String(w.department||'')+' '+String(w.designation||'')).toLowerCase();return workerDirectoryFilter==='all'||workerDirectoryFilter==='departments'||(workerDirectoryFilter==='steel'&&d.includes('steel'))||(workerDirectoryFilter==='carpenter'&&d.includes('carpenter'));}).length} workers</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '10px' }}>ID & Name</th>
            <th style={{ padding: '10px' }}>Dept / Designation</th>
            <th style={{ padding: '10px' }}>Salary</th>
            <th style={{ padding: '10px' }}>Documents View</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(userRole.is_admin&&workerDirectoryFilter==='departments'?workers:filteredWorkers).filter(w=>{const d=(String(w.department||'')+' '+String(w.designation||'')).toLowerCase();return workerDirectoryFilter==='all'||workerDirectoryFilter==='departments'||(workerDirectoryFilter==='steel'&&d.includes('steel'))||(workerDirectoryFilter==='carpenter'&&d.includes('carpenter'));}).map(w => (
            <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
              <td style={{ padding: '10px' }}>{w.department} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{w.designation || 'Worker'}</span></td>
              <td style={{ padding: '10px' }}>{w.monthly_salary} {w.currency || selectedCurrency}</td>
              <td style={{ padding: '10px', minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                  {[
                    ['Passport', w.passport_file_url], ['ID Card', w.id_card_file_url],
                    ['Medical', w.medical_card_file_url], ['Visa', w.visa_file_url], ['Labour', w.labour_card_file_url]
                  ].filter(([,url]) => !!url).map(([label,url]) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#075985', background: '#e0f2fe', padding: '4px 7px', borderRadius: 4, textDecoration: 'none' }}>{label} · View / PDF</a>
                  ))}
                  {workerDocuments.filter(doc => String(doc.worker_id) === String(w.id)).map(doc => (
                    <span key={doc.id} style={{display:'inline-flex',gap:5,alignItems:'center',background:'#f1f5f9',padding:'4px 6px',borderRadius:5,fontSize:11}}>
                      <button type="button" onClick={()=>void openWorkerDocument(doc,false)} style={{border:0,background:'transparent',padding:0,color:'#075985',cursor:'pointer'}}>{doc.document_title || doc.category} · View / Print</button>
                      <button type="button" onClick={()=>void openWorkerDocument(doc,true)} style={{border:0,background:'transparent',padding:0,color:'#166534',cursor:'pointer'}}>Download</button>
                      {(userRole.is_admin || userRole.can_edit_workers) && <button type="button" onClick={()=>deleteWorkerDocument(doc)} style={{border:0,background:'transparent',color:'#b91c1c',cursor:'pointer'}}>×</button>}
                    </span>
                  ))}
                </div>
                {(userRole.is_admin || userRole.can_edit_workers) && <label className="no-print" style={{fontSize:11,color:'#475569',cursor:'pointer'}}>
                  ＋ Add Photo / Document
                  <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{display:'block',fontSize:10,marginTop:4,maxWidth:190}} onChange={e=>{const file=e.target.files?.[0]; if(file) void uploadWorkerDocument(w,file); e.target.value='';}} />
                </label>}
                {!w.passport_file_url && !w.id_card_file_url && !w.medical_card_file_url && !w.visa_file_url && !w.labour_card_file_url && !workerDocuments.some(doc=>String(doc.worker_id)===String(w.id)) && <span style={{fontSize:11,color:'#94a3b8'}}>No documents yet</span>}
              </td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(userRole.is_admin || userRole.can_edit_workers) && (
                    <button onClick={() => handleStartEditWorker(w)} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                  )}
                  {(userRole.is_admin || userRole.can_delete_workers) && (
                    <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
       
{/* TAB 4: TIMESHEET */}
{activeTab === 'attendance' &&
 (userRole.is_admin || userRole.can_view_timesheet) &&
 (() => {
   const getRecord = worker =>
     attendanceData[selectedTimesheetDate]?.[worker.id] ||
     attendance.find(a =>
       String(a.worker_id) === String(worker.id) &&
       a.date === selectedTimesheetDate
     ) || {};

   const reportWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(w => {
     const deptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
     const siteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
     const deptMatch = !deptScope || deptScope === 'All' ||
       w.department?.toLowerCase() === deptScope.toLowerCase();
     const dailySite = getRecord(w).work_site || getRecord(w).site || '';
     const siteMatch = !siteScope || siteScope === 'All' ||
       dailySite.toLowerCase() === siteScope.toLowerCase();
     return deptMatch && siteMatch;
   });

   const getStatus = worker =>
     String(getRecord(worker).status || (isHolidayDate(selectedTimesheetDate) ? 'Holiday' : 'Absent')).toLowerCase().replace(/_/g, ' ').trim();

   const getSite = worker =>
     getRecord(worker).site ||
     getRecord(worker).work_site ||
     'Unassigned';

  const reportIsHoliday = isHolidayDate(selectedTimesheetDate);
   const presentCount = reportWorkers.filter(w => {
  const status = getStatus(w);

  const isOnAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(w.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    return (
      sameWorker &&
      onLeave &&
      leave.start_date <= selectedTimesheetDate &&
      selectedTimesheetDate <= leave.expected_return
    );
  });

  return (status === 'present' || status === 'holiday present') && !isOnAnnualLeave;
}).length;
   const absentWorkers = reportIsHoliday ? [] : reportWorkers.filter(w => getStatus(w) === 'absent');

   const annualLeaveCount = reportIsHoliday ? 0 : reportWorkers.filter(w => ['annual leave', 'annual-leave'].includes(getStatus(w))).length;

   const otherLeaveCount = reportIsHoliday ? 0 : reportWorkers.filter(w => ['leave', 'sick leave', 'other leave'].includes(getStatus(w))).length;

   const mamzarAbsent = absentWorkers.filter(w =>
     getSite(w).toLowerCase().includes('mamzar')
   ).length;

   const otherSiteAbsent = absentWorkers.filter(w =>
     !getSite(w).toLowerCase().includes('mamzar')
   ).length;

   return (
     <div style={{
       background: '#fff',
       padding: '20px',
       borderRadius: '10px',
       boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
     }}>
       <div style={{
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         flexWrap: 'wrap',
         gap: '12px',
         marginBottom: '18px'
       }}>
         <div>
           <h3 style={{ margin: 0 }}>📅 Daily Attendance Report</h3>
           <p style={{ color: '#64748b', fontSize: '12px', marginBottom: 0 }}>
             Department-wise and site-wise attendance
           </p>
         </div>

         <div>
           <label style={{
             fontWeight: 'bold',
             color: '#2563eb',
             marginRight: '8px'
           }}>
             Select Date:
           </label>
           <input
             type="date"
             value={selectedTimesheetDate}
             onChange={e => setSelectedTimesheetDate(e.target.value)}
             style={{
               padding: '8px',
               borderRadius: '6px',
               border: '1px solid #2563eb'
             }}
           />
         </div>
       </div>

       <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
         <span style={{ fontWeight: 800, color: isHolidayDate(selectedTimesheetDate) ? '#92400e' : '#475569' }}>
           {isHolidayDate(selectedTimesheetDate) ? `HOLIDAY${holidayDates.find(h => h.holiday_date === selectedTimesheetDate)?.description ? ': ' + holidayDates.find(h => h.holiday_date === selectedTimesheetDate).description : ' (Sunday)'}` : 'Working day'}
         </span>
         {userRole.is_admin && new Date(`${selectedTimesheetDate}T12:00:00`).getDay() !== 0 && (
           <button onClick={handleToggleHolidayDate} style={{ padding: '8px 12px', border: '1px solid #d97706', borderRadius: 7, background: holidayDates.some(h => h.holiday_date === selectedTimesheetDate) ? '#fff7ed' : '#fffbeb', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>
             {holidayDates.some(h => h.holiday_date === selectedTimesheetDate) ? 'Remove Holiday' : 'Mark Selected Date as Holiday'}
           </button>
         )}
       </div>

       {userRole.is_admin && (
         <div style={{ marginBottom: '16px' }}>
           <label style={{ fontWeight: 'bold', marginRight: '8px' }}>
             Department:
           </label>
           <select
             value={selectedDeptFilter}
             onChange={e => setSelectedDeptFilter(e.target.value)}
             style={{ padding: '8px', borderRadius: '6px' }}
           >
             <option value="All">All Departments</option>
             {uniqueDepartments.map((d, i) => (
               <option key={i} value={d}>{d}</option>
             ))}
           </select>
         </div>
       )}

       <div style={{ overflowX: 'auto' }}>
         <table style={{
           width: '100%',
           borderCollapse: 'collapse',
           minWidth: '720px'
         }}>
           <thead>
             <tr style={{
               background: '#1e293b',
               color: '#fff',
               textAlign: 'left'
             }}>
               <th style={{ padding: '10px' }}>Worker</th>
               <th style={{ padding: '10px' }}>Department</th>
               <th style={{ padding: '10px' }}>Site</th>
               <th style={{ padding: '10px' }}>OT Hours</th>
               <th style={{ padding: '10px' }}>Status</th>
               <th style={{ padding: '10px' }}>Action</th>
             </tr>
           </thead>

           <tbody>
             {reportWorkers.map(worker => {
               const record = getRecord(worker);
               const savedStatus = record.status || (reportIsHoliday ? 'Holiday' : 'Absent');
               const savedSite = getSite(worker);
               const savedOT = record.ot ?? record.overtime_hours ?? 0;

               return (
                 <tr key={worker.id} style={{
                   borderBottom: '1px solid #e2e8f0',
                   backgroundColor: ['annual leave','sick leave','leave','other leave'].includes(savedStatus.toLowerCase()) ? '#ffedd5' : savedStatus.toLowerCase() === 'absent' ? '#fee2e2' : ['holiday','holiday present'].includes(savedStatus.toLowerCase()) ? '#fef08a' : 'transparent',
                   color: ['annual leave','sick leave','leave','other leave'].includes(savedStatus.toLowerCase()) ? '#9a3412' : savedStatus.toLowerCase() === 'absent' ? '#991b1b' : 'inherit'
                 }}>
                   <td style={{ padding: '10px', fontWeight: 'bold' }}>
                     #{worker.id} - {worker.name}
                     <div style={{
                       fontSize: '11px',
                       color: '#64748b',
                       fontWeight: 'normal'
                     }}>
                       {worker.designation || 'Worker'}
                     </div>
                   </td>

                   <td style={{ padding: '10px' }}>
                     {worker.department || '-'}
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       value={timesheetSiteInputs[worker.id] || savedSite}
                       onChange={e => setTimesheetSiteInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ padding: '6px', maxWidth: '160px' }}
                     >
                       {!sitesList.includes(savedSite) && (
                         <option value={savedSite}>{savedSite}</option>
                       )}
                       {sitesList.map((site, i) => (
                         <option key={i} value={site}>{site}</option>
                       ))}
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <input
                       type="number"
                       min="0"
                       value={overtimeInputs[worker.id] ?? savedOT}
                       onChange={e => setOvertimeInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ width: '70px', padding: '6px' }}
                     />
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       id={`status-${worker.id}`}
                       key={`${worker.id}-${selectedTimesheetDate}-${savedStatus}`}
                       defaultValue={reportIsHoliday ? (String(savedStatus).toLowerCase() === 'holiday present' ? 'Present' : 'Absent') : savedStatus}
                       style={{ padding: '6px', borderRadius: '4px' }}
                     >
                       <option value="Present">{reportIsHoliday ? 'Holiday Duty (OT Only)' : 'Present'}</option>
                       <option value="Absent">Absent</option>
                       <option value="Annual Leave">Annual Leave</option>
                       <option value="Sick Leave">Sick Leave</option>
                       <option value="Leave">Leave</option>
                       <option value="Other Leave">Other Leave</option>
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <button
                       onClick={() => {
                         const dropdown = document.getElementById(`status-${worker.id}`);
                         handleMarkAttendance(
                           worker.id,
                           dropdown ? dropdown.value : savedStatus
                         );
                       }}
                       style={{
                         padding: '7px 12px',
                         background: '#2563eb',
                         color: '#fff',
                         border: 'none',
                         borderRadius: '5px',
                         cursor: 'pointer',
                         fontWeight: 'bold'
                       }}
                     >
                       Update
                     </button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
     </div>
   );
 })()}
              
        {/* TAB 5A: DAILY TIMESHEET */}
        {activeTab === 'daily-timesheet' && (userRole.is_admin || userRole.can_view_daily_timesheet) && (
         <div
  className="daily-timesheet-print"
  id="hr-daily-timesheet-print"
  style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}
>
  
  <div className="nda-page-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"/><div><div className="brand-title">NDA-PK — Daily Timesheet</div><div className="brand-subtitle">Date: {selectedTimesheetDate} · Department: {selectedDeptFilter}</div></div></div>
  <style>{dailyTimesheetPrintStyle}</style>

            <h2 className="no-print">📄 Daily Timesheet</h2>

            <div className="no-print" style={{
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedTimesheetDate}
                  onChange={e => setSelectedTimesheetDate(e.target.value)}
                  style={{ padding: '9px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Working Site
                </label>
                <div style={{ padding: '9px', minWidth: '200px', border: '1px solid #cbd5e1', borderRadius: '5px', background: '#f8fafc' }}>
                  {userRole.is_admin ? (selectedSiteFilter === 'All' ? 'All Sites' : selectedSiteFilter) : userRole.assigned_site}
                </div>
              </div>
              <div style={{ minWidth: 180 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Department</label>
                <div style={{ padding: '9px', minWidth: '180px', border: '1px solid #cbd5e1', borderRadius: '5px', background: '#f8fafc' }}>{userRole.is_admin ? selectedDeptFilter : userRole.assigned_department}</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '1050px'
              }}>
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>S.No</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Designation</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>ID</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Site</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Status</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Normal Hours</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Contract OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Total OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {(userRole.is_admin ? workers : filteredWorkers)
                    .filter(worker => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                    
const workerSite = record.site || record.work_site || '';
                      const workerDept = String(worker.department || '').trim().toLowerCase();
                      const departmentMatches = selectedDeptFilter === 'All' || workerDept === selectedDeptFilter.toLowerCase().trim();
                      const siteMatches = dailyTimesheetSite === 'All' || dailyTimesheetSite === 'All Workers' || workerSite.toLowerCase().trim() === dailyTimesheetSite.toLowerCase().trim();
                      const permittedDept = userRole.is_admin || !userRole.assigned_department || userRole.assigned_department === 'All' || workerDept === String(userRole.assigned_department).toLowerCase().trim();
                      return departmentMatches && siteMatches && permittedDept;
                    })
.map((worker, index) => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                  
                      const annualLeave = getAnnualLeaveForWorker(
                        worker.id,
                        selectedTimesheetDate
                      );

                      const rowIsHoliday = isHolidayDate(selectedTimesheetDate);
                      const status = annualLeave ? 'Annual Leave' : (rowIsHoliday ? (String(record.status || '').toLowerCase() === 'holiday present' ? 'Holiday Present' : 'Holiday') : (record.status || 'Absent'));

                      const canCountOT = isPresentAttendanceStatus(status) && !annualLeave;
                      const ot = canCountOT ? (Number(record.ot ?? record.overtime_hours ?? 0) || 0) : 0;

                      const contractOT = canCountOT ? (Number(record.contract_ot ?? record.contract_overtime_hours ?? 0) || 0) : 0;

                      const totalOT = ot + contractOT;

                      const normalHours = !rowIsHoliday && !annualLeave && String(status).toLowerCase() === 'present' ? 8 : 0;

                      return (                       
<tr
  key={worker.id}
  style={{
    backgroundColor:
      ['annual leave', 'sick leave', 'leave', 'other leave'].includes(String(status).trim().toLowerCase())
        ? '#ffedd5'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#fee2e2'
          : String(status).trim().toLowerCase() === 'present'
            ? '#dcfce7'
            : rowIsHoliday ? '#fef08a' : '#ffffff',
    color:
      ['annual leave', 'sick leave', 'leave', 'other leave'].includes(String(status).trim().toLowerCase())
        ? '#9a3412'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#991b1b'
          : '#111827',
    fontWeight:
      ['annual leave', 'sick leave', 'leave', 'other leave', 'absent'].includes(String(status).trim().toLowerCase())
        ? 'bold'
        : 'normal'
  }}
>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.name || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.designation || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{worker.id || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{record.work_site || record.site || '—'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{status}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{normalHours}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{ot}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{contractOT}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{totalOT}</td>
                         <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>-</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <section style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px' }}>📝 Daily Work Details — {selectedTimesheetDate}</h3>
              <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>Details yahan save hongi aur date, site aur department ke mutabiq purana record bhi yahin milega.</p>
              {userRole.is_admin && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 10 }}>
                <label>Site<select value={dailyWorkDetailSite} onChange={e=>setDailyWorkDetailSite(e.target.value)} style={{...fieldStyle,marginTop:4}}>{sitesList.map(site=><option key={site} value={site}>{site}</option>)}</select></label>
                <label>Department<select value={dailyWorkDetailDepartment} onChange={e=>setDailyWorkDetailDepartment(e.target.value)} style={{...fieldStyle,marginTop:4}}>{visibleDepartments.map(dept=><option key={dept} value={dept}>{dept}</option>)}</select></label>
              </div>}
              {(userRole.is_admin || userRole.can_use_bulk || userRole.can_edit_timesheet) && <form onSubmit={handleSaveDailyWorkDetails}>
                <textarea value={dailyWorkDetailDraft} onChange={e=>setDailyWorkDetailDraft(e.target.value)} rows={3} placeholder="Aaj ka work detail yahan likhein..." style={{...fieldStyle,resize:'vertical',marginBottom:9}} />
                <button type="submit" disabled={dailyWorkDetailsSaving} style={{...primaryStyle,maxWidth:220,background:'#1d4ed8'}}>{dailyWorkDetailsSaving?'Saving...':'Save Work Details'}</button>
              </form>}
              {dailyWorkDetailsLoadError && <p style={{color:'#991b1b'}}>Details read nahi ho sakin: {dailyWorkDetailsLoadError}</p>}
              <div style={{marginTop:14,display:'grid',gap:9}}>
                {dailyWorkDetailRows.filter(r => (dailyTimesheetSite==='All Workers'||dailyTimesheetSite==='All'||String(r.work_site||'').toLowerCase()===String(dailyTimesheetSite).toLowerCase()) && (selectedDeptFilter==='All'||String(r.work_department||'').toLowerCase()===String(selectedDeptFilter).toLowerCase()) && (userRole.is_admin || ((userRole.assigned_site==='All'||String(r.work_site).toLowerCase()===String(userRole.assigned_site).toLowerCase()) && (userRole.assigned_department==='All'||String(r.work_department).toLowerCase()===String(userRole.assigned_department).toLowerCase())))).map(row=><div key={`${row.work_date}-${row.work_site}-${row.work_department}`} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:7,padding:11}}>
                  <div style={{fontSize:12,color:'#64748b',fontWeight:700}}>{row.work_date} · {row.work_site} · {row.work_department}</div>
                  <p style={{whiteSpace:'pre-wrap',margin:'7px 0'}}>{row.work_details}</p>
                  {userRole.is_admin && <div style={{display:'flex',gap:7}}><button type="button" onClick={()=>editDailyWorkDetail(row)} style={{...primaryStyle,width:'auto',padding:'6px 12px',background:'#1d4ed8'}}>Edit</button><button type="button" onClick={()=>deleteDailyWorkDetail(row)} style={{...primaryStyle,width:'auto',padding:'6px 12px',background:'#b91c1c'}}>Delete</button></div>}
                </div>)}
                {!dailyWorkDetailRows.length && <p style={{color:'#64748b',margin:0}}>Is date ka koi saved Work Details record nahi.</p>}
              </div>
            </section>

            <div style={{ marginTop: '15px' }}>
              {userRole.is_admin && <button
                onClick={() => printNdaPage('hr-daily-timesheet-print', userRole.is_admin)}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🖨️ Print / Save PDF
              </button>}
            </div>
          </div>
        )}
       
{/* TAB 5: MONTHLY SHEET */}
{activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
  <div
    id="hr-payroll-print"
    style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
<div className="nda-page-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"/><div><div className="brand-title">NDA-PK — Payroll Sheet</div><div className="brand-subtitle">Salary Month: {salaryMonthLabel} ({salaryMonthStartDate} to {salaryMonthEndDate}) · OT Period: {payrollPeriodStartDate} to {payrollPeriodEndDate}</div></div></div>
 <style>{`
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  @media print {
    #hr-payroll-print {
      position: relative !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 25mm 0 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }

    #hr-payroll-print .no-print {
      display: none !important;
    }

    #hr-payroll-print table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
    }

    #hr-payroll-print th,
    #hr-payroll-print td {
      border: 1px solid #555 !important;
      padding: 5px 3px !important;
      color: #000 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
    }

    #hr-payroll-print h3 {
      color: #000 !important;
    }
  }
`}</style>
    <div
      className="no-print"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}
    >
      <h3 style={{ margin: 0 }}>📋 Monthly Sheet</h3>

      {userRole.is_admin && <button
        onClick={() => printNdaPage('hr-payroll-print', userRole.is_admin)}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        🖨️ Print / Save as PDF
      </button>}
    </div>

    <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 15, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <div style={{ minWidth: 260, fontWeight: 'bold' }}>Monthly Salary & Overtime Sheet<br/><span style={{fontSize:12,color:'#475569'}}>Salary Month: {salaryMonthLabel} ({salaryMonthDays} days) · {salaryMonthStartDate} to {salaryMonthEndDate}</span><br/><span style={{fontSize:12,color:'#475569'}}>OT Closing Period: {payrollPeriodStartDate} to {payrollPeriodEndDate}</span><br/><span style={{fontSize:12,color:currentPayrollPeriodClosed?'#b91c1c':'#047857'}}>{currentPayrollPeriodClosed ? 'CLOSED — editing blocked' : 'OPEN — attendance and OT can be entered'}</span></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Payroll Month:
        <input type="month" value={payrollMonth} onChange={handlePayrollMonthChange} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
      </label>
      <div style={{fontSize:12,color:'#475569',padding:'8px 10px',background:'#fff',border:'1px solid #cbd5e1',borderRadius:6}}>
        Selected Period: <b>{payrollPeriodStartDate} to {payrollPeriodEndDate}</b>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Department (Top Filter):
        <span style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', minWidth: 120 }}>{userRole.is_admin ? selectedDeptFilter : userRole.assigned_department}</span>
      </label>
      {userRole.is_admin && (currentPayrollPeriodClosed
        ? <button type="button" onClick={reopenSelectedPayrollPeriod} style={{ padding: '10px 13px', background: '#b45309', color: '#fff', border: 0, borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Reopen Salary Period</button>
        : <button type="button" disabled={closingPayrollPeriod} onClick={closeSelectedPayrollPeriod} style={{ padding: '10px 13px', background: '#047857', color: '#fff', border: 0, borderRadius: 6, fontWeight: 800, cursor: closingPayrollPeriod ? 'wait' : 'pointer', opacity: closingPayrollPeriod ? 0.7 : 1 }}>{closingPayrollPeriod ? 'Closing…' : 'Close Month & Open Next'}</button>)}
    </div>

    <div
      style={{
        overflowX: 'auto',
        width: '100%'
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: '750px',
          borderCollapse: 'collapse',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>S.No.</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px', textAlign: 'left' }}>Name</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>ID</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Payable Days</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Overtime</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Extra OT Hours</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Overtime Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Salary Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Salary</th>
            <th className="no-print" style={{ border: '1px solid #94a3b8', padding: '9px' }}>Salary Slip</th>
          </tr>
        </thead>

        <tbody>         
{salaryData.map((s, index) => {
  const totalOT = Number(s.totalOT || 0);
  const overtimePay = Number(s.otSalary || 0);
  const salaryPay = Number(s.baseSalary || 0);
  const totalSalary = Number(s.totalPayable || (salaryPay + overtimePay));

            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {index + 1}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>
                  {s.name}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.id}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.presentDays}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {totalOT} hrs
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', color: '#b45309', fontWeight: 700 }}>
                  {Number(s.extraOT || 0)} hrs
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(overtimePay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(salaryPay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>
                  {Math.round(totalSalary).toLocaleString()} {selectedCurrency}
                </td>
                <td className="no-print" style={{ border: '1px solid #cbd5e1', padding: '8px', whiteSpace: 'nowrap' }}>
                  {userRole.is_admin && <button type="button" onClick={() => handlePrintWorkerPayrollSlip(s)} style={{ padding: '7px 10px', background: '#047857', color: '#fff', border: 0, borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>🧾 Print / PDF</button>}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
            <td
              colSpan={8}
              style={{
                border: '1px solid #94a3b8',
                padding: '10px',
                textAlign: 'right'
              }}
            >
              GRAND TOTAL
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '10px' }}>
              {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
            </td>
            <td className="no-print" style={{ border: '1px solid #94a3b8', padding: '10px' }}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
)}
        {/* TAB 6: CHANGE LOGIN DETAILS */}
        {activeTab === 'changepass' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🔑 Change Login Details</h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '13px' }}>
              {userRole.is_admin ? 'Admin yahan apna login email aur password dono change kar sakta hai.' : 'Staff apna password change kar sakta hai. Login email admin hi change karega.'}
            </p>
            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Current Password *</label>
                <input type="password" value={currentPassInput} onChange={e => setCurrentPassInput(e.target.value)} placeholder="Enter current password" autoComplete="current-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              {userRole.is_admin && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Admin Login Email</label>
                  <input type="email" value={newLoginEmailInput} onChange={e => setNewLoginEmailInput(e.target.value)} placeholder={session?.user?.email || 'admin@nda.pk'} autoComplete="username" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Password {userRole.is_admin ? '(optional if changing email only)' : '*'}</label>
                <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} placeholder="Enter new password" autoComplete="new-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required={!userRole.is_admin} />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Login Details</button>
            </form>
          </div>
        )}

        {/* TAB 7: WORKING SITES MANAGEMENT */}
        {activeTab === 'sites' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏗️ Manage Working Sites</h3>
            <form onSubmit={handleAddNewSite} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newSiteInput} onChange={e => setNewSiteInput(e.target.value)} placeholder="e.g. Dubai Marina Site" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Site</button>
            </form>
            <h4>Current Active Sites:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sitesList.map((site, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{site}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSite(site)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB: DEPARTMENTS MANAGEMENT */}
        {activeTab === 'departments' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏢 Manage Departments</h3>
            <form onSubmit={handleAddNewDepartment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newDeptInput} onChange={e => setNewDeptInput(e.target.value)} placeholder="e.g. Mechanical" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Dept</button>
            </form>
            <h4>Current Active Departments:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {uniqueDepartments.map((dept, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{dept}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteDepartment(dept)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DESIGNATION MANAGEMENT — moved out of Workers Directory */}
        {activeTab === 'designations' && userRole.is_admin && (
          <div style={{ background: '#fff', padding: 22, borderRadius: 12, boxShadow: '0 2px 8px rgba(15,23,42,.08)', maxWidth: 760 }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>🛠️ Designation Management</h3>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>Yahan se designation add ya delete karein. Delete hone wali designation refresh ke baad active list mein wapas nahi aayegi. Purane worker records safe rahenge.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) auto', gap: 10, alignItems: 'end', marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 5 }}>Select Designation to Delete</label>
                <select value={designation} onChange={e => setDesignation(e.target.value)} style={{ ...fieldStyle }}>
                  <option value="">Select designation</option>
                  {designationsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 5 }}>New Designation</label>
                <input value={newDesignation} onChange={e => setNewDesignation(e.target.value)} placeholder="Enter designation name" style={{ ...fieldStyle }} />
              </div>
              <button type="button" onClick={handleAddDesignation} style={{ padding: '11px 15px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>+ Add</button>
            </div>
            <button type="button" onClick={handleDeleteDesignation} disabled={!designation} style={{ padding: '10px 16px', border: 0, borderRadius: 8, background: designation ? '#dc2626' : '#94a3b8', color: '#fff', fontWeight: 800, cursor: designation ? 'pointer' : 'not-allowed', marginBottom: 18 }}>🗑️ Delete Selected Designation</button>
            <h4 style={{ margin: '0 0 8px' }}>Active Designations ({designationsList.length})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
              {designationsList.map(d => <button type="button" key={d} onClick={() => setDesignation(d)} style={{ textAlign: 'left', padding: '10px 12px', border: `1px solid ${designation === d ? '#0f766e' : '#e2e8f0'}`, borderRadius: 8, background: designation === d ? '#ccfbf1' : '#f8fafc', color: '#0f172a', cursor: 'pointer', fontWeight: 700 }}>{d}</button>)}
            </div>
          </div>
        )}

        {/* TAB 9: PERMISSIONS PANEL */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🔐 Granular Staff Permissions & Staff ID Allocation</h3>
            <form onSubmit={handleSavePermission} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#1e293b' }}>{targetEmail ? `✏️ Edit Access for: ${targetEmail}` : '➕ Add New Staff Access'}</h4>
                {targetEmail && (
                  <button type="button" onClick={() => {
                    setTargetStaffId('');
                    setTargetEmail('');
                    setTargetPassword('');
                    setTargetDept('All');
                    setTargetSite('All');
                    setPermDashboard(true);
                    setPermBulk(false);
                    setPermViewWorkers(true);
                    setPermAddWorkers(false);
                    setPermEditWorkers(false);
                    setPermDeleteWorkers(false);
                    setPermTimesheetView(false);
                    setPermDailyTimesheetView(false);
                    setPermTimesheetEdit(false);
                    setPermPayroll(false);
                  }} style={{ padding: '4px 10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancel Edit</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff ID</label>
                  <input type="text" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} placeholder="e.g. STF-01" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff Email *</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="staff@nda.pk" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password *</label>
                  <input type="text" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Department</label>
                  <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Departments (only if authorized)</option>
                    {uniqueDepartments.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Site</label>
                  <select value={targetSite} onChange={e => setTargetSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Sites</option>
                    {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Checkboxes Permissions */}
              <h4 style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#334155' }}>Select Permissions:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> Can View Dashboard
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Can Use Bulk & OCR
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permViewWorkers} onChange={e => setPermViewWorkers(e.target.checked)} /> Can View Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Can Add Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permEditWorkers} onChange={e => setPermEditWorkers(e.target.checked)} /> Can Edit Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDeleteWorkers} onChange={e => setPermDeleteWorkers(e.target.checked)} /> Can Delete Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetView} onChange={e => setPermTimesheetView(e.target.checked)} /> Can View Timesheet Entry / Monthly Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDailyTimesheetView} onChange={e => setPermDailyTimesheetView(e.target.checked)} /> Can View Daily Timesheet Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetEdit} onChange={e => setPermTimesheetEdit(e.target.checked)} /> Can Edit Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> Can View Payroll
                </label>
              </div>

              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save / Update Staff Access</button>
            </form>

            <h4 style={{ margin: '20px 0 10px 0' }}>Existing Staff Access List & Active Permissions</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Staff ID & Email</th>
                    <th style={{ padding: '10px' }}>Dept / Site Scope</th>
                    <th style={{ padding: '10px' }}>Assigned Permissions Summary</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsList.filter(p => !p.is_admin).map((p, idx) => {
                    const activePerms = [];
                    if (p.can_view_dashboard) activePerms.push('Dashboard');
                    if (p.can_use_bulk) activePerms.push('Bulk/OCR');
                    if (p.can_view_workers) activePerms.push('View Workers');
                    if (p.can_add_workers) activePerms.push('Add Worker');
                    if (p.can_edit_workers) activePerms.push('Edit Worker');
                    if (p.can_delete_workers) activePerms.push('Delete Worker');
                    if (p.can_view_timesheet) activePerms.push('Timesheet Entry / Monthly Timesheet');
                    if (p.can_view_daily_timesheet) activePerms.push('Daily Timesheet');
                    if (p.can_edit_timesheet) activePerms.push('Edit Timesheet');
                    if (p.can_view_payroll) activePerms.push('Payroll');

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>
                          <strong>{p.staff_id || 'N/A'}</strong><br/>
                          <span style={{ color: '#0284c7' }}>{p.user_email}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          Dept: <strong>{p.assigned_department}</strong><br/>
                          Site: <strong>{p.assigned_site}</strong>
                        </td>
                        <td style={{ padding: '10px', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {activePerms.map((ap, i) => (
                              <span key={i} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{ap}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => {
                              setTargetStaffId(p.staff_id || '');
                              setTargetEmail(p.user_email || '');
                              setTargetPassword(p.user_password || '');
                              setTargetDept(p.assigned_department || 'All');
                              setTargetSite(p.assigned_site || 'All');
                              setPermDashboard(p.can_view_dashboard ?? true);
                              setPermBulk(p.can_use_bulk ?? false);
                              setPermViewWorkers(p.can_view_workers ?? true);
                              setPermAddWorkers(p.can_add_workers ?? false);
                              setPermEditWorkers(p.can_edit_workers ?? false);
                              setPermDeleteWorkers(p.can_delete_workers ?? false);
                              setPermTimesheetView(p.can_view_timesheet ?? true);
                              setPermDailyTimesheetView(p.can_view_daily_timesheet ?? false);
                              setPermTimesheetEdit(p.can_edit_timesheet ?? true);
                              setPermPayroll(p.can_view_payroll ?? false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                            <button onClick={() => handleDeleteUserPermission(p.user_email)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      {/* ADMIN ONLY: DATE / MONTH / RANGE TIMESHEET CLEANUP */}
        {activeTab === 'data-cleanup' && userRole.is_admin && (
          <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #fecaca', maxWidth:850, boxShadow:'0 8px 28px #991b1b0b' }}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}><div style={{fontSize:30}}>🗑️</div><div><h2 style={{margin:0,color:'#991b1b'}}>Delete Timesheet Records</h2><p style={{margin:'5px 0 0',color:'#64748b',fontSize:13}}>Sirf selected day, poora month, ya custom date range delete karein.</p></div></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
              {[['day','One Day'],['month','Full Month'],['range','Date Range']].map(([value,label])=><button key={value} onClick={()=>setCleanupMode(value)} style={{padding:'10px 15px',borderRadius:9,border:cleanupMode===value?'1px solid #b91c1c':'1px solid #cbd5e1',background:cleanupMode===value?'#fee2e2':'#fff',color:cleanupMode===value?'#991b1b':'#334155',fontWeight:800,cursor:'pointer'}}>{label}</button>)}
            </div>
            {cleanupMode==='day'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select exact date to delete <input type="date" value={cleanupSelectedDate} onChange={e=>setCleanupSelectedDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='month'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select month <input type="month" value={cleanupMonth} onChange={e=>setCleanupMonth(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='range'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:15}}><label style={{fontWeight:700}}>From date<input type="date" value={cleanupStartDate} onChange={e=>setCleanupStartDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label><label style={{fontWeight:700}}>To date<input type="date" value={cleanupEndDate} onChange={e=>setCleanupEndDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label></div>}
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',padding:13,borderRadius:10,color:'#9a3412',fontSize:13,margin:'12px 0 18px'}}><b>Important:</b> Selected date(s) bhi delete hon gi. {cleanupMode==='month'?'Selected month ke pehle se aakhri din tak tamam records delete honge.':cleanupMode==='range'?'From aur To dono dates include hain.':'Sirf isi date ki timesheet delete hogi.'} Delete hone ke baad restore nahi kar sakte.</div>
            <div style={{display:'grid',gap:12,marginBottom:20}}>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAttendance} onChange={e=>setCleanupAttendance(e.target.checked)}/><span><b>Timesheet / Attendance</b> — status, normal OT, contract OT, site</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupDailyDetails} onChange={e=>setCleanupDailyDetails(e.target.checked)}/><span><b>Daily work details</b> — site remarks and daily work notes</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAnnualLeaves} onChange={e=>setCleanupAnnualLeaves(e.target.checked)}/><span><b>Completed annual leave records</b> — records starting inside the selected date range; active “On Leave” records are excluded</span></label>
            </div>
            <button type="button" disabled={cleanupLoading} onClick={handleDeleteOldRecords} style={{padding:'12px 18px',background:cleanupLoading?'#9ca3af':'#b91c1c',color:'#fff',border:0,borderRadius:9,fontWeight:800,cursor:cleanupLoading?'wait':'pointer'}}>{cleanupLoading?'Deleting records…':'Permanently Delete Selected Records'}</button>
          </div>
        )}

     {/* TAB 10: ANNUAL LEAVES, PENALTIES & 12-MONTH DEDUCTION */}
        {activeTab === 'annualLeave' && userRole.is_admin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>UAE Labor Law: Annual Leave & 12-Month Overstay Deductions</h2>
              <button onClick={() => {
                setTargetStaffId('');
                setLeaveWorkerId('');
                setLeaveStartDate('');
                setLeaveExpectedReturnDate('');
                setLeaveActualReturnDate('');
                setHasDeduction(true);
                setMonthlyDeductions({});
                setLeaveModalOpen(true);
              }} style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Record Annual Leave</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              <button onClick={() => setAnnualManagementView('annual')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'annual' ? '#047857' : '#64748b', fontWeight: 800 }}>1. Annual Leave</button>
              <button onClick={() => setAnnualManagementView('count')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'count' ? '#047857' : '#64748b', fontWeight: 800 }}>2. Leave Count Workers</button>
              <button onClick={() => setAnnualManagementView('final')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'final' ? '#047857' : '#64748b', fontWeight: 800 }}>3. Final Calculation</button>
            </div>

            {annualManagementView === 'annual' && <>
            {leaveModalOpen && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>{targetStaffId ? '✏️ Edit Leave & 12-Month Deduction' : 'Add Leave & Multi-Month Deduction Breakdown'}</h3>
                <form onSubmit={handleSaveAnnualLeave}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Worker</label>
                      <select value={leaveWorkerId} onChange={e => setLeaveWorkerId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required>
                        <option value="">Choose Worker...</option>
                        {filteredWorkers.map(w => (
                          <option key={w.id} value={w.id}>#{w.id} - {w.name} ({w.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Leave Start Date</label>
                      <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Expected Return Date</label>
                      <input type="date" value={leaveExpectedReturnDate} onChange={e => setLeaveExpectedReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Actual Return Date (Optional)</label>
                      <input type="date" value={leaveActualReturnDate} onChange={e => setLeaveActualReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                 
                  {/* Deduction Controls & 12-Month Breakdown Section */}
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <input type="checkbox" id="hasDeductionCheck" checked={hasDeduction} onChange={e => setHasDeduction(e.target.checked)} style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }} />
                      <label htmlFor="hasDeductionCheck" style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer' }}>Overstay Penalty / Deduction Applicable?</label>
                    </div>

                    {hasDeduction && (
                      <div>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                          📅 Select Month-by-Month Deduction Days (Up to next 12 Months):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          {Array.from({ length: 12 }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + i);
                            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });

                            return (
                              <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{monthName}</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  min="0"
                                  placeholder="Days (e.g. 5)" 
                                  value={monthlyDeductions[monthKey] || ''} 
                                  onChange={e => {
                                    setMonthlyDeductions({
                                      ...monthlyDeductions,
                                      [monthKey]: e.target.value
                                    });
                                  }} 
                                  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          * Jis mahine mein jitne din deduct karne hain wahan enter karein.
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{targetStaffId ? 'Update Record' : 'Save Leave Record'}</button>
                    <button type="button" onClick={() => setLeaveModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Table View */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '12px' }}>Worker ID</th>
                    <th style={{ padding: '12px' }}>Leave Period</th>
                    <th style={{ padding: '12px' }}>Actual Return</th>
                    <th style={{ padding: '12px' }}>Deduction Breakdown / Total</th>
                    <th style={{ padding: '12px' }}>Accrued Leave Balance</th>
                    <th style={{ padding: '12px' }}>Leave Days Used</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    {userRole.is_admin && <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {annualLeaveScopedList.length === 0 ? (
                    <tr><td colSpan={userRole.is_admin ? 8 : 7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No annual leave records found.</td></tr>
                  ) : (
                    annualLeaveScopedList.map((leave, idx) => {
                      

let accruedDays = 0;

const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = leave.start_date
  ? new Date(leave.start_date + 'T00:00:00')
  : null;

const actualReturnDate =
  leave.actual_return && leave.actual_return !== 'On Leave'
    ? new Date(leave.actual_return + 'T00:00:00')
    : null;

let leaveDaysUsed = 0;

if (startDate) {
  const endDate = actualReturnDate || today;
  const diffDays = Math.floor(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  );
  leaveDaysUsed = Math.max(0, diffDays + 1);
}

// Is worker ke tamam leave records date ke hisaab se
// arrange karke balance calculate karein.
const workerLeaves = annualLeaveList
  .filter(
    item => String(item.worker_id) === String(leave.worker_id)
  )
  .slice()
  .sort((a, b) =>
    String(a.start_date || '').localeCompare(
      String(b.start_date || '')
    )
  );

let balance = 0;
let lastReturn = null;
let firstReturnFound = false;

for (const item of workerLeaves) {
  const s = item.start_date
    ? new Date(item.start_date + 'T00:00:00')
    : null;

  const r =
    item.actual_return && item.actual_return !== 'On Leave'
      ? new Date(item.actual_return + 'T00:00:00')
      : null;

  if (!s) continue;

  // Pehli recorded Actual Return Date se earning shuru.
  if (!firstReturnFound) {
    if (r) {
      lastReturn = r;
      firstReturnFound = true;
    }
    continue;
  }

  // Wapsi se agli annual leave tak 2.5 din per month.
  if (lastReturn) {
    const daysBetween = Math.max(
      0,
      Math.floor((s - lastReturn) / (1000 * 60 * 60 * 24))
    );

    balance += daysBetween * (30 / 365);
  }

  // Guzari hui annual leave balance se minus.
  const end = r || today;
  const usedDays = Math.max(
    0,
    Math.floor((end - s) / (1000 * 60 * 60 * 24)) + 1
  );

  balance -= usedDays;

  if (r) {
    lastReturn = r;
  } else {
    // Worker abhi leave par hai; earning ruki rahegi.
    lastReturn = null;
    break;
  }
}

// Agar worker wapas aa chuka hai, to aaj tak earning jorein.
if (lastReturn) {
  const daysSinceReturn = Math.max(
    0,
    Math.floor((today - lastReturn) / (1000 * 60 * 60 * 24))
  );

  balance += daysSinceReturn * (30 / 365);
}

accruedDays = balance.toFixed(1);
                      return (
                        <tr key={leave.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>#{leave.worker_id}</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            <div><strong>Start:</strong> {leave.start_date}</div>
                            <div><strong>Expected:</strong> {leave.expected_return}</div>
                          </td>
                          <td style={{ padding: '12px' }}>{leave.actual_return}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: Number(leave.deduction_days) > 0 ? 'bold' : 'normal', color: Number(leave.deduction_days) > 0 ? '#dc2626' : 'inherit' }}>
                              Total: {leave.deduction_days} Days
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              {leave.deduction_breakdown || 'No Breakdown'}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {leave.actual_return && leave.actual_return !== 'On Leave' ? (
                              <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontSize: '12px' }}>
                                🟢 {accruedDays} Days Accumulated
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Pending Return</span>
                            )}
                          </td>
                          
<td style={{ padding: '12px' }}>
  <span style={{
    padding: '4px 8px',
    borderRadius: '4px',
    background: '#fff7ed',
    color: '#c2410c',
    fontWeight: 'bold',
    fontSize: '12px'
  }}>
    {leaveDaysUsed} Days
  </span>
</td>
                          <td style={{ padding: '12px' }}>
                            {(() => {
                              const todayText = new Date().toISOString().slice(0, 10);
                              const displayStatus = leave.actual_return && leave.actual_return !== 'On Leave' ? 'Returned' : (leave.start_date && leave.start_date > todayText ? 'Upcoming' : 'On Leave');
                              const statusStyle = displayStatus === 'Returned' ? { background: '#dcfce7', color: '#166534' } : displayStatus === 'Upcoming' ? { background: '#bbf7d0', color: '#166534' } : { background: '#bbf7d0', color: '#166534' };
                              return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, ...statusStyle }}>{displayStatus}</span>;
                            })()}
                          </td>
                          {userRole.is_admin && (
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => {
                                  setTargetStaffId(leave.id);
                                  setLeaveWorkerId(leave.worker_id);
                                  setLeaveStartDate(leave.start_date);
                                  setLeaveExpectedReturnDate(leave.expected_return);
                                  setLeaveActualReturnDate(leave.actual_return === 'On Leave' ? '' : leave.actual_return);
                                  setHasDeduction(leave.has_deduction ?? true);
                                  setMonthlyDeductions({});
                                  setLeaveModalOpen(true);
                                }} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                                <button onClick={async () => {
                                  if (confirm('Kya aap waqai is leave record ko delete karna chahte hain?')) {
                                    const { error } = await supabase.from('annual_leaves').delete().eq('id', leave.id);
                                    if (error) {
                                      alert('Error deleting record: ' + error.message);
                                    } else {
                                      setAnnualLeaveList(annualLeaveList.filter(l => l.id !== leave.id));
                                      alert('Record delete ho gaya!');
                                      fetchAnnualLeaves();
                                    }
                                  }
                                }} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </>}

            {annualManagementView === 'count' && <div style={{ display: 'grid', gap: 18 }}>
              <section style={{ background: '#fff', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10, overflowX: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>Leave Count — All Workers</h3>
                <p style={{ color: '#475569', fontSize: 13 }}>Annual leave count last vacation se wapsi ki date se dobara shuru hota hai. Leave salary paid-up date agar is se baad ho to woh date use hogi. UAE rule: 6 mahine se zyada aur 1 saal se kam service par 2 din per month; 1 saal complete hone ke baad 30 din per year. Har worker ki last return date yahan save karein.</p>
                <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Last Leave Salary Date</th><th style={thStyle}>Last Vacation Return Date</th><th style={thStyle}>Earned Days</th><th style={thStyle}>Leave Used</th><th style={thStyle}>Available Balance</th></tr></thead><tbody>
                  {filteredWorkers.map(w => {
                    const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                    const salaryRecords = leaveSalaryRecords.filter(r => String(r.worker_id) === String(w.id)).sort((a,b) => String(b.leave_salary_last_date || '').localeCompare(String(a.leave_salary_last_date || '')));
                    const latestSalaryRecord = salaryRecords[0];
                    const joinDate = emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : '');
                    const workerLeaveRows = annualLeaveList.filter(l => String(l.worker_id) === String(w.id));
                    const latestRecordedReturn = workerLeaveRows.filter(l => l.actual_return && l.actual_return !== 'On Leave').map(l => String(l.actual_return).slice(0,10)).sort().at(-1) || '';
                    const savedLastReturn = lastReturnDateEdit[String(w.id)] ?? ([w.last_return_date, latestRecordedReturn].filter(Boolean).map(x => String(x).slice(0,10)).sort().at(-1) || '');
                    const accrualCandidates = [joinDate, savedLastReturn, latestSalaryRecord?.leave_salary_last_date].filter(Boolean).sort();
                    const accrualStart = accrualCandidates.at(-1) || '';
                    const todayString = new Date().toISOString().slice(0,10);
                    const join = joinDate ? new Date(joinDate + 'T00:00:00') : null;
                    const accrualFrom = accrualStart ? new Date(accrualStart + 'T00:00:00') : null;
                    const todayDate = new Date(todayString + 'T00:00:00');
                    const activeLeave = workerLeaveRows.filter(l => l.start_date && l.start_date <= todayString && (!l.actual_return || l.actual_return === 'On Leave')).sort((a,b) => String(b.start_date).localeCompare(String(a.start_date)))[0];
                    const accrualEndDate = activeLeave ? new Date(String(activeLeave.start_date).slice(0,10) + 'T00:00:00') : todayDate;
                    let accrued = 0;
                    if (join && accrualFrom && accrualFrom <= accrualEndDate) {
                      const sixMonthDate = new Date(join); sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);
                      const firstYearDate = new Date(join); firstYearDate.setFullYear(firstYearDate.getFullYear() + 1);
                      const earlyStart = new Date(Math.max(accrualFrom.getTime(), sixMonthDate.getTime()));
                      const earlyEnd = new Date(Math.min(accrualEndDate.getTime(), firstYearDate.getTime()));
                      if (earlyEnd > earlyStart) accrued += ((earlyEnd - earlyStart) / 86400000) * (24 / 365);
                      const laterStart = new Date(Math.max(accrualFrom.getTime(), firstYearDate.getTime()));
                      if (accrualEndDate > laterStart) accrued += ((accrualEndDate - laterStart) / 86400000) * (30 / 365);
                    }
                    const used = workerLeaveRows.filter(l => l.start_date && l.start_date >= (accrualStart || '9999-12-31') && l.start_date <= todayString).reduce((sum,l) => { const end = l.actual_return && l.actual_return !== 'On Leave' ? l.actual_return : todayString; return sum + Math.max(0, Math.floor((new Date(end + 'T00:00:00') - new Date(l.start_date + 'T00:00:00')) / 86400000) + 1); }, 0);
                    const balance = Math.max(0, accrued - used);
                    const edit = employmentEdit[String(w.id)] || { joining_date: joinDate, cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '', unpaid_absence_days: emp.unpaid_absence_days || w.unpaid_absence_days || 0 };
                    return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b><div style={{ color: '#64748b', fontSize: 12 }}>{w.department} / {w.designation}</div></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 145, padding: 7 }} /><button onClick={() => saveEmploymentRecord(w.id)} style={{ marginTop: 5, padding: '5px 8px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save Joining Date</button></td><td style={tdStyle}>{latestSalaryRecord?.leave_salary_last_date || 'Never recorded'}</td><td style={tdStyle}><input type="date" value={savedLastReturn || ''} onChange={e => setLastReturnDateEdit(prev => ({ ...prev, [String(w.id)]: e.target.value }))} style={{ ...fieldStyle, minWidth: 145, padding: 7 }} /><button onClick={() => saveLastVacationReturnDate(w.id)} style={{ marginTop: 5, padding: '5px 8px', background: '#047857', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save Return Date</button></td><td style={tdStyle}>{accrued.toFixed(1)} days</td><td style={tdStyle}>{used.toFixed(1)} days</td><td style={tdStyle}><b style={{ color: '#15803d', background: '#dcfce7', padding: '5px 8px', borderRadius: 6 }}>{balance.toFixed(1)} days</b></td></tr>;
                  })}
                </tbody></table>
              </section>
              <section style={{ background: '#f8fafc', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                <h3 style={{ marginTop: 0 }}>Leave Salary Received — Reset Leave Balance</h3>
                <p style={{ fontSize: 13, color: '#475569' }}>Yahan salary ki woh last date dalein jis tak leave salary pay hui. Is record ke baad earned leave dobara us date se calculate hogi.</p>
                <form onSubmit={saveLeaveSalaryReceived} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, alignItems: 'end' }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Worker<select value={leaveSalaryWorkerId} onChange={e => setLeaveSalaryWorkerId(e.target.value)} required style={fieldStyle}><option value="">Choose worker</option>{filteredWorkers.map(w => <option key={w.id} value={w.id}>#{w.worker_id || w.id} — {w.name} ({w.department})</option>)}</select></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Leave salary paid up to<input type="date" value={leaveSalaryLastDate} onChange={e => setLeaveSalaryLastDate(e.target.value)} required style={fieldStyle} /></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Amount (AED, optional)<input type="number" min="0" step="0.01" value={leaveSalaryAmount} onChange={e => setLeaveSalaryAmount(e.target.value)} style={fieldStyle} /></label>
                  <button type="submit" style={{ ...primaryStyle, background: '#047857' }}>Leave Salary Received</button>
                </form>
                <div style={{ marginTop: 14, overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Paid Up To</th><th style={thStyle}>Amount</th><th style={thStyle}>Recorded</th></tr></thead><tbody>{leaveSalaryRecords.filter(r => annualLeaveScopedWorkerIds.has(String(r.worker_id))).map(r => <tr key={r.id}><td style={tdStyle}>{workers.find(w => String(w.id) === String(r.worker_id))?.name || `Worker #${r.worker_id}`}</td><td style={tdStyle}>{r.leave_salary_last_date}</td><td style={tdStyle}>{Number(r.amount || 0).toFixed(2)} AED</td><td style={tdStyle}>{r.received_at ? String(r.received_at).slice(0,10) : ''}</td></tr>)}{!leaveSalaryRecords.length && <tr><td colSpan="4" style={tdStyle}>No leave salary records yet.</td></tr>}</tbody></table></div>
              </section>
            </div>}

            {annualManagementView === 'final' && <div style={{ background: '#fff', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10, overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Final Calculation — UAE Private-Sector Gratuity Estimate</h3>
              <p style={{ color: '#475569', fontSize: 13 }}>Estimate basic salary par hota hai, total salary par zaroori nahi. App mein joining date, cancellation/last working date aur basic salary save karein. General full-time formula: 1 saal se kam service par gratuity nahi; pehle 5 saal ke liye har saal 21 din basic wage, 5 saal ke baad har additional saal 30 din, aur total cap 2 saal ki basic wage. Final payment se pehle HR/UAE labour guidance se verify karein.</p>
              <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Cancellation / Last Date</th><th style={thStyle}>Basic Salary AED</th><th style={thStyle}>Unpaid Absence Days</th><th style={thStyle}>Service</th><th style={thStyle}>Gratuity Days</th><th style={thStyle}>Estimated Gratuity AED</th><th style={thStyle}>Actions</th></tr></thead><tbody>
                {filteredWorkers.map(w => {
                  const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                  const edit = employmentEdit[String(w.id)] || { joining_date: emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : ''), cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '', unpaid_absence_days: emp.unpaid_absence_days ?? w.unpaid_absence_days ?? 0 };
                  const endDate = edit.cancellation_date || finalCalcDate;
                  const basic = Math.max(0, Number(edit.basic_salary || 0));
                  const calc = calculateUAEGratuity(edit.joining_date, endDate, basic, edit.unpaid_absence_days || 0);
                  return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /></td><td style={tdStyle}><input type="date" value={edit.cancellation_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, cancellation_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /><div style={{ fontSize: 11, color: '#64748b' }}>Blank = current date</div></td><td style={tdStyle}><input type="number" min="0" step="0.01" value={edit.basic_salary || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, basic_salary: e.target.value } }))} style={{ ...fieldStyle, minWidth: 110, padding: 7 }} /></td><td style={tdStyle}><input type="number" min="0" step="1" value={edit.unpaid_absence_days || 0} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, unpaid_absence_days: e.target.value } }))} style={{ ...fieldStyle, minWidth: 90, padding: 7 }} /></td><td style={tdStyle}>{calc.serviceYears.toFixed(2)} years</td><td style={tdStyle}>{calc.gratuityDays.toFixed(1)}</td><td style={tdStyle}><b>{calc.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</b></td><td style={tdStyle}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => setGratuityViewWorkerId(String(w.id))} style={{ padding: '7px 10px', background: '#0f766e', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>View</button><button onClick={() => saveEmploymentRecord(w.id)} style={{ padding: '7px 10px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save</button></div></td></tr>;
                })}
              </tbody></table>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 12 }}>Current calculation date: {finalCalcDate}. <label>Calculation date <input type="date" value={finalCalcDate} onChange={e => setFinalCalcDate(e.target.value)} style={{ ...fieldStyle, width: 180, display: 'inline-block' }} /></label></p>
              {gratuityViewWorkerId && (() => {
                const worker = workers.find(x => String(x.id) === String(gratuityViewWorkerId));
                if (!worker) return null;
                const emp = employmentRecords.find(r => String(r.worker_id) === String(worker.id)) || {};
                const edit = employmentEdit[String(worker.id)] || { joining_date: emp.joining_date || worker.joining_date || worker.start_date || (worker.created_at ? String(worker.created_at).slice(0,10) : ''), cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || worker.basic_salary || '', unpaid_absence_days: emp.unpaid_absence_days ?? worker.unpaid_absence_days ?? 0 };
                const endDate = edit.cancellation_date || finalCalcDate;
                const calc = calculateUAEGratuity(edit.joining_date, endDate, edit.basic_salary, edit.unpaid_absence_days || 0);
                const money = n => Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.58)', zIndex: 10020, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div id="nda-gratuity-worker-detail" style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px #0005' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><h3 style={{ margin: 0 }}>Final Gratuity Details</h3><button onClick={() => setGratuityViewWorkerId(null)} style={{ border: 0, borderRadius: 7, padding: '7px 12px', background: '#e2e8f0', cursor: 'pointer' }}>Close</button></div>
                    <h2 style={{ margin: '14px 0 4px' }}>#{worker.worker_id || worker.id} — {worker.name}</h2><div style={{ color: '#64748b', fontSize: 13 }}>{worker.department || '—'} / {worker.designation || '—'}</div>
                    <table style={{ ...tableStyle, marginTop: 16 }}><tbody>
                      {[['Joining date', edit.joining_date || 'Not entered'],['Last working / cancellation date', endDate || 'Not entered'],['Calculation date', finalCalcDate],['Basic monthly salary', `AED ${money(edit.basic_salary)}`],['Daily basic wage (basic ÷ 30)', `AED ${money(calc.dailyBasic)}`],['Total service days', calc.serviceDays],['Unpaid absence days deducted', calc.adjustedServiceDays === 0 ? calc.serviceDays : Math.max(0, calc.serviceDays - calc.adjustedServiceDays)],['Service counted after unpaid absence', `${calc.serviceYears.toFixed(4)} years`],['First 5 years: 21 days per year', `${calc.firstFiveDays.toFixed(2)} gratuity days`],['After 5 years: 30 days per year', `${calc.additionalDays.toFixed(2)} gratuity days`],['Total gratuity days', `${calc.gratuityDays.toFixed(2)} days`],['Gratuity before 2-year cap', `AED ${money(calc.dailyBasic * calc.gratuityDays)}`],['Maximum legal cap (24 basic salaries)', `AED ${money(Number(edit.basic_salary || 0) * 24)}`],['Final estimated gratuity', `AED ${money(calc.amount)}`]].map(([label,value]) => <tr key={label}><td style={{ ...tdStyle, width: '56%', fontWeight: 700 }}>{label}</td><td style={tdStyle}>{value}</td></tr>)}
                    </tbody></table>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>Estimate for a full-time foreign worker under UAE Labour Law Article 51. Unpaid absence days are deducted only from the number entered above. Part-time contracts, UAE nationals, alternative savings schemes, employer deductions and individual contract terms may require a different calculation.</p>
                    {userRole.is_admin && <button onClick={() => printNdaPage('nda-gratuity-worker-detail', userRole.is_admin)} style={{ marginTop: 8, padding: '9px 14px', background: '#1d4ed8', color: '#fff', border: 0, borderRadius: 7, cursor: 'pointer', fontWeight: 800 }}>Print Details</button>}
                  </div>
                </div>;
              })()}
            </div>}
          </div>
        )}
        {/* 📊 MONTHLY TIMESHEET MODAL WITH SEARCH, DEPT FILTER & VIEW/PRINT OPTIONS */}
{activeTab === 'monthly-timesheet' && (userRole.is_admin || userRole.can_view_timesheet || userRole.can_view_payroll) && (
  <section id="hr-monthly-timesheet-print" className="monthly-timesheet-page" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: 'none', minHeight: '70vh', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(15,23,42,.06)' }}>
      <div className="nda-page-print-brand"><img src="/nda-naveed-logo.png" alt="NDA-PK"/><div><div className="brand-title">NDA-PK — Monthly Timesheet</div><div className="brand-subtitle">Monthly Worker Attendance Report</div></div></div>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📊 Monthly Timesheet & Worker Report</h2>
        <button 
          onClick={() => { setShowMonthlyTimesheetModal(false); setActiveTab('dashboard'); }}
          style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Dashboard
        </button>
      </div>     
<style>{`
  @media print {
    .monthly-timesheet-filters {
      display: none !important;
    }

    .monthly-timesheet-actions {
      display: none !important;
    }
  }
`}</style>

      {/* Filters: Search, Department, Month, Year */}
    <div className="monthly-timesheet-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search by ID or Name */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Search Worker (ID / Name)</label>
            <input 
              type="text" 
              placeholder="e.g. 101 or John..." 
              value={timesheetSearchQuery} 
              onChange={e => setTimesheetSearchQuery(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '180px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department (Top Filter)</label>
            <div style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '150px', background: '#fff' }}>{userRole.is_admin ? selectedDeptFilter : userRole.assigned_department}</div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Payroll Month</label>
            <input type="month" value={payrollMonth} onChange={handlePayrollMonthChange} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{fontSize:12,color:'#475569',padding:'8px 10px',background:'#fff',border:'1px solid #cbd5e1',borderRadius:6}}>
            Salary Period: <b>{payrollPeriodStartDate} to {payrollPeriodEndDate}</b>
            <span style={{display:'block',marginTop:3,fontWeight:700,color:currentPayrollPeriodClosed?'#b91c1c':'#047857'}}>{currentPayrollPeriodClosed?'CLOSED — view / print only':'OPEN — current period'}</span>
          </div>
        </div>


      </div>

      {/* Filtered & Searched Workers List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px' }}>Worker ID & Name</th>
              <th style={{ padding: '10px' }}>Department</th>
              <th style={{ padding: '10px' }}>Attendance Sites</th>
              <th style={{ padding: '10px' }}>Extra OT / OT Site</th>
              {userRole.is_admin && <th className="monthly-timesheet-actions" style={{ padding: '10px', textAlign: 'center' }}>Actions (View / Print / PDF)</th>}
            </tr>
          </thead>
          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => {
                const reportDepartment = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
                const reportSite = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
                const matchesDept = reportDepartment === 'All' || !reportDepartment || String(w.department || '').trim().toLowerCase() === String(reportDepartment).trim().toLowerCase();
                const workerSiteRows = attendance.filter(a => String(a.worker_id) === String(w.id) && String(a.date || '').slice(0,10) >= payrollStartDate && String(a.date || '').slice(0,10) <= payrollEndDate);
                const matchesSite = reportSite === 'All' || !reportSite || workerSiteRows.some(a => String(a.work_site || a.site || '').trim().toLowerCase() === String(reportSite).trim().toLowerCase());
                const matchesSearch = !timesheetSearchQuery || 
                  String(w.id).toLowerCase().includes(timesheetSearchQuery.toLowerCase()) || 
                  w.name.toLowerCase().includes(timesheetSearchQuery.toLowerCase());
                return matchesDept && matchesSite && matchesSearch;
              })
              .map(w => (
              <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                <td style={{ padding: '10px' }}>{w.department}</td>
                <td style={{ padding: '10px' }}>{[...new Set(attendance.filter(a => String(a.worker_id) === String(w.id) && String(a.date || '').slice(0,10) >= payrollStartDate && String(a.date || '').slice(0,10) <= payrollEndDate).map(a => a.work_site || a.site).filter(Boolean))].join(', ') || '—'}</td>
                <td style={{ padding: '10px', minWidth: 180 }}>
                  {(() => {
                    const extraRows = attendance.filter(a => String(a.worker_id) === String(w.id) && String(a.date || '').slice(0,10) >= payrollStartDate && String(a.date || '').slice(0,10) <= payrollEndDate && (Number(a.extra_ot_hours) || 0) > 0);
                    return extraRows.length ? extraRows.map(a => <div key={`${a.date}-${a.id || a.worker_id}`} style={{ marginBottom: 4, padding: '4px 6px', borderRadius: 5, background: '#f5f3ff', color: '#5b21b6', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.date}: {Number(a.extra_ot_hours) || 0}h · {a.extra_ot_site || a.work_site || 'Site N/A'}</div>) : <span style={{ color: '#94a3b8' }}>—</span>;
                  })()}
                </td>
                {userRole.is_admin && <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  
                  {/* View Timesheet Button */}
                  <button 
                    onClick={() => { setViewingWorkerTimesheet(w); if (!userRole.is_admin) void logActivity('Viewed worker timesheet', `Worker #${w.worker_id || w.id} — ${w.name || ''}`); }} 
                    style={{ padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    👁️ View Timesheet
                  </button>

                  {/* Print / PDF Button */}
                  <button 
                    onClick={() => handlePrintWorkerMonthlyReport(w)} 
                    style={{ padding: '6px 10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    📄 Print / PDF
                  </button>

                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Timesheet Summary Boxes - always included at the very end of the printed report. */}
      <style>{`
        .monthly-timesheet-summary { display:block !important; width:100%; margin-top:24px; padding-top:16px; border-top:2px solid #cbd5e1; break-inside:avoid !important; page-break-inside:avoid !important; }
        .monthly-timesheet-summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
        .monthly-timesheet-summary-card { min-width:0; border:1px solid #cbd5e1; border-radius:9px; padding:13px 14px; background:#f8fafc !important; break-inside:avoid !important; page-break-inside:avoid !important; }
        @media screen and (max-width:700px) { .monthly-timesheet-summary-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media print { .monthly-timesheet-summary { display:block !important; visibility:visible !important; margin-top:18px !important; } .monthly-timesheet-summary-grid { grid-template-columns:repeat(4,minmax(0,1fr)) !important; } .monthly-timesheet-summary-card { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } }
      `}</style>
      {(() => {
        const reportDepartment = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
        const reportSite = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
        const reportWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(w => {
          const matchesDept = reportDepartment === 'All' || !reportDepartment || String(w.department || '').trim().toLowerCase() === String(reportDepartment).trim().toLowerCase();
          const matchesSite = reportSite === 'All' || !reportSite || attendance.some(a => String(a.worker_id) === String(w.id) && String(a.date || '').slice(0,10) >= payrollStartDate && String(a.date || '').slice(0,10) <= payrollEndDate && String(a.work_site || a.site || '').trim().toLowerCase() === String(reportSite).trim().toLowerCase());
          const matchesSearch = !timesheetSearchQuery || String(w.id).toLowerCase().includes(timesheetSearchQuery.toLowerCase()) || String(w.name || '').toLowerCase().includes(timesheetSearchQuery.toLowerCase());
          return matchesDept && matchesSite && matchesSearch;
        });
        const workerMap = new Map(reportWorkers.map(w => [String(w.id), w]));
        const uniqueRows = new Map();
        attendance.forEach(a => {
          const workerId = String(a.worker_id);
          const date = String(a.date || '').slice(0, 10);
          const worker = workerMap.get(workerId);
          if (!worker || date < payrollStartDate || date > payrollEndDate) return;
          const joinDate = String(worker.joining_date || '').slice(0, 10);
          if (joinDate && date < joinDate) return;
          uniqueRows.set(`${workerId}-${date}`, a);
        });
        const reportRows = Array.from(uniqueRows.values());
        const presentRows = reportRows.filter(a => isPresentAttendanceStatus(a.status));
        const absentDays = reportRows.filter(a => String(a.status || '').trim().toLowerCase() === 'absent').length;
        const zeroOTDays = presentRows.filter(a => (Number(a.overtime_hours) || 0) + (Number(a.contract_overtime_hours) || 0) + (Number(a.extra_ot_hours) || 0) <= 0).length;
        const monthlyOT = reportRows.reduce((sum, a) => sum + (Number(a.overtime_hours) || 0) + (Number(a.contract_overtime_hours) || 0) + (Number(a.extra_ot_hours) || 0), 0);
        const summaryItems = [
          { label: 'TOTAL PRESENT DAYS', value: presentRows.length, accent: '#047857', note: 'Present + Holiday Present' },
          { label: 'TOTAL ABSENT DAYS', value: absentDays, accent: '#b91c1c', note: 'Recorded absent entries' },
          { label: '0 OVERTIME DAYS', value: zeroOTDays, accent: '#b45309', note: 'Present days with zero OT' },
          { label: 'MONTHLY TOTAL OT', value: `${monthlyOT.toFixed(2)} HRS`, accent: '#1d4ed8', note: 'Normal + Contract + Extra OT' }
        ];
        return <div className="monthly-timesheet-summary">
          <h3 style={{ margin: '0 0 12px', color: '#0b2853', fontSize: 16, fontWeight: 900 }}>MONTHLY ATTENDANCE & OVERTIME SUMMARY</h3>
          <div className="monthly-timesheet-summary-grid">
            {summaryItems.map(item => <div className="monthly-timesheet-summary-card" key={item.label} style={{ borderColor: `${item.accent}66`, borderLeft: `5px solid ${item.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.35px', color: '#475569', marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: item.accent, lineHeight: 1.1 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>{item.note}</div>
            </div>)}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 9 }}>Report Period: {payrollStartDate} to {payrollEndDate} · Workers included: {reportWorkers.length}</div>
        </div>;
      })()}

    <div className="no-print" style={{display:'flex',justifyContent:'flex-end',marginTop:18,paddingTop:14,borderTop:'1px solid #e2e8f0'}}>
      {userRole.is_admin && <button type="button" onClick={() => printNdaPage('hr-monthly-timesheet-print', userRole.is_admin)} style={{padding:'10px 18px',background:'#2563eb',color:'#fff',border:0,borderRadius:7,fontWeight:800,cursor:'pointer'}}>🖨️ Print Full Report / Save PDF</button>}
    </div>
  </section>
)}
      {/* 👁 SINGLE WORKER TIMESHEET PREVIEW MODAL */}
{viewingWorkerTimesheet && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 'bold' }}>📄 Monthly Timesheet Details</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Worker: <b>#{viewingWorkerTimesheet.id} - {viewingWorkerTimesheet.name}</b> | Dept: {viewingWorkerTimesheet.department} | Salary Period: {payrollPeriodStartDate} to {payrollPeriodEndDate}
          </p>
        </div>
        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close View
        </button>
      </div>

      {/* Worker Basic Info Card */}
      <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '13px' }}>
          <div><b>Designation:</b> {viewingWorkerTimesheet.designation || 'Worker'}</div>
          
          <div><b>Monthly Salary:</b> {viewingWorkerTimesheet.monthly_salary || 'N/A'} {viewingWorkerTimesheet.currency || 'AED'}</div>
        </div>
      </div>

      {/* Timesheet Table Preview using real attendance data */}
      <div style={{ marginBottom: '20px', maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Date</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Status</th>
             <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Normal OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Contract OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Extra OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Extra OT Site</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Total OT</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Site</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
        const timesheetJoinDate = String(viewingWorkerTimesheet.joining_date || '').slice(0, 10);
const timesheetAsOfDate = formatPayrollDate(new Date());
const timesheetEndDate = payrollPeriodEndDate < timesheetAsOfDate ? payrollPeriodEndDate : timesheetAsOfDate;
const workerAttendanceByDate = new Map();
attendance.forEach(a => {
  const recordDate = String(a.date || '').slice(0, 10);
  if (String(a.worker_id) === String(viewingWorkerTimesheet.id) && recordDate >= payrollPeriodStartDate && recordDate <= timesheetEndDate && (!timesheetJoinDate || recordDate >= timesheetJoinDate)) workerAttendanceByDate.set(recordDate, a);
});
const workerAttendance = Array.from(workerAttendanceByDate.values());

const attendanceByDate = new Map(workerAttendance.map(att => [String(att.date || '').slice(0, 10), att]));
const allPeriodDates = [];
if (payrollPeriodStartDate && payrollPeriodEndDate && payrollPeriodStartDate <= payrollPeriodEndDate) {
  const cursor = new Date(`${payrollPeriodStartDate}T12:00:00`);
  const end = new Date(`${timesheetEndDate}T12:00:00`);
  while (cursor <= end && allPeriodDates.length < 400) {
    allPeriodDates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
}
const monthlyRows = allPeriodDates
  .filter(date => (!timesheetJoinDate || date >= timesheetJoinDate) && (attendanceByDate.has(date) || isHolidayDate(date) || getAnnualLeaveForWorker(viewingWorkerTimesheet.id, date)))
  .map(date => {
    const att = attendanceByDate.get(date) || {
      worker_id: viewingWorkerTimesheet.id,
      date,
      status: 'Holiday',
      overtime_hours: 0,
      contract_overtime_hours: 0,
      extra_ot_hours: 0,
      work_site: viewingWorkerTimesheet.work_site || ''
    };
    const annualLeave = getAnnualLeaveForWorker(viewingWorkerTimesheet.id, date);
    const holiday = isHolidayDate(date);
    const status = annualLeave ? 'Annual Leave' : (holiday ? (isPresentAttendanceStatus(att.status) ? 'Holiday Present' : 'Holiday') : (att.status || '—'));
    const canCountOT = isPresentAttendanceStatus(status);
    return {
      ...att,
      date,
      status,
      overtime_hours: canCountOT ? (Number(att.overtime_hours) || 0) : 0,
      contract_overtime_hours: canCountOT ? (Number(att.contract_overtime_hours) || 0) : 0,
      extra_ot_hours: canCountOT ? (Number(att.extra_ot_hours) || 0) : 0,
      total_overtime_hours: canCountOT ? ((Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0) + (Number(att.extra_ot_hours) || 0)) : 0
    };
  });

return monthlyRows.map((att, idx) => {
  const rowStatus = String(att.status || '').trim().toLowerCase();

  let rowBg = '#ffffff';
  let statusBg = '#dcfce7';
  let statusColor = '#166534';

  if (rowStatus === 'holiday' || rowStatus === 'holiday present') {
    rowBg = '#fef08a';
    statusBg = '#facc15';
    statusColor = '#713f12';
  } else if (rowStatus === 'annual leave') {
    rowBg = '#fef3c7';
    statusBg = '#fef3c7';
    statusColor = '#92400e';
  } else if (rowStatus === 'absent') {
    rowBg = '#fee2e2';
    statusBg = '#fee2e2';
    statusColor = '#991b1b';
  } else if (rowStatus === 'sick leave' || rowStatus === 'leave' || rowStatus === 'other leave') {
    rowBg = '#ffedd5';
    statusBg = '#ffedd5';
    statusColor = '#9a3412';
  } else if (rowStatus === 'present') {
    rowBg = '#dcfce7';
    statusBg = '#dcfce7';
    statusColor = '#166534';
  }

  return (
    <tr
      key={idx}
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: rowBg
      }}
    >
      <td style={{ padding: '8px 10px', fontWeight: '500' }}>
        {att.date}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: statusBg,
            color: statusColor,
            fontWeight: 'bold'
          }}
        >
          {att.status || '—'}
        </span>
      </td>
     <td style={{ padding: '8px 10px', color: '#475569' }}>
  {Number(att.overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#7c3aed' }}>
  {Number(att.contract_overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#b45309', fontWeight: 700 }}>
  {Number(att.extra_ot_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#5b21b6', fontWeight: 700 }}>
  {Number(att.extra_ot_hours) > 0 ? (att.extra_ot_site || att.work_site || viewingWorkerTimesheet.work_site || 'N/A') : '—'}
</td>
<td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
  {(Number(att.overtime_hours) || 0) +
   (Number(att.contract_overtime_hours) || 0) +
   (Number(att.extra_ot_hours) || 0)} Hours
</td>
      <td style={{ padding: '8px 10px', color: '#64748b' }}>
        {att.work_site || viewingWorkerTimesheet.work_site || 'N/A'}
      </td>
    </tr>
  );
});
            })()}
          </tbody>
        </table>
      </div>

      {/* Action Buttons inside View Modal */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>

        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}
      </main>
      <style>{`@media print {
        @page { margin: 8mm; }
        html, body { height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
        body.nda-printing > *:not(.nda-print-target) { display: none !important; }
        body.nda-printing > .nda-print-target { display: block !important; position: relative !important; inset: auto !important; width: 100% !important; max-width: none !important; min-height: 0 !important; height: auto !important; margin: 0 !important; overflow: visible !important; box-shadow: none !important; }
        body.nda-printing > .nda-print-target * { max-height: none; }
        body.nda-printing > .nda-print-target table { page-break-inside: auto !important; break-inside: auto !important; }
        body.nda-printing > .nda-print-target tr { page-break-inside: avoid !important; break-inside: avoid !important; }
        body.nda-printing > .nda-print-target .no-print, body.nda-printing > .nda-print-target button { display: none !important; }
      }`}</style>
     
{/* Footer */}
<div
  className="nda-hr-footer"
  style={{
    width: '100%',
    marginLeft: 278,
    width: 'calc(100% - 278px)',
    boxSizing: 'border-box',
    textAlign: 'center',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 'bold',
    borderTop: '1px solid #cbd5e1'
  }}
>
</div>
    </div>
    </>
  );
}
