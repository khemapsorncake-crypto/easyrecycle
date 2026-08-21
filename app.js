const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const on=(id,event,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener(event,fn);};
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
const money=n=>Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const unitThai=u=>({'kg':'กก.','กก.':'กก.','piece':'ชิ้น','ชิ้น':'ชิ้น'}[u]||u||'กก.');
const paymentThai=p=>({cash:'เงินสด',transfer:'โอนเงิน',other:'อื่น ๆ','เงินสด':'เงินสด','โอนเงิน':'โอนเงิน'}[p]||p||'เงินสด');

const seed=[
 ['R001','ขวดน้ำดื่ม / PET','กก.',4],['R002','ขวดน้ำเกลือ','กก.',4],['R003','กระดาษลัง / ลัง','กก.',2],
 ['R004','กระดาษสี','กก.',1],['R005','กระดาษขาว-ดำ','กก.',3],['R006','พลาสติกกรอบ','กก.',4],
 ['R007','พลาสติกรวม','กก.',2],['R008','เหล็ก','กก.',5],['R009','สังกะสี','กก.',3],
 ['R010','ขวดแก้ว','กก.',0.75],['R011','กระป๋อง','กก.',4],['R012','อะลูมิเนียม','กก.',25],
 ['R013','ทองแดง','กก.',180],['R014','สแตนเลส','กก.',20],['R015','เก้าอี้','ชิ้น',5],
 ['R016','หม้อหุงข้าว','ชิ้น',20],['R017','เครื่องใช้ไฟฟ้า','ชิ้น',10],['R018','อื่น ๆ','กก.',1]
].map(x=>({id:uid(),code:x[0],name:x[1],unit:x[2],price:x[3]}));

let products=[], bills=[], cart=[], selectedProduct=null, editingBillId=null, currentReceiptId=null;
let settings={shopName:'ร้านรับซื้อของเก่า',shopAddress:'',shopPhone:'',taxId:'',receiptFooter:'ขอบคุณที่มาใช้บริการ'};
let db=null, cloud=false, cloudBusy=false;

const roundsOf=i=>(i?.rounds||[]).map(Number).filter(n=>n>0);
const qtyOf=i=>roundsOf(i).reduce((s,n)=>s+n,0);
function calcBill(b){
 b.items=(b.items||[]).map(i=>({...i,price:Number(i.price||i.price_per_unit||0),unit:unitThai(i.unit),rounds:roundsOf(i)}));
 b.totalRounds=b.items.reduce((s,i)=>s+roundsOf(i).length,0);
 b.totalWeight=b.items.filter(i=>unitThai(i.unit)==='กก.').reduce((s,i)=>s+qtyOf(i),0);
 b.total=b.items.reduce((s,i)=>s+qtyOf(i)*Number(i.price||0),0);
 return b;
}

function localLoad(){
 products=JSON.parse(localStorage.getItem('rb_products')||'null')||seed;
 bills=JSON.parse(localStorage.getItem('rb_bills')||'[]');
 settings=JSON.parse(localStorage.getItem('rb_settings')||'null')||settings;
 bills=bills.map(calcBill);
}
function localSave(){
 localStorage.setItem('rb_products',JSON.stringify(products));
 localStorage.setItem('rb_bills',JSON.stringify(bills));
 localStorage.setItem('rb_settings',JSON.stringify(settings));
}
function setCloudStatus(text,type='warn'){
 const el=$('#cloudStatus'); if(!el)return;
 el.textContent=text;el.className='cloud-status '+type;
}

async function initCloud(){
 const url=window.EASYRECYCLE_SUPABASE_URL, key=window.EASYRECYCLE_SUPABASE_ANON_KEY;
 if(!url||!key||url.includes('PASTE_')||key.includes('PASTE_')||!window.supabase){
  cloud=false;setCloudStatus('เฉพาะเครื่อง','warn');return;
 }
 try{
  db=window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.from('purchases').select('id').limit(1);
  if(error)throw error;
  cloud=true;setCloudStatus('Cloud เชื่อมแล้ว','ok');
  await cloudLoadAll();
 }catch(e){
  console.error('Cloud init:',e);cloud=false;setCloudStatus('Cloud เชื่อมไม่ได้','warn');
 }
}

