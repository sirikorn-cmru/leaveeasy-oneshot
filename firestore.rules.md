# วิธีทดสอบ firestore.rules ด้วย Rules Playground

ก่อน deploy จริง ให้เปิด Firebase Console → Firestore Database → แท็บ **Rules** →
กดปุ่ม **Rules Playground** แล้วทดสอบตามตารางด้านล่างทีละแถว วิธีตั้งค่าการจำลอง (simulation)
ในแต่ละครั้ง:

1. เลือก **Simulation type** ตามคอลัมน์ "การกระทำ" (get / list / create / update / delete)
2. ใส่ **Location** เป็น path ของเอกสารตามคอลัมน์ "เอกสารที่ทดสอบ"
3. เปิด **Authenticated** แล้วใส่ **Firebase UID** สมมติตามคอลัมน์ "สวมสิทธิ์เป็น" (หรือปิด
   Authenticated ไว้ถ้าต้องการทดสอบกรณี "ไม่ได้ล็อกอิน")
4. ถ้าเป็นการทดสอบ create/update ให้ใส่ข้อมูลในช่อง **Document data (JSON)** ตามที่ระบุ
5. กด **Run** แล้วเทียบผลลัพธ์กับคอลัมน์ "ผลที่คาดหวัง"

ก่อนเริ่ม ให้เตรียมเอกสารตัวอย่างไว้ในฐานข้อมูลทดสอบก่อน (หรือสร้างผ่านแท็บ Data ของ
Playground เอง):
- `users/emp1` = `{ name: "พนักงาน1", email: "emp1@test.com", role: "employee" }`
- `users/emp2` = `{ name: "พนักงาน2", email: "emp2@test.com", role: "employee" }`
- `users/mgr1` = `{ name: "หัวหน้า1", email: "mgr1@test.com", role: "manager" }`
- `users/hr1` = `{ name: "ฝ่ายบุคคล1", email: "hr1@test.com", role: "hr" }`
- **ห้ามสร้าง** `users/ghost1` — ตั้งใจให้ไม่มีเอกสารผู้ใช้ ใช้ทดสอบกรณี "ล็อกอินได้แต่ไม่มี
  เอกสาร users/{uid}" (กฎข้อ 6)
- `leaveRequests/lr1` = `{ requesterId: "emp1", status: "รอพิจารณา", title: "ลาป่วย", reason: "...", ... }`
- `leaveRequests/lr2` = `{ requesterId: "emp2", status: "อนุมัติ", title: "ลากิจ", ... }`
- `leaveRequests/lr1/approvals/a1` = `{ authorId: "mgr1", authorName: "หัวหน้า1", message: "...", createdAt: ... }`
- `leaveRequests/orphan1/approvals/a9` = `{ authorId: "mgr1", ... }` โดย**ไม่มี**เอกสารแม่
  `leaveRequests/orphan1` (Firestore ลบเอกสารแม่แล้ว subcollection ไม่ถูกลบตาม — ใช้ทดสอบกฎข้อ 6)

---

## กฎข้อ 1 — ไม่ได้ล็อกอิน ทำอะไรไม่ได้เลย

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ผลที่คาดหวัง |
|---|---|---|---|
| ไม่ล็อกอิน (ปิด Authenticated) | get | `leaveTypes/any` | **deny** |
| ไม่ล็อกอิน (ปิด Authenticated) | get | `users/emp1` | **deny** |
| ไม่ล็อกอิน (ปิด Authenticated) | create | `leaveRequests/new1` (ข้อมูลอะไรก็ได้) | **deny** |

