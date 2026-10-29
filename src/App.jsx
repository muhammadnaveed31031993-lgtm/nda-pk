import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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

function shiftPayrollDateOneMonth(dateText) {
  const [year, month, day] = String(dateText || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const targetMonthIndex = month; // zero-based index for the following month
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const targetDay = Math.min(day, new Date(targetYear, targetMonth + 1, 0).getDate());
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function BusinessWorkspace({ session, userRole, onLogout, onSwitchSystem }) {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [people, setPeople] = useState([]);
  const [entries, setEntries] = useState([]);
  const [accessRows, setAccessRows] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('daily');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0,10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessKind, setNewBusinessKind] = useState('other');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('Worker');
  const [personPhone, setPersonPhone] = useState('');
  const [payType, setPayType] = useState('fixed');
  const [payAmount, setPayAmount] = useState('');
  const [profitPercent, setProfitPercent] = useState('30');
  const [entryKind, setEntryKind] = useState('income');
  const [category, setCategory] = useState('Daily Income');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessBusinessId, setAccessBusinessId] = useState('');
  const [accessFlags, setAccessFlags] = useState({can_view:true,can_view_daily:true,can_view_vehicles:true,can_view_workers:true,can_view_monthly:true,can_add:false,can_edit:false,can_delete:false,can_manage_vehicles:false,can_manage_workers:false,can_manage_access:false});
  const [currency, setCurrency] = useState('AED');
  const admin = !!userRole?.is_admin;
  const can = (key) => admin || !!access?.[key];
  const currentBusiness = businesses.find(b => String(b.id) === String(businessId));
  const money = n => `${currency} ${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const inputStyle = {width:'100%',boxSizing:'border-box',padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#0f172a'};
  const btn = {padding:'10px 14px',border:0,borderRadius:8,background:'#047857',color:'#fff',fontWeight:700,cursor:'pointer'};
  const card = {background:'#fff',borderRadius:14,padding:16,boxShadow:'0 5px 22px #0f172a0b',minWidth:0};

  async function loadBusinesses(preferredId) {
    setLoading(true);
    try {
      if (admin) {
        const {data,error} = await supabase.from('business_profiles').select('*').eq('active',true).order('name');
        if (error) throw error;
        const rows=data||[]; setBusinesses(rows);
        const next=String(preferredId || businessId || rows[0]?.id || ''); setBusinessId(next);
        if (next) setAccess({can_view:true,can_add:true,can_edit:true,can_delete:true,can_manage_vehicles:true,can_manage_workers:true,can_manage_access:true});
        const {data:ar,error:ae}=await supabase.from('business_access').select('*,business_profiles(name)').order('user_email');
        if (!ae) setAccessRows(ar||[]);
      } else {
        const {data:ar,error:ae}=await supabase.from('business_access').select('*,business_profiles(*)').ilike('user_email',session?.user?.email||'').eq('active',true).eq('can_view',true);
        if (ae) throw ae;
        const rows=ar||[]; setAccessRows(rows); setBusinesses(rows.map(r=>r.business_profiles).filter(Boolean));
        const next=String(preferredId || businessId || rows[0]?.business_id || ''); setBusinessId(next);
        const row=rows.find(r=>String(r.business_id)===next) || rows[0] || null; setAccess(row);
      }
    } catch(e) { alert('Business list load nahi hui: '+(e?.message||e)+'. SQL setup check karein.'); }
    finally { setLoading(false); }
  }
  async function loadBusinessData(id=businessId) {
    if (!id) return;
    setLoading(true);
    try {
      const [v,p,e] = await Promise.all([
        supabase.from('business_vehicles').select('*').eq('business_id',id).eq('active',true).order('plate_number'),
        supabase.from('business_people').select('*').eq('business_id',id).eq('active',true).order('person_name'),
        supabase.from('business_entries').select('*').eq('business_id',id).order('entry_date',{ascending:false}).order('created_at',{ascending:false})
      ]);
      if(v.error) throw v.error; if(p.error) throw p.error; if(e.error) throw e.error;
      setVehicles(v.data||[]); setPeople(p.data||[]); setEntries(e.data||[]);
    } catch(e) { alert('Business details load nahi huay: '+(e?.message||e)); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ loadBusinesses(); },[session?.user?.email,admin]);
  useEffect(()=>{ if(businessId) loadBusinessData(businessId); },[businessId]);

  async function addBusiness(e) {
    e.preventDefault(); if(!admin) return;
    const name=newBusinessName.trim(); if(!name) return;
    const {data,error}=await supabase.from('business_profiles').insert([{name,business_kind:newBusinessKind,active:true,created_by:session?.user?.email||''}]).select('*').single();
    if(error) return alert('Business create nahi hua: '+error.message);
    setNewBusinessName(''); await loadBusinesses(data.id); setBusinessId(String(data.id)); alert('Naya business add ho gaya.');
  }
  async function addVehicle(e) {
    e.preventDefault(); if(!can('can_manage_vehicles')) return alert('Vehicle add karne ki permission nahi.');
    if(!vehiclePlate.trim()) return alert('Vehicle plate number enter karein.');
    const {error}=await supabase.from('business_vehicles').insert([{business_id:Number(businessId),plate_number:vehiclePlate.trim().toUpperCase(),vehicle_name:vehicleName.trim(),notes:vehicleNotes.trim(),active:true}]);
    if(error) return alert('Vehicle save nahi hui: '+error.message);
    setVehiclePlate('');setVehicleName('');setVehicleNotes('');await loadBusinessData();alert('Vehicle file create ho gayi.');
  }
  async function addPerson(e) {
    e.preventDefault(); if(!can('can_manage_workers')) return alert('Worker add karne ki permission nahi.');
    if(!personName.trim()) return alert('Worker ka naam enter karein.');
    const payload={business_id:Number(businessId),person_name:personName.trim(),job_title:personRole.trim()||'Worker',phone:personPhone.trim(),pay_type:payType,monthly_salary:payType==='fixed'?(Number(payAmount)||0):0,profit_percent:payType==='profit_percent'?(Number(profitPercent)||0):0,active:true};
    if(payload.profit_percent<0||payload.profit_percent>100) return alert('Profit percentage 0 se 100 ke darmiyan honi chahiye.');
    const {error}=await supabase.from('business_people').insert([payload]); if(error) return alert('Worker save nahi hua: '+error.message);
    setPersonName('');setPersonPhone('');setPayAmount('');await loadBusinessData();alert('Worker add ho gaya.');
  }
  async function addEntry(e) {
    e.preventDefault(); if(!can('can_add')) return alert('Entry add karne ki permission nahi.');
    const val=Number(amount); if(!entryDate||!Number.isFinite(val)||val<=0) return alert('Date aur amount sahi enter karein.');
    let billUrl='';
    if(billFile){
      const safeName=`${businessId}/${entryDate}/${Date.now()}-${billFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const {error:upErr}=await supabase.storage.from('business-bills').upload(safeName,billFile,{upsert:false});
      if(upErr) return alert('Bill upload nahi hua: '+upErr.message+' (Storage bucket/policy check karein)');
      const {data}=supabase.storage.from('business-bills').getPublicUrl(safeName); billUrl=data?.publicUrl||'';
    }
    const payload={business_id:Number(businessId),entry_date:entryDate,entry_kind:entryKind,category:category.trim()||'General',amount:val,payment_mode:paymentMode,vehicle_id:vehicleId?Number(vehicleId):null,driver_id:driverId?Number(driverId):null,description:description.trim(),remarks:remarks.trim(),bill_url:billUrl,created_by:session?.user?.email||''};
    const {error}=await supabase.from('business_entries').insert([payload]); if(error) return alert('Roznamcha save nahi hua: '+error.message);
    setAmount('');setDescription('');setRemarks('');setBillFile(null);await loadBusinessData();alert('Daily detail save ho gayi.');
  }
  async function deleteEntry(row) { if(!can('can_delete')) return alert('Delete permission nahi.'); if(!window.confirm('Yeh entry delete karni hai?'))return; const {error}=await supabase.from('business_entries').delete().eq('id',row.id).eq('business_id',Number(businessId)); if(error)return alert(error.message);await loadBusinessData(); }
  async function editEntry(row) {
    if(!can('can_edit')) return alert('Edit permission nahi.');
    const newDate=window.prompt('Date (YYYY-MM-DD)',row.entry_date||entryDate); if(newDate===null)return;
    const newCategory=window.prompt('Category',row.category||'General'); if(newCategory===null)return;
    const newAmount=window.prompt('Amount',String(row.amount||'')); if(newAmount===null)return;
    const value=Number(newAmount); if(!newDate||!Number.isFinite(value)||value<=0)return alert('Date/amount sahi enter karein.');
    const newDescription=window.prompt('Details',row.description||''); if(newDescription===null)return;
    const newRemarks=window.prompt('Remarks',row.remarks||''); if(newRemarks===null)return;
    const {error}=await supabase.from('business_entries').update({entry_date:newDate,category:newCategory,amount:value,description:newDescription,remarks:newRemarks}).eq('id',row.id).eq('business_id',Number(businessId));
    if(error)return alert('Entry update nahi hui: '+error.message); await loadBusinessData();
  }
  async function saveAccess(e) {
    e.preventDefault();
    if(!admin&&!can('can_manage_access')) return alert('Access manage karne ki permission nahi.');
    const email=accessEmail.trim().toLowerCase();
    const newPassword=accessPassword;
    if(!email||!accessBusinessId) return alert('Email aur business select karein.');
    if(newPassword.trim().length < 6) return alert('Staff ka password kam az kam 6 characters ka hona chahiye.');

    // Create the email/password login through Supabase Auth; never save passwords in a table.
    const {data:oldAuthData}=await supabase.auth.getSession();
    const oldAuthSession=oldAuthData?.session||null;
    let accountCreated=false;
    const {data:signupData,error:signupError}=await supabase.auth.signUp({email,password:newPassword});
    if(signupError) {
      const msg=String(signupError.message||'');
      if(/already registered|already exists|user already/i.test(msg)) {
        const proceed=window.confirm('Is email ka Supabase login pehle se mojood hai. Is password se purana password change nahi hoga. Kya sirf permissions save karni hain?');
        if(!proceed) return;
      } else {
        return alert('Staff login create nahi hua: '+msg+'\nSupabase Authentication mein email sign-ups enabled honay chahiye.');
      }
    } else {
      accountCreated=true;
    }
    // Restore the current admin Auth session if one existed; otherwise remove the temporary signup session.
    if(oldAuthSession?.access_token && oldAuthSession?.refresh_token) {
      await supabase.auth.setSession({access_token:oldAuthSession.access_token,refresh_token:oldAuthSession.refresh_token});
    } else if(signupData?.session) {
      await supabase.auth.signOut();
    }

    const payload={user_email:email,business_id:Number(accessBusinessId),...accessFlags,active:true,updated_by:session?.user?.email||''};
    const {error}=await supabase.from('business_access').upsert([payload],{onConflict:'user_email,business_id'});
    if(error) return alert('Login '+(accountCreated?'create ho gaya, lekin ':'')+'permission save nahi hui: '+error.message+'\nAgar RLS enabled hai to admin/Auth policy configure karni hogi.');
    setAccessEmail('');setAccessPassword('');
    await loadBusinesses(businessId);
    alert((accountCreated?'Staff email/password account create ho gaya. ':'')+'Business permissions save ho gayi.'+(signupData?.user&&!signupData?.session?' Supabase email confirmation enabled hai; staff ko email confirm karni hogi.':''));
  }
  const selectedEntries=entries.filter(r=>r.entry_date===entryDate);
  const monthEntries=entries.filter(r=>String(r.entry_date||'').slice(0,7)===month);
  const sum=(rows,kind,mode=null)=>rows.filter(r=>(!kind||r.entry_kind===kind)&&(!mode||r.payment_mode===mode)).reduce((n,r)=>n+Number(r.amount||0),0);
  const income=sum(selectedEntries,'income'),expense=sum(selectedEntries,'expense'),net=income-expense;
  const mIncome=sum(monthEntries,'income'),mExpense=sum(monthEntries,'expense');
  const labelForVehicle=id=>vehicles.find(v=>String(v.id)===String(id))?.plate_number||'—';
  const labelForPerson=id=>people.find(p=>String(p.id)===String(id))?.person_name||'—';
  const profitShare=people.map(p=>({...p,share:p.pay_type==='profit_percent'?Math.max(0,mIncome-mExpense)*Number(p.profit_percent||0)/100:0}));
  const panelTitle=currentBusiness?.name||'Business';
  return <div style={{minHeight:'100vh',background:'#f1f5f9',fontFamily:"'Segoe UI',sans-serif",color:'#0f172a'}}>
    <header style={{padding:'18px clamp(14px,3vw,30px)',background:'linear-gradient(115deg,#064e3b,#047857)',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:'#a7f3d0'}}>NDA-PK BUSINESS</div><h1 style={{margin:'5px 0',fontSize:26}}>{panelTitle}</h1><div style={{fontSize:13,color:'#d1fae5'}}>Signed in: {session?.user?.email}</div></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={onSwitchSystem} style={{...btn,background:'#fff',color:'#065f46'}}>← System Selection</button><button onClick={onLogout} style={{...btn,background:'#b91c1c'}}>Logout</button></div>
    </header>
    <main style={{padding:'18px clamp(12px,2vw,26px)',maxWidth:1500,margin:'0 auto'}}>
      {admin&&<section style={{...card,marginBottom:16}}><h3 style={{marginTop:0}}>＋ Add New Business</h3><form onSubmit={addBusiness} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}><input style={inputStyle} value={newBusinessName} onChange={e=>setNewBusinessName(e.target.value)} placeholder="Business name (e.g. Shop, Trading)" required/><select style={inputStyle} value={newBusinessKind} onChange={e=>setNewBusinessKind(e.target.value)}><option value="transport">Transport</option><option value="other">Other Business</option></select><button style={btn}>Create Business</button></form></section>}
      <section style={{...card,marginBottom:16,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}><label style={{fontSize:13,fontWeight:700}}>Open Business<select style={{...inputStyle,marginTop:6}} value={businessId} onChange={e=>setBusinessId(e.target.value)}><option value="">Select business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label style={{fontSize:13,fontWeight:700}}>Date<input type="date" style={{...inputStyle,marginTop:6}} value={entryDate} onChange={e=>setEntryDate(e.target.value)}/></label><label style={{fontSize:13,fontWeight:700}}>Month Sheet<input type="month" style={{...inputStyle,marginTop:6}} value={month} onChange={e=>setMonth(e.target.value)}/></label><label style={{fontSize:13,fontWeight:700}}>Currency<select style={{...inputStyle,marginTop:6}} value={currency} onChange={e=>setCurrency(e.target.value)}><option>AED</option><option>PKR</option><option>INR</option><option>USD</option></select></label></section>
      {!businessId?<section style={card}><h3>No business selected</h3><p>Admin pehle “Add New Business” se business banaye. Staff ko admin se access milne ke baad business nazar aayega.</p></section>:<>
      <nav style={{display:'flex',gap:8,overflowX:'auto',padding:'2px 0 14px'}}>{[['daily','📒 Daily Roznamcha', 'can_view_daily', ['can_add','can_edit','can_delete']],['vehicles','🚚 Vehicle Files','can_view_vehicles',['can_manage_vehicles']],['workers','👥 Workers & Salary','can_view_workers',['can_manage_workers']],['monthly','📅 Monthly Sheet','can_view_monthly',[]],['access','🔐 Staff Access','can_manage_access',[]]].filter(([id,,viewKey,actionKeys])=>admin||(id==='access'?can('can_manage_access'):(!!access?.[viewKey]||actionKeys.some(k=>can(k))))).map(([id,label])=><button key={id} onClick={()=>setView(id)} style={{whiteSpace:'nowrap',padding:'10px 14px',border:0,borderRadius:9,background:view===id?'#047857':'#fff',color:view===id?'#fff':'#334155',fontWeight:800,cursor:'pointer'}}>{label}</button>)}</nav>
      {view==='daily'&&(admin||access?.can_view_daily||can('can_add')||can('can_edit')||can('can_delete'))&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>{[['Income',income,'#dcfce7','#166534'],['Expenses',expense,'#fee2e2','#991b1b'],['Net Profit',net,'#dbeafe','#1d4ed8'],['Cash Income',sum(selectedEntries,'income','Cash'),'#fef3c7','#92400e'],['Credit / Udhaar',sum(selectedEntries,'income','Credit'),'#ede9fe','#5b21b6']].map(([l,n,bg,c])=><div key={l} style={{background:bg,borderRadius:12,padding:16,color:c}}><div style={{fontSize:13,fontWeight:700}}>{l}</div><div style={{fontSize:23,fontWeight:900,marginTop:6}}>{money(n)}</div></div>)}</div>
        {can('can_add')&&<form onSubmit={addEntry} style={{...card,marginBottom:16}}><h3 style={{marginTop:0}}>Daily Detail Entry — {entryDate}</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:10}}><select style={inputStyle} value={entryKind} onChange={e=>{setEntryKind(e.target.value);setCategory(e.target.value==='income'?'Daily Income':'Petrol / Fuel');}}><option value="income">Income</option><option value="expense">Expense</option></select><input style={inputStyle} value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category (petrol, toll, maintenance...)" required/><input style={inputStyle} type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Amount (${currency})`} required/><select style={inputStyle} value={paymentMode} onChange={e=>setPaymentMode(e.target.value)}><option>Cash</option><option>Credit</option><option>Bank</option></select><select style={inputStyle} value={vehicleId} onChange={e=>setVehicleId(e.target.value)}><option value="">Vehicle (optional)</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number} {v.vehicle_name}</option>)}</select><select style={inputStyle} value={driverId} onChange={e=>setDriverId(e.target.value)}><option value="">Driver / worker (optional)</option>{people.map(p=><option key={p.id} value={p.id}>{p.person_name}</option>)}</select><input style={inputStyle} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Details"/><input style={inputStyle} value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Remarks"/><label style={{fontSize:13}}>Bill / file upload<input style={{...inputStyle,marginTop:4}} type="file" accept="image/*,.pdf" onChange={e=>setBillFile(e.target.files?.[0]||null)}/></label><button style={btn}>Save Daily Detail</button></div></form>}
        <section style={{...card,overflowX:'auto'}}><h3 style={{marginTop:0}}>Daily Roznamcha — {entryDate}</h3><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Date','Type','Category','Vehicle No.','Driver / Worker','Details','Payment','Amount','Bill',''].map(h=><th key={h} style={{padding:9,borderBottom:'1px solid #e2e8f0',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{selectedEntries.map(r=><tr key={r.id}>{[r.entry_date,r.entry_kind,r.category,labelForVehicle(r.vehicle_id),labelForPerson(r.driver_id),r.description||r.remarks||'—',r.payment_mode,money(r.amount)].map((v,i)=><td key={i} style={{padding:9,borderBottom:'1px solid #f1f5f9'}}>{v}</td>)}<td style={{padding:9}}>{r.bill_url?<a href={r.bill_url} target="_blank" rel="noreferrer">Open bill</a>:'—'}</td><td style={{padding:9}}>{can('can_edit')&&<button onClick={()=>editEntry(r)} style={{...btn,background:'#1d4ed8',padding:'6px 8px',marginRight:5}}>Edit</button>}{can('can_delete')&&<button onClick={()=>deleteEntry(r)} style={{...btn,background:'#b91c1c',padding:'6px 8px'}}>Delete</button>}</td></tr>)}{!selectedEntries.length&&<tr><td colSpan="10" style={{padding:14,color:'#64748b'}}>Is date ka koi record nahi. Upar daily detail add karein.</td></tr>}</tbody></table></section>
      </>}
      {view==='vehicles'&&(admin||access?.can_view_vehicles||can('can_manage_vehicles'))&&<><section style={{...card,marginBottom:16}}><h3 style={{marginTop:0}}>Vehicle Files</h3>{can('can_manage_vehicles')&&<form onSubmit={addVehicle} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}><input style={inputStyle} value={vehiclePlate} onChange={e=>setVehiclePlate(e.target.value)} placeholder="Plate number" required/><input style={inputStyle} value={vehicleName} onChange={e=>setVehicleName(e.target.value)} placeholder="Vehicle name / model"/><input style={inputStyle} value={vehicleNotes} onChange={e=>setVehicleNotes(e.target.value)} placeholder="Notes / file details"/><button style={btn}>Create Vehicle File</button></form>}</section><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>{vehicles.map(v=><section key={v.id} style={card}><h3 style={{marginTop:0}}>🚚 {v.plate_number}</h3><div>{v.vehicle_name||'Vehicle'}</div><p style={{color:'#64748b',fontSize:13}}>{v.notes||'No extra details'}</p><div style={{fontSize:13}}>This file keeps date-wise entries and bills linked to this vehicle.</div><button style={{...btn,marginTop:10}} onClick={()=>{setVehicleId(String(v.id));setView('daily');}}>Open Daily Records</button></section>)}{!vehicles.length&&<section style={card}>No vehicle files yet. Add your first vehicle above.</section>}</div></>}
      {view==='workers'&&(admin||access?.can_view_workers||can('can_manage_workers'))&&<><section style={{...card,marginBottom:16}}><h3 style={{marginTop:0}}>Workers, Drivers & Salary / Profit Share</h3>{can('can_manage_workers')&&<form onSubmit={addPerson} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}><input style={inputStyle} value={personName} onChange={e=>setPersonName(e.target.value)} placeholder="Full name" required/><input style={inputStyle} value={personRole} onChange={e=>setPersonRole(e.target.value)} placeholder="Driver / Worker / Mechanic"/><input style={inputStyle} value={personPhone} onChange={e=>setPersonPhone(e.target.value)} placeholder="Phone number"/><select style={inputStyle} value={payType} onChange={e=>setPayType(e.target.value)}><option value="fixed">Fixed monthly salary</option><option value="profit_percent">Profit percentage</option></select>{payType==='fixed'?<input style={inputStyle} type="number" min="0" step="0.01" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Monthly salary"/>:<input style={inputStyle} type="number" min="0" max="100" step="0.01" value={profitPercent} onChange={e=>setProfitPercent(e.target.value)} placeholder="Profit %"/>}<button style={btn}>Add Worker</button></form>}</section><section style={{...card,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Name','Role','Phone','Payment Type','Monthly Salary','Profit %','This Month Share'].map(h=><th key={h} style={{padding:9,textAlign:'left',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}</tr></thead><tbody>{profitShare.map(p=><tr key={p.id}>{[p.person_name,p.job_title,p.phone||'—',p.pay_type==='fixed'?'Fixed salary':'Profit share',money(p.monthly_salary),`${p.profit_percent||0}%`,money(p.share)].map((v,i)=><td key={i} style={{padding:9,borderBottom:'1px solid #f1f5f9'}}>{v}</td>)}</tr>)}{!people.length&&<tr><td colSpan="7" style={{padding:14}}>No workers added yet.</td></tr>}</tbody></table><p style={{fontSize:12,color:'#64748b'}}>Profit share is calculated from positive net profit for the selected month (income minus recorded expenses). Fixed salaries are shown as a set amount; salary payments and monthly accruals are not automatically posted by this screen.</p></section></>}
      {view==='monthly'&&(admin||access?.can_view_monthly)&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginBottom:16}}>{[['Monthly Income',mIncome],['Monthly Expense',mExpense],['Net Monthly Profit',mIncome-mExpense],['Profit Share Total',profitShare.reduce((n,p)=>n+p.share,0)]].map(([l,n])=><section key={l} style={card}><div style={{fontSize:13,color:'#64748b'}}>{l}</div><div style={{fontSize:23,fontWeight:900,marginTop:6}}>{money(n)}</div></section>)}</div><section style={{...card,overflowX:'auto'}}><h3 style={{marginTop:0}}>Monthly Transactions — {month}</h3><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Date','Vehicle','Driver / Worker','Type','Category','Details','Payment','Amount','Bill'].map(h=><th key={h} style={{padding:9,textAlign:'left',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{monthEntries.map(r=><tr key={r.id}>{[r.entry_date,labelForVehicle(r.vehicle_id),labelForPerson(r.driver_id),r.entry_kind,r.category,r.description||r.remarks||'—',r.payment_mode,money(r.amount)].map((v,i)=><td key={i} style={{padding:9,borderBottom:'1px solid #f1f5f9'}}>{v}</td>)}<td style={{padding:9}}>{r.bill_url?<a href={r.bill_url} target="_blank" rel="noreferrer">Open</a>:'—'}</td></tr>)}{!monthEntries.length&&<tr><td colSpan="9" style={{padding:14}}>No entries for this month.</td></tr>}</tbody></table></section></>}
      {view==='access'&&(admin||can('can_manage_access'))&&<section style={card}><h3 style={{marginTop:0}}>Business Staff Access</h3><p style={{fontSize:13,color:'#64748b'}}>Email/password login accounts must be created in Supabase Authentication or through a secured server-side function. This screen grants business-specific access only.</p><form onSubmit={saveAccess} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,alignItems:'center'}}><input style={inputStyle} type="email" value={accessEmail} onChange={e=>setAccessEmail(e.target.value)} placeholder="Staff email / login ID" autoComplete="username" required/><input style={inputStyle} type="password" value={accessPassword} onChange={e=>setAccessPassword(e.target.value)} placeholder="Create password (minimum 6 characters)" autoComplete="new-password" minLength={6} required/><select style={inputStyle} value={accessBusinessId} onChange={e=>setAccessBusinessId(e.target.value)} required><option value="">Choose business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>{Object.entries({can_view:'Can access this business',can_view_daily:'Can view Daily Roznamcha',can_add:'Can add daily entries',can_edit:'Can edit entries',can_delete:'Can delete entries',can_view_vehicles:'Can view Vehicle Files',can_manage_vehicles:'Can manage vehicle files',can_view_workers:'Can view Workers & Salary',can_manage_workers:'Can manage workers / salaries',can_view_monthly:'Can view Monthly Sheet',can_manage_access:'Can manage staff permissions'}).map(([key,label])=><label key={key} style={{display:'flex',gap:8,alignItems:'center',fontSize:13}}><input type="checkbox" checked={!!accessFlags[key]} onChange={e=>setAccessFlags(old=>({...old,[key]:e.target.checked}))}/>{label}</label>)}<button style={btn}>Create Login & Save Permissions</button></form><div style={{overflowX:'auto',marginTop:18}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Email','Business','Permissions','Status'].map(h=><th key={h} style={{padding:9,textAlign:'left',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}</tr></thead><tbody>{accessRows.map(r=><tr key={r.id}><td style={{padding:9}}>{r.user_email}</td><td style={{padding:9}}>{r.business_profiles?.name||businesses.find(b=>String(b.id)===String(r.business_id))?.name||`Business #${r.business_id}`}</td><td style={{padding:9}}>{['can_view','can_view_daily','can_add','can_edit','can_delete','can_view_vehicles','can_manage_vehicles','can_view_workers','can_manage_workers','can_view_monthly','can_manage_access'].filter(k=>r[k]).join(', ')||'None'}</td><td style={{padding:9}}>{r.active?'Active':'Disabled'}</td></tr>)}{!accessRows.length&&<tr><td colSpan="4" style={{padding:12}}>No staff permissions yet.</td></tr>}</tbody></table></div></section>}
      </>}
      {loading&&<div style={{position:'fixed',bottom:14,right:14,background:'#0f172a',color:'#fff',padding:'8px 12px',borderRadius:8}}>Loading…</div>}
    </main>
  </div>;
}

export default function App() {
  // Keep the login for this browser tab: refresh will restore it, while closing the tab
  // normally clears sessionStorage. Do not use localStorage for persistent login.
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('nda_user_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed?.user?.email && parsed?.role) return parsed;
      sessionStorage.removeItem('nda_user_session');
      return null;
    } catch {
      return null;
    }
  });
  // Select which system to open before entering either workspace.
  const [selectedSystem, setSelectedSystem] = useState(null); // 'hr' | 'business'
  const [businessType, setBusinessType] = useState('transport');
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
 // Monthly Timesheet Modal & Date Selection States
  const [showMonthlyTimesheetModal, setShowMonthlyTimesheetModal] = useState(false);
  const [payrollStartDate, setPayrollStartDate] = useState(() => getInitialPayrollRange().startDate);
  const [payrollEndDate, setPayrollEndDate] = useState(() => getInitialPayrollRange().endDate);
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
  const [loading, setLoading] = useState(false);
  const [modalDepartment, setModalDepartment] = useState(null);
  const [modalLocationTab, setModalLocationTab] = useState('All');
  const [attendanceListModal, setAttendanceListModal] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);
  const isHolidayDate = dateStr => Boolean(dateStr && (new Date(`${dateStr}T12:00:00`).getDay() === 0 || holidayDates.some(h => h.holiday_date === dateStr)));

  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [sitesList, setSitesList] = useState(['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown']);
  const [departmentsList, setDepartmentsList] = useState(['Plumbing', 'Electrical', 'Civil', 'Mustafa', 'Drivers']);

  // Edit / Add Worker Form States
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [workSite, setWorkSite] = useState('Sharjah Mamzar');
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
  const [bulkWorkDetails, setBulkWorkDetails] = useState('');
  
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
  const [siteHolidayNormalOT, setSiteHolidayNormalOT] = useState('2');
  const [siteHolidayContractOT, setSiteHolidayContractOT] = useState('0');
  
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
 const [dailyTimesheetSite, setDailyTimesheetSite] = useState('All Workers');
 const [dailyTimesheetDepartment, setDailyTimesheetDepartment] = useState('All');
 const [payrollDepartment, setPayrollDepartment] = useState('All');
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

  async function handleSaveBulkWorkDetails(e, silent = false) {
    e?.preventDefault?.();
    if (!userRole.is_admin && !userRole.can_use_bulk && !userRole.can_edit_timesheet) {
      return alert('Aapko Daily Work Details save karne ki permission nahi hai.');
    }
    const workDate = selectedTimesheetDate;
    const workSite = !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All' ? userRole.assigned_site : bulkSite;
    const workDepartment = !userRole.is_admin && userRole.assigned_department && userRole.assigned_department !== 'All' ? userRole.assigned_department : bulkDepartment;
    const workDetails = bulkWorkDetails.trim();
    if (!workDate || !workSite || !workDepartment || workDepartment === 'All') return alert('Date, working site aur ek specific department select karein.');
    if (!workDetails) { if (!silent) alert('Daily work details likhein.'); return false; }
    setDailyWorkDetailsSaving(true);
    try {
      const { data: existingRows, error: findError } = await supabase
        .from('daily_work_details')
        .select('work_date,work_site,work_department')
        .eq('work_date', workDate)
        .eq('work_site', workSite)
        .eq('work_department', workDepartment);
      if (findError) throw findError;
      if ((existingRows || []).length) {
        const { error: updateError } = await supabase
          .from('daily_work_details')
          .update({ work_details: workDetails })
          .eq('work_date', workDate)
          .eq('work_site', workSite)
          .eq('work_department', workDepartment);
        if (updateError) throw updateError;
      } else {
        // Avoid ON CONFLICT here: installations may have legacy constraint names.
        // If two saves race, recover a unique violation by updating the matching row.
        const { error: insertError } = await supabase
          .from('daily_work_details')
          .insert([{ work_date: workDate, work_site: workSite, work_department: workDepartment, work_details: workDetails }]);
        if (insertError) {
          if (insertError.code === '23505') {
            const { error: retryUpdateError } = await supabase
              .from('daily_work_details')
              .update({ work_details: workDetails })
              .eq('work_date', workDate)
              .eq('work_site', workSite)
              .eq('work_department', workDepartment);
            if (retryUpdateError) throw retryUpdateError;
          } else {
            throw insertError;
          }
        }
      }
      const currentSiteMatches = dailyTimesheetSite === 'All Workers' || dailyTimesheetSite === 'All' || String(dailyTimesheetSite).trim().toLowerCase() === String(workSite).trim().toLowerCase();
      const currentDepartmentMatches = dailyTimesheetDepartment === 'All' || String(dailyTimesheetDepartment).trim().toLowerCase() === String(workDepartment).trim().toLowerCase();
      if (currentSiteMatches && currentDepartmentMatches) {
        if (dailyTimesheetDepartment === 'All') {
          const line = `${workSite} / ${workDepartment}: ${workDetails}`;
          setSavedDailyWorkDetails(previous => [...previous.split('\n').filter(item => item && !item.toLowerCase().startsWith(`${workSite} / ${workDepartment}:`.toLowerCase())), line].join('\n'));
        } else {
          setSavedDailyWorkDetails(workDetails);
        }
      }
      setBulkWorkDetails('');
      if (!silent) alert(`Daily Work Details ${workDate} / ${workSite} / ${workDepartment} ke liye save ho gayi hain.`);
      return true;
    } catch (err) {
      alert('Daily Work Details save nahi hui: ' + (err?.message || String(err)) + '. Agar work_department column missing ho to corrected SQL setup run karein.');
      return false;
    } finally {
      setDailyWorkDetailsSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDailyWorkDetails() {
      if (!selectedTimesheetDate) {
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
      const norm = value => String(value || '').trim().toLowerCase();
      const effectiveDepartment = !userRole.is_admin && userRole.assigned_department && userRole.assigned_department !== 'All'
        ? userRole.assigned_department : dailyTimesheetDepartment;
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
  }, [selectedTimesheetDate, dailyTimesheetSite, dailyTimesheetDepartment, userRole.is_admin, userRole.assigned_department, userRole.assigned_site]);

  useEffect(() => {
    let cancelled = false;
    async function loadBulkWorkDetails() {
      if (!selectedTimesheetDate || !bulkSite || !bulkDepartment || bulkDepartment === 'All') { setBulkWorkDetails(''); return; }
      const { data, error } = await supabase
        .from('daily_work_details')
        .select('work_department,work_details')
        .eq('work_date', selectedTimesheetDate)
        .eq('work_site', bulkSite)
        .in('work_department', [bulkDepartment, 'All'])
        .order('work_department', { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn('Bulk daily work details load error:', error.message);
        return;
      }
      const exact = (data || []).find(row => String(row.work_department || '').trim().toLowerCase() === String(bulkDepartment).trim().toLowerCase());
      const legacy = (data || []).find(row => String(row.work_department || '').trim().toLowerCase() === 'all');
      setBulkWorkDetails(exact?.work_details || legacy?.work_details || '');
    }
    loadBulkWorkDetails();
    return () => { cancelled = true; };
  }, [selectedTimesheetDate, bulkSite, bulkDepartment]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const totalDaysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Save login for the current tab so refreshing the page does not log the user out.
  // sessionStorage is cleared when the tab is closed in normal browser behavior.
  useEffect(() => {
    try {
      if (session?.user?.email && session?.role) {
        sessionStorage.setItem('nda_user_session', JSON.stringify(session));
      } else {
        sessionStorage.removeItem('nda_user_session');
      }
    } catch (err) {
      console.warn('Tab session could not be saved:', err);
    }
  }, [session]);

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
      setPayrollStartDate(String(data.start_date).slice(0, 10));
      setPayrollEndDate(String(data.end_date).slice(0, 10));
    }
  }

  async function savePayrollPeriodSettings(startDate = payrollStartDate, endDate = payrollEndDate, showMessage = true) {
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
    const { data, error } = await supabase.from('worker_employment_records').select('*');
    if (error) { console.warn('Employment records table not ready:', error.message); return; }
    setEmploymentRecords(data || []);
  }

  async function fetchLeaveSalaryRecords() {
    const { data, error } = await supabase.from('worker_leave_salary_records').select('*').order('leave_salary_last_date', { ascending: false });
    if (error) { console.warn('Leave salary records table not ready:', error.message); return; }
    setLeaveSalaryRecords(data || []);
  }

  async function saveEmploymentRecord(workerId) {
    if (!userRole.is_admin) return alert('Sirf admin employment details update kar sakta hai.');
    const row = employmentEdit[String(workerId)] || {};
    if (!row.joining_date) return alert('Worker ki joining/start date enter karein.');
    const payload = { worker_id: String(workerId), joining_date: row.joining_date, cancellation_date: row.cancellation_date || null, basic_salary: Number(row.basic_salary || 0) };
    const { error } = await supabase.from('worker_employment_records').upsert([payload], { onConflict: 'worker_id' });
    if (error) return alert('Employment record save nahi hua: ' + error.message + '\nPehle neeche diya SQL Supabase mein run karein.');
    await fetchEmploymentRecords();
    alert('Joining date / final calculation details save ho gayi hain.');
  }

  async function saveLeaveSalaryReceived(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin leave salary received record kar sakta hai.');
    if (!leaveSalaryWorkerId || !leaveSalaryLastDate) return alert('Worker aur leave salary ki last date select karein.');
    const { error } = await supabase.from('worker_leave_salary_records').insert([{ worker_id: String(leaveSalaryWorkerId), leave_salary_last_date: leaveSalaryLastDate, amount: Number(leaveSalaryAmount || 0), received_at: new Date().toISOString() }]);
    if (error) return alert('Leave salary record save nahi hua: ' + error.message + '\nPehle neeche diya SQL Supabase mein run karein.');
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

async function fetchDesignations() {
  const defaultNames = [
    'Carpenter', 'Carpenter Helper', 'Steel Fixer', 'Steel Fixer Helper',
    'Plumber', 'Mason', 'Electrician', 'Painter', 'Helper', 'Foreman',
    'Driver', 'Office Boy', 'Timekeeper'
  ];

  // Keep the database as the source of truth. Inactive rows are retained as
  // tombstones so a deleted default designation does not return after refresh.
  const { data: allRows, error: readError } = await supabase
    .from('designations')
    .select('id,name,is_active')
    .order('name', { ascending: true });

  if (readError) {
    console.error('Error fetching designations:', readError.message);
    alert('Designations load nahi huin. Supabase mein designations.is_active column check karein: ' + readError.message);
    return;
  }

  const existingNames = (allRows || []).map(item => String(item.name || '').trim().toLowerCase());
  const missingDefaults = defaultNames
    .filter(name => !existingNames.includes(name.toLowerCase()))
    .map(name => ({ name, is_active: true }));

  if (missingDefaults.length) {
    const { error: seedError } = await supabase.from('designations').insert(missingDefaults);
    if (seedError) {
      console.error('Could not initialize default designations:', seedError.message);
    }
  }

  const { data: activeRows, error: activeError } = await supabase
    .from('designations')
    .select('name,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (activeError) {
    console.error('Error loading active designations:', activeError.message);
    alert('Designations load nahi huin: ' + activeError.message);
    return;
  }

  const names = [...new Set((activeRows || [])
    .map(item => String(item.name || '').trim())
    .filter(Boolean))];
  setDesignationsList(names);
  if (names.length && !names.some(name => name.toLowerCase() === String(designation || '').trim().toLowerCase())) {
    setDesignation(names[0]);
  }
}


 async function handleSaveAnnualLeave(e) {
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

async function handleToggleHolidayDate() {
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
    if (!userRole.is_admin) return;
    if (window.confirm(`Delete access for ${emailToDelete}?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', emailToDelete);
      if (error) alert('Error: ' + error.message);
      else fetchPermissionsList();
    }
  }
  
  function handleDeleteSite(siteToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (sitesList.length <= 1) {
      return alert('Kam az kam ek working site honi lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${siteToDelete}' site delete karna chahte hain?`)) {
      const updatedSites = sitesList.filter(site => site !== siteToDelete);
      setSitesList(updatedSites);
      
      if (selectedSiteFilter === siteToDelete) setSelectedSiteFilter('All');
      if (workSite === siteToDelete) setWorkSite(updatedSites[0]);
      
      alert(`Site '${siteToDelete}' successfully delete ho gayi!`);
    }
  }

  async function handleAddNewSite(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newSiteInput.trim()) return alert('Site name enter karein!');
    if (sitesList.includes(newSiteInput.trim())) return alert('Yeh site pehle se mojood hai!');

    setSitesList([...sitesList, newSiteInput.trim()]);
    alert(`New working site '${newSiteInput.trim()}' added successfully!`);
    setNewSiteInput('');
  }

  async function handleAddNewDepartment(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newDeptInput.trim()) return alert('Department name enter karein!');
    if (departmentsList.some(d => String(d).trim().toLowerCase() === newDeptInput.trim().toLowerCase())) return alert('Yeh department pehle se mojood hai!');

    setDepartmentsList([...uniqueDepartments, newDeptInput.trim()]);
    alert(`New department '${newDeptInput.trim()}' added successfully!`);
    setNewDeptInput('');
  }
  function handleDeleteDepartment(deptToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (departmentsList.length <= 1) {
      return alert('Kam az kam ek department hona lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${deptToDelete}' department delete karna chahte hain?`)) {
      const updatedDepts = uniqueDepartments.filter(dept => String(dept).trim().toLowerCase() !== String(deptToDelete).trim().toLowerCase());
      setDepartmentsList(updatedDepts);
      
      if (selectedDeptFilter === deptToDelete) setSelectedDeptFilter('All');
      if (department === deptToDelete) setDepartment(updatedDepts[0]);
      
      alert(`Department '${deptToDelete}' successfully delete ho gaya!`);
    }
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
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

      // Business-only staff must authenticate through Supabase Auth. Legacy HR staff
      // passwords are deliberately not accepted for Business access.
      const isMatchedAdmin = !!resolvedAccount && String(resolvedAccount.user_password) === cleanPassword &&
        (resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true');
      if (selectedSystem === 'business' && !isMatchedAdmin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (authError || !authData?.user?.email) {
          alert('Business login ke liye email/password Supabase Authentication mein hona chahiye. HR staff ka login Business ke liye use nahi ho sakta.');
          return;
        }
        const { data: accessRows, error: accessError } = await supabase.from('business_access').select('business_id').ilike('user_email', cleanEmail).eq('active', true).eq('can_view', true);
        if (accessError || !accessRows?.length) {
          await supabase.auth.signOut();
          alert('Is email ko kisi Business ki viewing permission nahi mili. Admin se Business access lein.');
          return;
        }
        const businessRole = { is_admin: false, business_only: true, can_view_business: true };
        const businessSession = { user: { email: cleanEmail }, role: businessRole, system_scope: 'business' };
        setSession(businessSession); setUserRole(businessRole); setSelectedSystem('business');
        return;
      }

      if (!resolvedAccount || String(resolvedAccount.user_password) !== cleanPassword) {
        alert('Invalid Email or Password!');
        return;
      }

      const isAdminAccount =
        resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true';

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
        setActiveTab('dashboard');
        return;
      }

      const staffRole = {
        is_admin: false,
        staff_id: resolvedAccount.staff_id || '',
        assigned_department: String(resolvedAccount.assigned_department || '').trim() || 'Unassigned',
        assigned_site: resolvedAccount.assigned_site || 'All',
        can_view_dashboard: resolvedAccount.can_view_dashboard ?? true,
        can_use_bulk: resolvedAccount.can_use_bulk ?? false,
        can_view_workers: resolvedAccount.can_view_workers ?? true,
        can_add_workers: resolvedAccount.can_add_workers ?? false,
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
      localStorage.removeItem('nda_user_session'); // Clear any old saved session from earlier versions.
    } catch (err) {
      console.warn('Could not clear saved session:', err);
    }
    setSession(null);
    setSelectedSystem(null);
  }

  async function handleDeleteWorker(id) {
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
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || departmentsList[0]);
    setWorkSite(worker.work_site || sitesList[0]);
    const workerDesignation = String(worker.designation || 'Worker').trim() || 'Worker';
    setDesignation(workerDesignation);
    // Keep the worker's current designation selectable even if it was removed
    // from the active designation list or differs only by capitalization.
    setDesignationsList(prev => prev.some(d => String(d).trim().toLowerCase() === workerDesignation.toLowerCase())
      ? prev
      : [...prev, workerDesignation]);
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
    setName('');
    setDepartment(departmentsList[0]);
    setWorkSite(sitesList[0]);
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
    e.preventDefault();
    if (!userRole.is_admin) {
      if (editingWorkerId && !userRole.can_edit_workers) return alert('Permission denied: worker edit allowed nahi.');
      if (!editingWorkerId && !userRole.can_add_workers) return alert('Permission denied: worker add allowed nahi.');
      if (userRole.assigned_department && userRole.assigned_department !== 'All' &&
          department.toLowerCase() !== userRole.assigned_department.toLowerCase()) {
        return alert('Aap sirf apne assigned department mein worker add/edit kar sakte hain.');
      }
      if (userRole.assigned_site && userRole.assigned_site !== 'All' &&
          workSite.toLowerCase() !== userRole.assigned_site.toLowerCase()) {
        return alert('Aap sirf apni assigned site select kar sakte hain.');
      }
    }
    if (!name.trim() || !monthlySalary) return alert('Name and Salary required!');

    const monthlyNum = Number(monthlySalary);
    const dailyRateCalc = monthlyNum / totalDaysInCurrentMonth;

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      work_site: workSite.trim(),
      designation: designation.trim(),
      monthly_salary: monthlyNum,
      daily_rate: dailyRateCalc,
      religion,
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
        resetWorkerForm();
        fetchWorkers();
      }
    }
  }

   // Print Individual Worker Monthly Report
  function handlePrintWorkerMonthlyReport(worker) {
    const workerAttendance = attendance.filter(
      a => String(a.worker_id) === String(worker.id)
    );

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
          <h2>NDA-PK SYSTEM - Individual Worker Monthly Report</h2>

          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name || ''}</p>
            <p><strong>Department:</strong> ${worker.department || 'N/A'}
              | <strong>Site:</strong> ${worker.work_site || 'N/A'}</p>
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
<th>Total OT</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              ${
                workerAttendance.length === 0
                  ? '<tr><td colspan="4">No attendance records found.</td></tr>'
                  : workerAttendance.map(att => `
                      <tr>
                        <td>${att.date || ''}</td>
                        <td>${att.status || ''}</td>                       
<td>${Number(att.overtime_hours) || 0} Hours</td>
<td>${Number(att.contract_overtime_hours) || 0} Hours</td>
<td>${(Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0)} Hours</td>
                        <td>${att.work_site || worker.work_site || 'N/A'}</td>
                      </tr>
                    `).join('')
              }
            </tbody>
          </table>

          <div class="report-footer">
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. Handle Bulk Attendance & Overtime (Supports 'All' Departments & Designations)
 async function handleBulkAttendance() {
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
  const effectiveBulkSite =
    userRole.is_admin || userRole.assigned_site === 'All'
      ? bulkSite
      : userRole.assigned_site;
  const deptWorkers = allowedWorkers.filter(w => {
    const matchDept =
      bulkDepartment === 'All' ||
      (w.department &&
        w.department.toLowerCase() === bulkDepartment.toLowerCase());

    const workerDesignation = normalizeDesignation(w.designation);

    const matchDesig =
      selectedDesignations.includes('All') ||
      selectedDesignations.includes(workerDesignation);
    const matchSite = !effectiveBulkSite || String(w.work_site || '').trim().toLowerCase() === String(effectiveBulkSite).trim().toLowerCase();

    return matchDept && matchDesig && matchSite;
  });

  if (deptWorkers.length === 0) {
    return alert(
      `No workers found matching department (${bulkDepartment}) and designation (${bulkDesignation})!`
    );
  }

  const selectedDateIsHoliday = isHolidayDate(selectedTimesheetDate);
  const records = deptWorkers.map(w => {
    const existing = attendanceData[selectedTimesheetDate]?.[w.id] || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate) || {};
    return {
      worker_id: w.id,
      date: selectedTimesheetDate,
      // Overtime-only bulk must never turn an unrecorded worker into an Absent worker.
      // Holiday overtime is recorded with a neutral Holiday status, not Present/Absent.
      status: selectedDateIsHoliday ? 'Holiday' : (existing.status || 'Present'),
      overtime_hours: Number(bulkOT) || 0,
      contract_overtime_hours: Number(bulkContractOT) || 0,
      department: w.department,
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

    if (!updated[selectedTimesheetDate]) {
      updated[selectedTimesheetDate] = {};
    }
    
deptWorkers.forEach(w => {
  updated[selectedTimesheetDate][w.id] = {
    status: selectedDateIsHoliday ? 'Holiday' : (attendanceData[selectedTimesheetDate]?.[w.id]?.status || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate)?.status || 'Present'),
    ot: Number(bulkOT) || 0,
    contract_ot: Number(bulkContractOT) || 0,
    contract_overtime_hours: Number(bulkContractOT) || 0,
    site: effectiveBulkSite
  };
});

    return updated;
  });

  if (bulkWorkDetails.trim()) {
    await handleSaveBulkWorkDetails(null, true);
  }
  alert(
    `Overtime updated for ${selectedTimesheetDate}: ${deptWorkers.length} workers. Existing attendance status was preserved.${bulkWorkDetails.trim() ? ' Daily Work Details bhi save karne ki koshish ki gayi.' : ''}`
  );

  fetchAttendance();
}

  
 // 3. Handle Single Attendance & OT Change (Auto-saves to DB and updates Monthly Timesheet)
async function handleSingleAttendanceChange(
  workerId,
  dateStr,
  newStatus,
  newOt,
  newSite,
  newContractOT = 0
) {
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

  const updatedRecord = {
    ...previousRecord,
    status: newStatus,
    ot: Number(newOt) || 0,
    contract_ot: Number(newContractOT) || 0,
    contract_overtime_hours: Number(newContractOT) || 0,
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
        status: newStatus,
        overtime_hours: Number(newOt) || 0,
        contract_overtime_hours: Number(newContractOT) || 0,
        department: worker?.department,
        work_site: assignedSite
      }], { onConflict: 'worker_id,date' });

    
if (error) {
  throw new Error(error.message);
}

  } catch (err) {
    alert('Save karte waqt error: ' + err.message);
  }
}
  
async function handleSaveSiteAttendance(e) {
  e.preventDefault();
  if (!userRole.is_admin) return alert('Staff ko bulk overwrite ki permission nahi hai. Nayi entry Quick Entry se karein; existing records admin update karega.');
  if (!selectedTimesheetDate || !siteAttendanceSite) return alert('Date aur site select karein.');
  if (isPayrollDateClosed(selectedTimesheetDate)) return alert('Yeh salary period close hai. Admin pehle period reopen kare.');
  if (!siteAttendanceDepartment || siteAttendanceDepartment === 'All') return alert('Doosre department ki attendance ko affect hone se bachane ke liye ek specific department select karein.');
  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const enteredIds = [...new Set(siteAttendanceIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  const normalizeWorkerId = value => String(value ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const getWorkerSiteForDate = w => {
    // Workers Directory is the canonical assignment. Old attendance rows may contain stale site names,
    // so only use attendance site when the worker has no assigned site in the directory.
    const directorySite = String(w.work_site || w.site || '').trim();
    if (directorySite) return directorySite;
    const saved = attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate);
    return String(saved?.work_site || saved?.site || '').trim();
  };
  const normalizeDepartment = value => normalizeWorkerId(value).replace(/\s+/g, ' ');
  const getPublicWorkerIds = w => [w.worker_id, w.id, w.employee_id, w.id_no, w.worker_no, w.employee_no]
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(normalizeWorkerId);
  const scopedWorkers = allowedWorkers.filter(w => {
    const assignedSite = getWorkerSiteForDate(w);
    const siteMatch = normalizeWorkerId(assignedSite) === normalizeWorkerId(siteAttendanceSite);
    const deptMatch = normalizeDepartment(w.department) === normalizeDepartment(siteAttendanceDepartment);
    return siteMatch && deptMatch;
  });
  const presentWorkers = enteredIds.map(id => scopedWorkers.find(w => getPublicWorkerIds(w).includes(normalizeWorkerId(id))));
  const missingIds = enteredIds.filter((id, i) => !presentWorkers[i]);
  if (missingIds.length) {
    const knownElsewhere = missingIds.map(id => {
      const worker = allowedWorkers.find(w => getPublicWorkerIds(w).includes(normalizeWorkerId(id)));
      return worker ? `${id} (${worker.name || 'Worker'} — ${worker.department || 'No department'} / ${getWorkerSiteForDate(worker) || 'No site'})` : `${id} (Workers Directory mein ID nahi mili)`;
    });
    return alert('Yeh IDs selected site/department mein match nahi huin: ' + knownElsewhere.join('; ') + '. Attendance change nahi ki gayi. Workers Directory mein ID, department aur working site verify karein.');
  }
  const selectedWorkers = scopedWorkers;
  if (!selectedWorkers.length) return alert('Is site aur department ke workers nahi mile. Workers Directory mein site/department check karein.');
  setSiteAttendanceSaving(true);
  try {
    const siteDateIsHoliday = isHolidayDate(selectedTimesheetDate);
    const records = selectedWorkers.map(w => {
      const old = attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate);
      const isPresent = presentWorkers.some(p => p && String(p.id) === String(w.id));
      return {
        worker_id: w.id, date: selectedTimesheetDate,
        // Sunday/holiday must not create Present or Absent records. Use Holiday status;
        // overtime hours can be entered through the Bulk Overtime Only controls.
        status: siteDateIsHoliday ? 'Holiday' : (isPresent ? 'Present' : 'Absent'),
        overtime_hours: siteDateIsHoliday ? (isPresent ? (Number(siteHolidayNormalOT) || 0) : 0) : (Number(old?.overtime_hours) || 0),
        contract_overtime_hours: siteDateIsHoliday ? (isPresent ? (Number(siteHolidayContractOT) || 0) : 0) : (Number(old?.contract_overtime_hours) || 0),
        department: w.department || '', work_site: siteAttendanceSite
      };
    });
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) throw error;
    setSiteAttendanceIds('');
    await fetchAttendance();
    alert(siteDateIsHoliday ? `Holiday status save ho gaya (${siteAttendanceSite}). Sunday/holiday ke OT hours Bulk Overtime Only mein enter karein.` : `Attendance save ho gayi: ${records.filter(r => r.status === 'Present').length} Present, ${records.filter(r => r.status === 'Absent').length} Absent (${siteAttendanceSite}).`);
  } catch (err) {
    alert('Attendance save nahi hui: ' + (err?.message || String(err)));
  } finally { setSiteAttendanceSaving(false); }
}

async function handleQuickAttendance(e) {
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

  const normalOT = quickOTType === 'Normal OT' ? hours : 0;
  const contractOT = quickOTType === 'Contract OT' ? hours : 0;

  setQuickSaving(true);

  try {
    await handleSingleAttendanceChange(
      worker.id,
      selectedTimesheetDate,
      'Present',
      normalOT,
      quickSite,
      contractOT
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
    const { error } = await supabase.from('attendance').upsert([
      { worker_id: workerId, date: selectedTimesheetDate, status, overtime_hours: otHours, contract_overtime_hours: contractOtHours, department: worker?.department, work_site: assignedSiteForToday }
    ], { onConflict: 'worker_id,date' });

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  // 5. Handle Save Staff Permissions
  async function handleSavePermission(e) {
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
      can_use_bulk: permBulk,
      can_view_workers: permViewWorkers,
      can_add_workers: permAddWorkers,
      can_edit_workers: permEditWorkers,
      can_delete_workers: permDeleteWorkers,
      can_view_timesheet: permTimesheetView,
      can_view_daily_timesheet: permDailyTimesheetView,
      can_edit_timesheet: permTimesheetEdit,
      can_view_payroll: permPayroll,
      is_admin: false
    };

    const { error } = await supabase.from('user_permissions').upsert([permData], { onConflict: 'user_email' });
    if (error) alert('Error: ' + error.message);
    else {
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

  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    const userSiteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
    
    let deptMatch = (!userDeptScope || userDeptScope === 'All' || String(w.department || '').trim().toLowerCase() === String(userDeptScope).trim().toLowerCase());
    let siteMatch = (!userSiteScope || userSiteScope === 'All' || String(w.work_site || '').trim().toLowerCase() === String(userSiteScope).trim().toLowerCase());
    
    return deptMatch && siteMatch;
  });

  // Annual Leave records follow the same selected department/site scope as the worker list.
  const annualLeaveScopedWorkerIds = new Set(filteredWorkers.map(w => String(w.id)));
  const annualLeaveScopedList = annualLeaveList.filter(leave => annualLeaveScopedWorkerIds.has(String(leave.worker_id)));

  const activeWorkerIds = new Set(filteredWorkers.map(w => w.id));
  const selectedDateAttendance = attendance.filter(a => a.date === selectedTimesheetDate && activeWorkerIds.has(a.worker_id));
  
  const latestAttendanceMap = {};
  selectedDateAttendance.forEach(a => { latestAttendanceMap[a.worker_id] = a; });

 

const presentCountForDate = filteredWorkers.filter(worker => {
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
  const payrollMonthDays = Math.round((Date.UTC(payrollPeriodEnd.getFullYear(), payrollPeriodEnd.getMonth(), payrollPeriodEnd.getDate()) - Date.UTC(payrollPeriodStart.getFullYear(), payrollPeriodStart.getMonth(), payrollPeriodStart.getDate())) / 86400000) + 1;
  const currentPayrollPeriodClosed = closedPayrollPeriods.some(period => period.status === 'closed' && String(period.start_date).slice(0, 10) === payrollPeriodStartDate && String(period.end_date).slice(0, 10) === payrollPeriodEndDate);

  // Admin ko tamam sites ke workers dikhayein
  // Staff ko sirf apni permitted workers list dikhayein
  const payrollWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(worker => {
    const workerDepartment = String(worker.department || '').trim().toLowerCase();
    const selectedPayrollDepartment = String(payrollDepartment || 'All').trim().toLowerCase();
    const assignedDept = String(userRole.assigned_department || 'All').trim().toLowerCase();
    const assignedSite = String(userRole.assigned_site || 'All').trim().toLowerCase();
    const payrollDeptMatch = selectedPayrollDepartment === 'all' || workerDepartment === selectedPayrollDepartment;
    const staffDeptMatch = userRole.is_admin || assignedDept === 'all' || workerDepartment === assignedDept;
    const staffSiteMatch = userRole.is_admin || assignedSite === 'all' || String(worker.work_site || '').trim().toLowerCase() === assignedSite;
    return payrollDeptMatch && staffDeptMatch && staffSiteMatch;
  });

  payrollWorkers.forEach(worker => {
    // Include only records in the Admin-selected salary period.
    const monthlyRecords = attendance.filter(a => {
      const recordDate = String(a.date || '').slice(0, 10);
      return String(a.worker_id) === String(worker.id) && recordDate >= payrollPeriodStartDate && recordDate <= payrollPeriodEndDate;
    });

    // Sundays and admin-marked holidays count as paid days once per date.
    const monthHolidayDates = new Set();
    const payrollAsOfDate = formatPayrollDate(new Date());
    for (let cursor = new Date(payrollPeriodStart); cursor <= payrollPeriodEnd; cursor.setDate(cursor.getDate() + 1)) {
      const d = formatPayrollDate(cursor);
      // For an open/current period, don't count future Sundays or future holidays before they occur.
      if (d <= payrollAsOfDate && (cursor.getDay() === 0 || holidayDates.some(h => String(h.holiday_date).slice(0, 10) === d))) monthHolidayDates.add(d);
    }
    const workedPresentDays = monthlyRecords.filter(a =>
      String(a.status || '').trim().toLowerCase() === 'present' && !monthHolidayDates.has(String(a.date || '').slice(0, 10))
    ).length;
    const presentDays = workedPresentDays + monthHolidayDates.size;

    // Normal OT + Contract OT
    const totalOT = monthlyRecords.reduce((total, record) => {
      const normalOT = Number(record.overtime_hours) || 0;
      const contractOT = Number(record.contract_overtime_hours) || 0;

      return total + normalOT + contractOT;
    }, 0);

    const monthlySal = Number(
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * payrollMonthDays) ||
      0
    );

    const dailyRateNum = monthlySal / payrollMonthDays;
    const hourlyRate = dailyRateNum / 8;

    const baseSalary = dailyRateNum * presentDays;
    const otSalary = totalOT * (hourlyRate * 1.25);
    const totalPayable = baseSalary + otSalary;

    salaryDataMap[worker.id] = {
      presentDays,
      totalOT,
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

  if (!selectedSystem) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #164e63 0, #0f172a 48%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: '#67e8f9', fontWeight: 800 }}>NDA-PK DIGITAL WORKSPACE</div>
            <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '10px 0' }}>Choose Your System</h1>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Apna system select karein jahan aap kaam karna chahte hain.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <button onClick={() => setSelectedSystem('hr')} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #38bdf8', color: '#fff', background: 'linear-gradient(145deg,#075985,#1e3a8a)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>👷</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK HR SYSTEM</h2><p style={{ color: '#dbeafe', lineHeight: 1.6 }}>Workers, attendance, timesheet, overtime, payroll, annual leave, permissions aur HR reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#1d4ed8', borderRadius: 10, fontWeight: 800 }}>Open HR System →</span>
            </button>
            <button onClick={() => { setSelectedSystem('business'); setBusinessType('transport'); }} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #34d399', color: '#fff', background: 'linear-gradient(145deg,#065f46,#14532d)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>📈</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK BUSINESS</h2><p style={{ color: '#d1fae5', lineHeight: 1.6 }}>Transport aur aap ke banaye huay kisi bhi business ka daily roznamcha, vehicle files, workers salary/profit share, bills aur monthly reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#047857', borderRadius: 10, fontWeight: 800 }}>Open Business →</span>
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
            <h1 style={{ color: '#f8fafc', fontSize: '22px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>{selectedSystem === 'hr' ? 'HR SYSTEM · Sites & Staff Login' : 'BUSINESS MANAGEMENT LOGIN'}</p>
            <button type="button" onClick={() => setSelectedSystem(null)} style={{ marginTop: 8, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>← Change System</button>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nda.pk" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
     {/* Compact top bar: system identity lives here; dashboard banner below is the only dashboard hero */}
      <header style={{ background: 'linear-gradient(115deg,#0b1f46 0%,#123d78 58%,#087e8b 100%)', color: '#ffffff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #0b355f', boxShadow: '0 5px 18px rgba(15,47,99,.22)' }}>
        <div style={{display:'flex',alignItems:'center',gap:12,minWidth:230}}>
          <div style={{width:44,height:44,borderRadius:10,background:'linear-gradient(145deg,#0f2f63,#2563eb)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:25}}>🏢</div>
          <div>
            <h2 style={{ fontSize: '20px', margin: 0, color: '#ffffff', fontWeight:900 }}>NDA-PK SYSTEM</h2>
            <span style={{ fontSize: '11px', color: '#dbeafe' }}>Multi-Site Workforce Management</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <div style={{fontSize:12,color:'#e0f2fe',padding:'8px 10px',borderRight:'1px solid #7dd3fc55'}}>📅 {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</div>
          <div style={{display:'flex',alignItems:'center',gap:9,padding:'5px 10px',borderRadius:10,background:'rgba(255,255,255,.13)'}}>
            <img src="data:image/jpeg;base64,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" alt="Muhammad Naveed" style={{width:48,height:48,objectFit:"cover",borderRadius:"50%",border:"2px solid #2563eb",boxShadow:"0 2px 8px rgba(37,99,235,.25)"}}/><div><div style={{fontSize:13,fontWeight:800,color:"#ffffff"}}>Muhammad Naveed</div><div style={{fontSize:10,color:'#dbeafe'}}>Administrator</div></div>
          </div>
          <button onClick={() => setSelectedSystem(null)} style={{ padding: '8px 11px', backgroundColor: 'rgba(255,255,255,.14)', color: '#ffffff', border: '1px solid rgba(255,255,255,.35)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Switch System</button>
          <button onClick={handleLogout} style={{ padding: '8px 11px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* Tabs Menu Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        {(userRole.is_admin || userRole.can_view_dashboard) && (
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Dashboard</button>
        )}
        {(userRole.is_admin || userRole.can_use_bulk) && (
          <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk & OCR</button>
        )}
        {(userRole.is_admin || userRole.can_view_workers) && (
          <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers Directory</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && (
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet Entry</button>
        )}
      {(userRole.is_admin || userRole.can_view_daily_timesheet) && <button
  onClick={() => setActiveTab('daily-timesheet')}
  style={{
    padding: '10px 15px',
    backgroundColor: activeTab === 'daily-timesheet' ? '#2563eb' : 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  }}
>
  📄 Daily Timesheet
</button>}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        )}
        {userRole.is_admin && <button onClick={() => setActiveTab('changepass')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'changepass' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔑 Change Password</button>}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('sites')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'sites' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏗️ Working Sites</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('departments')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'departments' ? '#7c3aed' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏢 Departments</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 Permissions</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('annualLeave')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'annualLeave' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🌴 Annual Leave</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('data-cleanup')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'data-cleanup' ? '#dc2626' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🗑️ Data Cleanup</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet || userRole.can_view_payroll) && <button 
          onClick={() => setShowMonthlyTimesheetModal(true)} 
          style={{ padding: '10px 15px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
        >
          📊 Monthly Timesheet
        </button>}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        
        {/* Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
          {!['changepass', 'sites', 'departments', 'permissions'].includes(activeTab) && (userRole.is_admin ? (
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
            !['changepass', 'sites', 'departments', 'permissions'].includes(activeTab) && <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Site: {userRole.assigned_site} | Dept: {userRole.assigned_department}</span>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED</option>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
            {userRole.is_admin && <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Print Page</button>}
          </div>
        </div>
        
{/* TAB 1: DASHBOARD */}
{activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
  <>
    <section style={{background:'linear-gradient(120deg,#0f172a 0%,#1d4ed8 65%,#0e7490 100%)',borderRadius:18,padding:'24px clamp(16px,3vw,30px)',color:'#fff',marginBottom:20,boxShadow:'0 12px 30px #1e3a8a20',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,letterSpacing:3,fontWeight:800,color:'#bae6fd'}}>NDA-PK · HR CONTROL CENTER</div><h2 style={{fontSize:'clamp(23px,3vw,32px)',margin:'8px 0'}}>Workforce Overview</h2><p style={{margin:0,color:'#dbeafe',fontSize:14}}>Attendance, site deployment and payroll at a glance.</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
        <label style={{fontSize:12,color:'#dbeafe'}}>Dashboard Date<input type="date" value={selectedTimesheetDate} onChange={e=>setSelectedTimesheetDate(e.target.value)} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label>
        <label style={{fontSize:12,color:'#dbeafe'}}>Payroll Start Date<input type="date" value={payrollStartDate} onChange={e=>setPayrollStartDate(e.target.value)} disabled={!userRole.is_admin} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label>
        <label style={{fontSize:12,color:'#dbeafe'}}>Payroll Closing Date<input type="date" value={payrollEndDate} min={payrollStartDate || undefined} onChange={e=>setPayrollEndDate(e.target.value)} disabled={!userRole.is_admin} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label>
        {userRole.is_admin && <button type="button" disabled={savingPayrollPeriodSettings} onClick={()=>savePayrollPeriodSettings()} style={{alignSelf:'end',padding:'10px 13px',background:'#047857',color:'#fff',border:0,borderRadius:9,fontWeight:800,cursor:savingPayrollPeriodSettings?'wait':'pointer',opacity:savingPayrollPeriodSettings?0.7:1}}>{savingPayrollPeriodSettings?'Saving…':'Save Payroll Dates'}</button>}

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
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
              Workers with attendance: <strong>{totalAttendanceCount}</strong>
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
              Absent: desigWorkers.filter(w => normaliseDashboardStatus(getAttendanceStatus(w)) === 'absent' && !isWorkerOnAnnualLeave(w)),
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
                      {desigAttendanceWorkers.length} Attended
                    </span>
                  </div>

                  {sitesList.map(site => {
                    const siteWorkersCount = desigWorkers.filter(w => {
                      const attendanceRecord =
                        attendanceData[selectedTimesheetDate]?.[w.id];

                      return Boolean(attendanceRecord) &&
                        (attendanceRecord.site || attendanceRecord.work_site) === site;
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
                 {attendanceListModal.workers.map(w => <tr key={w.id}><td style={tdStyle}>{w.worker_id || w.employee_id || w.id_no || w.id}</td><td style={tdStyle}>{w.name || w.worker_name || '—'}</td><td style={tdStyle}>{w.designation || '—'}</td><td style={tdStyle}>{w.department || '—'}</td><td style={tdStyle}>{attendanceData[selectedTimesheetDate]?.[w.id]?.site || attendanceData[selectedTimesheetDate]?.[w.id]?.work_site || w.work_site || w.site || '—'}</td></tr>)}
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
    <h3 style={{ margin: '0 0 10px 0' }}>⚡ Bulk Overtime Only — Department / Designation</h3>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Date</label>
        <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Department</label>
        <select value={userRole.is_admin ? bulkDepartment : userRole.assigned_department} onChange={e => setBulkDepartment(e.target.value)} disabled={!userRole.is_admin} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {userRole.is_admin && <option value="All">All Departments</option>}
          {visibleDepartments.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
        </select>
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
    </div>

    <form onSubmit={handleSaveBulkWorkDetails} style={{ marginTop: 18, padding: 18, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10 }}>
      <h3 style={{ margin: '0 0 8px', color: '#1d4ed8' }}>📝 Daily Work Details — Save to Daily Timesheet</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>Selected date, site aur department ki details yahan likhein. Har department ki details alag save hongi aur save hote hi box khali ho jayega.</p>
      <textarea value={bulkWorkDetails} onChange={e => setBulkWorkDetails(e.target.value)} rows={4} placeholder="Example: Carpenters formwork fixing kar rahe hain; steel fixers reinforcement tying kar rahe hain..." style={{ ...fieldStyle, resize: 'vertical', marginBottom: 10 }} />
      <button type="submit" disabled={dailyWorkDetailsSaving} style={{ ...primaryStyle, background: '#1d4ed8', opacity: dailyWorkDetailsSaving ? .7 : 1 }}>{dailyWorkDetailsSaving ? 'Saving details…' : 'Save Daily Work Details'}</button>
    </form>

    <div style={{ marginTop: '20px', padding: '18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
      <h3 style={{ margin: '0 0 8px', color: '#166534' }}>🟢 Site Attendance by Worker ID</h3>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534' }}>Date, site aur department select karein. Normal working day par entered IDs Present aur selected scope ke baqi workers Absent honge. Sunday/holiday par koi Present/Absent nahi hoga; entered IDs ke sirf Normal OT aur Contract OT hours save honge.</p>
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
        <button type="submit" disabled={siteAttendanceSaving} style={{ ...primaryStyle, marginTop: 12, background: '#15803d', opacity: siteAttendanceSaving ? .7 : 1 }}>{siteAttendanceSaving ? 'Saving Attendance…' : (isHolidayDate(selectedTimesheetDate) ? 'Save Holiday OT by Worker ID' : 'Save Site Attendance (Others Absent)')}</button>
      </form>
    </div>

    <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
      <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Scanner (For Date: {selectedTimesheetDate})</h4>
      <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
      {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
      {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
    </div>
    
{/* QUICK ATTENDANCE BOX */}
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
        </select>
      </div>

      <div>
        <label>OT Hours</label>
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
</div>

    {/* Individual Worker Attendance List */}
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
              .filter(w => bulkDepartment === 'All' || w.department === bulkDepartment)
              .map((worker) => {
                const record = attendanceData[selectedTimesheetDate]?.[worker.id] || { status: 'Present', ot: 0 };
                const currentSite = record.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

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
                          const siteToSave = latestRecord.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

                         
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
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
  <input
    type="text"
    value={newDesignation}
    onChange={e => setNewDesignation(e.target.value)}
    placeholder="Add new designation"
    style={{
      flex: 1,
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1'
    }}
  />
<button
  type="button"
  onClick={async () => {
    const value = newDesignation.trim();

    if (!value) return;

    if (
      designationsList.some(
        d => d.toLowerCase() === value.toLowerCase()
      )
    ) {
      alert('Designation already exists!');
      return;
    }

    const { error } = await supabase
      .from('designations')
      .insert([{ name: value, is_active: true }]);

    if (error) {
      alert('Designation save nahi hui: ' + error.message);
      return;
    }

    setDesignationsList(prev => [...prev, value]);
    setDesignation(value);
    setNewDesignation('');
    alert('Designation successfully saved!');
  }}
  style={{
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer'
  }}
>
  + Add
</button>
<button
  type="button"
  onClick={async () => {
    const selected = String(designation || '').trim();
    if (!selected) return alert('Pehle delete karne ke liye designation select karein.');
    if (!window.confirm(`Kya aap designation "${selected}" ko list se delete karna chahte hain? Existing workers ka record delete nahi hoga.`)) return;

    // Soft-delete every capitalization variant. Keeping the row inactive
    // prevents built-in/default designations from being added back on refresh.
    const { data: changedRows, error } = await supabase
      .from('designations')
      .update({ is_active: false })
      .ilike('name', selected)
      .select('id,name,is_active');

    if (error) {
      alert('Designation delete nahi hui: ' + error.message + '\nSupabase SQL Editor mein is_active column add karna zaroori hai.');
      return;
    }

    if (!changedRows || changedRows.length === 0) {
      // If it was a built-in name not yet stored in the DB, write an inactive
      // tombstone so the name stays deleted after reload on all devices.
      const { error: tombstoneError } = await supabase
        .from('designations')
        .insert([{ name: selected, is_active: false }]);
      if (tombstoneError) {
        alert('Designation database se delete nahi hui: ' + tombstoneError.message);
        return;
      }
    }

    setDesignationsList(prev => prev.filter(d => d.trim().toLowerCase() !== selected.toLowerCase()));
    setDesignation('');
    alert('Designation delete ho gayi. Worker records aur attendance delete nahi hue.');
  }}
  style={{
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: 'white',
    cursor: 'pointer'
  }}
>
  Delete
</button>
</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Working Site</label>
              <select value={workSite} onChange={e => setWorkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
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
      
          {/* DOCUMENTS UPLOAD SECTION */}
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1e293b' }}>📁 Worker Documents Upload</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Passport Copy</label>
                <input type="file" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const fileName = `pass_${Date.now()}.${file.name.split('.').pop()}`;
                    const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
                    setPassportFileUrl(data.publicUrl);
                    alert('Passport uploaded successfully!');
                  } catch (err) {
                    alert('Passport upload error: ' + err.message);
                  }
                }} style={{ fontSize: '11px' }} />
              </div>

              <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ID Card</label>
  <input 
    type="file" 
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `idcard_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        setIdCardFileUrl(publicUrl);
        alert('ID Card uploaded successfully!');
      } catch (err) {
        alert('Upload Error: ' + err.message);
      }
    }} 
    style={{ fontSize: '11px' }} 
  />
  {idCardFileUrl && <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>✔ Saved & Ready</div>}
</div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Visa Copy</label>
                <input type="file" onChange={(e) => alert('Visa selected!')} style={{ fontSize: '11px' }} />
              </div>

            </div>
          </div>

          <button type="submit" style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {editingWorkerId ? 'Update Worker' : 'Save Worker'}
          </button>
        </form>
      </div>
    )}

    {/* WORKERS DIRECTORY TABLE */}
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 15px 0' }}>👷 Workers Directory</h3>
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
          {filteredWorkers.map(w => (
            <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
              <td style={{ padding: '10px' }}>{w.department} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{w.designation || 'Worker'}</span></td>
              <td style={{ padding: '10px' }}>{w.monthly_salary} {w.currency || selectedCurrency}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {w.passport_file_url ? (
                    <a href={w.passport_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '3px 6px', borderRadius: '4px', textDecoration: 'none' }}>Passport</a>
                  ) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Passport</span>}
                </div>
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
   const reportWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(w => {
     const deptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
     const siteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
     const deptMatch = !deptScope || deptScope === 'All' ||
       w.department?.toLowerCase() === deptScope.toLowerCase();
     const siteMatch = !siteScope || siteScope === 'All' ||
       w.work_site?.toLowerCase() === siteScope.toLowerCase();
     return deptMatch && siteMatch;
   });

   const getRecord = worker =>
     attendanceData[selectedTimesheetDate]?.[worker.id] ||
     attendance.find(a =>
       String(a.worker_id) === String(worker.id) &&
       a.date === selectedTimesheetDate
     ) || {};

   const getStatus = worker =>
     String(getRecord(worker).status || 'Absent').toLowerCase().replace(/_/g, ' ').trim();

   const getSite = worker =>
     getRecord(worker).site ||
     getRecord(worker).work_site ||
     worker.work_site ||
     'Unassigned';

  const reportIsHoliday = isHolidayDate(selectedTimesheetDate);
   const presentCount = reportIsHoliday ? 0 : reportWorkers.filter(w => {
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

  return status === 'present' && !isOnAnnualLeave;
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
               const savedStatus = record.status || 'Absent';
               const savedSite = getSite(worker);
               const savedOT = record.ot ?? record.overtime_hours ?? 0;

               return (
                 <tr key={worker.id} style={{
                   borderBottom: '1px solid #e2e8f0',
                   backgroundColor: savedStatus.toLowerCase() === 'absent' ? '#fee2e2' : 'transparent',
                   color: savedStatus.toLowerCase() === 'absent' ? '#991b1b' : 'inherit'
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
                       defaultValue={savedStatus}
                       style={{ padding: '6px', borderRadius: '4px' }}
                     >
                       <option value="Present">Present</option>
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
  style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}
>
  <style>{dailyTimesheetPrintStyle}</style>

            <h2>📄 Daily Timesheet</h2>

            <div style={{
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
                <select
                  value={dailyTimesheetSite}
                  onChange={e => setDailyTimesheetSite(e.target.value)}
                  style={{ padding: '9px', minWidth: '200px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                >
{userRole.is_admin ? <option value="All Workers">All Workers</option> : null}
{(userRole.is_admin ? sitesList : (userRole.assigned_site && userRole.assigned_site !== 'All' ? [userRole.assigned_site] : sitesList)).map((site, idx) => (<option key={idx} value={site}>{site}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Department</label>
                <select value={userRole.is_admin || userRole.assigned_department === 'All' ? dailyTimesheetDepartment : userRole.assigned_department} onChange={e => setDailyTimesheetDepartment(e.target.value)} disabled={!userRole.is_admin && userRole.assigned_department !== 'All'} style={{ padding: '9px', minWidth: '200px', border: '1px solid #cbd5e1', borderRadius: '5px' }}>
                  {userRole.is_admin || userRole.assigned_department === 'All' ? <option value="All">All Departments</option> : null}
                  {(userRole.is_admin ? visibleDepartments : (userRole.assigned_department && userRole.assigned_department !== 'All' ? [userRole.assigned_department] : visibleDepartments)).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '950px'
              }}>
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>S.No</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Designation</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>ID</th>
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
                    
const workerSite = record.site || record.work_site || worker.work_site || '';
                      const workerDept = String(worker.department || '').trim().toLowerCase();
                      const departmentMatches = dailyTimesheetDepartment === 'All' || workerDept === dailyTimesheetDepartment.toLowerCase().trim();
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
                      const status = rowIsHoliday ? 'Holiday Present' : (annualLeave ? 'Annual Leave' : (record.status || 'Absent'));

                      const ot = annualLeave && !rowIsHoliday
                        ? 0
                        : (Number(record.ot ?? record.overtime_hours ?? 0) || 0);

                      const contractOT = annualLeave && !rowIsHoliday
                        ? 0
                        : (Number(record.contract_ot ?? record.contract_overtime_hours ?? 0) || 0);

                      const totalOT = ot + contractOT;

                      const normalHours = rowIsHoliday ? 8 : (!annualLeave && String(status).toLowerCase() === 'present' ? 8 : 0);

                      return (                       
<tr
  key={worker.id}
  style={{
    backgroundColor:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#fef3c7'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#fee2e2'
          : '#ffffff',
    color:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#92400e'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#991b1b'
          : '#111827',
    fontWeight:
      ['annual leave', 'absent'].includes(String(status).trim().toLowerCase())
        ? 'bold'
        : 'normal'
  }}
>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.name || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.designation || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{worker.id || '-'}</td>
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

            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px'
            }}>
              <strong>Daily Work Details / Remarks</strong>
              <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                {dailyWorkDetailsLoadError ? `Details read nahi ho sakin: ${dailyWorkDetailsLoadError}. Supabase SQL policy fix run karein.` : (savedDailyWorkDetails || 'Is date, site aur department ke liye koi Daily Work Details save nahi hain.')}
              </p>
            </div>

            <div style={{ marginTop: '15px' }}>
              {userRole.is_admin && <button
                onClick={() => window.print()}
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
    id="monthly-sheet-print"
    style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
<style>{`
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    #monthly-sheet-print,
    #monthly-sheet-print * {
      visibility: visible !important;
    }

    #monthly-sheet-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print .no-print {
      display: none !important;
    }

    #monthly-sheet-print table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
    }

    #monthly-sheet-print th,
    #monthly-sheet-print td {
      border: 1px solid #555 !important;
      padding: 5px 3px !important;
      color: #000 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print h3 {
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
        onClick={() => window.print()}
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
      <div style={{ minWidth: 220, fontWeight: 'bold' }}>Monthly Salary & Overtime Sheet<br/><span style={{fontSize:12,color:'#475569'}}>Selected Salary Period: {payrollPeriodStartDate} to {payrollPeriodEndDate} ({payrollMonthDays} days)</span><br/><span style={{fontSize:12,color:currentPayrollPeriodClosed?'#b91c1c':'#047857'}}>{currentPayrollPeriodClosed ? 'CLOSED — editing blocked' : 'OPEN — attendance and OT can be entered'}</span></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Start Date:
        <input type="date" value={payrollStartDate} disabled={!userRole.is_admin} onChange={e => setPayrollStartDate(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Closing Date:
        <input type="date" value={payrollEndDate} min={payrollStartDate || undefined} disabled={!userRole.is_admin} onChange={e => setPayrollEndDate(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
      </label>
      {userRole.is_admin && <button type="button" disabled={savingPayrollPeriodSettings} onClick={() => savePayrollPeriodSettings()} style={{ padding: '9px 12px', background: '#1d4ed8', color: '#fff', border: 0, borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Save Dates</button>}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Department:
        <select value={userRole.is_admin ? payrollDepartment : userRole.assigned_department} onChange={e => setPayrollDepartment(e.target.value)} disabled={!userRole.is_admin} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          <option value="All">All Departments</option>
          {visibleDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
        </select>
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
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Present</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Overtime</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Overtime Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Salary Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Salary</th>
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
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(overtimePay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(salaryPay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>
                  {Math.round(totalSalary).toLocaleString()} {selectedCurrency}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
            <td
              colSpan={7}
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
                <p style={{ color: '#475569', fontSize: 13 }}>Calculation: 30 days per year (2.5 days per month). Leave salary receive hone ki last date se balance zero samjha jayega; us ke baad nayi leave accrual shuru hoti hai. Har worker ki joining date pehle save karein.</p>
                <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Last Leave Salary Date</th><th style={thStyle}>Earned Days</th><th style={thStyle}>Leave Used</th><th style={thStyle}>Available Balance</th></tr></thead><tbody>
                  {filteredWorkers.map(w => {
                    const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                    const salaryRecords = leaveSalaryRecords.filter(r => String(r.worker_id) === String(w.id)).sort((a,b) => String(b.leave_salary_last_date || '').localeCompare(String(a.leave_salary_last_date || '')));
                    const latestSalaryRecord = salaryRecords[0];
                    const joinDate = emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : '');
                    const accrualStart = latestSalaryRecord?.leave_salary_last_date || joinDate;
                    const todayString = new Date().toISOString().slice(0,10);
                    const accrued = accrualStart && accrualStart <= todayString ? Math.max(0, ((new Date(todayString + 'T00:00:00') - new Date(accrualStart + 'T00:00:00')) / 86400000) * (30 / 365)) : 0;
                    const used = annualLeaveList.filter(l => String(l.worker_id) === String(w.id) && l.start_date && l.start_date >= (accrualStart || '9999-12-31') && l.start_date <= todayString).reduce((sum,l) => { const end = l.actual_return && l.actual_return !== 'On Leave' ? l.actual_return : todayString; return sum + Math.max(0, Math.floor((new Date(end + 'T00:00:00') - new Date(l.start_date + 'T00:00:00')) / 86400000) + 1); }, 0);
                    const balance = latestSalaryRecord ? Math.max(0, accrued - used) : Math.max(0, accrued - used);
                    const edit = employmentEdit[String(w.id)] || { joining_date: joinDate, cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '' };
                    return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b><div style={{ color: '#64748b', fontSize: 12 }}>{w.department} / {w.designation}</div></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 145, padding: 7 }} /><button onClick={() => saveEmploymentRecord(w.id)} style={{ marginTop: 5, padding: '5px 8px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save Date</button></td><td style={tdStyle}>{latestSalaryRecord?.leave_salary_last_date || 'Never recorded'}</td><td style={tdStyle}>{accrued.toFixed(1)} days</td><td style={tdStyle}>{used.toFixed(1)} days</td><td style={tdStyle}><b style={{ color: '#15803d', background: '#dcfce7', padding: '5px 8px', borderRadius: 6 }}>{balance.toFixed(1)} days</b></td></tr>;
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
              <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Cancellation / Last Date</th><th style={thStyle}>Basic Salary AED</th><th style={thStyle}>Service</th><th style={thStyle}>Gratuity Days</th><th style={thStyle}>Estimated Gratuity AED</th><th style={thStyle}>Save</th></tr></thead><tbody>
                {filteredWorkers.map(w => {
                  const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                  const edit = employmentEdit[String(w.id)] || { joining_date: emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : ''), cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '' };
                  const endDate = edit.cancellation_date || finalCalcDate;
                  const start = edit.joining_date ? new Date(edit.joining_date + 'T00:00:00') : null;
                  const end = endDate ? new Date(endDate + 'T00:00:00') : null;
                  const serviceDays = start && end && end >= start ? Math.floor((end - start) / 86400000) : 0;
                  const serviceYears = serviceDays / 365;
                  const basic = Math.max(0, Number(edit.basic_salary || 0));
                  const gratuityDays = serviceYears < 1 ? 0 : Math.min(730, Math.max(0, Math.min(serviceYears, 5) * 21 + Math.max(0, serviceYears - 5) * 30));
                  const gratuityAmount = Math.min(basic * 2, (basic / 30) * gratuityDays);
                  return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /></td><td style={tdStyle}><input type="date" value={edit.cancellation_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, cancellation_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /><div style={{ fontSize: 11, color: '#64748b' }}>Blank = current date</div></td><td style={tdStyle}><input type="number" min="0" step="0.01" value={edit.basic_salary || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, basic_salary: e.target.value } }))} style={{ ...fieldStyle, minWidth: 110, padding: 7 }} /></td><td style={tdStyle}>{(serviceDays / 365).toFixed(2)} years</td><td style={tdStyle}>{gratuityDays.toFixed(1)}</td><td style={tdStyle}><b>{gratuityAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</b></td><td style={tdStyle}><button onClick={() => saveEmploymentRecord(w.id)} style={{ padding: '7px 10px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save</button></td></tr>;
                })}
              </tbody></table>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 12 }}>Current calculation date: {finalCalcDate}. <label>Calculation date <input type="date" value={finalCalcDate} onChange={e => setFinalCalcDate(e.target.value)} style={{ ...fieldStyle, width: 180, display: 'inline-block' }} /></label></p>
            </div>}
          </div>
        )}
        {/* 📊 MONTHLY TIMESHEET MODAL WITH SEARCH, DEPT FILTER & VIEW/PRINT OPTIONS */}
{showMonthlyTimesheetModal && (userRole.is_admin || userRole.can_view_timesheet || userRole.can_view_payroll) && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '1050px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📊 Monthly Timesheet & Worker Report</h2>
        <button 
          onClick={() => setShowMonthlyTimesheetModal(false)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close
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

          {/* Department Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Filter Department</label>
            <select 
              value={userRole.is_admin ? monthlyDepartmentFilter : userRole.assigned_department} 
              onChange={e => setMonthlyDepartmentFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '150px' }}
            >
              <option value="All">All Departments</option>
              {visibleDepartments.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Payroll Start Date</label>
            <input type="date" value={payrollStartDate} disabled={!userRole.is_admin} onChange={e => setPayrollStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Payroll Closing Date</label>
            <input type="date" value={payrollEndDate} min={payrollStartDate || undefined} disabled={!userRole.is_admin} onChange={e => setPayrollEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          {userRole.is_admin && <button type="button" onClick={() => savePayrollPeriodSettings()} disabled={savingPayrollPeriodSettings} style={{ padding: '8px 12px', background: '#047857', color: '#fff', border: 0, borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Save Dates</button>}
        </div>

        {userRole.is_admin && <button 
          onClick={() => window.print()} 
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          🖨️ Print Full Report
        </button>}
      </div>

      {/* Filtered & Searched Workers List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px' }}>Worker ID & Name</th>
              <th style={{ padding: '10px' }}>Department</th>
              <th style={{ padding: '10px' }}>Working Site</th>
              {userRole.is_admin && <th className="monthly-timesheet-actions" style={{ padding: '10px', textAlign: 'center' }}>Actions (View / Print / PDF)</th>}
            </tr>
          </thead>
          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => {
                const reportDepartment = userRole.is_admin ? monthlyDepartmentFilter : userRole.assigned_department;
                const matchesDept = reportDepartment === 'All' || !reportDepartment || String(w.department || '').trim().toLowerCase() === String(reportDepartment).trim().toLowerCase();
                const matchesSearch = !timesheetSearchQuery || 
                  String(w.id).toLowerCase().includes(timesheetSearchQuery.toLowerCase()) || 
                  w.name.toLowerCase().includes(timesheetSearchQuery.toLowerCase());
                return matchesDept && matchesSearch;
              })
              .map(w => (
              <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                <td style={{ padding: '10px' }}>{w.department}</td>
                <td style={{ padding: '10px' }}>{w.work_site || sitesList[0]}</td>
                {userRole.is_admin && <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  
                  {/* View Timesheet Button */}
                  <button 
                    onClick={() => setViewingWorkerTimesheet(w)} 
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

    </div>
  </div>
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
          <div><b>Working Site:</b> {viewingWorkerTimesheet.work_site || 'N/A'}</div>
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
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Total OT</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Site</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
        const workerAttendance = attendance.filter(a => {
  const recordDate = String(a.date || '').slice(0, 10);
  return String(a.worker_id) === String(viewingWorkerTimesheet.id) && recordDate >= payrollPeriodStartDate && recordDate <= payrollPeriodEndDate;
});

const monthlyRows = workerAttendance.map(att => {
  const annualLeave = getAnnualLeaveForWorker(
    viewingWorkerTimesheet.id,
    String(att.date).slice(0, 10)
  );

  return {
    ...att,
    status: annualLeave ? 'Annual Leave' : att.status,
    overtime_hours: annualLeave ? 0 : (Number(att.overtime_hours) || 0),
    contract_overtime_hours: annualLeave ? 0 : (Number(att.contract_overtime_hours) || 0),
    total_overtime_hours: annualLeave ? 0 : ((Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0))
  };
});

return monthlyRows.map((att, idx) => {
  const rowStatus = String(att.status || '').trim().toLowerCase();

  let rowBg = '#ffffff';
  let statusBg = '#dcfce7';
  let statusColor = '#166534';

  if (rowStatus === 'annual leave') {
    rowBg = '#fef3c7';
    statusBg = '#fef3c7';
    statusColor = '#92400e';
  } else if (rowStatus === 'absent') {
    rowBg = '#fee2e2';
    statusBg = '#fee2e2';
    statusColor = '#991b1b';
  } else if (rowStatus === 'sick leave' || rowStatus === 'other leave') {
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
          {att.status}
        </span>
      </td>
     <td style={{ padding: '8px 10px', color: '#475569' }}>
  {Number(att.overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#7c3aed' }}>
  {Number(att.contract_overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
  {(Number(att.overtime_hours) || 0) +
   (Number(att.contract_overtime_hours) || 0)} Hours
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
        {userRole.is_admin && <button 
          onClick={() => handlePrintWorkerMonthlyReport(viewingWorkerTimesheet)}
          style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          🖨️ Print / Download PDF
        </button>}
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
     
{/* Footer */}
<div
  style={{
    width: '100%',
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
  );
}