async function reconstructLegacyBill(h){
 const {data:items,error}=await db.from('purchase_items').select('*').eq('purchase_id',h.id).order('id');
 if(error) return calcBill({id:h.id,no:h.receipt_no,date:h.purchase_date,seller:h.seller_name||'',phone:h.seller_phone||'',note:h.seller_note||'',payment:h.payment_method||'cash',items:[]});
 const out=[];
 for(const it of items||[]){
  const {data:rs}=await db.from('weigh_rounds').select('*').eq('purchase_item_id',it.id).order('round_number');
  out.push({id:String(it.id),productId:it.product_id?String(it.product_id):null,code:it.product_code,name:it.product_name,unit:unitThai(it.unit),price:Number(it.price_per_unit||0),rounds:(rs||[]).map(r=>Number(r.weight))});
 }
 return calcBill({id:h.id,no:h.receipt_no,date:h.purchase_date,seller:h.seller_name||'',phone:h.seller_phone||'',note:h.seller_note||'',payment:h.payment_method||'cash',items:out});
}

function billFromJson(h){
 const j=h.bill_json;
 if(!j||typeof j!=='object')return null;
 return calcBill({
  ...j,id:h.id,no:h.receipt_no||j.no,date:h.purchase_date||j.date,
  seller:h.seller_name??j.seller??'',phone:h.seller_phone??j.phone??'',
  note:h.seller_note??j.note??'',payment:h.payment_method??j.payment??'cash'
 });
}

async function cloudLoadAll(){
 if(!cloud||cloudBusy)return;
 cloudBusy=true;
 try{
  const [pr,pu,st]=await Promise.all([
   db.from('products').select('*').order('id'),
   db.from('purchases').select('*').order('purchase_date',{ascending:false}).order('id',{ascending:false}),
   db.from('store_settings').select('*').limit(1)
  ]);
  if(pr.error)throw pr.error;
  if(pu.error)throw pu.error;
  if(pr.data?.length) products=pr.data.map(p=>({id:String(p.id),code:p.code||'',name:p.name,unit:unitThai(p.unit),price:Number(p.buy_price||0)}));
  if(!st.error&&st.data?.[0]){
   const x=st.data[0]; settings={shopName:x.store_name||'',shopAddress:x.address||'',shopPhone:x.phone||'',taxId:x.tax_id||'',receiptFooter:x.receipt_footer||''};
  }
  const loaded=[];
  for(const h of pu.data||[]){
   let b=billFromJson(h);
   if(!b)b=await reconstructLegacyBill(h);
   loaded.push(b);
  }
  bills=loaded;
  localSave();renderAll();
 }catch(e){
  console.error('Load Cloud:',e);setCloudStatus('Cloud อ่านข้อมูลไม่ได้','warn');
 }finally{cloudBusy=false;}
}

function makeBillSnapshot(bill){
 return {
  no:bill.no,date:bill.date,seller:bill.seller,phone:bill.phone,note:bill.note,payment:bill.payment,
  items:bill.items.map(i=>({productId:i.productId??null,code:i.code||'',name:i.name,unit:unitThai(i.unit),price:Number(i.price||0),rounds:[...roundsOf(i)]})),
  totalWeight:bill.totalWeight,totalRounds:bill.totalRounds,total:bill.total,version:15
 };
}

