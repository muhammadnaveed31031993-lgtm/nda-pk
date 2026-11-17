import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function printNdaPage(targetId, isAdmin = false) {
  if (!isAdmin) { alert('Print / PDF ki permission sirf Admin ko hai.'); return; }
  const target = document.getElementById(targetId);
  if (!target) { alert('Print page nahi mil saka. Page refresh karke dobara try karein.'); return; }
  document.querySelectorAll('.nda-print-target').forEach(node => node.classList.remove('nda-print-target'));
  target.classList.add('nda-print-target');
  const images = Array.from(target.querySelectorAll('img'));
  Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }))).then(() => {
    const cleanup = () => { target.classList.remove('nda-print-target'); window.removeEventListener('afterprint', cleanup); };
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

function BusinessWorkspace({ session, userRole, onLogout, onSwitchSystem }) {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