## กฎข้อ 2 — `users/{uid}`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ข้อมูล (ถ้ามี) | ผลที่คาดหวัง |
|---|---|---|---|---|
| `emp1` | get | `users/emp1` | - | **allow** (อ่านของตัวเอง) |
| `emp1` | get | `users/emp2` | - | **deny** (employee อ่านของคนอื่นไม่ได้) |
| `mgr1` | get | `users/emp1` | - | **allow** (manager อ่านของใครก็ได้) |
| `hr1` | get | `users/emp1` | - | **allow** (hr อ่านของใครก็ได้) |
| `emp1` | create | `users/emp1` | `{ name:"x", email:"x@test.com", role:"employee" }` | **allow** (สร้างของตัวเอง + role employee) |
| `emp1` | create | `users/emp1` | `{ name:"x", email:"x@test.com", role:"manager" }` | **deny** (ตั้ง role ตัวเองเป็น manager ไม่ได้) |
| `emp1` | create | `users/emp2` | `{ name:"x", email:"x@test.com", role:"employee" }` | **deny** (สร้างเอกสารแทนคนอื่นไม่ได้) |
| `emp1` | create | `users/emp1` | `{ name:"x", email:"x@test.com", role:"employee", isAdmin:true }` | **deny** (มี field นอกเหนือจาก name/email/role) |
| `hr1` | update | `users/emp1` | เปลี่ยน `role` เป็น `"manager"` | **allow** (hr เปลี่ยน role ได้) |
| `hr1` | update | `users/emp1` | เปลี่ยน `role` เป็น `"superadmin"` | **deny** (role ต้องเป็น 1 ใน 3 ค่าที่ระบบรู้จักเท่านั้น) |
| `mgr1` | update | `users/emp1` | เปลี่ยน `role` เป็น `"manager"` | **deny** (manager เปลี่ยน role ไม่ได้ ต้อง hr เท่านั้น) |
| `emp1` | update | `users/emp1` | เปลี่ยนเฉพาะ `role` เป็น `"hr"` | **deny** (เลื่อนขั้นตัวเองไม่ได้ ต่อให้เขียนแค่ field เดียว) |
| `emp1` | delete | `users/emp1` | - | **deny** (ลบแล้วสร้างใหม่เพื่อเปลี่ยน role ไม่ได้ — delete ปิดตายทุกคน) |
| `hr1` | delete | `users/emp1` | - | **deny** (แม้แต่ hr ก็ลบไม่ได้) |

