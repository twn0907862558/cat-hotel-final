import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Cat, Trash2, Plus, X, 
  ChevronLeft, ChevronRight, LayoutGrid, Users, Search, Save, LogIn, LogOut, UserPlus, Home, Share2,
  Eye, Edit, Download, Upload, Image as ImageIcon, Phone, AlertCircle, CheckCircle, Info, FileText, MapPin, Heart, Shield, FileImage, AlertTriangle, Bell, Copy, MessageSquare, DollarSign, Wallet, Calculator, Check, Stethoscope, Utensils, Printer, FileSpreadsheet
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,       
  signOut                        
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  updateDoc,
} from 'firebase/firestore';

// --- 1. Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyBYI4gm9oTZETeWcLFofavkIqYztp68uGc",
  authDomain: "cathotel-b4f9c.firebaseapp.com",
  projectId: "cathotel-b4f9c",
  storageBucket: "cathotel-b4f9c.firebasestorage.app",
  messagingSenderId: "655343396612",
  appId: "1:655343396612:web:6c2dd729972835d34e9251",
  measurementId: "G-D32TZ5KTGV"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Aesthetic Configuration (Refined Morandi) ---
const THEME = {
  bg: 'bg-[#F2F0E9]', // 更溫暖的淺灰米色
  header: 'bg-white/80 backdrop-blur-md', // 毛玻璃效果 Header
  primary: 'bg-[#9A8478] hover:bg-[#826A5D]', // 莫蘭迪暖棕
  primaryText: 'text-[#9A8478]',
  secondary: 'bg-[#D3CDC0] hover:bg-[#C2BCAE]', // 淺卡其灰
  accent: 'text-[#C88D7D]', // 柔和陶土紅
  text: 'text-[#5E5550]', // 深暖灰
  subText: 'text-[#A09890]', // 淺暖灰
  border: 'border-[#E6E2D8]',
  card: 'bg-white shadow-sm border border-[#E6E2D8]',
  input: 'bg-white border-[#E0DCD4] focus:border-[#9A8478] focus:ring-2 focus:ring-[#9A8478]/20 transition-all',
  success: 'bg-[#94A89A]', // 莫蘭迪綠
  danger: 'text-[#C97C7C] bg-[#FFF0F0]', // 柔和紅
  activeTab: 'bg-[#9A8478] text-white shadow-md transform scale-105',
  inactiveTab: 'text-[#A09890] hover:bg-[#E6E2D8]/50',
};

// --- Room Configuration ---
const ROOM_CONFIG = {
  small: {
    label: '溫馨小型房',
    price: 600, 
    rooms: ['101', '102', '103', '104', '201', '202', '203', '204'],
    bg: 'bg-white',
    border: 'border-[#E6E2D8]',
    tag: 'bg-[#F0EBE5] text-[#8C8279]'
  },
  medium: {
    label: '舒適中型房',
    price: 1000, 
    rooms: ['A', 'B', 'C', 'D'],
    bg: 'bg-[#FAF8F5]',
    border: 'border-[#DED8CF]',
    tag: 'bg-[#E6E2D8] text-[#5E5550]'
  },
  large: {
    label: '豪華 VIP 房',
    price: 1500, 
    rooms: ['VIP'],
    bg: 'bg-[#F5F2EB]',
    border: 'border-[#D3CDC0]',
    tag: 'bg-[#9A8478] text-white'
  }
};

const EXTRA_CAT_PRICE = 200; 

// --- Helpers ---
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isDateOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

const calculateTotal = (roomType, startDate, endDate, catCount) => {
    if (!startDate || !endDate || !roomType) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    const basePrice = ROOM_CONFIG[roomType]?.price || 0;
    const count = parseInt(catCount) || 1;
    const extraFee = (count > 1) ? (count - 1) * EXTRA_CAT_PRICE : 0;
    return diffDays * (basePrice + extraFee);
};

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
        reader.onerror = reject;
    });
};

