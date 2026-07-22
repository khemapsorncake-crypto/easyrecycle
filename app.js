const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
const seed=[
 ['R001','ขวดน้ำดื่ม / PET','กก.',4],['R002','ขวดน้ำเกลือ','กก.',4],['R003','กระดาษลัง / ลัง','กก.',2],
 ['R004','กระดาษสี','กก.',1],['R005','กระดาษขาว-ดำ','กก.',3],['R006','พลาสติกกรอบ','กก.',4],
 ['R007','พลาสติกรวม','กก.',2],['R008','เหล็ก','กก.',5],['R009','สังกะสี','กก.',3],
 ['R010','ขวดแก้ว','กก.',0.75],['R011','กระป๋อง','กก.',4],['R012','อะลูมิเนียม','กก.',25],
 ['R013','ทองแดง','กก.',180],['R014','สแตนเลส','กก.',20],['R015','เก้าอี้','ชิ้น',5],
 ['R016','หม้อหุงข้าว','ชิ้น',20],['R017','เครื่องใช้ไฟฟ้า','ชิ้น',10],['R018','อื่น ๆ','กก.',1]
].map(x=>({id:uid(),code:x[0],name:x[1],unit:x[2],price:x[3]}));
let products=JSON.parse(localStorage.getItem('rb_products')||'null')||seed;
let bills=JSON.parse(localStorage.getItem('rb_bills')||'[]');
let settings=JSON.parse(localStorage.getItem('rb_settings')||'null')||{shopName:'ร้านรับซื้อของเก่า',shopAddress:'',shopPhone:'',taxId:'',receiptFooter:'ขอบคุณที่มาใช้บริการ'};
let cart=[],selectedProduct=null;
const money=n=>Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Date().toISOString().slice(0,10);
const itemQty=i=>(i.rounds||[Number(i.qty)||0]).reduce((s,n)=>s+Number(n||0),0);
const itemRounds=i=>(i.rounds&&i.rounds.length?i.rounds:[Number(i.qty)||0]).filter(n=>Number(n)>0);
const save=()=>{localStorage.setItem('rb_products',JSON.stringify(products));localStorage.setItem('rb_bills',JSON.stringify(bills));localStorage.setItem('rb_settings',JSON.stringify(settings));};

$('#buyDate').value=today();
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');renderAll()});

function renderProducts(q=''){
 q=q.toLowerCase().trim();
 const list=products.filter(p=>(p.name+p.code).toLowerCase().includes(q));
 $('#productCards').innerHTML=list.map(p=>`<button class="product-card" onclick="askWeight('${p.id}')"><h3>${p.name}</h3><span>${p.code} • ต่อ ${p.unit}</span><b>฿${money(p.price)}</b><small>แตะเพื่อเริ่มชั่งรอบที่ 1</small></button>`).join('')||'<p>ไม่พบรายการ</p>';
 $('#productTable').innerHTML=products.map(p=>`<tr><td>${p.code}</td><td>${p.name}</td><td>${p.unit}</td><td>฿${money(p.price)}</td><td><button class="secondary" onclick="editProduct('${p.id}')">แก้ไข</button> <button class="remove" onclick="deleteProduct('${p.id}')">ลบ</button></td></tr>`).join('');
}
$('#searchProduct').oninput=e=>renderProducts(e.target.value);

window.askWeight=id=>{
 selectedProduct=products.find(p=>p.id===id);
 const existing=cart.find(i=>i.productId===id);
 $('#weightTitle').textContent=selectedProduct.name;
 $('#weightPrice').textContent=`ราคาซื้อ ฿${money(selectedProduct.price)} / ${selectedProduct.unit}`;
 $('#weightRoundLabel').textContent=`กำลังบันทึกรอบที่ ${(existing?.rounds?.length||0)+1}`;
 $('#weightInput').value='';
 $('#weightDialog').showModal();setTimeout(()=>$('#weightInput').focus(),100);
};
$('#addWeightBtn').onclick=e=>{
 e.preventDefault();
 const qty=Number($('#weightInput').value);
 if(!(qty>0))return alert('กรอกน้ำหนักหรือจำนวนให้ถูกต้อง');
 let item=cart.find(i=>i.productId===selectedProduct.id);
 if(item)item.rounds.push(qty);
 else cart.push({id:uid(),productId:selectedProduct.id,code:selectedProduct.code,name:selectedProduct.name,unit:selectedProduct.unit,price:selectedProduct.price,rounds:[qty]});
 $('#weightDialog').close();renderCart();
};