## กฎข้อ 3 — `leaveRequests/{id}`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ข้อมูล (ถ้ามี) | ผลที่คาดหวัง |
|---|---|---|---|---|
| `emp1` | get | `leaveRequests/lr1` (requesterId=emp1) | - | **allow** (อ่านใบของตัวเอง) |
| `emp1` | get | `leaveRequests/lr2` (requesterId=emp2) | - | **deny** (อ่านใบของ employee คนอื่นไม่ได้) |
| `mgr1` | get | `leaveRequests/lr2` (requesterId=emp2) | - | **allow** (manager อ่านใบใครก็ได้) |
| `emp1` | create | `leaveRequests/new1` | `{ requesterId:"emp1", status:"รอพิจารณา", ... }` | **allow** |
| `emp1` | create | `leaveRequests/new1` | `{ requesterId:"emp2", status:"รอพิจารณา", ... }` | **deny** (ยื่นแทนคนอื่นไม่ได้) |
| `emp1` | create | `leaveRequests/new1` | `{ requesterId:"emp1", status:"อนุมัติ", ... }` | **deny** (สร้างมาแล้วอนุมัติเลยไม่ได้) |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยนเฉพาะ `status` เป็น `"อนุมัติ"` | **allow** |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` และแก้ `title` ด้วย | **deny** (แก้ field อื่นนอกจาก status ไม่ได้) |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` และแก้ `reason` ด้วย | **deny** (แก้เหตุผลการลาแนบไปกับการอนุมัติไม่ได้) |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` และ**เพิ่ม field ใหม่** เช่น `note:"x"` | **deny** (`affectedKeys()` นับ field ที่เพิ่มเข้ามาใหม่ด้วย) |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เขียนทับทั้งเอกสารแบบ `set()` โดย**ตัด field `reason` ทิ้ง** และตั้ง `status` เป็น `"อนุมัติ"` | **deny** (`affectedKeys()` นับ field ที่ถูกลบออกด้วย) |
| `mgr1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` และแก้ `requesterId`/`approverId` ด้วย | **deny** (ยึดใบลาคนอื่นมาเป็นของตัวเองไม่ได้) |
| `mgr1` | update | `leaveRequests/lr2` (status=อนุมัติ อยู่แล้ว) | เปลี่ยน `status` เป็น `"ไม่อนุมัติ"` | **deny** (ใบที่ตัดสินแล้วเปลี่ยนซ้ำไม่ได้) |
| `mgr1` | update | `leaveRequests/lr2` (status=อนุมัติ อยู่แล้ว) | เปลี่ยน `status` กลับเป็น `"รอพิจารณา"` | **deny** (ถอยสถานะกลับไม่ได้ — ทั้งเพราะสถานะเดิมไม่ใช่ "รอพิจารณา" และค่าใหม่ไม่อยู่ใน 2 ค่าที่อนุญาต) |
| `emp1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` | **deny** (employee เปลี่ยนสถานะเองไม่ได้ แม้เป็นเจ้าของใบ) |
| `emp1` | delete | `leaveRequests/lr1` (requesterId=emp1, status=รอพิจารณา) | - | **allow** |
| `emp1` | delete | `leaveRequests/lr2` (requesterId=emp2, status=อนุมัติ) | - | **deny** (ไม่ใช่เจ้าของ + สถานะไม่ใช่รอพิจารณา) |
| `emp1` | delete | สมมติ `leaveRequests/lr1` แต่สถานะเป็น `"อนุมัติ"` แล้ว | - | **deny** (ใบที่ตัดสินแล้วลบไม่ได้ แม้เป็นเจ้าของ) |

## กฎข้อ 4 — `leaveRequests/{id}/approvals/{approvalId}`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ข้อมูล (ถ้ามี) | ผลที่คาดหวัง |
|---|---|---|---|---|
| `emp1` | get | `leaveRequests/lr1/approvals/a1` (lr1.requesterId=emp1) | - | **allow** |
| `emp2` | get | `leaveRequests/lr1/approvals/a1` (lr1.requesterId=emp1) | - | **deny** (ไม่ใช่เจ้าของใบแม่ และไม่ใช่ staff) |
| `mgr1` | get | `leaveRequests/lr1/approvals/a1` | - | **allow** |
| `emp1` | create | `leaveRequests/lr1/approvals/new1` | `{ authorId:"emp1", message:"ขอเพิ่มเอกสาร" }` | **allow** (เจ้าของใบ เขียนความเห็นตัวเอง) |
| `emp1` | create | `leaveRequests/lr1/approvals/new1` | `{ authorId:"mgr1", message:"..." }` | **deny** (authorId ไม่ตรงกับ uid ที่ล็อกอินอยู่) |
| `mgr1` | create | `leaveRequests/lr1/approvals/new1` | `{ authorId:"mgr1", message:"อนุมัติแล้ว" }` | **allow** |
| `emp2` | create | `leaveRequests/lr1/approvals/new1` | `{ authorId:"emp2", message:"..." }` | **deny** (ไม่ใช่เจ้าของใบแม่ ไม่ใช่ staff) |
| `emp2` | create | `leaveRequests/lr1/approvals/new1` | `{ authorId:"emp1", message:"..." }` | **deny** (ทั้งปลอม authorId และไม่มีสิทธิ์ในใบแม่) |
| `hr1` | update | `leaveRequests/lr1/approvals/a1` | แก้ `message` | **deny** (ห้ามแก้ความเห็นที่โพสต์แล้วเสมอ แม้แต่ hr) |
| `mgr1` | update | `leaveRequests/lr1/approvals/a1` | แก้ `message` | **deny** (ห้ามแก้ความเห็นที่โพสต์แล้วเสมอ) |
| `mgr1` | delete | `leaveRequests/lr1/approvals/a1` | - | **deny** (ห้ามลบความเห็นเสมอ) |
| `emp1` | delete | `leaveRequests/lr1/approvals/a1` | - | **deny** (เจ้าของใบก็ลบความเห็นไม่ได้) |
| `mgr1` | get | `leaveRequests/orphan1/approvals/a9` (ไม่มีเอกสารแม่) | - | **allow** (staff อ่านได้ — เช็ค `isStaff()` ก่อน ไม่ไปแตะเอกสารแม่ที่หายไป) |
| `emp1` | get | `leaveRequests/orphan1/approvals/a9` (ไม่มีเอกสารแม่) | - | **deny** (พิสูจน์ความเป็นเจ้าของไม่ได้ → ปฏิเสธ ไม่ใช่ error) |
| `emp1` | create | `leaveRequests/orphan1/approvals/new1` | `{ authorId:"emp1", message:"..." }` | **deny** (เขียนความเห็นใต้ใบลาที่ไม่มีอยู่จริงไม่ได้) |

## กฎข้อ 5 — `leaveTypes/{id}`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ข้อมูล (ถ้ามี) | ผลที่คาดหวัง |
|---|---|---|---|---|
| `emp1` | get | `leaveTypes/lt1` | - | **allow** (ใครล็อกอินอยู่ก็อ่านได้ ใช้ทำ dropdown) |
| `emp1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **deny** (employee จัดการประเภทลาไม่ได้) |
| `mgr1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **deny** (manager ก็จัดการไม่ได้ ต้อง hr เท่านั้น) |
| `hr1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **allow** |
| `hr1` | update | `leaveTypes/lt1` | แก้ `name` | **allow** |
| `hr1` | delete | `leaveTypes/lt1` | - | **allow** |