async function saveBillCloud(bill){
 if(!cloud)return false;
 const header={
  receipt_no:bill.no,purchase_date:bill.date,seller_name:bill.seller,seller_phone:bill.phone,seller_note:bill.note,
  payment_method:bill.payment,total_weight:bill.totalWeight,total_rounds:bill.totalRounds,subtotal:bill.total,discount:0,
  net_total:bill.total,status:'completed',bill_json:makeBillSnapshot(bill),updated_at:new Date().toISOString()
 };
 try{
  let purchaseId=editingBillId;
  if(editingBillId){
   const {data,error}=await db.from('purchases').update(header).eq('id',editingBillId).select('id').single();
   if(error)throw error;purchaseId=data.id;
  }else{
   const {data,error}=await db.from('purchases').insert(header).select('id').single();
   if(error)throw error;purchaseId=data.id;
  }
  bill.id=purchaseId;
  // Child tables remain useful for reports. Failure here does not lose the bill_json source of truth.
  try{
   await db.from('purchase_items').delete().eq('purchase_id',purchaseId);
   for(const i of bill.items){
    const pid=/^\d+$/.test(String(i.productId||''))?Number(i.productId):null;
    const {data:it,error}=await db.from('purchase_items').insert({
     purchase_id:purchaseId,product_id:pid,product_code:i.code,product_name:i.name,
     unit:unitThai(i.unit)==='กก.'?'kg':i.unit,price_per_unit:i.price,total_weight:qtyOf(i),
     round_count:roundsOf(i).length,line_total:qtyOf(i)*i.price
    }).select('id').single();
    if(error)throw error;
    const rs=roundsOf(i).map((w,x)=>({purchase_item_id:it.id,round_number:x+1,weight:w}));
    if(rs.length){const {error:re}=await db.from('weigh_rounds').insert(rs);if(re)throw re;}
   }
  }catch(childErr){console.warn('Child table sync warning:',childErr);}
  return true;
 }catch(e){
  console.error('Save Cloud:',e);alert('บันทึก Cloud ไม่สำเร็จ\n'+e.message);return false;
 }
}

