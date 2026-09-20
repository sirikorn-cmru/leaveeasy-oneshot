// ─────────────────────────────────────────────────────────────
// js/auth.js — ชั้นเข้าถึงระบบล็อกอิน (Firebase Authentication) ตัวเดียวของทั้งระบบ
//
// สคริปต์ของหน้าอื่น (login.js, signup.js, nav.js, ...) ต้องเรียกผ่านฟังก์ชันในไฟล์นี้
// เท่านั้น ห้าม import firebase-auth.js ไปเรียกตรง ๆ ในไฟล์อื่น (เหตุผลเดียวกับ js/db.js —
// ถ้าจะเปลี่ยนวิธีจัดการ error หรือวิธี cache โปรไฟล์ จะได้แก้ที่เดียวจบ)
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getUser, FirebaseNotConfiguredError } from "./db.js";

function ตรวจว่าตั้งค่าแล้ว() {
  if (!auth) throw new FirebaseNotConfiguredError();
}

// ── แปล error code ของ Firebase Auth เป็นข้อความไทย (รวมไว้จุดเดียว ห้ามกระจายไปที่อื่น) ──
var AUTH_ERROR_MESSAGES = {
  "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
  "auth/email-already-in-use": "อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว",
  "auth/weak-password": "รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชีผู้ใช้นี้ในระบบ",
  "auth/too-many-requests": "พยายามเข้าสู่ระบบผิดบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง",
  // Firebase SDK เวอร์ชันใหม่บางกรณีรวม wrong-password/user-not-found เป็นโค้ดนี้แทน
  "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
};

export function translateAuthError(err) {
  var รหัส = err && err.code;
  if (รหัส && AUTH_ERROR_MESSAGES[รหัส]) return AUTH_ERROR_MESSAGES[รหัส];
  return "เกิดข้อผิดพลาด: " + (err && err.message ? err.message : String(err));
}

// ── รอให้ Firebase Auth คืนสถานะล็อกอินครั้งแรกก่อน (กันปัญหา auth.currentUser ยังเป็น
//    null ชั่วคราวตอนหน้าเว็บเพิ่งโหลด/รีเฟรช ทั้งที่จริง ๆ ผู้ใช้ล็อกอินค้างอยู่) ──
var สัญญารอสถานะแรก = null;

function รอสถานะล็อกอินครั้งแรก() {
  if (!สัญญารอสถานะแรก) {
    if (!auth) {
      สัญญารอสถานะแรก = Promise.resolve(null);
    } else {
      สัญญารอสถานะแรก = new Promise(function (resolve) {
        var ยกเลิก;
        ยกเลิก = onAuthStateChanged(auth, function (user) {
          resolve(user);
          // เลื่อนไปยกเลิก listener ในรอบถัดไป กันกรณี callback ยิงแบบ sync
          // ก่อนตัวแปร ยกเลิก จะถูกกำหนดค่าเสร็จ
          setTimeout(function () { if (ยกเลิก) ยกเลิก(); }, 0);
        });
      });
    }
  }
  return สัญญารอสถานะแรก;
}

// ── โปรไฟล์ผู้ใช้ที่ล็อกอินอยู่ตอนนี้ (cache ไว้ในหน่วยความจำ ไม่อ่าน Firestore ซ้ำทุกครั้ง) ──
var โปรไฟล์แคช = null;
var uidแคช = null;

// คืนค่า { uid, name, email, role } ของผู้ใช้ที่ล็อกอินอยู่ หรือ null ถ้าไม่ได้ล็อกอิน
// (อ่าน users/{uid} จาก Firestore ผ่าน getUser ใน js/db.js — ไม่เรียก Firestore ตรงจากที่นี่)
export async function currentUserProfile() {
  await รอสถานะล็อกอินครั้งแรก();

  var user = auth ? auth.currentUser : null;
  if (!user) {
    โปรไฟล์แคช = null;
    uidแคช = null;
    return null;
  }
  if (โปรไฟล์แคช && uidแคช === user.uid) return โปรไฟล์แคช;

  var เอกสาร = null;
  try {
    เอกสาร = await getUser(user.uid);
  } catch (err) {
    // อ่าน users/{uid} ไม่สำเร็จ (เช่น หลุดสิทธิ์ตาม Security Rules หรือออฟไลน์)
    // — ใช้ข้อมูลเท่าที่มีจาก Firebase Auth แทน ดีกว่าโยน error ทิ้งทั้งหน้า
    เอกสาร = null;
  }

  โปรไฟล์แคช = {
    uid: user.uid,
    name: (เอกสาร && เอกสาร.name) || user.email || "",
    email: user.email || (เอกสาร && เอกสาร.email) || "",
    role: (เอกสาร && เอกสาร.role) || "employee"
  };
  uidแคช = user.uid;
  return โปรไฟล์แคช;
}

// ── สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ ────────────────────
// หมายเหตุ: การสร้างเอกสาร users/{uid} หลังสมัครสมาชิกสำเร็จ เป็นหน้าที่ของ js/signup.js
// (เรียก createUserDoc ใน js/db.js ต่อ) ไม่ใช่หน้าที่ของฟังก์ชันนี้ เพื่อให้ auth.js
// รับผิดชอบเฉพาะ Firebase Authentication ส่วน db.js รับผิดชอบ Firestore เท่านั้น

// สมัครสมาชิกด้วยอีเมล/รหัสผ่าน คืนค่า Firebase Auth User ({ uid, email, ... })
export async function signUpWithEmail(email, password) {
  ตรวจว่าตั้งค่าแล้ว();
  var ผลลัพธ์ = await createUserWithEmailAndPassword(auth, email, password);
  return ผลลัพธ์.user;
}

// เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน คืนค่า Firebase Auth User
export async function signInWithEmail(email, password) {
  ตรวจว่าตั้งค่าแล้ว();
  var ผลลัพธ์ = await signInWithEmailAndPassword(auth, email, password);
  return ผลลัพธ์.user;
}

// ออกจากระบบ
export async function signOutUser() {
  ตรวจว่าตั้งค่าแล้ว();
  await signOut(auth);
  โปรไฟล์แคช = null;
  uidแคช = null;
}

// สมัครสมาชิกฟังฟังก์ชันเปลี่ยนสถานะล็อกอินตรง ๆ จาก Firebase Auth (ไว้ให้หน้าที่ต้องการ
// อัปเดต UI ทันทีที่สถานะเปลี่ยนใช้ได้ — ถ้ายังไม่ได้ตั้งค่า Firebase จะเรียก callback(null)
// ครั้งเดียวแทน เพื่อให้ผู้เรียกไม่ต้องเช็คกรณี "ยังไม่ได้ตั้งค่า" แยกเอง)
export function onAuthChange(callback) {
  if (!auth) {
    Promise.resolve().then(function () { callback(null); });
    return function () {};
  }
  return onAuthStateChanged(auth, callback);
}
