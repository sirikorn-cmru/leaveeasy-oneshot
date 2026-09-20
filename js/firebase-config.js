// ─────────────────────────────────────────────────────────────
// js/firebase-config.js — ค่าตั้งค่าโปรเจกต์ Firebase (Public Client Config)
//
// ⚠️ นี่ไม่ใช่ "ความลับ" แบบรหัสผ่าน/คีย์ลับ — เป็นค่ามาตรฐานที่ Firebase ให้ฝั่ง
// เบราว์เซอร์ใช้เชื่อมต่อโปรเจกต์ ความปลอดภัยจริงถูกควบคุมด้วย Firestore Security
// Rules (ไฟล์ firestore.rules) ไม่ใช่การซ่อนไฟล์นี้ จึงคอมมิตไฟล์นี้ขึ้น Git ได้ตามปกติ
//
// ตอนนี้ยังไม่มีโปรเจกต์ Firebase จริง ค่าด้านล่างจึงเป็นแค่ placeholder
// ต้องไปสร้างโปรเจกต์ใน Firebase Console แล้วคัดลอกค่าจริงมาแทนที่ทุกช่อง
//
// วิธีหาค่าแต่ละช่อง:
//   1. เปิด https://console.firebase.google.com แล้วเลือก (หรือสร้าง) โปรเจกต์
//   2. กดไอคอนฟันเฟือง ⚙️ ข้างคำว่า "Project Overview" → เลือก "Project settings"
//   3. เลื่อนลงมาที่หัวข้อ "Your apps" — ถ้ายังไม่มีแอปเว็บ ให้กดไอคอน </> เพื่อเพิ่ม
//      Web App ใหม่ก่อน (ตั้งชื่ออะไรก็ได้ เช่น "leaveeasy-web")
//   4. หน้านั้นจะโชว์ก้อนโค้ด "const firebaseConfig = { ... }" ให้คัดลอกค่าแต่ละช่อง
//      มาแทนที่ข้อความ "ใส่ค่าจาก Firebase Console" ด้านล่างทีละช่อง:
//        apiKey            → ค่าใน apiKey
//        authDomain        → ค่าใน authDomain        (เช่น your-project.firebaseapp.com)
//        projectId         → ค่าใน projectId
//        storageBucket     → ค่าใน storageBucket
//        messagingSenderId → ค่าใน messagingSenderId
//        appId             → ค่าใน appId
//   5. อย่าลืมไปเปิดใช้งานที่เมนูซ้ายของ Console ด้วย:
//        - Firestore Database → Create database
//        - Authentication → Sign-in method → เปิด provider ที่จะใช้ (เช่น Email/Password)
//      ไม่งั้นต่อโค้ดได้ แต่ใช้งานจริงไม่ได้เพราะยังไม่มีฐานข้อมูล/ระบบล็อกอินให้ต่อ
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "ใส่ค่าจาก Firebase Console",
  authDomain: "ใส่ค่าจาก Firebase Console",
  projectId: "ใส่ค่าจาก Firebase Console",
  storageBucket: "ใส่ค่าจาก Firebase Console",
  messagingSenderId: "ใส่ค่าจาก Firebase Console",
  appId: "ใส่ค่าจาก Firebase Console"
};