function switchTab(id){
 $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
 $$('.panel').forEach(x=>x.classList.toggle('active',x.id===id));
 if(id==='history'&&cloud)cloudLoadAll();
}
$$('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
if($('#buyDate'))$('#buyDate').value=today();

function renderProducts(q=''){
 q=(q||'').toLowerCase().trim();
 const list=products.filter(p=>(p.name+' '+p.code).toLowerCase().includes(q));
 $('#productCards').innerHTML=list.map(p=>`<button class="product-card" onclick="askWeight('${p.id}')"><h3>${esc(p.name)}</h3><span>${esc(p.code)} • ${unitThai(p.unit)}</span><b>฿${money(p.price)} / ${unitThai(p.unit)}</b><small>แตะเพื่อเพิ่มรอบชั่ง</small></button>`).join('')||'<div class="empty">ไม่พบรายการ</div>';
 $('#productTable').innerHTML=products.map(p=>`<tr><td>${esc(p.code||'')}</td><td>${esc(p.name)}</td><td>${unitThai(p.unit)}</td><td>฿${money(p.price)}</td><td><button class="secondary" onclick="editProduct('${p.id}')">แก้ไข</button></td></tr>`).join('');
}
on('searchProduct','input',e=>renderProducts(e.target.value));

window.askWeight=id=>{
 selectedProduct=products.find(p=>String(p.id)===String(id));if(!selectedProduct)return;
 const existing=cart.find(i=>String(i.productId)===String(id));
 $('#weightTitle').textContent=selectedProduct.name;$('#weightPrice').textContent=`ราคา ฿${money(selectedProduct.price)} / ${unitThai(selectedProduct.unit)}`;
 $('#weightRoundLabel').textContent=`รอบที่ ${(existing?.rounds?.length||0)+1}`;$('#weightInput').value='';
 $('#weightDialog').showModal();setTimeout(()=>$('#weightInput').focus(),80);
};
on('addWeightBtn','click',e=>{
 e.preventDefault();const v=Number($('#weightInput').value);if(!(v>0))return alert('กรอกน้ำหนักหรือจำนวน');
 let i=cart.find(x=>String(x.productId)===String(selectedProduct.id));
 if(i)i.rounds.push(v);else cart.push({id:uid(),productId:selectedProduct.id,code:selectedProduct.code,name:selectedProduct.name,unit:selectedProduct.unit,price:Number(selectedProduct.price),rounds:[v]});
 $('#weightDialog').close();renderCart();
});
window.addRound=id=>{
 const i=cart.find(x=>String(x.id)===String(id));if(!i)return;
 selectedProduct={id:i.productId,code:i.code,name:i.name,unit:i.unit,price:i.price};
 $('#weightTitle').textContent=i.name;$('#weightPrice').textContent=`ราคา ฿${money(i.price)} / ${unitThai(i.unit)}`;$('#weightRoundLabel').textContent=`รอบที่ ${roundsOf(i).length+1}`;
 $('#weightInput').value='';$('#weightDialog').showModal();
};
window.updateRound=(id,x,v)=>{const i=cart.find(a=>String(a.id)===String(id));if(i&&Number(v)>0)i.rounds[x]=Number(v);renderCart();};
window.removeRound=(id,x)=>{const i=cart.find(a=>String(a.id)===String(id));if(!i)return;i.rounds.splice(x,1);if(!i.rounds.length)cart=cart.filter(a=>String(a.id)!==String(id));renderCart();};
window.updatePrice=(id,v)=>{const i=cart.find(a=>String(a.id)===String(id));if(i)i.price=Math.max(0,Number(v)||0);renderCart();};
window.removeCart=id=>{cart=cart.filter(a=>String(a.id)!==String(id));renderCart();};
on('clearCartBtn','click',()=>{if(!cart.length||confirm('ล้างรายการทั้งหมด?')){cart=[];renderCart();}});

function renderCart(){
 $('#cartList').innerHTML=cart.map(i=>{
  const rs=roundsOf(i),q=qtyOf(i);
  return `<div class="cart-item"><div class="cart-top"><div><b>${esc(i.name)}</b><small>${rs.length} รอบ • รวม ${money(q)} ${unitThai(i.unit)}</small></div><button class="remove" onclick="removeCart('${i.id}')">ลบ</button></div>
  <div class="round-list">${rs.map((r,x)=>`<div class="round-row"><label>รอบ ${x+1}<input type="number" min=".01" step=".01" value="${r}" onchange="updateRound('${i.id}',${x},this.value)"></label><span>${unitThai(i.unit)}</span><button class="round-delete" onclick="removeRound('${i.id}',${x})">×</button></div>`).join('')}</div>
  <button class="add-round" onclick="addRound('${i.id}')">+ เพิ่มรอบที่ ${rs.length+1}</button>
  <div class="calc-row"><label>ราคา/${unitThai(i.unit)}<input type="number" min="0" step=".01" value="${i.price}" onchange="updatePrice('${i.id}',this.value)"></label><div><span>${money(q)} × ${money(i.price)}</span><b>฿${money(q*i.price)}</b></div></div></div>`;
 }).join('')||'<div class="empty">ยังไม่มีรายการรับซื้อ</div>';
 const r=cart.reduce((s,i)=>s+roundsOf(i).length,0),w=cart.filter(i=>unitThai(i.unit)==='กก.').reduce((s,i)=>s+qtyOf(i),0),t=cart.reduce((s,i)=>s+qtyOf(i)*i.price,0);
 $('#totalRounds').textContent=r;$('#totalWeight').textContent=money(w);$('#grandTotal').textContent=money(t);
}
function nextNo(date){return `RB-${date.replaceAll('-','')}-${String(bills.filter(b=>b.date===date&&String(b.id)!==String(editingBillId)).length+1).padStart(3,'0')}`;}

on('checkoutBtn','click',async()=>{
 if(!cart.length)return alert('กรุณาเพิ่มรายการ');
 const date=$('#buyDate').value||today(),old=editingBillId?bills.find(b=>String(b.id)===String(editingBillId)):null;
 const bill=calcBill({id:editingBillId||Date.now(),no:old?.no||nextNo(date),date,seller:$('#sellerName').value.trim()||'ไม่ระบุชื่อ',phone:$('#sellerPhone').value.trim(),note:$('#sellerNote').value.trim(),payment:$('#paymentMethod').value,items:cart.map(i=>({...i,rounds:[...roundsOf(i)]}))});
 if(cloud){
  setCloudStatus('กำลังบันทึก…','warn');
  const ok=await saveBillCloud(bill);if(!ok){setCloudStatus('Cloud มีปัญหา','warn');return;}
  await cloudLoadAll();setCloudStatus('Cloud เชื่อมแล้ว','ok');
 }else{
  if(editingBillId){const x=bills.findIndex(b=>String(b.id)===String(editingBillId));if(x>=0)bills[x]=bill;}else bills.unshift(bill);
  localSave();
 }
 currentReceiptId=bill.id;showReceipt(bill);resetForm(false);renderAll();
});
function resetForm(closeReceipt=false){
 cart=[];editingBillId=null;$('#sellerName').value='';$('#sellerPhone').value='';$('#sellerNote').value='';$('#buyDate').value=today();$('#paymentMethod').value='cash';
 $('#editBanner').classList.add('hidden');$('#checkoutBtn').textContent='บันทึกและออกใบรับซื้อ';renderCart();
 if(closeReceipt&&$('#receiptDialog').open)$('#receiptDialog').close();
}
on('cancelEditBtn','click',()=>resetForm(true));

window.startEditBill=async id=>{
 if(cloud)await cloudLoadAll();
 const b=bills.find(x=>String(x.id)===String(id));if(!b)return alert('ไม่พบบิล');
 editingBillId=b.id;cart=b.items.map(i=>({id:uid(),productId:i.productId,code:i.code,name:i.name,unit:i.unit,price:Number(i.price),rounds:[...roundsOf(i)]}));
 $('#sellerName').value=b.seller||'';$('#sellerPhone').value=b.phone||'';$('#sellerNote').value=b.note||'';$('#buyDate').value=b.date;$('#paymentMethod').value=b.payment||'cash';
 $('#editReceiptNo').textContent=b.no;$('#editBanner').classList.remove('hidden');$('#checkoutBtn').textContent='บันทึกการแก้ไขบิล';
 if($('#receiptDialog').open)$('#receiptDialog').close();switchTab('buy');renderCart();scrollTo({top:0,behavior:'smooth'});
};
window.openReceipt=id=>{const b=bills.find(x=>String(x.id)===String(id));if(b)showReceipt(b);};

function receiptHtml(b){
 return `<h2>${esc(settings.shopName)}</h2><p>${esc(settings.shopAddress||'')}${settings.shopPhone?'<br>โทร '+esc(settings.shopPhone):''}${settings.taxId?'<br>เลขผู้เสียภาษี '+esc(settings.taxId):''}</p><hr><h3>ใบรับซื้อ</h3><p><b>${esc(b.no)}</b><br>${new Date(b.date+'T12:00:00').toLocaleDateString('th-TH',{dateStyle:'long'})}<br>ผู้ขาย: ${esc(b.seller)}${b.phone?' • '+esc(b.phone):''}</p>
 <table><thead><tr><th>รายการ / รอบชั่ง</th><th class="right">จำนวนเงิน</th></tr></thead><tbody>${b.items.map(i=>`<tr><td><b>${esc(i.name)}</b><br><small>${roundsOf(i).map((r,x)=>`รอบ ${x+1}: ${money(r)} ${unitThai(i.unit)}`).join(' • ')}</small><br>${roundsOf(i).length} รอบ | ${money(qtyOf(i))} ${unitThai(i.unit)} × ฿${money(i.price)}</td><td class="right">฿${money(qtyOf(i)*i.price)}</td></tr>`).join('')}</tbody></table>
 <div class="receipt-summary"><div><span>จำนวนรอบ</span><b>${b.totalRounds} รอบ</b></div><div><span>น้ำหนักรวม</span><b>${money(b.totalWeight)} กก.</b></div><div class="receipt-grand"><span>ยอดจ่าย</span><b>฿${money(b.total)}</b></div></div>
 <p>ชำระ: ${paymentThai(b.payment)}</p>${b.note?`<p>หมายเหตุ: ${esc(b.note)}</p>`:''}<hr><p>${esc(settings.receiptFooter||'')}</p><p>ผู้รับเงิน ____________________</p>`;
}
function showReceipt(b){
 currentReceiptId=b.id;$('#receiptContent').innerHTML=receiptHtml(b);
 if(!$('#receiptDialog').open)$('#receiptDialog').showModal();
}
on('closeReceiptBtn','click',()=>$('#receiptDialog').close());
on('editReceiptBtn','click',()=>{if(currentReceiptId!=null)startEditBill(currentReceiptId);});

function printReceipt(mode='a4'){
 const b=bills.find(x=>String(x.id)===String(currentReceiptId));
 if(!b)return alert('ไม่พบบิลที่จะพิมพ์');
 const portal=$('#printPortal');portal.className=mode==='80'?'print-80':'print-a4';portal.innerHTML=`<div class="print-receipt">${receiptHtml(b)}</div>`;
 document.body.classList.add('printing');
 const done=()=>{document.body.classList.remove('printing');portal.className='';portal.innerHTML='';window.removeEventListener('afterprint',done);};
 window.addEventListener('afterprint',done);
 setTimeout(()=>window.print(),60);
 setTimeout(()=>{if(document.body.classList.contains('printing'))done();},5000);
}
on('printReceiptBtn','click',()=>printReceipt('a4'));
on('print80Btn','click',()=>printReceipt('80'));

on('imageReceiptBtn','click',async()=>{
 const b=bills.find(x=>String(x.id)===String(currentReceiptId));if(!b)return alert('ไม่พบบิล');
 if(!window.html2canvas)return alert('ระบบสร้างรูปยังโหลดไม่ครบ กรุณารีเฟรชเว็บแล้วลองใหม่');
 const btn=$('#imageReceiptBtn');btn.disabled=true;btn.textContent='กำลังสร้างรูป…';
 try{
  const box=document.createElement('div');box.className='image-capture-box';box.innerHTML=`<div class="receipt">${receiptHtml(b)}</div>`;document.body.appendChild(box);
  const canvas=await html2canvas(box,{scale:2,backgroundColor:'#fff',useCORS:true,logging:false,windowWidth:box.scrollWidth,windowHeight:box.scrollHeight});
  box.remove();
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png',1));const filename=`${b.no}.png`;
  const file=new File([blob],filename,{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:b.no});}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 }catch(e){if(e.name!=='AbortError')alert('บันทึกรูปไม่สำเร็จ\n'+e.message);}
 finally{btn.disabled=false;btn.textContent='🖼️ บันทึกเป็นรูป';}
});