## กฎข้อ 6 — ผู้ใช้ที่ "ล็อกอินได้ แต่ไม่มีเอกสาร `users/{uid}`"

เกิดขึ้นจริงได้ 2 ทาง: (ก) สมัครสมาชิกสำเร็จแต่ `createUserDoc` เขียน Firestore ไม่สำเร็จ
(`js/signup.js` เรียกทีหลัง `signUpWithEmail` คนละจังหวะกัน) (ข) สร้างบัญชีจาก Firebase
Console → Authentication ตรง ๆ โดยไม่แตะ Firestore

กฎต้อง "ปฏิเสธอย่างเงียบ ๆ" (ได้ role = `""` = ไม่ใช่ staff) ไม่ใช่ทำให้การประเมินกฎ error
— ให้ทดสอบเป็น UID `ghost1` ที่ **ไม่มี** เอกสาร `users/ghost1`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ผลที่คาดหวัง |
|---|---|---|---|
| `ghost1` | get | `users/ghost1` | **allow** (อ่านเอกสารตัวเองได้ แม้เอกสารยังไม่มี — จะได้ผลว่าไม่พบเอกสาร) |
| `ghost1` | create | `users/ghost1` (`{ name:"x", email:"x@test.com", role:"employee" }`) | **allow** (ซ่อมตัวเองได้ — กฎ create ไม่พึ่ง `myRole()`) |
| `ghost1` | get | `leaveTypes/lt1` | **allow** (เงื่อนไขมีแค่ล็อกอินอยู่) |
| `ghost1` | get | `users/emp1` | **deny** (ไม่ใช่เจ้าของ และ `myRole()` = `""` → ไม่ใช่ staff) |
| `ghost1` | get | `leaveRequests/lr1` (requesterId=emp1) | **deny** |
| `ghost1` | list | `leaveRequests` โดยใส่ `where requesterId == "ghost1"` | **allow** (ดูกฎข้อ 7) |
| `ghost1` | create | `leaveRequests/new1` (`requesterId:"ghost1"`, `status:"รอพิจารณา"`) | **allow** (กฎ create ไม่พึ่ง `myRole()`) |

## กฎข้อ 7 — คิวรีแบบ list (ต้องตรงกับ `js/db.js`)

Firestore **ไม่กรองแถวให้** — ถ้าตัวคิวรีเองพิสูจน์ไม่ได้ว่ากฎเป็นจริงกับทุกแถวที่จะคืนมา
จะโดน `PERMISSION_DENIED` ทั้งคิวรี ตารางนี้จึงต้องตรงกับที่ `js/db.js` ยิงจริง

