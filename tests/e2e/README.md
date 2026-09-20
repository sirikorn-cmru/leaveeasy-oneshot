# เทสต์อัตโนมัติ (Playwright) — LeaveEasy

เทสต์ 2 เคสที่รันด้วย `playwright test` ได้จริง แปลงมาจากแผนทดสอบที่ตกลงกันไว้

| ไฟล์ | เคส | ขั้นตอน | อ้างเกณฑ์ |
|---|---|---|---|
| `01-submit-leave-request.spec.js` | ยื่นใบลาใหม่แล้วไปโผล่ในหน้ารายการ | 9 | US-02 + US-01 (+ US-10 เรื่องลำดับ) |
| `02-approve-leave-request.spec.js` | กดอนุมัติแล้วสถานะเปลี่ยนจริง | 8 | US-04 |
| `03-empty-title-validation.spec.js` | เว้นช่องหัวข้อแล้วกดบันทึก ต้องไม่บันทึกและต้องเตือน | 6 | นอกเหนือเกณฑ์ที่เขียนไว้ (ล็อกพฤติกรรมที่โค้ดทำอยู่) |
| `04-guest-cannot-read.spec.js` | ไม่ล็อกอินแล้วเปิดหน้ารายการ ต้องอ่านข้อมูลไม่ได้ | 5 | US-08 |
| `05-cannot-open-other-user-request.spec.js` | employee คนที่สอง เปิดใบลาของคนแรกไม่ได้ | 6 | US-08 |

## ต้องเตรียมอะไรก่อน

1. **ตั้งค่า Firebase จริง** — ใส่ค่าจาก Firebase Console ลง `js/firebase-config.js` ให้ครบทั้ง 6 ช่อง
   ถ้ายังเป็น placeholder เทสต์จะถูก **ข้ามพร้อมบอกเหตุผล** ไม่ใช่ fail มั่ว ๆ
2. **เตรียมบัญชีทดสอบ 2 บัญชี** (ใช้อีเมล `@example.com` เท่านั้น ห้ามใช้อีเมลจริงของใคร)
   - บัญชี role `employee`
   - บัญชี role `manager` หรือ `hr`
   - **บัญชี role `employee` อีกคนหนึ่ง** (เคสที่ 5 เท่านั้น) — ห้ามใช้ manager/hr แทน
     เพราะ manager/hr เปิดใบลาของทุกคนได้ตามการออกแบบ
3. **มีใบลาสถานะ `รอพิจารณา` อย่างน้อย 1 ใบ** สำหรับเคสที่ 2
   (รันเคสที่ 1 ก่อนจะสร้างให้เอง หรือใช้ `seed/seed.html`)

## ตั้งค่าบัญชีผ่าน environment variable

ห้าม hardcode อีเมล/รหัสผ่านลงไฟล์เทสต์ เพราะไฟล์พวกนี้ขึ้น Git

**PowerShell**

```powershell
$env:E2E_EMPLOYEE_EMAIL = "employee@example.com"
$env:E2E_EMPLOYEE_PASSWORD = "..."
$env:E2E_MANAGER_EMAIL = "manager@example.com"
$env:E2E_MANAGER_PASSWORD = "..."
$env:E2E_EMPLOYEE2_EMAIL = "employee2@example.com"
$env:E2E_EMPLOYEE2_PASSWORD = "..."
npm run test:e2e
```

**Git Bash**

```bash
E2E_EMPLOYEE_EMAIL=employee@example.com E2E_EMPLOYEE_PASSWORD=... \
E2E_MANAGER_EMAIL=manager@example.com E2E_MANAGER_PASSWORD=... \
E2E_EMPLOYEE2_EMAIL=employee2@example.com E2E_EMPLOYEE2_PASSWORD=... \
npm run test:e2e
```

## วิธีรัน

```bash
npm run test:e2e
```

เซิร์ฟเวอร์เปิดให้เองผ่าน `npm run dev` (ถ้ามีตัวที่รันอยู่แล้วจะใช้ตัวนั้นต่อ)

ดูรายงานแบบหน้าเว็บหลังรันเสร็จ:

```bash
npm run test:e2e:report
```

## ขอบเขตที่ยังไม่ครอบ

- เคสที่ 2 ทดสอบเฉพาะทาง **"อนุมัติ"** ไม่ได้ทดสอบทาง **"ไม่อนุมัติ"**
  ถ้าจะครอบ ต้องใช้ใบลาอีกใบแยกต่างหาก แล้วรันชุดขั้นตอนเดียวกันโดยกด `#btn-reject` แทน
- ยังไม่ครอบ US-03, US-05, US-06, US-07, US-08 (การแยกสิทธิ์ข้ามผู้ใช้), US-09

## เทสต์ความปลอดภัย (เคส 4 และ 5) ตรวจ 2 ชั้น

ชั้นแรกคือหน้าจอ — `js/nav.js` เด้งคนที่ไม่ได้ล็อกอินออกไป `login.html`
ชั้นนี้เป็นแค่ยามหน้าประตูฝั่งเบราว์เซอร์ ใครเปิด DevTools ก็ข้ามได้

ชั้นที่สองคือด่านจริง — ยิงอ่าน Firestore ตรง ๆ ผ่าน REST API แล้วต้องได้
`PERMISSION_DENIED` เท่านั้น ถ้ายังไม่ได้ Publish `firestore.rules` ขึ้น Console
เทสต์จะไม่ผ่านที่ชั้นนี้ ถึงชั้นแรกจะผ่านก็ตาม

## หมายเหตุที่ควรรู้ตอนเขียนเทสต์เพิ่ม

- เซิร์ฟเวอร์ `serve` เปิด `cleanUrls` ไว้ — `/login.html` จะถูก 301 เป็น `/login`
  จึงห้ามเทียบ path ตรง ๆ ให้ใช้ `H.idจากURL()` อ่านค่าจาก query string แทน
- **ห้ามใช้ปุ่ม "ออกจากระบบ" เป็นสัญญาณว่าล็อกอินสำเร็จ** เพราะมันโผล่ตลอดแม้ยังไม่ล็อกอิน
  (บั๊ก CSS ที่รายงานไว้ใน `tests/20260920-test-result.md`) ให้ดูที่ `#nav-user` แทน
