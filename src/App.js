import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Users, ShoppingBag, Settings, Plus, 
  Trash2, Edit2, Check, X, Search, CreditCard, 
  ChevronLeft, ChevronRight, UserPlus, LogOut, Wallet, 
  ArrowUpCircle, Sparkles, Package, Gift, AlertCircle, FileText, Database,
  TrendingUp, BarChart3, Bell, Tag, Info, Download, FileSpreadsheet, Filter
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, setDoc, writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// ==========================================
// 0. 自動樣式與 Excel 引擎注入
// ==========================================
const SystemInjector = () => {
  useEffect(() => {
    // 注入 Tailwind CSS
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    // 注入 SheetJS (用於 Excel 匯出)
    if (!document.querySelector('script[src*="xlsx"]')) {
      const xlsxScript = document.createElement('script');
      xlsxScript.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
      document.head.appendChild(xlsxScript);
    }
  }, []);
  return null;
};

// ==========================================
// 1. Firebase 設定
// ==========================================
const userFirebaseConfig = {
  apiKey: "AIzaSyAlhVUXU9YaCURmomwzTND8ViIRFxlxqD4",
  authDomain: "skincare-e2c39.firebaseapp.com",
  projectId: "skincare-e2c39",
  storageBucket: "skincare-e2c39.firebasestorage.app",
  messagingSenderId: "86546693998",
  appId: "1:86546693998:web:d00d9c7adfc400ef574b7f",
  measurementId: "G-W3RTNKV7S0"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig;
const appId = 'kirei_store_main'; 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const DATA_PATH = `artifacts/${appId}/public/data`;

// ==========================================
// 2. 工具函數
// ==========================================
const generateId = () => Math.random().toString(36).substr(2, 9);

// 使用本地時間 (修正時區問題)
const todayStr = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const checkTimeGap = (appointments, targetDate, targetTime, excludeId = null) => {
  const targetMin = parseInt(targetTime.split(':')[0]) * 60 + parseInt(targetTime.split(':')[1]);
  const conflicts = appointments.filter(a => a.date === targetDate && a.id !== excludeId);
  for (let appt of conflicts) {
    const apptMin = parseInt(appt.time.split(':')[0]) * 60 + parseInt(appt.time.split(':')[1]);
    if (Math.abs(targetMin - apptMin) < 180) return appt;
  }
  return null;
};

// ==========================================
// 3. 通用 UI 元件
// ==========================================

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-stone-800 text-white shadow-lg active:scale-95",
    secondary: "bg-emerald-50 text-emerald-700 active:scale-95",
    accent: "bg-[#B49A85] text-white shadow-lg active:scale-95",
    danger: "bg-rose-50 text-rose-500 active:bg-rose-100",
    excel: "bg-emerald-600 text-white shadow-lg active:scale-95",
    outline: "border border-stone-200 text-stone-500",
    ghost: "text-stone-400 p-2"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-2xl px-5 py-3.5 font-bold transition-all flex items-center justify-center gap-2 select-none disabled:opacity-50 ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />} {children}
    </button>
  );
};

const ModalSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 pb-12 space-y-5 animate-slide-up relative z-10 shadow-2xl max-h-[95dvh] overflow-y-auto no-scrollbar">
        <div className="md:hidden w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-2"></div>
        <div className="flex justify-between items-center mb-2">
           <h3 className="text-2xl font-serif font-black text-stone-800">{title}</h3>
           <button onClick={onClose} className="p-2 bg-stone-50 rounded-full text-stone-400"><X size={20}/></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const SearchableSelect = ({ label, options, value, onChange, onAddNew, placeholder = "打字搜尋..." }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = options.find(o => o.value === value);
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || (o.subLabel && o.subLabel.includes(search)));

  return (
    <div className="flex flex-col gap-2 relative">
      {label && <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">{label}</label>}
      <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 flex justify-between items-center cursor-pointer">
        <span className={selectedItem ? "text-stone-800 font-bold" : "text-stone-400"}>{selectedItem ? selectedItem.label : placeholder}</span>
        <ChevronRight size={18} className={`text-stone-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}/>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-2xl border border-stone-100 z-[110] overflow-hidden animate-fade-in">
          <div className="p-3 border-b bg-stone-50"><div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border"><Search size={16}/><input autoFocus className="bg-transparent w-full outline-none text-sm p-1" placeholder="輸入關鍵字..." value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()} /></div></div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setIsOpen(false); setSearch(''); }} className="px-5 py-4 text-sm hover:bg-stone-50 cursor-pointer border-b border-stone-50">
                <div className="font-bold text-stone-700">{o.label}</div><div className="text-[10px] text-stone-400">{o.subLabel}</div>
              </div>
            ))}
          </div>
          {onAddNew && <div onClick={() => { onAddNew(); setIsOpen(false); }} className="p-4 bg-stone-800 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"><UserPlus size={16}/> 建立新顧客</div>}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. 功能組件
// ==========================================

const CalendarView = ({ customers, services, appointments, onSaveAppt, onDeleteAppt, onGoToCheckout, showNotify }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr());
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewAppt, setViewAppt] = useState(null);
  const [apptForm, setApptForm] = useState({ customerId: '', serviceId: 'tbd', time: '12:00', date: todayStr(), notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const dayCounts = useMemo(() => {
    const counts = {};
    appointments.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
    return counts;
  }, [appointments]);

  const dailyAppts = appointments.filter(a => a.date === selectedDateStr).sort((a,b) => a.time.localeCompare(b.time));

  const handleSave = async () => {
    if (!apptForm.customerId) return alert("⚠️ 請務必選擇一位顧客！");
    
    // 檢查衝突
    const conflict = checkTimeGap(appointments, apptForm.date, apptForm.time, viewAppt?.id);
    if (conflict && !confirm(`⚠️ 時間衝突警示\n${conflict.time} 已有 ${conflict.customerName} 的預約。\n確定要插入此時段嗎？`)) return;

    const c = customers.find(x => x.id === apptForm.customerId);
    const s = services.find(x => x.id === apptForm.serviceId);
    
    setIsSaving(true);
    try {
        const saveData = {
            ...apptForm,
            customerName: c.name,
            serviceName: s?.name || "現場決定項目",
            precautions: c.precautions || ""
        };

        if (viewAppt?.id) saveData.id = viewAppt.id;

        await onSaveAppt(saveData);

        setSelectedDateStr(apptForm.date);
        setCurrentDate(new Date(apptForm.date)); 
        setShowAddModal(false); 
        setIsEditing(false); 
        setViewAppt(null);
        showNotify("✅ 預約已成功寫入資料庫！");

    } catch (error) {
        console.error("預約儲存失敗:", error);
        alert(`❌ 儲存失敗！\n\n錯誤代碼: ${error.message}\n請截圖此畫面給開發者。`);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#FDFCF8] overflow-hidden">
      <div className="md:w-96 bg-white p-6 border-r border-stone-100 shrink-0 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-serif font-black text-stone-800">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</h2>
           <div className="flex gap-1"><button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-stone-50 rounded-full"><ChevronLeft/></button><button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-stone-50 rounded-full"><ChevronRight/></button></div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-stone-300 uppercase mb-4 tracking-widest">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-y-4">
           {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
           {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1; 
              const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const count = dayCounts[dStr] || 0; 
              const isSelected = dStr === selectedDateStr;
              return (
                <button key={day} onClick={() => setSelectedDateStr(dStr)} className={`relative h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${isSelected ? 'bg-stone-800 text-white shadow-lg scale-110' : 'hover:bg-stone-50 text-stone-600'}`}>
                  <span className="text-sm font-bold">{day}</span>
                  {count > 0 && <span className={`text-[10px] font-black mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>{count}</span>}
                </button>
              );
           })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-40 no-scrollbar">
         <div className="flex justify-between items-end mb-8">
            <div><p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1 font-serif">Aura Schedule</p><h3 className="text-3xl font-serif font-black text-stone-800">{selectedDateStr}</h3></div>
            <Button variant="accent" icon={Plus} onClick={() => { setApptForm({customerId:'', serviceId:'tbd', time:'12:00', date:selectedDateStr, notes:''}); setViewAppt(null); setIsEditing(false); setShowAddModal(true); }}>新增行程</Button>
         </div>
         <div className="space-y-4">
            {dailyAppts.map(appt => (
               <div key={appt.id} onClick={() => { setViewAppt(appt); setApptForm(appt); setIsEditing(false); setShowAddModal(true); }} className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-6 cursor-pointer active:scale-[0.98] transition-all">
                  <div className="text-xl font-black text-stone-800 w-16 text-center border-r pr-6">{appt.time}</div>
                  <div className="flex-1"><div className="font-black text-stone-800 text-lg">{appt.customerName}</div><div className="text-sm text-stone-400 font-bold">{appt.serviceName}</div></div>
                  <ChevronRight size={20} className="text-stone-200"/>
               </div>
            ))}
            {dailyAppts.length === 0 && <div className="py-24 text-center text-stone-200 font-bold">當天尚未安排任何預約</div>}
         </div>
      </div>

      <ModalSheet isOpen={showAddModal} onClose={() => { setShowAddModal(false); setIsEditing(false); }} title={isEditing ? "編輯行程" : (viewAppt ? "行程細節" : "建立新行程")}>
         <div className="space-y-5">
            {(viewAppt && !isEditing) ? (
               <div className="space-y-6">
                  <div className="p-6 bg-stone-800 text-white rounded-[2rem] shadow-xl">
                     <h4 className="text-2xl font-black font-serif">{viewAppt.customerName}</h4>
                     <p className="text-stone-400 font-bold">{viewAppt.date} · {viewAppt.time}</p>
                     <div className="mt-4 inline-block bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/10">{viewAppt.serviceName}</div>
                  </div>
                  {viewAppt.precautions && <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-700 font-bold text-sm">⚠️ 注意事項：{viewAppt.precautions}</div>}
                  {viewAppt.notes && <div className="p-5 bg-stone-50 rounded-2xl text-stone-600 text-sm">{viewAppt.notes}</div>}
                  <div className="flex gap-3 pt-4 border-t border-stone-100">
                     <Button variant="danger" className="flex-1" onClick={() => { if(confirm("確定刪除此行程？")) { onDeleteAppt(viewAppt.id); setShowAddModal(false); } }}><Trash2 size={18}/></Button>
                     <Button variant="outline" className="flex-1" onClick={() => setIsEditing(true)}><Edit2 size={18}/> 修改預約</Button>
                     <Button variant="accent" className="flex-[1.5]" onClick={() => onGoToCheckout(viewAppt)}>前往結帳</Button>
                  </div>
               </div>
            ) : (
               <>
                  <SearchableSelect label="選擇顧客" options={customers.map(c => ({ label: c.name, value: c.id, subLabel: c.phone }))} value={apptForm.customerId} onChange={cid => { const c = customers.find(x => x.id === cid); if(c?.precautions) alert(`⚠️ 提醒：${c.precautions}`); setApptForm({...apptForm, customerId: cid}); }} onAddNew={() => alert("請至顧客管理新增顧客")}/>
                  <SearchableSelect label="預定課程" options={[{ label: '現場討論', value: 'tbd' }, ...services.map(s => ({ label: s.name, value: s.id, subLabel: `$${s.price}` }))]} value={apptForm.serviceId} onChange={val => setApptForm({...apptForm, serviceId: val})}/>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">日期</label><input type="date" className="w-full bg-stone-50 p-4 rounded-2xl outline-none" value={apptForm.date} onChange={e => setApptForm({...apptForm, date: e.target.value})} /></div>
                     <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">時間</label><input type="time" className="w-full bg-stone-50 p-4 rounded-2xl outline-none" value={apptForm.time} onChange={e => setApptForm({...apptForm, time: e.target.value})} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">備註</label><textarea className="w-full bg-stone-50 p-4 rounded-2xl h-24 resize-none outline-none" placeholder="輸入行程備註..." value={apptForm.notes} onChange={e => setApptForm({...apptForm, notes: e.target.value})} /></div>
                  <div className="flex gap-3 mt-2">
                     {isEditing && <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>取消修改</Button>}
                     <Button className="flex-[2] py-5 text-lg" disabled={isSaving} onClick={handleSave}>{isSaving ? "儲存中..." : (isEditing ? "儲存修改內容" : "建立預約行程")}</Button>
                  </div>
               </>
            )}
         </div>
      </ModalSheet>
    </div>
  );
};