function renderHistory(){
 const q=($('#historySearch').value||'').toLowerCase(),d=$('#historyDate').value;
 const list=bills.filter(b=>(!q||(b.no+' '+b.seller+' '+b.items.map(i=>i.name).join(' ')).toLowerCase().includes(q))&&(!d||b.date===d));
 $('#historyList').innerHTML=list.map(b=>`<div class="history-card"><div><b>${esc(b.no)}</b><p>${new Date(b.date+'T12:00:00').toLocaleDateString('th-TH')} • ${esc(b.seller)}</p><p>${b.items.map(i=>esc(i.name)).join(', ')}</p><p>${b.items.length} รายการ • ${b.totalRounds} รอบ • ${money(b.totalWeight)} กก.</p></div><div><b>฿${money(b.total)}</b><div class="history-actions"><button class="secondary" onclick="openReceipt('${b.id}')">ดู/ปริ้น</button><button class="secondary" onclick="startEditBill('${b.id}')">✏️ แก้ไข</button></div></div></div>`).join('')||'<div class="empty">ยังไม่มีประวัติ</div>';
}
on('historySearch','input',renderHistory);on('historyDate','change',renderHistory);on('refreshHistoryBtn','click',()=>cloud?cloudLoadAll():renderAll());

on('addProductBtn','click',()=>{$('#productId').value='';$('#productCode').value='';$('#productName').value='';$('#productUnit').value='กก.';$('#productPrice').value='';$('#productDialog').showModal();});
window.editProduct=id=>{const p=products.find(x=>String(x.id)===String(id));if(!p)return;$('#productId').value=p.id;$('#productCode').value=p.code;$('#productName').value=p.name;$('#productUnit').value=p.unit;$('#productPrice').value=p.price;$('#productDialog').showModal();};
on('saveProductBtn','click',async e=>{
 e.preventDefault();const id=$('#productId').value,p={code:$('#productCode').value.trim(),name:$('#productName').value.trim(),unit:$('#productUnit').value.trim(),price:Number($('#productPrice').value)};
 if(!p.code||!p.name)return alert('กรอกข้อมูลให้ครบ');
 if(cloud){
  const row={code:p.code,name:p.name,unit:p.unit==='กก.'?'kg':p.unit,buy_price:p.price,active:true};
  const res=id?await db.from('products').update(row).eq('id',id):await db.from('products').insert(row);
  if(res.error)return alert(res.error.message);await cloudLoadAll();
 }else{
  if(id){const i=products.findIndex(x=>String(x.id)===String(id));products[i]={...products[i],...p};}else products.push({id:uid(),...p});
  localSave();renderAll();
 }
 $('#productDialog').close();
});