| สวมสิทธิ์เป็น | คิวรี (ฟังก์ชันใน `js/db.js`) | ผลที่คาดหวัง |
|---|---|---|
| `emp1` | `leaveRequests` + `where requesterId == "emp1"` + `limit` — กิ่ง employee ของ `listLeaveRequests()` | **allow** |
| `emp1` | `leaveRequests` + `orderBy createdAt` ไม่มี `where` (กิ่ง staff) | **deny** — ยืนยันว่า employee ห้ามหลุดไปใช้กิ่งนี้ |
| `emp1` | `leaveRequests` + `where requesterId == "emp2"` | **deny** (เดา uid เพื่อนแล้วคิวรีตรง ๆ ไม่ได้) |
| `mgr1` / `hr1` | `leaveRequests` + `orderBy createdAt desc` + `limit` — กิ่ง staff | **allow** |
| ทุก role | `leaveTypes` + `limit` — `listLeaveTypes()` | **allow** |
| `emp1` (เจ้าของ lr1) | `leaveRequests/lr1/approvals` + `orderBy createdAt asc` — `listApprovals()` | **allow** |
| `emp2` (ไม่ใช่เจ้าของ) | `leaveRequests/lr1/approvals` + `orderBy createdAt asc` | **deny** |
| `mgr1` / `hr1` | `leaveRequests/lr1/approvals` + `orderBy createdAt asc` | **allow** |
| `emp2` | collection group query ชื่อ `approvals` (ไล่อ่านความเห็นข้ามทุกใบลา) | **deny** — กฎเขียนเป็น path เจาะจง ไม่ใช่ `/{path=**}/approvals/{id}` จึงไม่ครอบคลุม collection group |

---

**ข้อจำกัดที่รู้อยู่ — เป็นเรื่องที่กฎบังคับให้ไม่ได้ ไม่ใช่ช่องโหว่ที่ลืมปิด:**

1. **"จะกดไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการก่อน"** — บังคับได้เฉพาะใน
   `js/leave-request-detail.js` เท่านั้น Security Rules นับจำนวนเอกสารใน subcollection ไม่ได้
   ถ้าจะบังคับฝั่งเซิร์ฟเวอร์ต้องเพิ่ม field ตัวนับไว้ในเอกสารแม่ ซึ่งเปลี่ยนโครงสร้างข้อมูล
   ที่ตกลงกันไว้ → จงใจไม่ทำ **คนที่ยิง API ตรงข้าม UI จึงกดไม่อนุมัติโดยไม่มีความเห็นได้**
2. **`authorName` / `requesterName` ปลอมได้** — กฎบังคับแค่ `authorId`/`requesterId` ให้ตรงกับ
   uid จริง แต่ "ชื่อที่แสดงบนจอ" เป็นข้อความอิสระ ผู้ใช้ที่ยิงตรงข้าม UI จึงตั้งชื่อแสดงผล
   เป็นชื่อคนอื่นได้ (ตัวตนที่ใช้ตัดสินสิทธิ์ยังถูกต้องเสมอ)
3. **`seed/seed.js` รันไม่ผ่านกฎชุดนี้** — มันเขียน `users/u001`, `leaveRequests/lr001` ฯลฯ
   ด้วย id ตายตัวที่ไม่ตรงกับ uid ของคนที่ล็อกอินอยู่ ต้องใส่ข้อมูลตัวอย่างผ่าน Firebase
   Console หรือชั่วคราวก่อน deploy กฎชุดนี้ (อย่าผ่อนกฎเพื่อให้ seed ผ่าน)
4. **บล็อก `match /{document=**} { allow read, write: if false; }` ท้ายไฟล์ไม่ได้กันอะไรเลย**
   Firestore รวมผลทุก match ด้วย OR — บล็อก `if false` ยกเลิกสิทธิ์ที่กฎข้างบนให้ไว้ไม่ได้
   และ path ที่ไม่มีกฎรองรับก็ถูกปฏิเสธโดยปริยายอยู่แล้ว อย่าทดสอบแล้วสรุปว่า "ปลอดภัยเพราะมี
   บล็อกนี้"

**หมายเหตุ:** ถ้าแถวไหนได้ผลไม่ตรงกับที่คาดไว้ ให้ตรวจสอบก่อนว่าเอกสารตัวอย่างที่เตรียมไว้
(`users/emp1`, `leaveRequests/lr1` ฯลฯ) มีค่าตรงตามที่ตารางระบุจริงหรือไม่ — Rules Playground
จะจำลองผลตามข้อมูลจริงที่มีอยู่ในฐานข้อมูลทดสอบตอนนั้น ไม่ใช่ค่าที่เขียนไว้ในตารางนี้โดยอัตโนมัติ
