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
- `leaveRequests/lr1` = `{ requesterId: "emp1", status: "รอพิจารณา", title: "ลาป่วย", ... }`
- `leaveRequests/lr2` = `{ requesterId: "emp2", status: "อนุมัติ", title: "ลากิจ", ... }`

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
| `hr1` | update | `users/emp1` | เปลี่ยน `role` เป็น `"manager"` | **allow** (hr เปลี่ยน role ได้) |
| `mgr1` | update | `users/emp1` | เปลี่ยน `role` เป็น `"manager"` | **deny** (manager เปลี่ยน role ไม่ได้ ต้อง hr เท่านั้น) |

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
| `mgr1` | update | `leaveRequests/lr2` (status=อนุมัติ อยู่แล้ว) | เปลี่ยน `status` เป็น `"ไม่อนุมัติ"` | **deny** (ใบที่ตัดสินแล้วเปลี่ยนซ้ำไม่ได้) |
| `emp1` | update | `leaveRequests/lr1` (status=รอพิจารณา) | เปลี่ยน `status` เป็น `"อนุมัติ"` | **deny** (employee เปลี่ยนสถานะเองไม่ได้) |
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
| `mgr1` | update | `leaveRequests/lr1/approvals/a1` | แก้ `message` | **deny** (ห้ามแก้ความเห็นที่โพสต์แล้วเสมอ) |
| `mgr1` | delete | `leaveRequests/lr1/approvals/a1` | - | **deny** (ห้ามลบความเห็นเสมอ) |

## กฎข้อ 5 — `leaveTypes/{id}`

| สวมสิทธิ์เป็น | การกระทำ | เอกสารที่ทดสอบ | ข้อมูล (ถ้ามี) | ผลที่คาดหวัง |
|---|---|---|---|---|
| `emp1` | get | `leaveTypes/lt1` | - | **allow** (ใครล็อกอินอยู่ก็อ่านได้ ใช้ทำ dropdown) |
| `emp1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **deny** (employee จัดการประเภทลาไม่ได้) |
| `mgr1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **deny** (manager ก็จัดการไม่ได้ ต้อง hr เท่านั้น) |
| `hr1` | create | `leaveTypes/new1` | `{ name:"ลากิจ" }` | **allow** |
| `hr1` | update | `leaveTypes/lt1` | แก้ `name` | **allow** |
| `hr1` | delete | `leaveTypes/lt1` | - | **allow** |

---

**หมายเหตุ:** ถ้าแถวไหนได้ผลไม่ตรงกับที่คาดไว้ ให้ตรวจสอบก่อนว่าเอกสารตัวอย่างที่เตรียมไว้
(`users/emp1`, `leaveRequests/lr1` ฯลฯ) มีค่าตรงตามที่ตารางระบุจริงหรือไม่ — Rules Playground
จะจำลองผลตามข้อมูลจริงที่มีอยู่ในฐานข้อมูลทดสอบตอนนั้น ไม่ใช่ค่าที่เขียนไว้ในตารางนี้โดยอัตโนมัติ