// --- 結帳櫃檯 ---
const CheckoutView = ({ customers, services, products, onUpdateCustomer, onAddCustomer, showNotify, initialAppt }) => {
  const [selectedC, setSelectedC] = useState(initialAppt ? customers.find(c => c.id === initialAppt.customerId) : null);
  const [cart, setCart] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [txNote, setTxNote] = useState('');

  useEffect(() => {
     if (initialAppt && initialAppt.serviceId !== 'tbd') {
        const s = services.find(x => x.id === initialAppt.serviceId);
        if (s) setCart([{ ...s, uuid: generateId(), useSession: false, finalPrice: s.price }]);
     }
  }, [initialAppt]);

  const filteredItems = useMemo(() => {
     const all = [ ...services.map(s => ({ ...s, type: 'service' })), ...products.map(p => ({ ...p, type: 'product' })) ];
     return all.filter(i => i.name.toLowerCase().includes(searchItem.toLowerCase()));
  }, [services, products, searchItem]);

  const subtotal = cart.reduce((sum, i) => sum + (i.useSession ? 0 : (i.finalPrice || i.price || 0)), 0);
  const grandTotal = Math.max(0, subtotal - manualDiscount);

  const handleCheckout = async (method) => {
    if (!selectedC) return;
    let newBal = selectedC.balance; let newSess = selectedC.giftSessions || 0;
    const sessNeeded = cart.filter(i => i.useSession).length;
    if (sessNeeded > newSess) return showNotify("堂數不足", "error");
    if (method === 'balance' && newBal < grandTotal) return showNotify("餘額不足", "error");

    newSess -= sessNeeded;
    cart.forEach(i => { if (i.type === 'gift_session') newSess += (i.sessions || 0); if (i.type === 'topup') newBal += (i.price || 0); });
    if (method === 'balance') newBal -= grandTotal;

    const history = { id: generateId(), date: todayStr(), total: grandTotal, subtotal, discount: manualDiscount, note: txNote, method: method === 'balance' ? '餘額扣款' : '現金/刷卡', items: cart.map(i => i.name + (i.useSession ? '(扣堂)' : ` $${i.finalPrice || i.price}`)) };
    
    try {
        await onUpdateCustomer({ ...selectedC, balance: newBal, giftSessions: newSess, history: [history, ...(selectedC.history || [])] });
        showNotify("結帳完成！"); setSelectedC(null); setCart([]); setManualDiscount(0); setTxNote('');
    } catch(e) {
        alert("結帳失敗: " + e.message);
    }
  };

  if (!selectedC) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#FDFCF8] pb-40">
         <div className="w-full max-sm px-4 space-y-6 text-center">
            <h2 className="text-4xl font-serif font-black text-stone-800 tracking-tighter">結帳櫃檯</h2>
            <SearchableSelect options={customers.map(c => ({ label: c.name, value: c.id, subLabel: c.phone }))} value="" onChange={cid => setSelectedC(customers.find(c => c.id === cid))} />
         </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#FDFCF8] overflow-hidden">
       <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-40 no-scrollbar">
          <div className="flex justify-between items-center"><h3 className="text-xl font-black text-stone-800">選擇品項</h3><Button variant="ghost" onClick={() => setSelectedC(null)}><LogOut size={18}/> 換人</Button></div>
          <div className="grid grid-cols-2 gap-4">
             <div onClick={() => { const a = prompt("儲值金額"); if(a) setCart([...cart, { name: `帳戶儲值 $${a}`, price: parseInt(a), finalPrice: parseInt(a), type: 'topup', uuid: generateId() }]); }} className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] cursor-pointer active:scale-95 transition-all text-center"><div className="w-12 h-12 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm"><ArrowUpCircle size={24}/></div><div className="font-black text-emerald-800 font-serif">帳戶儲值</div></div>
             <div onClick={() => { const s = prompt("購課堂數"); const p = prompt("價格"); if(s) setCart([...cart, { name: `課程點數 ${s}堂`, price: parseInt(p), finalPrice: parseInt(p), type: 'gift_session', sessions: parseInt(s), uuid: generateId() }]); }} className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] cursor-pointer active:scale-95 transition-all text-center"><div className="w-12 h-12 bg-white text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm"><Gift size={24}/></div><div className="font-black text-orange-800 font-serif">購買堂數</div></div>
          </div>
          <div className="space-y-4">
             <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"/><input className="w-full bg-white border border-stone-100 p-4 pl-12 rounded-2xl outline-none font-bold" placeholder="打字搜尋名稱..." value={searchItem} onChange={e => setSearchItem(e.target.value)}/></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map(i => (
                   <div key={i.id} onClick={() => setCart([...cart, { ...i, uuid: generateId(), useSession: false, finalPrice: i.price }])} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all">
                      <div><div className="font-black text-stone-800 font-serif">{i.name}</div><div className="text-xs text-stone-400 font-bold">${i.price}</div></div>
                      <Plus size={18} className="text-stone-300"/>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div className="md:w-96 bg-white border-l border-stone-100 flex flex-col shadow-2xl z-10 h-full overflow-hidden">
          <div className="p-6 border-b border-stone-50 flex items-center gap-4 shrink-0">
             <div className="w-14 h-14 bg-stone-800 text-white rounded-[1.5rem] flex items-center justify-center text-2xl font-black font-serif">{selectedC.name[0]}</div>
             <div><div className="font-black text-stone-800 text-xl font-serif">{selectedC.name}</div><div className="text-xs text-stone-400 font-bold">餘額 ${selectedC.balance} · 堂數 {selectedC.giftSessions || 0}</div></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
             {cart.map(item => (
                <div key={item.uuid} className="bg-stone-50 p-5 rounded-[2rem] space-y-2 relative group">
                   <button onClick={() => setCart(cart.filter(i => i.uuid !== item.uuid))} className="absolute top-2 right-2 text-stone-300"><X size={16}/></button>
                   <div className="flex justify-between font-black text-stone-800 text-sm"><span>{item.name}</span></div>
                   <div className="flex justify-between items-center">
                      {item.type === 'service' ? <label className="flex items-center gap-1 text-[10px] font-bold text-stone-400"><input type="checkbox" className="rounded" checked={item.useSession} onChange={() => setCart(cart.map(i => i.uuid === item.uuid ? {...i, useSession: !i.useSession} : i))} /> 使用堂數</label> : <div/>}
                      <input type="number" className={`w-20 bg-white border border-stone-100 rounded-lg px-2 py-1 text-right font-black text-sm ${item.useSession ? 'text-stone-200 line-through' : 'text-emerald-600'}`} value={item.finalPrice} onChange={e => setCart(cart.map(i => i.uuid === item.uuid ? {...i, finalPrice: parseInt(e.target.value)||0} : i))} disabled={item.useSession} />
                   </div>
                </div>
             ))}
          </div>
          <div className="p-6 bg-stone-50 border-t border-stone-100 space-y-4 shrink-0 pb-32 md:pb-6">
             <div className="space-y-3">
                <div className="flex items-center gap-2"><label className="text-[10px] font-black text-rose-400 uppercase">全單折扣</label><input type="number" className="flex-1 bg-white border border-stone-100 p-2 rounded-xl font-black text-rose-600 text-sm outline-none" value={manualDiscount} onChange={e => setManualDiscount(parseInt(e.target.value)||0)} /></div>
                <textarea className="w-full bg-white border border-stone-100 p-3 rounded-xl h-16 text-xs resize-none outline-none" placeholder="本次交易備註..." value={txNote} onChange={e => setTxNote(e.target.value)} />
             </div>
             <div className="flex justify-between items-end border-t border-stone-200 pt-3"><span className="text-stone-400 font-black uppercase text-[10px]">Grand Total</span><span className="text-4xl font-serif font-black text-stone-800">${grandTotal}</span></div>
             <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => handleCheckout('cash')}>現金/刷卡</Button><Button onClick={() => handleCheckout('balance')} disabled={selectedC.balance < grandTotal}>餘額扣款</Button></div>
          </div>
       </div>
    </div>
  );
};

