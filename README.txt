EasyRecycle Internal V1.2 — Supabase Cloud

สิ่งที่เปลี่ยน
- ข้อมูลสินค้า บิล ประวัติ และข้อมูลร้านเก็บบน Supabase
- มือถือ คอม และแท็บเล็ตเห็นข้อมูลชุดเดียวกัน
- ไม่มีระบบ Login ตามการใช้งานภายใน
- ถ้า Cloud ขัดข้อง ระบบจะแสดงข้อมูลสำรองล่าสุดในเครื่อง

ติดตั้งครั้งแรก
1) เข้า https://supabase.com แล้วสร้าง Project ใหม่
2) เข้า SQL Editor > New query
3) เปิดไฟล์ supabase.sql คัดลอกทั้งหมดไปวาง แล้วกด Run
4) เข้า Project Settings > API
5) คัดลอก Project URL และ anon/public key
6) เปิดไฟล์ supabase-config.js แล้วแทนค่า 2 บรรทัด:
   EASYRECYCLE_SUPABASE_URL
   EASYRECYCLE_SUPABASE_ANON_KEY
7) อัปโหลดไฟล์ทั้งหมดขึ้น GitHub ทับของเดิม แล้ว Commit
8) รอ Vercel ประมาณ 1–2 นาที เปิดเว็บใหม่
9) ด้านบนควรขึ้น “เชื่อม Cloud แล้ว • ทุกเครื่องเห็นข้อมูลเดียวกัน”

ข้อควรทราบ
- ระบบนี้ไม่มี Login จึงตั้ง Policy ให้ anon อ่าน/เขียนข้อมูลได้
- เหมาะกับลิงก์ใช้ภายในเท่านั้น อย่าเผยแพร่ลิงก์เว็บสู่สาธารณะ
- anon key ใส่ในหน้าเว็บได้ตามรูปแบบของ Supabase แต่ห้ามใช้ service_role key เด็ดขาด
