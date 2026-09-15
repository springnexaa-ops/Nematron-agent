import { askNexa } from '../../shared/ai-engine.js';

let data = await window.nexaERP.getData();
if (!data.medicines.length) {
  data.medicines = [
    {name:'Paracetamol 500mg',batch:'PCM-2601',stock:18,reorderLevel:20,expiry:'2027-01-31'},
    {name:'Amoxicillin 500mg',batch:'AMX-2511',stock:7,reorderLevel:15,expiry:'2026-11-30'},
    {name:'Pantoprazole 40mg',batch:'PAN-2602',stock:46,reorderLevel:20,expiry:'2027-02-28'}
  ];
  data.sales = [{total:4200,cost:3000},{total:1850,cost:1200}];
  await window.nexaERP.saveData(data);
}
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const low=data.medicines.filter(m=>m.stock<=m.reorderLevel).length;
const exp=data.medicines.filter(m=>m.expiry && new Date(m.expiry)<=new Date(Date.now()+90*86400000)).length;
const sales=data.sales.reduce((s,x)=>s+Number(x.total||0),0);
document.querySelector('#medCount').textContent=data.medicines.length;
document.querySelector('#lowCount').textContent=low;
document.querySelector('#expCount').textContent=exp;
document.querySelector('#salesTotal').textContent=money(sales);
document.querySelector('#tbody').innerHTML=data.medicines.map(m=>`<tr><td>${m.name}</td><td>${m.batch||'—'}</td><td>${m.stock}</td><td>${m.expiry||'—'}</td></tr>`).join('');
function ask(){document.querySelector('#answer').textContent=askNexa(document.querySelector('#q').value,data);}
document.querySelector('#ask').onclick=ask;document.querySelector('#q').onkeydown=e=>{if(e.key==='Enter')ask();};