// --- 顧客管理 ---
const CustomerView = ({ customers, onUpdateCustomer, onDeleteCustomer, onAddCustomer, showNotify }) => {
  const [search, setSearch] = useState('');
  const [viewC, setViewC] = useState(null);
  const [editHist, setEditHist] = useState(null);
  const [isEditProfile, setIsEditProfile] = useState(false);

  const filtered = customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)));

  if (viewC) return (
      <div className="h-full overflow-y-auto p-6 space-y-6 pb-40 bg-[#FDFCF8] no-scrollbar">
        <button className="flex items-center gap-2 text-stone-400 font-bold" onClick={() => setViewC(null)}><ChevronLeft size={20}/> 返回名單</button>
        <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm text-center">
           <div className="w-24 h-24 bg-stone-800 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto mb-4 font-serif">{viewC.name[0]}</div>
           <h2 className="text-3xl font-serif font-black text-stone-800">{viewC.name}</h2>
           <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-stone-50 p-5 rounded-3xl"><div className="text-[10px] text-stone-400 font-black uppercase mb-1">Balance</div><div className="text-2xl font-black text-emerald-600 font-serif">${viewC.balance}</div></div>
              <div className="bg-stone-50 p-5 rounded-3xl"><div className="text-[10px] text-stone-400 font-black uppercase mb-1">Sessions</div><div className="text-2xl font-black text-stone-800 font-serif">{viewC.giftSessions || 0}</div></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-100 space-y-4">
           <div><label className="text-[10px] font-black text-rose-400 block mb-1 uppercase tracking-widest underline">重要注意事項</label><p className="text-rose-700 font-bold text-sm">{viewC.precautions || "無"}</p></div>
           <div className="pt-4 border-t border-stone-50"><label className="text-[10px] font-black text-stone-400 block mb-1 uppercase tracking-widest underline">一般備註</label><p className="text-stone-700 font-medium text-sm whitespace-pre-line">{viewC.notes || "無備註"}</p></div>
        </div>

        <div className="space-y-4"><h3 className="font-black text-stone-800 font-serif text-xl">消費歷史紀錄</h3>
           {viewC.history?.map(h => (
              <div key={h.id} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex flex-col gap-2 relative">
                 <div className="flex justify-between items-start">
                    <div className="flex-1"><div className="text-xs font-black text-stone-300 font-serif">{h.date}</div><div className="font-bold text-stone-800 text-sm">{h.items?.join(', ')}</div>{h.note && <div className="text-[10px] text-stone-400 mt-1 bg-stone-50 p-2 rounded-lg">備註：{h.note}</div>}</div>
                    <div className="text-right flex flex-col items-end"><div className="text-xl font-black text-stone-800 font-serif">${h.total}</div><div className="text-[10px] text-stone-400 font-bold uppercase">{h.method}</div></div>
                 </div>
                 <div className="flex justify-end gap-3 pt-2 border-t border-stone-50">
                    <button onClick={() => setEditHist(h)} className="text-xs font-black text-stone-400 hover:text-stone-800 flex items-center gap-1"><Edit2 size={12}/> 修改</button>
                    <button onClick={() => { if(confirm("確定刪除紀錄？")) { const newH = viewC.history.filter(x => x.id !== h.id); const updatedC = {...viewC, history: newH}; onUpdateCustomer(updatedC).then(() => setViewC(updatedC)).catch(e => alert(e.message)); } }} className="text-xs font-black text-rose-300 hover:text-rose-500 flex items-center gap-1"><Trash2 size={12}/> 刪除</button>
                 </div>
              </div>
           ))}
        </div>
        <div className="flex gap-3"><Button variant="danger" className="flex-1" onClick={() => { if(confirm("確定刪除顧客？")) { onDeleteCustomer(viewC.id); setViewC(null); } }}>刪除顧客</Button><Button className="flex-[2]" onClick={() => setIsEditProfile(true)}>修改資料</Button></div>
        
        <ModalSheet isOpen={!!editHist} onClose={() => setEditHist(null)} title="修改消費紀錄">
           {editHist && (
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase pl-1">日期</label><input type="date" className="w-full bg-stone-50 p-4 rounded-2xl outline-none font-bold" value={editHist.date} onChange={e => setEditHist({...editHist, date: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase pl-1">總額</label><input type="number" className="w-full bg-stone-50 p-4 rounded-2xl outline-none font-bold" value={editHist.total} onChange={e => setEditHist({...editHist, total: parseInt(e.target.value)||0})} /></div>
                 </div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase pl-1">備註</label><textarea className="w-full bg-stone-50 p-4 rounded-2xl h-24 resize-none outline-none" value={editHist.note || ''} onChange={e => setEditHist({...editHist, note: e.target.value})} /></div>
                 <Button className="w-full py-5" onClick={async () => {
                    const newH = viewC.history.map(h => h.id === editHist.id ? editHist : h);
                    try {
                        await onUpdateCustomer({...viewC, history: newH});
                        setViewC({...viewC, history: newH}); 
                        setEditHist(null); 
                        showNotify("紀錄修改成功");
                    } catch(e) { alert(e.message); }
                 }}>確認更新</Button>
              </div>
           )}
        </ModalSheet>
        <ModalSheet isOpen={isEditProfile} onClose={() => setIsEditProfile(false)} title="詳細資料編輯"><CustomerFormView initialData={viewC} onSave={async c => { try{ await onUpdateCustomer(c); setViewC(c); setIsEditProfile(false); }catch(e){alert(e.message);} }} onCancel={() => setIsEditProfile(false)}/></ModalSheet>
     </div>
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-[#FDFCF8] pb-32 overflow-y-auto no-scrollbar">
       <div className="flex justify-between items-center"><h2 className="text-2xl font-serif font-black text-stone-800">顧客管理</h2><Button size="sm" variant="accent" icon={Plus} onClick={() => setIsEditProfile(true)}>新增顧客</Button></div>
       <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"/><input className="w-full bg-white border border-stone-100 p-4 pl-12 rounded-[2rem] shadow-sm outline-none font-medium font-serif" placeholder="搜尋姓名..." value={search} onChange={e => setSearch(e.target.value)} /></div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
             <div key={c.id} onClick={() => setViewC(c)} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all cursor-pointer"><div className="w-14 h-14 bg-stone-100 text-stone-600 rounded-2xl flex items-center justify-center text-xl font-bold font-serif">{c.name[0]}</div><div className="flex-1 min-w-0"><div className="font-bold text-stone-800 text-lg font-serif">{c.name}</div><div className="text-[10px] text-stone-400 font-bold uppercase">{c.phone || "No Phone"}</div></div><div className="text-right"><div className="text-sm font-black text-emerald-600 font-serif">${c.balance}</div><div className="text-[10px] font-black text-stone-300 uppercase">{c.giftSessions || 0} Sess</div></div></div>
          ))}
       </div>
       <ModalSheet isOpen={isEditProfile && !viewC} onClose={() => setIsEditProfile(false)} title="建立新顧客檔案"><CustomerFormView onSave={async c => { try{ await onAddCustomer(c); setIsEditProfile(false); }catch(e){alert(e.message);} }} onCancel={() => setIsEditProfile(false)}/></ModalSheet>
    </div>
  );
};