window.addRound=id=>{
 const item=cart.find(i=>i.id===id); selectedProduct=products.find(p=>p.id===item.productId)||item;
 $('#weightTitle').textContent=item.name;$('#weightPrice').textContent=`ราคาซื้อ ฿${money(item.price)} / ${item.unit}`;
 $('#weightRoundLabel').textContent=`กำลังบันทึกรอบที่ ${itemRounds(item).length+1}`;$('#weightInput').value='';$('#weightDialog').showModal();setTimeout(()=>$('#weightInput').focus(),100);
};
window.removeRound=(id,index)=>{const item=cart.find(i=>i.id===id);item.rounds.splice(index,1);if(!item.rounds.length)cart=cart.filter(i=>i.id!==id);renderCart()};
window.updateRound=(id,index,val)=>{const item=cart.find(i=>i.id===id),n=Number(val);if(n>0)item.rounds[index]=n;renderCart()};
window.updatePrice=(id,val)=>{const item=cart.find(i=>i.id===id);item.price=Math.max(0,Number(val)||0);renderCart()};
window.removeCart=id=>{cart=cart.filter(i=>i.id!==id);renderCart()};
$('#clearCartBtn').onclick=()=>{if(!cart.length||confirm('ล้างรายการรับซื้อทั้งหมดหรือไม่?')){cart=[];renderCart()}};

function renderCart(){
 $('#cartList').innerHTML=cart.map(i=>{
   const rounds=itemRounds(i),qty=itemQty(i),sum=qty*i.price;
   return `<div class="cart-item">
    <div class="cart-top"><div><b>${i.name}</b><small>${rounds.length} รอบ • รวม ${money(qty)} ${i.unit}</small></div><button class="remove" onclick="removeCart('${i.id}')">ลบ</button></div>
    <div class="round-list">${rounds.map((r,x)=>`<div class="round-row"><label>รอบที่ ${x+1}<input type="number" min="0.01" step="0.01" value="${r}" onchange="updateRound('${i.id}',${x},this.value)"></label><span>${i.unit}</span><button class="round-delete" onclick="removeRound('${i.id}',${x})">×</button></div>`).join('')}</div>
    <button class="add-round" onclick="addRound('${i.id}')">+ เพิ่มรอบชั่งที่ ${rounds.length+1}</button>
    <div class="calc-row"><label>ราคา/${i.unit}<input type="number" min="0" step="0.01" value="${i.price}" onchange="updatePrice('${i.id}',this.value)"></label><div><span>${money(qty)} × ${money(i.price)}</span><b>฿${money(sum)}</b></div></div>
   </div>`;
 }).join('')||'<div class="empty-cart"><b>ยังไม่มีรายการ</b><p>เลือกรายการด้านซ้าย แล้วกรอกน้ำหนักรอบแรก</p></div>';
 const totalWeight=cart.filter(i=>i.unit==='กก.').reduce((s,i)=>s+itemQty(i),0);
 const total=cart.reduce((s,i)=>s+itemQty(i)*i.price,0);
 const totalRounds=cart.reduce((s,i)=>s+itemRounds(i).length,0);
 $('#totalWeight').textContent=money(totalWeight);$('#grandTotal').textContent=money(total);$('#totalRounds').textContent=totalRounds;
}

