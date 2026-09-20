// ─────────────────────────────────────────────────────────────
// js/firebase.js — จุดเดียวที่ initialize Firebase App / Firestore / Auth
//
// ไฟล์อื่นที่ต้องคุยกับ Firebase ให้ import { db, auth, ... } จากไฟล์นี้เท่านั้น
// ห้ามเรียก initializeApp() ซ้ำที่ไฟล์อื่น — จะได้ instance คนละตัวกันโดยไม่ตั้งใจ
//
// ใช้ Firebase v10 Modular Web SDK โหลดตรงจาก CDN ของ gstatic (ไม่ต้องติดตั้ง
// ผ่าน npm และไม่ต้องมี build step ตามข้อกำหนดของโปรเจกต์นี้)
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// true ถ้า js/firebase-config.js ยังเป็นค่า placeholder (ยังไม่ได้ใส่ค่าจริง)
// ไฟล์อื่นเช็คค่านี้ก่อนเรียก Firestore/Auth เพื่อโชว์ข้อความไทยแทนที่จะปล่อยให้ error เงียบ ๆ
export const firebaseNotConfigured = Object.keys(firebaseConfig).some(function (คีย์) {
  var ค่า = firebaseConfig[คีย์];
  return !ค่า || String(ค่า).indexOf("ใส่ค่าจาก") === 0;
});

var app = null;
var dbInstance = null;
var authInstance = null;

if (!firebaseNotConfigured) {
  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app);
  authInstance = getAuth(app);
}

// เป็น null ถ้ายังไม่ได้ตั้งค่า Firebase จริง (ดู firebaseNotConfigured ด้านบน)
export const db = dbInstance;
export const auth = authInstance;