// --- ★★★ 新增功能：報表分析 (頻率統計) ★★★ ---
const ReportView = ({ appointments }) => {
    const [start, setStart] = useState(todayStr());
    const [end, setEnd] = useState(todayStr());
    const [results, setResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleAnalyze = () => {
        // 1. 篩選日期
        const filtered = appointments.filter(a => a.date >= start && a.date <= end);
        
        // 2. 統計次數與資料
        const stats = {};
        filtered.forEach(a => {
            const key = a.customerId || a.customerName; // 優先使用 ID，無 ID 則用 Name 分組
            if (!stats[key]) {
                stats[key] = {
                    id: a.customerId,
                    name: a.customerName,
                    count: 0,
                    records: []
                };
            }
            stats[key].count++;
            stats[key].records.push(a);
        });

        // 3. 轉換為陣列並排序 (次數多到少)
        const sorted = Object.values(stats).sort((a, b) => b.count - a.count);
        setResults(sorted);
        setSelectedUser(null);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#FDFCF8] overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto no-scrollbar pb-40">
                <div className="mb-6 space-y-4">
                    <h2 className="text-2xl font-serif font-black text-stone-800">來客頻率分析</h2>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">開始日期</label><input type="date" className="w-full bg-stone-50 p-4 rounded-2xl outline-none font-bold" value={start} onChange={e => setStart(e.target.value)} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">結束日期</label><input type="date" className="w-full bg-stone-50 p-4 rounded-2xl outline-none font-bold" value={end} onChange={e => setEnd(e.target.value)} /></div>
                        </div>
                        <Button className="w-full" onClick={handleAnalyze} icon={Search}>開始查詢區段</Button>
                    </div>
                </div>

                {results.length > 0 ? (
                    <div className="space-y-3">
                        <div className="px-2 text-xs font-black text-stone-400 uppercase flex justify-between"><span>顧客名稱</span><span>區段來訪次數</span></div>
                        {results.map((r, idx) => (
                            <div key={idx} onClick={() => setSelectedUser(r)} className={`p-5 rounded-[2rem] border flex justify-between items-center cursor-pointer transition-all ${selectedUser === r ? 'bg-stone-800 text-white border-stone-800 shadow-lg' : 'bg-white border-stone-100 hover:bg-stone-50 text-stone-800'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx < 3 ? 'bg-amber-300 text-amber-900' : 'bg-stone-100 text-stone-400'}`}>{idx + 1}</div>
                                    <div className="font-bold text-lg font-serif">{r.name}</div>
                                </div>
                                <div className="font-black text-2xl font-serif">{r.count} <span className="text-xs font-normal opacity-50">次</span></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-stone-300 font-bold">請選擇日期並點擊查詢</div>
                )}
            </div>

            {selectedUser && (
                <div className="md:w-96 bg-white border-l border-stone-100 p-6 overflow-y-auto shadow-2xl z-10">
                    <div className="mb-6 pb-6 border-b border-stone-100">
                        <h3 className="text-2xl font-serif font-black text-stone-800">{selectedUser.name}</h3>
                        <div className="text-stone-400 font-bold text-sm mt-1">區間總計 {selectedUser.count} 次預約</div>
                    </div>
                    <div className="space-y-3">
                        {selectedUser.records.map((rec, i) => (
                            <div key={i} className="bg-stone-50 p-4 rounded-2xl">
                                <div className="text-xs font-black text-stone-400 mb-1">{rec.date} {rec.time}</div>
                                <div className="font-bold text-stone-800">{rec.serviceName}</div>
                                {rec.notes && <div className="text-xs text-stone-500 mt-2 bg-white p-2 rounded-lg">{rec.notes}</div>}
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" className="w-full mt-6" onClick={() => setSelectedUser(null)}>關閉明細</Button>
                </div>
            )}
        </div>
    );
};

// --- 店務設定 (匯出 Excel 功能) ---
const SettingsView = ({ services, products, onAddService, onUpdateService, onDeleteService, onAddProduct, onUpdateProduct, onDeleteProduct, onExport }) => {
   const [tab, setTab] = useState('services');
   const [search, setSearch] = useState('');
   const [editItem, setEditItem] = useState(null);
   const list = (tab === 'services' ? services : products).filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

   // 封裝錯誤處理
   const handleAction = async (action, data) => {
       try { await action(data); setEditItem(null); } catch(e) { alert("操作失敗: " + e.message); }
   };

   return (
      <div className="h-full p-6 bg-[#FDFCF8] overflow-y-auto pb-40 no-scrollbar">
         <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif font-black text-stone-800">店務設定</h2><Button variant="accent" onClick={() => setEditItem({ name: '', price: 0, costPrice: 0 })}>新增項目</Button></div>
         <div className="flex gap-2 p-1.5 bg-stone-100 rounded-[2rem] mb-6"><button className={`flex-1 py-3 rounded-[1.5rem] text-sm font-black transition-all ${tab==='services' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`} onClick={()=>setTab('services')}>課程列表</button><button className={`flex-1 py-3 rounded-[1.5rem] text-sm font-black transition-all ${tab==='products' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`} onClick={()=>setTab('products')}>產品列表</button></div>
         <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"/><input className="w-full bg-white border border-stone-100 p-4 pl-12 rounded-2xl outline-none font-bold font-serif" placeholder="搜尋項目..." value={search} onChange={e => setSearch(e.target.value)}/></div>
         <div className="space-y-3">{list.map(i => (
            <div key={i.id} className="bg-white p-6 rounded-3xl border border-stone-100 flex justify-between shadow-sm">
               <div><div className="font-black text-stone-800 text-lg font-serif">{i.name}</div><div className="text-sm text-emerald-600 font-black font-serif">${i.price} {tab==='products' && <span className="text-stone-300 text-[10px] ml-2">成本: ${i.costPrice || 0}</span>}</div></div>
               <div className="flex gap-1"><button onClick={() => setEditItem(i)} className="p-3 text-stone-300 hover:text-stone-800"><Edit2 size={18}/></button><button onClick={() => { if(confirm("確定刪除？")) { const df = tab==='services'?onDeleteService:onDeleteProduct; handleAction(df, i.id); } }} className="p-3 text-stone-300 hover:text-rose-500"><Trash2 size={18}/></button></div>
            </div>
         ))}</div>

         <div className="mt-16 p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
            <h4 className="text-emerald-800 font-black text-sm uppercase mb-2 flex items-center gap-2"><Download size={16}/> 數據備份與匯出</h4>
            <p className="text-xs text-emerald-600 mb-6">點擊下方按鈕將產生包含顧客、消費紀錄、預約及產品清單的 Excel 報表。</p>
            <Button variant="excel" className="w-full" icon={FileSpreadsheet} onClick={onExport}>匯出全店 Excel 報表 (.xlsx)</Button>
         </div>

         <ModalSheet isOpen={!!editItem} onClose={() => setEditItem(null)} title="項目管理">
            {editItem && (
               <div className="space-y-5">
                  <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">名稱</label><input className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">售價</label><input type="number" className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={editItem.price} onChange={e => setEditItem({...editItem, price: parseInt(e.target.value)||0})} /></div>
                     {tab === 'products' && <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">成本價</label><input type="number" className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={editItem.costPrice} onChange={e => setEditItem({...editItem, costPrice: parseInt(e.target.value)||0})} /></div>}
                  </div>
                  <Button className="w-full py-5 text-lg" onClick={() => { const fn = tab === 'services' ? (editItem.id ? onUpdateService : onAddService) : (editItem.id ? onUpdateProduct : onAddProduct); handleAction(fn, editItem); }}>儲存內容</Button>
               </div>
            )}
         </ModalSheet>
      </div>
   );
};

// --- 顧客資料編輯 ---
const CustomerFormView = ({ initialData, onSave, onCancel, isModal }) => {
  const [form, setForm] = useState(initialData || { name: '', phone: '', skinType: '', precautions: '', notes: '', balance: 0, giftSessions: 0, history: [] });
  return (
    <div className={`flex flex-col ${isModal ? '' : 'p-6 max-w-xl mx-auto pb-40'}`}>
       <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">姓名</label><input className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">電話</label><input className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">肌膚狀況描述</label><input className="w-full bg-stone-50 p-4 rounded-2xl font-bold font-serif" value={form.skinType} onChange={e => setForm({...form, skinType: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-rose-400 uppercase tracking-widest pl-1 font-serif underline">⚠️ 重要注意事項</label><textarea className="w-full bg-rose-50 p-4 rounded-2xl h-24 font-bold text-rose-700 resize-none font-serif" value={form.precautions} onChange={e => setForm({...form, precautions: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1 font-serif">一般備註紀錄</label><textarea className="w-full bg-stone-50 p-4 rounded-2xl h-32 resize-none font-serif" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
       </div>
       <div className="pt-6 flex gap-3"><Button variant="outline" className="flex-1" onClick={onCancel}>取消</Button><Button className="flex-[2]" onClick={() => { if(!form.name) return; onSave(form); }}>確認存檔</Button></div>
    </div>
  );
};

// --- 通知中心 (明日提示邏輯) ---
const NotificationCenter = ({ appointments, onClose }) => {
  const tomorrow = tomorrowStr();
  const tmAppts = appointments.filter(a => a.date === tomorrow).sort((a,b) => a.time.localeCompare(b.time));
  return (
    <div className="space-y-4 font-serif">
       <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl font-black flex items-center gap-2 mb-4"><Bell size={18}/> 明日共 {tmAppts.length} 位預約</div>
       <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          {tmAppts.map(a => (
             <div key={a.id} className="bg-stone-50 p-5 rounded-[2rem] border border-stone-100">
                <div className="font-black text-stone-800 text-lg">{a.customerName}</div>
                <div className="text-xs text-stone-400 font-bold">{a.time} · {a.serviceName}</div>
                {a.precautions && <div className="mt-2 text-xs bg-rose-50 p-3 rounded-xl text-rose-600 font-bold">注意事項：{a.precautions}</div>}
             </div>
          ))}
          {tmAppts.length === 0 && <p className="text-center py-10 text-stone-300 font-bold">明日尚無預約</p>}
       </div>
       <Button variant="outline" className="w-full" onClick={onClose}>關閉通知</Button>
    </div>
  );
};

// ==========================================
// 5. 主程式架構
// ==========================================

export default function BeautySystem() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  const [checkoutAppt, setCheckoutAppt] = useState(null);
  const [showNotiBell, setShowNotiBell] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    signInAnonymously(auth).catch(error => {
        console.error("Firebase Auth Error:", error);
        alert("Firebase 連線失敗！請檢查 Console (F12) 的錯誤訊息。");
    });
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return; 
    const collections = ['customers', 'services', 'products', 'appointments'];
    const unsubs = collections.map(name => {
      const q = query(collection(db, `${DATA_PATH}/${name}`));
      // ★ 加上 Snapshot Error Logging
      return onSnapshot(q, 
        (snap) => {
          const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          if (name === 'customers') setCustomers(data);
          if (name === 'services') setServices(data);
          if (name === 'products') setProducts(data);
          if (name === 'appointments') setAppointments(data);
        },
        (error) => {
          console.error(`讀取 ${name} 失敗:`, error);
          if(error.code === 'permission-denied') alert(`權限不足：無法讀取 ${name}，請檢查 Firebase Rules`);
        }
      );
    });
    return () => unsubs.forEach(u => u());
  }, [user]);

  // ★★★ 修正 dbOp：捕捉錯誤並拋出，讓 UI 層可以接住 ★★★
  const dbOp = {
    add: async (coll, data) => {
        try {
            // 安全檢查：確保不會傳 undefined 給 Firebase
            const cleanData = JSON.parse(JSON.stringify(data)); // 深拷貝移除 undefined
            await addDoc(collection(db, `${DATA_PATH}/${coll}`), cleanData);
        } catch (e) {
            console.error(`Firebase ADD Failed [${coll}]:`, e);
            throw e; // 拋出錯誤讓外層捕捉
        }
    },
    update: async (coll, data) => {
        const {id, ...rest} = data;
        try {
            await updateDoc(doc(db, `${DATA_PATH}/${coll}`, id), rest);
        } catch (e) {
            console.error(`Firebase UPDATE Failed [${coll}]:`, e);
            throw e;
        }
    },
    delete: async (coll, id) => {
        try {
            await deleteDoc(doc(db, `${DATA_PATH}/${coll}`, id));
        } catch (e) {
            console.error(`Firebase DELETE Failed [${coll}]:`, e);
            throw e;
        }
    }
  };

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 核心：Excel 匯出邏輯
  const handleExportExcel = () => {
    if (typeof XLSX === 'undefined') return alert("Excel 引擎載入中，請稍候再試...");

    // 1. 顧客資料表
    const custData = customers.map(c => ({
       "顧客姓名": c.name,
       "電話": c.phone,
       "儲值餘額": c.balance,
       "剩餘堂數": c.giftSessions || 0,
       "肌膚狀況": c.skinType,
       "重要注意事項": c.precautions,
       "一般備註": c.notes
    }));

    // 2. 消費紀錄總表 (攤平)
    const historyData = [];
    customers.forEach(c => {
       (c.history || []).forEach(h => {
          historyData.push({
             "消費日期": h.date,
             "顧客姓名": c.name,
             "消費項目": h.items.join("、"),
             "應付金額": h.subtotal || h.total,
             "折扣後金額": h.total,
             "手動折扣": h.discount || 0,
             "付款方式": h.method,
             "交易備註": h.note
          });
       });
    });

    // 3. 預約清單
    const apptData = appointments.map(a => ({
       "預約日期": a.date,
       "預約時間": a.time,
       "顧客姓名": a.customerName,
       "服務項目": a.serviceName,
       "備註": a.notes
    }));

    // 4. 課程與產品
    const servData = services.map(s => ({ "課程名稱": s.name, "售價": s.price }));
    const prodData = products.map(p => ({ "產品名稱": p.name, "售價": p.price, "成本價": p.costPrice || 0 }));

    // 建立 Workbook
    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custData), "顧客總表");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData), "消費紀錄總表");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apptData), "預約清單");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(servData), "課程價目");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodData), "產品清單");

    // 下載
    XLSX.writeFile(wb, `肌本AURA_全店營運備份_${todayStr()}.xlsx`);
    showNotify("Excel 報表匯出成功");
  };

  const hasTomorrowAppts = useMemo(() => {
     return appointments.some(a => a.date === tomorrowStr());
  }, [appointments]);

  return (
    <div className="w-full h-[100dvh] bg-stone-50 flex font-sans text-stone-600 overflow-hidden text-[16px]">
        <SystemInjector />
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-100 p-6 space-y-4 z-20 shadow-sm shrink-0">
            <div className="py-4 mb-6"><h1 className="text-3xl font-serif font-black text-stone-800 leading-tight tracking-tighter">肌本<br/>AURA</h1></div>
            {[
               { id: 'calendar', icon: CalendarIcon, label: '預約行程' },
               { id: 'checkout', icon: CreditCard, label: '結帳櫃檯' },
               { id: 'customers', icon: Users, label: '顧客管理' },
               { id: 'reports', icon: BarChart3, label: '報表分析' }, // 新增的 Tab
               { id: 'settings', icon: Settings, label: '店務設定' },
            ].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all font-bold ${activeTab === tab.id ? 'bg-stone-800 text-white shadow-xl' : 'text-stone-400 hover:bg-stone-50 font-serif'}`}><tab.icon size={22}/><span className="text-sm">{tab.label}</span></button>
            ))}
        </aside>

        <main className="flex-1 h-full overflow-hidden relative flex flex-col bg-[#FDFCF8]">
             <div className="h-16 px-6 bg-white/50 backdrop-blur-md flex justify-between items-center border-b shrink-0 z-30">
                <div className="md:hidden font-serif font-black text-xl text-stone-800">肌本 AURA</div><div className="hidden md:block" />
                <button onClick={() => setShowNotiBell(true)} className="relative p-2 bg-white rounded-full shadow-sm active:scale-95 transition-all">
                   <Bell size={24} className="text-stone-800" />
                   {hasTomorrowAppts && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
             </div>
             {notification && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-full shadow-2xl bg-stone-800 text-white text-sm font-black animate-fade-in">{notification.msg}</div>}
             <div className="flex-1 overflow-hidden relative w-full h-full">
                {activeTab === 'calendar' && <CalendarView customers={customers} services={services} appointments={appointments} onSaveAppt={d=>d.id?dbOp.update('appointments',d):dbOp.add('appointments',d)} onDeleteAppt={id=>dbOp.delete('appointments',id)} onAddCustomer={d=>dbOp.add('customers',d)} onGoToCheckout={a=>{setCheckoutAppt(a); setActiveTab('checkout');}} showNotify={showNotify}/>}
                {activeTab === 'checkout' && <CheckoutView customers={customers} services={services} products={products} onUpdateCustomer={d=>dbOp.update('customers',d)} onAddCustomer={d=>dbOp.add('customers',d)} showNotify={showNotify} initialAppt={checkoutAppt}/>}
                {activeTab === 'customers' && <CustomerView customers={customers} onUpdateCustomer={d=>dbOp.update('customers',d)} onDeleteCustomer={id=>dbOp.delete('customers',id)} onAddCustomer={d=>dbOp.add('customers',d)} showNotify={showNotify} />}
                {activeTab === 'reports' && <ReportView appointments={appointments} />}
                {activeTab === 'settings' && <SettingsView services={services} products={products} onAddService={d=>dbOp.add('services',d)} onUpdateService={d=>dbOp.update('services',d)} onDeleteService={id=>dbOp.delete('services',id)} onAddProduct={d=>dbOp.add('products',d)} onUpdateProduct={d=>dbOp.update('products',d)} onDeleteProduct={id=>dbOp.delete('products',id)} onExport={handleExportExcel} />}
             </div>
             <div className="md:hidden absolute bottom-6 left-4 right-4 h-20 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 flex justify-around items-center z-[40] px-2">
                 {[ 
                     { id: 'calendar', icon: CalendarIcon }, 
                     { id: 'checkout', icon: CreditCard }, 
                     { id: 'customers', icon: Users }, 
                     { id: 'reports', icon: BarChart3 }, // 新增的 Tab
                     { id: 'settings', icon: Settings } 
                 ].map(tab => ( <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCheckoutAppt(null); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab.id ? 'bg-stone-800 text-white shadow-xl -translate-y-3 scale-110' : 'text-stone-300'}`}><tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} /></button> ))}
             </div>
        </main>
        <ModalSheet isOpen={showNotiBell} onClose={() => setShowNotiBell(false)} title="肌本 AURA 通知中心"><NotificationCenter appointments={appointments} onClose={() => setShowNotiBell(false)} /></ModalSheet>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap');
        body { font-family: 'Noto Sans TC', sans-serif; -webkit-tap-highlight-color: transparent; }
        h1, h2, h3, h4 { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input, textarea, select { font-size: 16px !important; } 
      `}</style>
    </div>
  );
}