$('#checkoutBtn').onclick=()=>{
 if(!cart.length)return alert('กรุณาเพิ่มรายการรับซื้อ');
 const seller=$('#sellerName').value.trim()||'ไม่ระบุชื่อ';
 const date=$('#buyDate').value||today();
 const bill={id:Date.now(),no:`RB-${date.replaceAll('-','')}-${String(bills.filter(b=>b.date===date).length+1).padStart(3,'0')}`,date,seller,phone:$('#sellerPhone').value.trim(),note:$('#sellerNote').value.trim(),payment:$('#paymentMethod').value,items:cart.map(i=>({...i,rounds:itemRounds(i),qty:itemQty(i)}))};
 bill.totalWeight=bill.items.filter(i=>i.unit==='กก.').reduce((s,i)=>s+itemQty(i),0);bill.totalRounds=bill.items.reduce((s,i)=>s+itemRounds(i).length,0);bill.total=bill.items.reduce((s,i)=>s+itemQty(i)*i.price,0);
 bills.unshift(bill);save();showReceipt(bill);cart=[];$('#sellerName').value='';$('#sellerPhone').value='';$('#sellerNote').value='';renderAll();
};

function showReceipt(b){
 $('#receiptContent').innerHTML=`<h2>${settings.shopName}</h2><p>${settings.shopAddress||''}${settings.shopPhone?'<br>โทร '+settings.shopPhone:''}${settings.taxId?'<br>เลขผู้เสียภาษี '+settings.taxId:''}</p><hr><h3>ใบรับซื้อ</h3><p><b>${b.no}</b><br>${new Date(b.date+'T12:00:00').toLocaleDateString('th-TH',{dateStyle:'long'})}<br>ผู้ขาย: ${b.seller}${b.phone?' • '+b.phone:''}</p>
 <table><thead><tr><th>รายการ / รอบชั่ง</th><th class="right">รวม</th></tr></thead><tbody>${b.items.map(i=>{const rounds=itemRounds(i),qty=itemQty(i);return `<tr><td><b>${i.name}</b><br><small>${rounds.map((r,x)=>`รอบ ${x+1}: ${money(r)} ${i.unit}`).join(' • ')}</small><br>${rounds.length} รอบ | ${money(qty)} ${i.unit} × ฿${money(i.price)}</td><td class="right">฿${money(qty*i.price)}</td></tr>`}).join('')}</tbody></table>
 <div class="receipt-summary"><div><span>จำนวนรอบชั่ง</span><b>${b.totalRounds||b.items.reduce((s,i)=>s+itemRounds(i).length,0)} รอบ</b></div><div><span>น้ำหนักรวม</span><b>${money(b.totalWeight)} กก.</b></div><div style="font-size:20px"><span>ยอดจ่าย</span><b>฿${money(b.total)}</b></div></div><p>ชำระโดย: ${b.payment}</p>${b.note?`<p>หมายเหตุ: ${b.note}</p>`:''}<hr><p>${settings.receiptFooter}</p><p>ผู้รับเงิน ____________________</p>`;
 $('#receiptDialog').showModal();
}
$('#printReceiptBtn').onclick=()=>print();$('#closeReceiptBtn').onclick=()=>$('#receiptDialog').close();
window.viewReceipt=id=>showReceipt(bills.find(b=>b.id===id));
window.deleteBill=id=>{if(confirm('ลบรายการนี้หรือไม่?')){bills=bills.filter(b=>b.id!==id);save();renderAll()}};

function renderHistory(){
 const q=$('#historySearch').value.toLowerCase(),d=$('#historyDate').value;
 const list=bills.filter(b=>(!q||(b.seller+b.no+b.items.map(i=>i.name).join(' ')).toLowerCase().includes(q))&&(!d||b.date===d));
 $('#historyList').innerHTML=list.map(b=>`<div class="history-card"><div><b>${b.no}</b><p>${new Date(b.date+'T12:00:00').toLocaleDateString('th-TH')} • ${b.seller}</p><p>${b.items.length} รายการ • ${b.totalRounds||b.items.reduce((s,i)=>s+itemRounds(i).length,0)} รอบชั่ง • ${money(b.totalWeight)} กก.</p></div><div style="text-align:right"><b>฿${money(b.total)}</b><br><button class="secondary" onclick="viewReceipt(${b.id})">ใบรับซื้อ</button> <button class="remove" onclick="deleteBill(${b.id})">ลบ</button></div></div>`).join('')||'<p>ยังไม่มีประวัติ</p>';
}
$('#historySearch').oninput=renderHistory;$('#historyDate').onchange=renderHistory;
$('#exportBtn').onclick=()=>{
 const rows=[['เลขที่','วันที่','ผู้ขาย','โทร','รายการ','รอบที่','น้ำหนัก/จำนวน','หน่วย','ราคาต่อหน่วย','ยอดรอบ','รวมต่อสินค้า','วิธีจ่าย']];
 bills.forEach(b=>b.items.forEach(i=>itemRounds(i).forEach((r,x)=>rows.push([b.no,b.date,b.seller,b.phone,i.name,x+1,r,i.unit,i.price,r*i.price,itemQty(i)*i.price,b.payment]))));
 download('\uFEFF'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'),'purchase-history-by-round.csv','text/csv');
};
function download(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$('#backupBtn').onclick=()=>download(JSON.stringify({products,bills,settings},null,2),'recycle-pos-backup.json','application/json');
$('#restoreInput').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!x.products||!x.bills)throw 0;products=x.products;bills=x.bills;settings=x.settings||settings;save();renderAll();alert('นำเข้าข้อมูลเรียบร้อย')}catch{alert('ไฟล์ไม่ถูกต้อง')}};