function renderSummary(){
 const t=today(),m=t.slice(0,7),tb=bills.filter(b=>b.date===t),mb=bills.filter(b=>b.date.startsWith(m));
 $('#todayAmount').textContent='฿'+money(tb.reduce((s,b)=>s+b.total,0));$('#todayBills').textContent=tb.length;
 $('#monthAmount').textContent='฿'+money(mb.reduce((s,b)=>s+b.total,0));$('#monthWeight').textContent=money(mb.reduce((s,b)=>s+b.totalWeight,0))+' กก.';
 const ag={};mb.flatMap(b=>b.items).forEach(i=>ag[i.name]=(ag[i.name]||0)+qtyOf(i));const arr=Object.entries(ag).sort((a,b)=>b[1]-a[1]).slice(0,8),max=arr[0]?.[1]||1;
 $('#topProducts').innerHTML=arr.map(([n,v])=>`<div class="bar-row"><div class="bar-label"><span>${esc(n)}</span><b>${money(v)}</b></div><div class="bar"><i style="width:${v/max*100}%"></i></div></div>`).join('')||'<div class="empty">ยังไม่มีข้อมูลเดือนนี้</div>';
}
function loadSettings(){
 $('#shopName').value=settings.shopName||'';$('#shopAddress').value=settings.shopAddress||'';$('#shopPhone').value=settings.shopPhone||'';$('#taxId').value=settings.taxId||'';$('#receiptFooter').value=settings.receiptFooter||'';$('#brandTitle').textContent=settings.shopName||'EasyRecycle';
}
on('saveSettingsBtn','click',async()=>{
 settings={shopName:$('#shopName').value.trim(),shopAddress:$('#shopAddress').value.trim(),shopPhone:$('#shopPhone').value.trim(),taxId:$('#taxId').value.trim(),receiptFooter:$('#receiptFooter').value.trim()};
 if(cloud){
  const {data}=await db.from('store_settings').select('id').limit(1);const row={store_name:settings.shopName,address:settings.shopAddress,phone:settings.shopPhone,tax_id:settings.taxId,receipt_footer:settings.receiptFooter,updated_at:new Date().toISOString()};
  const res=data?.[0]?await db.from('store_settings').update(row).eq('id',data[0].id):await db.from('store_settings').insert(row);if(res.error)return alert(res.error.message);
 }else localSave();
 loadSettings();alert('บันทึกแล้ว');
});

function renderAll(){renderProducts($('#searchProduct')?.value||'');renderCart();renderHistory();renderSummary();loadSettings();}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloud)cloudLoadAll();});
(async()=>{localLoad();renderAll();await initCloud();})();
