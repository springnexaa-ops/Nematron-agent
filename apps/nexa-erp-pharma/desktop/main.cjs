const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const dataFile = () => path.join(app.getPath('userData'), 'nexa-pharma-data.json');
function defaultData(){return {medicines:[],sales:[],purchases:[],syncQueue:[],settings:{mode:'offline-first'}};}
function readData(){try{return JSON.parse(fs.readFileSync(dataFile(),'utf8'));}catch{return defaultData();}}
function writeData(d){fs.mkdirSync(path.dirname(dataFile()),{recursive:true});fs.writeFileSync(dataFile(),JSON.stringify(d,null,2));return d;}

function createWindow(){
 const win=new BrowserWindow({width:1440,height:900,minWidth:1100,minHeight:700,backgroundColor:'#07111f',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 win.loadFile(path.join(__dirname,'renderer','index.html'));
}
ipcMain.handle('nexa:get-data',()=>readData());
ipcMain.handle('nexa:save-data',(_,d)=>writeData(d));
ipcMain.handle('nexa:queue-sync',(_,event)=>{const d=readData();d.syncQueue.push({...event,id:Date.now()});return writeData(d);});
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