const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return alert("沒有資料可匯出");
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => `"${String(row[fieldName] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handlePrint = () => {
    window.print();
};

const DEFAULT_PET = { 
  name: '', gender: 'boy', isNeutered: 'yes', 
  litterHabit: 'normal', litterType: 'mineral', 
  diet: 'canned', isRawFood: false, 
  hasBoardingExp: 'no', personality: '', 
  deworming: '', photo: null, vaccinationBook: null,
  notes: '' 
};

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [activeTab, setActiveTab] = useState('rooms');
  const [viewDate, setViewDate] = useState(formatDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  // Custom Alert/Confirm States
  const [genericConfirm, setGenericConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Special Confirmation for Settle
  const [settleConfirmation, setSettleConfirmation] = useState(null);

  // Forms
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    ownerName: '', petName: '', phone: '', startDate: formatDate(new Date()), endDate: '', 
    checkInTime: '14:00', checkOutTime: '11:00', notes: '', deposit: '', balance: '', totalAmount: '', catCount: 1
  });
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', emergencyName: '', emergencyPhone: '', pets: [], notes: '' });
  const [tempPet, setTempPet] = useState({ ...DEFAULT_PET });
  const [editingPetIndex, setEditingPetIndex] = useState(-1);
  const [isPetFormVisible, setIsPetFormVisible] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  
  // UI Helpers
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPetSuggestions, setShowPetSuggestions] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Auth Init ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- Data Sync ---
  const getPath = (col) => collection(db, col);
  
  useEffect(() => {
    const unsubB = onSnapshot(query(getPath('bookings')), 
        (s) => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => console.error("Bookings sync failed", err)
    );
    
    const unsubC = onSnapshot(query(getPath('customers')), 
        (s) => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => console.error("Customers sync failed", err)
    );

    return () => { unsubB(); unsubC(); };
  }, []);

  // --- Toast Helper ---
  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  // --- Logic Helpers ---
  const getPetName = (p) => typeof p === 'string' ? p : p.name;
  
  const getPetDetails = (p) => {
    if (typeof p === 'string') return { ...DEFAULT_PET, name: p };
    return { ...DEFAULT_PET, ...p };
  };

  // --- Date Change Helper ---
  const changeDate = (days) => {
      const result = new Date(viewDate);
      result.setDate(result.getDate() + days);
      setViewDate(formatDate(result));
  };

  // --- Estimation ---
  const estimatedInfo = useMemo(() => {
      if (!selectedRoom || !bookingForm.startDate || !bookingForm.endDate) return null;
      const days = Math.ceil((new Date(bookingForm.endDate) - new Date(bookingForm.startDate)) / (86400000));
      if (days <= 0) return null;
      const basePrice = ROOM_CONFIG[selectedRoom.type]?.price || 0;
      const extraFee = (bookingForm.catCount > 1) ? (bookingForm.catCount - 1) * EXTRA_CAT_PRICE : 0;
      return { days, total: days * (basePrice + extraFee), basePrice, extraFee };
  }, [selectedRoom, bookingForm.startDate, bookingForm.endDate, bookingForm.catCount]);

  // --- Form Updates ---
  const updateBooking = (field, val) => {
      if (!selectedRoom) return;
      const next = { ...bookingForm, [field]: val };
      if (['startDate', 'endDate', 'catCount'].includes(field)) {
          const newTotal = calculateTotal(selectedRoom.type, next.startDate, next.endDate, next.catCount);
          next.totalAmount = newTotal;
          next.balance = newTotal - (parseInt(next.deposit) || 0);
      }
      if (field === 'deposit') next.balance = (parseInt(next.totalAmount) || 0) - (parseInt(val) || 0);
      if (field === 'totalAmount') next.balance = (parseInt(val) || 0) - (parseInt(next.deposit) || 0);
      setBookingForm(next);
  };

  // --- Handlers ---
  const handleOpenBookingModal = (roomId = null, type = null, defaultDate = null, booking = null) => {
    if (!roomId) { roomId = '101'; type = 'small'; }
    setSelectedRoom({ id: roomId, type });
    setFormError('');

    if (booking) {
        setEditingBookingId(booking.id);
        setBookingForm({
            ownerName: booking.ownerName,
            petName: booking.petName,
            phone: booking.phone,
            startDate: booking.startDate,
            endDate: booking.endDate,
            checkInTime: booking.checkInTime || '14:00',
            checkOutTime: booking.checkOutTime || '11:00',
            notes: booking.notes || '',
            deposit: booking.deposit || '',
            balance: booking.balance || '',
            totalAmount: booking.totalAmount || '', 
            catCount: booking.catCount || 1
        });
    } else {
        setEditingBookingId(null);
        const start = defaultDate || viewDate;
        const end = formatDate(new Date(new Date(start).setDate(new Date(start).getDate() + 1)));
        const initTotal = calculateTotal(type, start, end, 1);
        setBookingForm({
            ownerName: '', petName: '', phone: '', notes: '',
            startDate: start, endDate: end, checkInTime: '14:00', checkOutTime: '11:00',
            deposit: '', balance: initTotal, totalAmount: initTotal, catCount: 1 
        });
    }
    setShowNameSuggestions(false);
    setShowPetSuggestions(false);
    setIsBookingModalOpen(true);
  };

  const handleBookingSubmit = async () => {
    try {
        if (!bookingForm.ownerName || !bookingForm.petName) { 
            setFormError('請填寫完整資訊'); 
            return; 
        }
        
        // Conflict Check (Fix: strictly exclude current editing ID)
        const conflict = bookings.find(b => {
            // 如果是編輯模式，先排除自己
            if (editingBookingId && b.id === editingBookingId) return false;
            
            return (
                b.roomId === selectedRoom.id && 
                isDateOverlap(b.startDate, b.endDate, bookingForm.startDate, bookingForm.endDate)
            );
        });

        if (conflict) { 
            setFormError(`此時段 (${conflict.startDate} ~ ${conflict.endDate}) 房間已被 ${conflict.petName} 預約`); 
            return; 
        }
        
        const payload = {
            ...bookingForm,
            deposit: parseInt(bookingForm.deposit) || 0,
            balance: parseInt(bookingForm.balance) || 0,
            totalAmount: parseInt(bookingForm.totalAmount) || 0,
            catCount: parseInt(bookingForm.catCount) || 1,
            roomId: selectedRoom.id, 
            roomType: selectedRoom.type,
            updatedAt: new Date().toISOString()
        };
        
        if (editingBookingId) {
            await updateDoc(doc(getPath('bookings'), editingBookingId), payload);
        } else {
            await addDoc(getPath('bookings'), { 
                ...payload, 
                createdBy: user?.email || 'Anon', 
                createdAt: new Date().toISOString() 
            });
        }
        
        setIsBookingModalOpen(false);
        showToast('預約儲存成功');
    } catch (err) {
        console.error("Submit Error:", err);
        setFormError('儲存失敗：' + err.message);
    }
  };

  const handleSaveCustomerFromBooking = async () => {
      const newPet = { ...DEFAULT_PET, name: bookingForm.petName };
      await addDoc(getPath('customers'), {
          name: bookingForm.ownerName, phone: bookingForm.phone, pets: [newPet], 
          notes: '預約自動建立', createdBy: user?.email || 'Anon', createdAt: new Date().toISOString()
      });
      showToast('客戶建立成功');
  };

  const handleOpenCustomerModal = (c = null, viewOnly = false) => {
    setEditingCustomer(c);
    setIsViewMode(viewOnly);
    setIsPetFormVisible(false);
    
    const loadedPets = (c?.pets || []).map(p => {
        const details = getPetDetails(p);
        return { ...DEFAULT_PET, ...details }; 
    });

    setCustomerForm(c ? { 
        name: c.name, 
        phone: c.phone || '', 
        emergencyName: c.emergencyName || '', 
        emergencyPhone: c.emergencyPhone || '', 
        pets: loadedPets, 
        notes: c.notes || '' 
    } : { name: '', phone: '', emergencyName: '', emergencyPhone: '', pets: [], notes: '' });
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSubmit = async () => {
      const customerData = { ...customerForm, updatedAt: new Date().toISOString() };
      if(editingCustomer) await updateDoc(doc(getPath('customers'), editingCustomer.id), customerData);
      else await addDoc(getPath('customers'), { ...customerData, createdBy: user?.email || 'Anonymous', createdAt: new Date().toISOString() });
      setIsCustomerModalOpen(false);
      showToast(editingCustomer ? '客戶資料已更新' : '客戶資料已建立');
  };

  const handleEditPet = (index) => {
    setEditingPetIndex(index);
    setTempPet(index >= 0 ? { ...customerForm.pets[index] } : { ...DEFAULT_PET });
    setIsPetFormVisible(true);
  };

  const handleSavePet = () => {
    if (!tempPet.name) return;
    const newPets = [...customerForm.pets];
    if (editingPetIndex >= 0) newPets[editingPetIndex] = tempPet;
    else newPets.push(tempPet);
    setCustomerForm(prev => ({ ...prev, pets: newPets }));
    setIsPetFormVisible(false);
  };

  const handleDeletePet = (index) => {
    setGenericConfirm({
        isOpen: true,
        title: '確定移除寵物?',
        message: '這個操作無法復原。',
        type: 'danger',
        onConfirm: () => {
            const newPets = customerForm.pets.filter((_, i) => i !== index);
            setCustomerForm(prev => ({ ...prev, pets: newPets }));
            setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handlePetImageUpload = async (e, field) => {
      const file = e.target.files[0];
      if(file) {
          try {
             const base64 = await compressImage(file);
             setTempPet(prev => ({...prev, [field]: base64}));
          } catch(err) { console.error(err); }
      }
  };

  // --- Room Change Logic (Updated) ---
  const handleRoomChange = (newId) => {
      // Find which type this room belongs to
      let newType = 'small';
      Object.entries(ROOM_CONFIG).forEach(([key, cfg]) => {
          if (cfg.rooms.includes(newId)) newType = key;
      });
      
      setSelectedRoom({ id: newId, type: newType });
      // Recalculate price automatically
      const newTotal = calculateTotal(newType, bookingForm.startDate, bookingForm.endDate, bookingForm.catCount);
      setBookingForm(prev => ({ 
          ...prev, 
          totalAmount: newTotal, 
          balance: newTotal - (parseInt(prev.deposit)||0) 
      }));
  };

  // --- Auth Handlers ---
  const handleRegister = async (e) => { e.preventDefault(); setAuthError(''); try { await createUserWithEmailAndPassword(auth, authForm.email, authForm.password); setIsAuthModalOpen(false); showToast('註冊成功', 'success'); } catch(e) { setAuthError('註冊失敗'); } };
  const handleLogin = async (e) => { e.preventDefault(); setAuthError(''); try { await signInWithEmailAndPassword(auth, authForm.email, authForm.password); setIsAuthModalOpen(false); showToast('登入成功', 'success'); } catch(e) { setAuthError('登入失敗'); } };
  const handleSignOut = async () => { try { await signOut(auth); showToast('已登出'); } catch(e) { console.error(e); } };

  // --- Search & Filter (Updated) ---
  const allPetsList = useMemo(() => customers.flatMap(c => (c.pets || []).map(p => ({ petName: getPetName(p), ownerName: c.name, phone: c.phone }))), [customers]);
  const petSuggestions = useMemo(() => {
      const q = bookingForm.petName.toLowerCase();
      if (!q) return [];
      const owner = customers.find(c => c.name === bookingForm.ownerName);
      return owner ? (owner.pets||[]).map(p => ({ petName: getPetName(p), ownerName: owner.name })) : allPetsList.filter(p => p.petName.toLowerCase().includes(q));
  }, [bookingForm.petName, bookingForm.ownerName, customers, allPetsList]);

  // 更新：新增預約時，搜尋飼主 (姓名 OR 電話)
  const filteredCustomers = useMemo(() => {
    if (!bookingForm.ownerName) return [];
    const q = bookingForm.ownerName.toLowerCase();
    return customers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.phone && c.phone.includes(q))
    );
  }, [bookingForm.ownerName, customers]);

  // 更新：客戶列表搜尋 (姓名 OR 電話 OR 寵物)
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery) return customers;
    const lowerQuery = customerSearchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(lowerQuery) || 
      (customer.phone && customer.phone.includes(lowerQuery)) || 
      (customer.pets && customer.pets.some(pet => getPetName(pet).toLowerCase().includes(lowerQuery)))
    );
  }, [customerSearchQuery, customers]);

  const reminders = useMemo(() => {
      const tmr = formatDate(new Date(new Date().setDate(new Date().getDate() + 1)));
      return { 
          ins: bookings.filter(b => b.startDate === tmr), 
          outs: bookings.filter(b => b.endDate === tmr) 
      };
  }, [bookings]);

  const selectCustomerSuggestion = (c) => {
      const firstPetName = c.pets && c.pets.length > 0 ? getPetName(c.pets[0]) : '';
      setBookingForm(p => ({...p, ownerName: c.name, phone: c.phone, petName: firstPetName }));
      setShowNameSuggestions(false);
  };

  const selectPetSuggestion = (item) => {
      setBookingForm(prev => ({ ...prev, petName: item.petName, ownerName: item.ownerName, phone: item.phone }));
      setShowPetSuggestions(false); setShowNameSuggestions(false); 
  };

  const copyText = (t) => { 
      try {
          const textArea = document.createElement("textarea");
          textArea.value = t;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showToast('已複製到剪貼簿');
      } catch (err) {
          console.error('Copy failed', err);
          showToast('複製失敗', 'danger');
      }
  };

  const deleteBooking = (id) => { 
      setGenericConfirm({
          isOpen: true,
          title: '確定刪除預約?',
          message: '此操作無法復原。',
          type: 'danger',
          onConfirm: async () => {
              await deleteDoc(doc(getPath('bookings'), id)); 
              setIsBookingModalOpen(false); 
              setGenericConfirm(prev => ({ ...prev, isOpen: false }));
              showToast('預約已刪除');
          }
      });
  };

  const handleSettle = async () => { 
      if(settleConfirmation) await updateDoc(doc(getPath('bookings'), settleConfirmation.id), { balance: 0 }); 
      setSettleConfirmation(null); 
      showToast('款項已結清');
  };

  const handleDeleteCustomerRequest = (c) => {
      setGenericConfirm({
          isOpen: true,
          title: '確定刪除客戶?',
          message: `刪除 ${c.name} 的資料將無法復原。`,
          type: 'danger',
          onConfirm: async () => {
               try { 
                   await deleteDoc(doc(getPath('customers'), c.id)); 
                   setGenericConfirm(prev => ({ ...prev, isOpen: false }));
                   showToast('客戶已刪除');
               } catch (err) { 
                   showToast("刪除失敗", 'danger'); 
               }
          }
      });
  };

  // --- Export Functions ---
  const handleExportMonthReport = () => {
    if (bookings.length === 0) return alert("無資料可匯出");
    const currentMonthPrefix = formatDate(currentMonth).substring(0, 7);
    const monthBookings = bookings.filter(b => b.startDate.startsWith(currentMonthPrefix) || b.endDate.startsWith(currentMonthPrefix));
    
    if (monthBookings.length === 0) return alert("本月無預約資料");

    const dataToExport = monthBookings.map(b => ({
      房號: b.roomId,
      房型: ROOM_CONFIG[b.roomType]?.label || b.roomType,
      寵物名: b.petName,
      飼主: b.ownerName,
      電話: b.phone,
      入住日期: b.startDate,
      退房日期: b.endDate,
      總金額: b.totalAmount || 0,
      尚欠尾款: b.balance || 0,
      備註: b.notes || ''
    })).sort((a, b) => a.入住日期.localeCompare(b.入住日期));
    
    downloadCSV(dataToExport, `${currentMonth.getFullYear()}年${currentMonth.getMonth()+1}月_月報表.csv`);
  };

  const handleExportFutureBookings = () => {
      const today = formatDate(new Date());
      const futureList = bookings.filter(b => b.startDate >= today);

      if (futureList.length === 0) return alert("目前沒有未來的預約");

      const dataToExport = futureList.map(b => ({
          入住日期: b.startDate,
          房號: b.roomId,
          房型: ROOM_CONFIG[b.roomType]?.label || b.roomType,
          寵物名: b.petName,
          飼主: b.ownerName,
          電話: b.phone,
          退房日期: b.endDate,
          定金: b.deposit || 0,
          尚欠尾款: b.balance || 0,
          備註: b.notes || ''
      })).sort((a, b) => a.入住日期.localeCompare(b.入住日期));

      downloadCSV(dataToExport, `未來預約清單_${today}.csv`);
  };
  
  const handleExportCustomers = () => {
    const dataToExport = filteredCustomersList.map(c => {
        const petsStr = (c.pets || []).map(p => getPetName(p)).join('、');
        return {
            姓名: c.name, 電話: c.phone || '', 緊急聯絡人: c.emergencyName || '', 緊急電話: c.emergencyPhone || '',
            寵物: petsStr, 備註: c.notes || ''
        };
    });
    downloadCSV(dataToExport, `客戶資料_${formatDate(new Date())}.csv`);
  };

  // --- Components ---
  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === id ? THEME.activeTab : THEME.inactiveTab} print:hidden`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  const isPermanentUser = user && !user.isAnonymous;
  const currentUserEmail = user && !user.isAnonymous ? user.email : '匿名用戶';

  // --- Render ---
  return (
    <div className={`min-h-screen ${THEME.bg} font-sans pb-20 text-[#5C554F]`}>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .print:hidden { display: none !important; }
          header, .mobile-tab-bar, button.no-print, .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; overflow: visible !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
          /* Ensure calendar fits */
          .calendar-container { min-width: 100% !important; overflow: visible !important; }
        }
      `}</style>

      {/* Header */}
      <header className={`${THEME.header} px-6 py-4 shadow-sm sticky top-0 z-20 flex justify-between items-center border-b ${THEME.border} print:hidden`}>
        <div className="flex items-center gap-3">
            <div className="bg-[#F2F0E9] p-2 rounded-xl"><Cat className="w-6 h-6 text-[#9A8478]"/></div>
            <h1 className="text-xl font-bold tracking-wide hidden sm:block">貓咪旅館 <span className="text-xs font-normal text-gray-400">管理系統</span></h1>
        </div>
        <div className="flex gap-2 items-center">
            <div className="hidden md:flex bg-[#F2F0E9] p-1 rounded-full mr-2">
                <NavButton id="rooms" icon={Home} label="房況" />
                <NavButton id="calendar" icon={CalendarIcon} label="月曆" />
                <NavButton id="customers" icon={Users} label="客戶" />
                <NavButton id="finance" icon={DollarSign} label="帳務" />
            </div>
            
            <button onClick={() => setIsReminderModalOpen(true)} className="p-2.5 bg-white border border-[#EBE5D9] rounded-full relative shadow-sm hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5 text-[#9A8478]"/>
                {(reminders.ins.length + reminders.outs.length) > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C97C7C] rounded-full animate-pulse"></span>}
            </button>
            <button onClick={() => isPermanentUser ? handleSignOut() : setIsAuthModalOpen(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md ${isPermanentUser ? 'bg-[#C97C7C] text-white hover:bg-[#B56B6B]' : 'bg-[#9A8478] text-white hover:bg-[#826A5D]'}`}>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{isPermanentUser ? '登出' : '登入'}</span>
            </button>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#EBE5D9] flex justify-around p-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
           <button onClick={() => setActiveTab('rooms')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='rooms' ? 'text-[#9A8478]' : 'text-gray-400'}`}><Home className="w-5 h-5"/><span className="text-[10px]">房況</span></button>
           <button onClick={() => setActiveTab('calendar')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='calendar' ? 'text-[#9A8478]' : 'text-gray-400'}`}><CalendarIcon className="w-5 h-5"/><span className="text-[10px]">月曆</span></button>
           <button onClick={() => setActiveTab('customers')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='customers' ? 'text-[#9A8478]' : 'text-gray-400'}`}><Users className="w-5 h-5"/><span className="text-[10px]">客戶</span></button>
           <button onClick={() => setActiveTab('finance')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='finance' ? 'text-[#9A8478]' : 'text-gray-400'}`}><DollarSign className="w-5 h-5"/><span className="text-[10px]">帳務</span></button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 mb-16 md:mb-0 print-full">
        {activeTab === 'rooms' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => handleOpenBookingModal()} className={`${THEME.primary} text-white px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 text-sm font-bold w-full sm:w-auto justify-center`}>
                            <Plus className="w-4 h-4"/> 新增預約
                        </button>
                        <button onClick={handleExportFutureBookings} className="bg-white border border-[#EBE5D9] text-[#8D7B68] px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-sm font-bold w-full sm:w-auto justify-center hover:bg-[#F9F7F2]">
                            <FileSpreadsheet className="w-4 h-4"/> 匯出未入住
                        </button>
                    </div>
                    
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-[#EBE5D9] flex items-center gap-2 w-full sm:w-auto justify-between">
                        <button onClick={()=>changeDate(-1)} className="p-1 hover:bg-[#F9F7F2] rounded-full"><ChevronLeft className="w-5 h-5 text-[#9A8478]"/></button>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400"/>
                            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="bg-transparent font-bold outline-none text-sm w-full text-[#5C554F] text-center"/>
                        </div>
                        <button onClick={()=>changeDate(1)} className="p-1 hover:bg-[#F9F7F2] rounded-full"><ChevronRight className="w-5 h-5 text-[#9A8478]"/></button>
                    </div>
                </div>
                {Object.entries(ROOM_CONFIG).map(([type, cfg]) => (
                    <div key={type} className="space-y-3">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-[#5C554F]">{cfg.label} <span className="text-xs text-[#A09890] font-normal border border-[#E6E2D8] px-2 py-0.5 rounded-full bg-white">NT${cfg.price}</span></h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                            {cfg.rooms.map(rid => {
                                // 邏輯修改：同時尋找「入住中」以及「今日退房」的訂單
                                const activeStay = bookings.find(x => x.roomId === rid && viewDate >= x.startDate && viewDate < x.endDate);
                                const checkOutToday = bookings.find(x => x.roomId === rid && x.endDate === viewDate);
                                
                                // 決定卡片主要顯示哪一筆資料
                                const b = activeStay || checkOutToday;
                                
                                const isCheckIn = activeStay && activeStay.startDate === viewDate;
                                const isCheckOut = checkOutToday && checkOutToday.endDate === viewDate;
                                
                                return (
                                    <div key={rid} onClick={() => handleOpenBookingModal(rid, type, null, b)} 
                                        className={`p-4 rounded-2xl border min-h-[120px] flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${b ? `${cfg.bg} border-[#9A8478] shadow-sm` : 'bg-white border-[#EBE5D9] hover:border-[#D6CDB8]'} print:border-gray-300`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-xl font-bold font-mono ${b ? 'text-[#5C554F]' : 'text-[#E6E2D8]'}`}>{rid}</span>
                                            {b && <div className="bg-white/80 p-1.5 rounded-full shadow-sm print:hidden"><Cat className="w-4 h-4 text-[#9A8478]"/></div>}
                                        </div>
                                        {b ? (
                                            <div>
                                                <div className="flex gap-1 mb-1 flex-wrap">
                                                    {isCheckIn && (
                                                        <span className="text-[10px] flex items-center gap-1 bg-[#94A89A]/20 text-[#6B9E78] px-1.5 py-0.5 rounded-full font-bold">
                                                            <LogIn className="w-3 h-3"/> {b.checkInTime || '14:00'} 入
                                                        </span>
                                                    )}
                                                    {isCheckOut && (
                                                        <span className="text-[10px] flex items-center gap-1 bg-[#C97C7C]/20 text-[#C97C7C] px-1.5 py-0.5 rounded-full font-bold">
                                                            <LogOut className="w-3 h-3"/> {b.checkOutTime || '11:00'} 退
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="font-bold flex items-center gap-1 text-[#5C554F] text-sm">{b.petName} {b.catCount > 1 && <span className="text-[10px] bg-[#9A8478] text-white px-1.5 rounded-full">{b.catCount}</span>}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-[#A09890] truncate max-w-[60px]">{b.ownerName}</span>
                                                    {b.balance > 0 && <span className="text-[9px] bg-[#FFF0F0] text-[#C97C7C] px-1.5 py-0.5 rounded-full font-bold border border-[#FADBD8]">${b.balance}</span>}
                                                </div>
                                            </div>
                                        ) : <div className="text-[#D6CDB8] text-xs flex items-center gap-1 print:hidden"><Plus className="w-3 h-3"/> 預約</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- 甘特圖月曆區域 --- */}
        {activeTab === 'calendar' && (
            <div className="overflow-hidden flex flex-col h-[calc(100vh-140px)] animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-3 rounded-t-2xl shadow-sm border border-[#EBE5D9] mx-4 mt-4 flex-shrink-0">
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 hover:bg-[#F9F7F2] rounded-full transition-colors"><ChevronLeft className="text-[#9A8478]"/></button>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 hover:bg-[#F9F7F2] rounded-full transition-colors"><ChevronRight className="text-[#9A8478]"/></button>
                    </div>
                    <h2 className="text-lg font-bold text-[#5C554F]">{currentMonth.getFullYear()}年 {currentMonth.getMonth()+1}月</h2>
                    <div className="flex gap-2 items-center">
                        <div className="hidden md:flex gap-3 text-xs mr-4">
                             <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#94A89A] rounded-sm"></span>入住</div>
                             <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E6E2D8] rounded-sm"></span>續住</div>
                             <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#C88D7D] rounded-sm"></span>退房</div>
                        </div>
                        <button onClick={handleExportMonthReport} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EBE5D9] text-[#8D7B68] rounded-lg text-sm font-bold shadow-sm hover:bg-[#F9F7F2]"><Download className="w-4 h-4"/> 月報表</button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-[#F9F7F2] text-[#9A8478] rounded-lg text-sm font-bold"><Printer className="w-4 h-4"/> 列印</button>
                    </div>
                </div>

                <div className="overflow-auto custom-scrollbar flex-1 mx-4 mb-4 border border-[#EBE5D9] bg-white rounded-b-2xl relative shadow-inner">
                    <table className="border-collapse w-full min-w-[1200px]">
                        <thead className="bg-[#F9F7F2] sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-3 sticky left-0 bg-[#F9F7F2] z-30 border-b border-r border-[#E6E2D8] min-w-[100px] text-[#A09890] font-bold text-xs">房號</th>
                                {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).getDate())].map((_, i) => {
                                    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i+1);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isToday = formatDate(d) === formatDate(new Date());
                                    return (
                                        <th key={i} className={`p-2 border-b border-r border-[#E6E2D8] min-w-[50px] text-center ${isToday ? 'bg-[#FFF0F0]' : ''}`}>
                                            <div className={`text-xs font-bold ${isWeekend ? 'text-[#C88D7D]' : 'text-[#5C554F]'}`}>{i+1}</div>
                                            <div className="text-[10px] text-[#A09890] font-normal">{['日','一','二','三','四','五','六'][d.getDay()]}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {Object.entries(ROOM_CONFIG).flatMap(([type, cfg]) => 
                                cfg.rooms.map(roomId => ({ roomId, type, label: cfg.label }))
                            ).map((room, rIndex) => (
                                <tr key={room.roomId} className="hover:bg-[#FAFAFA] transition-colors">
                                    <td className="p-2 sticky left-0 bg-white z-10 border-b border-r border-[#E6E2D8] text-center shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                        <div className="font-bold text-[#5C554F]">{room.roomId}</div>
                                        <div className="text-[9px] text-[#A09890]">{room.label.substring(0,2)}</div>
                                    </td>
                                    {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).getDate())].map((_, i) => {
                                        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i+1);
                                        const dateStr = formatDate(dateObj);
                                        const booking = bookings.find(b => b.roomId === room.roomId && dateStr >= b.startDate && dateStr <= b.endDate);
                                        let cellStyle = "";
                                        let statusLabel = ""; 
                                        if (booking) {
                                            if (dateStr === booking.startDate) {
                                                cellStyle = "bg-[#94A89A] text-white rounded-l-md ml-1 shadow-sm"; 
                                                statusLabel = "入住";
                                            } else if (dateStr === booking.endDate) {
                                                cellStyle = "bg-[#C88D7D] text-white rounded-r-md mr-1 shadow-sm";
                                                statusLabel = "退房";
                                            } else {
                                                cellStyle = "bg-[#E6E2D8] text-[#5E5550]";
                                                statusLabel = "";
                                            }
                                        }
                                        return (
                                            <td key={dateStr} 
                                                onClick={() => booking ? handleOpenBookingModal(room.roomId, room.type, null, booking) : handleOpenBookingModal(room.roomId, room.type, dateStr)}
                                                className="p-0 border-b border-r border-[#F2F0E9] relative h-[50px] cursor-pointer align-middle"
                                            >
                                                {booking && (
                                                    <div className={`w-full h-[80%] flex flex-col justify-center items-center text-[10px] leading-tight px-0.5 transition-all mx-auto ${cellStyle}`} title={`${booking.petName} (${booking.ownerName})`}>
                                                        <span className="font-bold truncate w-full text-center">{booking.petName}</span>
                                                        {statusLabel && <span className="text-[8px] opacity-90 scale-90">{statusLabel}</span>}
                                                    </div>
                                                )}
                                                {!booking && <div className="w-full h-full hover:bg-[#F9F7F2]"></div>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {/* --- Finance Tab --- */}
        {activeTab === 'finance' && (
            <div className="space-y-6">
                <div className={`${THEME.card} p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6`}>
                    <div className="flex items-center gap-4">
                        <div className="bg-[#F2F0E9] p-3 rounded-full"><Wallet className="w-8 h-8 text-[#9A8478]"/></div>
                        <div>
                            <h2 className="text-xl font-bold text-[#5C554F]">未結帳款</h2>
                            <p className="text-sm text-[#A09890]">所有尚有餘額的預約紀錄</p>
                        </div>
                    </div>
                    <div className="text-right bg-[#F9F7F2] px-6 py-3 rounded-xl border border-[#EBE5D9]">
                        <div className="text-xs text-[#A09890] font-bold uppercase tracking-wider mb-1">待收總額</div>
                        <div className="text-3xl font-bold text-[#9A8478] tracking-tight">${bookings.filter(b => b.balance > 0).reduce((s, b) => s + (parseInt(b.balance)||0), 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className={`${THEME.card} rounded-2xl overflow-hidden`}>
                     {bookings.filter(b => b.balance > 0).length === 0 ? (
                         <div className="p-12 text-center text-[#D6CDB8] flex flex-col items-center gap-3">
                             <CheckCircle className="w-12 h-12 opacity-50"/>
                             <p>太棒了！目前沒有未結清的帳款</p>
                         </div>
                      ) : (
                        <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-[#F9F7F2] border-b border-[#EBE5D9]">
                                    <tr>
                                        <th className="px-6 py-4 text-[#A09890] font-bold">日期/房號</th>
                                        <th className="px-6 py-4 text-[#A09890] font-bold">客戶資訊</th>
                                        <th className="px-6 py-4 text-[#A09890] font-bold text-right">已付定金</th>
                                        <th className="px-6 py-4 text-[#C97C7C] font-bold text-right">待收尾款</th>
                                        <th className="px-6 py-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F5F0E6]">
                                    {bookings.filter(b => b.balance > 0).map(b => (
                                        <tr key={b.id} className="hover:bg-[#FDFBF7]">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#5C554F]">{b.startDate}</div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded mt-1 inline-block ${ROOM_CONFIG[b.roomType]?.tag}`}>{b.roomId}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#5C554F]">{b.petName}</div>
                                                <div className="text-xs text-[#A09890]">{b.ownerName} ({b.phone})</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-[#A09890]">${(b.deposit||0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-[#C97C7C] text-base">${(b.balance||0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setSettleConfirmation(b)} className={`${THEME.primary} text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all`}>結清</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     )}
                </div>
            </div>
        )}

        {activeTab === 'customers' && (
             <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4 no-print">
                     <div className="relative flex-1">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D6CDB8]"/>
                         <input type="text" placeholder="搜尋客戶姓名、電話或寵物..." value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} className={`w-full pl-11 pr-4 py-3 rounded-xl ${THEME.input}`}/>
                     </div>
                     <div className="flex gap-2">
                         <button onClick={handlePrint} className="bg-white border border-[#EBE5D9] text-[#9A8478] px-4 py-3 rounded-xl shadow-sm font-bold flex items-center gap-2 hover:bg-[#F9F7F2] transition-all"><Printer className="w-5 h-5"/> 列印名單</button>
                         <button onClick={handleExportCustomers} className="bg-white border border-[#EBE5D9] text-[#8D7B68] px-4 py-3 rounded-xl shadow-sm font-bold flex items-center gap-2 hover:bg-[#F9F7F2] transition-all"><Download className="w-5 h-5"/> 匯出 CSV</button>
                         <button onClick={() => handleOpenCustomerModal()} className={`${THEME.primary} text-white px-6 py-3 rounded-xl shadow-md font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all`}><Plus className="w-5 h-5"/> 新增客戶</button>
                     </div>
                 </div>
                 
                 <div className="hidden print:block text-center mb-4"><h1 className="text-2xl font-bold">客戶名單</h1></div>

                 <div className={`${THEME.card} rounded-2xl overflow-hidden print-card`}>
                     {customers.filter(c => c.name.includes(customerSearchQuery)).length === 0 ? (
                         <div className="p-12 text-center text-[#D6CDB8]">找不到符合的客戶資料</div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 print:grid-cols-2">
                             {customers.filter(c => c.name.includes(customerSearchQuery)).map(c => (
                                 <div key={c.id} 
                                      onClick={() => handleOpenCustomerModal(c, true)} 
                                      className="border border-[#EBE5D9] rounded-xl p-4 hover:border-[#D6CDB8] hover:shadow-sm transition-all bg-[#FAFAFA] print:break-inside-avoid cursor-pointer" 
                                 >
                                     <div className="flex justify-between items-start mb-3">
                                         <div>
                                             <div className="font-bold text-lg text-[#5C554F]">{c.name}</div>
                                             <div className="text-xs text-[#A09890]">{c.phone}</div>
                                         </div>
                                         <div className="flex gap-1 no-print">
                                             <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomerRequest(c); }} className="p-2 hover:bg-[#FFF0F0] rounded-lg text-[#C97C7C]"><Trash2 className="w-4 h-4"/></button>
                                         </div>
                                     </div>
                                     <div className="flex flex-wrap gap-2">
                                         {(c.pets||[]).map((p,i) => (
                                             <span key={i} className="bg-[#EAE4D6] text-[#8C8279] px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 pr-3">
                                                 {p.photo ? <img src={p.photo} className="w-5 h-5 rounded-full object-cover"/> : <Cat className="w-3 h-3"/>} 
                                                 {getPetName(p)}
                                             </span>
                                         ))}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             </div>
        )}
      </main>

      {/* 2. Booking Modal */}
      {isBookingModalOpen && selectedRoom && (
          <div className="fixed inset-0 bg-[#5C554F]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="bg-[#FDFBF7] px-6 py-4 border-b border-[#EBE5D9] flex justify-between items-center flex-shrink-0">
                      <div><h3 className="text-lg font-bold text-[#5C554F]">{editingBookingId ? '編輯預約' : '新增預約'}</h3><span className={`text-xs px-2 py-0.5 rounded ${ROOM_CONFIG[selectedRoom.type].tag}`}>{ROOM_CONFIG[selectedRoom.type].label}</span></div>
                      <button onClick={()=>setIsBookingModalOpen(false)}><X className="text-[#A09890]"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
                      {/* Room Selection - Now always visible */}
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-[#9E968E]">房號</label>
                          <select 
                            value={selectedRoom.id} 
                            onChange={e => handleRoomChange(e.target.value)}
                            className={`w-full p-2.5 rounded-lg border ${THEME.input}`}
                          >
                              {Object.entries(ROOM_CONFIG).map(([type, cfg]) => (
                                  <optgroup label={cfg.label} key={type}>
                                      {cfg.rooms.map(r => <option key={r} value={r}>{r}</option>)}
                                  </optgroup>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1 relative">
                              <label className="text-xs font-bold text-[#9E968E]">飼主</label>
                              <input value={bookingForm.ownerName} onChange={e=>{updateBooking('ownerName', e.target.value); setShowNameSuggestions(true)}} className={`w-full p-2.5 rounded-lg border ${THEME.input}`}/>
                              {showNameSuggestions && filteredCustomers.length>0 && <div className="absolute top-full left-0 w-full bg-white shadow-lg border rounded-xl mt-1 z-20 max-h-40 overflow-y-auto">{filteredCustomers.map(c=><div key={c.id} onClick={()=>selectCustomerSuggestion(c)} className="p-2 hover:bg-[#F9F7F2] cursor-pointer text-sm border-b last:border-0">{c.name} ({c.phone})</div>)}</div>}
                          </div>
                          <div className="space-y-1 relative">
                              <label className="text-xs font-bold text-[#9E968E]">寵物</label>
                              <input value={bookingForm.petName} onChange={e=>{updateBooking('petName', e.target.value); setShowPetSuggestions(true)}} className={`w-full p-2.5 rounded-lg border ${THEME.input}`}/>
                              {showPetSuggestions && petSuggestions.length>0 && <div className="absolute top-full left-0 w-full bg-white shadow-lg border rounded-xl mt-1 z-20 max-h-40 overflow-y-auto">{petSuggestions.map((p,i)=><div key={i} onClick={()=>selectPetSuggestion(p)} className="p-2 hover:bg-[#F9F7F2] cursor-pointer text-sm border-b last:border-0">{p.petName} ({p.ownerName})</div>)}</div>}
                          </div>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-[#9E968E]">電話</label><input value={bookingForm.phone} onChange={e=>updateBooking('phone',e.target.value)} className={`w-full p-2.5 rounded-lg border ${THEME.input}`}/></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-[#9E968E]">貓咪數量 (多1隻+${EXTRA_CAT_PRICE})</label><div className="flex gap-2">{[1,2,3,4].map(n=><button key={n} onClick={()=>updateBooking('catCount',n)} className={`flex-1 py-2 rounded-lg border text-sm font-bold ${bookingForm.catCount===n?'bg-[#EAE4D6] border-[#D6CDB8] text-[#8D7B68]':'bg-white'}`}>{n}隻</button>)}</div></div>
                      
                      <div className="bg-[#F9F7F2] p-4 rounded-xl border border-[#F5F0E6] grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-[#9A8478]">入住</label><input type="date" value={bookingForm.startDate} onChange={e=>updateBooking('startDate',e.target.value)} className="w-full p-2 rounded-lg border mt-1"/><input type="time" value={bookingForm.checkInTime} onChange={e=>updateBooking('checkInTime',e.target.value)} className="w-full mt-1 bg-transparent text-xs"/></div>
                          <div><label className="text-xs font-bold text-[#9A8478]">退房</label><input type="date" value={bookingForm.endDate} onChange={e=>updateBooking('endDate',e.target.value)} className="w-full p-2 rounded-lg border mt-1"/><input type="time" value={bookingForm.checkOutTime} onChange={e=>updateBooking('checkOutTime',e.target.value)} className="w-full mt-1 bg-transparent text-xs"/></div>
                      </div>

                      {estimatedInfo && <div className="bg-[#FFFDF5] p-3 rounded-lg border border-[#FFE4B5] text-[#D4A017] text-sm flex justify-between items-center font-bold"><span>共 {estimatedInfo.days} 晚</span><span>${estimatedInfo.total.toLocaleString()}</span></div>}

                      <div className="bg-white p-4 rounded-xl border border-[#EBE5D9] space-y-3">
                          <h4 className="text-xs font-bold text-[#9E968E] flex gap-2"><DollarSign className="w-3 h-3"/> 款項明細</h4>
                          <div className="grid grid-cols-3 gap-3">
                              <div><label className="text-[10px] text-[#A09890]">總金額</label><input type="number" value={bookingForm.totalAmount} onChange={e=>updateBooking('totalAmount',e.target.value)} className="w-full p-1 border-b outline-none font-bold text-[#5C554F]"/></div>
                              <div><label className="text-[10px] text-[#A09890]">定金</label><input type="number" value={bookingForm.deposit} onChange={e=>updateBooking('deposit',e.target.value)} className="w-full p-1 border-b outline-none text-[#5C554F]"/></div>
                              <div><label className="text-[10px] text-[#C97C7C]">尾款</label><input type="number" readOnly value={bookingForm.balance} className="w-full p-1 border-b outline-none text-[#C97C7C] font-bold bg-transparent"/></div>
                          </div>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-[#9E968E]">備註</label><textarea rows="2" value={bookingForm.notes} onChange={e=>updateBooking('notes',e.target.value)} className={`w-full p-3 rounded-xl border ${THEME.input}`}/></div>
                      {!customers.find(c=>c.name===bookingForm.ownerName) && bookingForm.ownerName && <button onClick={handleSaveCustomerFromBooking} className="w-full py-2 bg-[#EAE4D6] text-[#8D7B68] rounded-lg text-sm font-bold">+ 存為新客戶</button>}
                  </div>
                  <div className="p-4 border-t flex gap-3 bg-white">
                      {editingBookingId && <button onClick={()=>deleteBooking(editingBookingId)} className="p-3 bg-[#FFF0F0] text-[#C97C7C] rounded-xl"><Trash2/></button>}
                      <button onClick={()=>setIsBookingModalOpen(false)} className="flex-1 py-3 border rounded-xl text-[#A09890] font-bold">取消</button>
                      <button onClick={handleBookingSubmit} className={`flex-1 py-3 ${THEME.primary} text-white rounded-xl font-bold shadow-md`}>確認</button>
                  </div>
              </div>
          </div>
      )}

      {/* Settle Confirm Modal */}
      {settleConfirmation && (
          <div className="fixed inset-0 bg-[#5C554F]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
                  <div className="w-12 h-12 bg-[#F0F9F4] rounded-full flex items-center justify-center mx-auto text-[#6B9E78]"><Check className="w-6 h-6"/></div>
                  <div><h3 className="font-bold text-lg text-[#5C554F]">確認結清?</h3><p className="text-sm text-[#A09890] mt-1">確認收到尾款 <span className="text-[#C97C7C] font-bold">${settleConfirmation.balance}</span> 嗎?</p></div>
                  <div className="flex gap-3"><button onClick={()=>setSettleConfirmation(null)} className="flex-1 py-2 border rounded-xl">取消</button><button onClick={handleSettle} className="flex-1 py-2 bg-[#6B9E78] text-white rounded-xl font-bold shadow-md">確認收款</button></div>
              </div>
          </div>
      )}

      {/* Generic Confirmation Modal (Replaces window.confirm) */}
      {genericConfirm.isOpen && (
          <div className="fixed inset-0 bg-[#5C554F]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${genericConfirm.type === 'danger' ? 'bg-[#FFF0F0] text-[#C97C7C]' : 'bg-[#F2F0E9] text-[#9A8478]'}`}>
                      <AlertTriangle className="w-6 h-6"/>
                  </div>
                  <div>
                      <h3 className="font-bold text-lg text-[#5C554F]">{genericConfirm.title}</h3>
                      <p className="text-sm text-[#A09890] mt-1">{genericConfirm.message}</p>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setGenericConfirm(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2 border rounded-xl">取消</button>
                      <button onClick={genericConfirm.onConfirm} className={`flex-1 py-2 rounded-xl font-bold shadow-md text-white ${genericConfirm.type === 'danger' ? 'bg-[#C97C7C]' : THEME.primary}`}>確認</button>
                  </div>
              </div>
          </div>
      )}

      {/* Reminder Modal */}
      {isReminderModalOpen && (
           <div className="fixed inset-0 bg-[#5C554F]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                    <div className="px-6 py-4 bg-[#F9F7F2] border-b flex justify-between items-center"><h3 className="font-bold flex gap-2 text-[#5C554F]"><Bell className="w-5 h-5 text-[#9A8478]"/> 明日提醒</h3><button onClick={()=>setIsReminderModalOpen(false)}><X/></button></div>
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        {reminders.ins.length===0 && reminders.outs.length===0 && <div className="text-center text-[#D6CDB8] py-8">明日無特別事項</div>}
                        {reminders.ins.length>0 && <div><h4 className="text-xs font-bold text-[#94A89A] mb-2 uppercase tracking-wider">明日入住</h4><div className="space-y-2">{reminders.ins.map(b=><div key={b.id} className="bg-[#F0F9F4] p-3 rounded-xl border border-[#E0EFE6] flex justify-between items-center"><div><div className="font-bold text-[#5C554F]">{b.petName}</div><div className="text-xs text-[#A09890]">{b.ownerName}</div></div><button onClick={()=>copyText(`提醒您明天是${b.petName}入住的日子`)} className="p-2 bg-white rounded-lg shadow-sm text-[#94A89A]"><Copy className="w-4 h-4"/></button></div>)}</div></div>}
                        {reminders.outs.length>0 && <div><h4 className="text-xs font-bold text-[#C97C7C] mb-2 uppercase tracking-wider">明日退房</h4><div className="space-y-2">{reminders.outs.map(b=><div key={b.id} className="bg-[#FFF5F5] p-3 rounded-xl border border-[#FFE0E0] flex justify-between items-center"><div><div className="font-bold text-[#5C554F]">{b.petName}</div><div className="text-xs text-[#A09890]">{b.ownerName}</div></div><button onClick={()=>copyText(`提醒您明天是${b.petName}退房的日子`)} className="p-2 bg-white rounded-lg shadow-sm text-[#C97C7C]"><Copy className="w-4 h-4"/></button></div>)}</div></div>}
                    </div>
                </div>
           </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-[#5C554F]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl">
                 <div className="text-center"><div className="bg-[#F9F7F2] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><User className="w-6 h-6 text-[#9A8478]"/></div><h2 className="text-xl font-bold text-[#5C554F]">管理員登入</h2></div>
                 <div className="space-y-3"><input type="email" placeholder="Email" className={`w-full p-3 rounded-xl border ${THEME.input}`} value={authForm.email} onChange={e=>setAuthForm({...authForm, email:e.target.value})}/><input type="password" placeholder="Password" className={`w-full p-3 rounded-xl border ${THEME.input}`} value={authForm.password} onChange={e=>setAuthForm({...authForm, password:e.target.value})}/></div>
                 <button onClick={authMode==='login'?handleLogin:handleRegister} className={`w-full py-3 ${THEME.primary} text-white rounded-xl font-bold shadow-md`}>{authMode==='login'?'登入':'註冊'}</button>
                 <div className="flex justify-between text-xs mt-2"><button onClick={()=>setIsAuthModalOpen(false)} className="text-[#A09890]">暫不登入</button><button onClick={()=>setAuthMode(m=>m==='login'?'reg':'login')} className="text-[#9A8478] underline">{authMode==='login'?'註冊帳號':'返回登入'}</button></div>
             </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast.show && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg transform transition-all duration-300 animate-in slide-in-from-bottom-5 z-50 flex items-center gap-2 ${toast.type === 'danger' ? 'bg-[#FFF0F0] text-[#C97C7C] border border-[#FADBD8]' : 'bg-[#F0F9F4] text-[#6B9E78] border border-[#E0EFE6]'}`}>
              {toast.type === 'danger' ? <AlertCircle className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
              <span className="font-bold text-sm">{toast.message}</span>
          </div>
      )}
    </div>
  );
}