$('#addProductBtn').onclick=()=>{$('#productForm').reset();$('#productId').value='';$('#productUnit').value='กก.';$('#productDialog').showModal()};
window.editProduct=id=>{const p=products.find(x=>x.id===id);$('#productId').value=p.id;$('#productCode').value=p.code;$('#productName').value=p.name;$('#productUnit').value=p.unit;$('#productPrice').value=p.price;$('#productDialog').showModal()};
window.deleteProduct=id=>{if(confirm('ลบรายการนี้?')){products=products.filter(x=>x.id!==id);save();renderAll()}};
$('#saveProductBtn').onclick=e=>{e.preventDefault();const p={id:$('#productId').value||uid(),code:$('#productCode').value.trim(),name:$('#productName').value.trim(),unit:$('#productUnit').value.trim(),price:Number($('#productPrice').value)};if(!p.code||!p.name||!p.unit)return alert('กรอกข้อมูลให้ครบ');const i=products.findIndex(x=>x.id===p.id);i<0?products.push(p):products[i]=p;save();$('#productDialog').close();renderAll()};

function renderSummary(){
 const t=today(),m=t.slice(0,7),tb=bills.filter(b=>b.date===t),mb=bills.filter(b=>b.date.startsWith(m));
 $('#todayAmount').textContent='฿'+money(tb.reduce((s,b)=>s+b.total,0));$('#todayBills').textContent=tb.length;$('#monthAmount').textContent='฿'+money(mb.reduce((s,b)=>s+b.total,0));$('#monthWeight').textContent=money(mb.reduce((s,b)=>s+b.totalWeight,0))+' กก.';
 const agg={};mb.flatMap(b=>b.items).forEach(i=>agg[i.name]=(agg[i.name]||0)+itemQty(i));const arr=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,8),max=arr[0]?.[1]||1;
 $('#topProducts').innerHTML=arr.map(([n,v])=>`<div class="bar-row"><div class="bar-label"><span>${n}</span><b>${money(v)}</b></div><div class="bar"><i style="width:${v/max*100}%"></i></div></div>`).join('')||'<p>ยังไม่มีข้อมูลเดือนนี้</p>';
}
function loadSettings(){for(const k in settings){const e=$('#'+k);if(e)e.value=settings[k]||''}$('#brandTitle').textContent=settings.shopName||'ระบบรับซื้อของเก่า'}
$('#saveSettingsBtn').onclick=()=>{settings={shopName:$('#shopName').value.trim(),shopAddress:$('#shopAddress').value.trim(),shopPhone:$('#shopPhone').value.trim(),taxId:$('#taxId').value.trim(),receiptFooter:$('#receiptFooter').value.trim()};save();loadSettings();alert('บันทึกแล้ว')};
$('#resetBtn').onclick=()=>{if(confirm('ข้อมูลทั้งหมดจะถูกลบ ยืนยันหรือไม่?')){localStorage.clear();location.reload()}};
function renderAll(){renderProducts($('#searchProduct').value);renderCart();renderHistory();renderSummary();loadSettings()}
let deferredPrompt;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');renderAll();
