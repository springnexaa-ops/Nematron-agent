const express=require('express');const path=require('path');const app=express();app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
const db={medicines:[{name:'Paracetamol 500mg',batch:'PCM-2601',stock:18,reorderLevel:20,expiry:'2027-01-31'},{name:'Amoxicillin 500mg',batch:'AMX-2511',stock:7,reorderLevel:15,expiry:'2026-11-30'}],sales:[]};
app.get('/api/health',(_,res)=>res.json({ok:true,product:'NEXA ERP (Pharma)'}));
app.get('/api/data',(_,res)=>res.json(db));
app.post('/api/sync',(req,res)=>{const p=req.body||{};if(Array.isArray(p.medicines))db.medicines=p.medicines;if(Array.isArray(p.sales))db.sales.push(...p.sales);res.json({ok:true,serverTime:new Date().toISOString()});});
app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(process.env.PORT||8080,()=>console.log('NEXA ERP (Pharma) cloud running'));
