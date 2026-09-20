// ─────────────────────────────────────────────────────────────
// js/db.js — ชั้นเข้าถึงข้อมูล (Data Access Layer) ตัวเดียวของทั้งระบบ
//
// สคริปต์ของหน้าอื่น (leave-requests.js, leave-request-detail.js, ...) ต้องเรียก
// ผ่านฟังก์ชันในไฟล์นี้เท่านั้น ห้าม import Firestore SDK ไปเรียกตรง ๆ ในไฟล์อื่น
// เพราะถ้าชื่อ collection หรือโครงสร้างข้อมูลเปลี่ยน จะได้แก้ที่เดียวจบ
//
// ชื่อ collection/field สะกดตรงตาม spec เป๊ะ (Firestore แยก case พิมพ์เล็กใหญ่):
//   users/{uid}, leaveTypes/{id}, leaveRequests/{id}, leaveRequests/{id}/approvals/{id}
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

var LEAVE_REQUESTS = "leaveRequests";
var LEAVE_TYPES = "leaveTypes";
var USERS = "users";
var APPROVALS = "approvals";
var MAX_LIMIT = 200;   // สเปกห้ามทำ pagination จริง ใช้ limit() กันคิวรีโตไม่จำกัดแทน

// โยน error ตัวนี้เมื่อยังไม่ได้ตั้งค่า Firebase (js/firebase-config.js ยังเป็น placeholder)
// สคริปต์ของหน้าที่เรียกใช้ควร catch ชื่อนี้แล้วเรียก showConfigWarning จาก js/nav.js
export function FirebaseNotConfiguredError() {
  this.name = "FirebaseNotConfiguredError";
  this.message = "ยังไม่ได้ตั้งค่า Firebase ในไฟล์ js/firebase-config.js";
}
FirebaseNotConfiguredError.prototype = Object.create(Error.prototype);

function ตรวจว่าตั้งค่าแล้ว() {
  if (!db) throw new FirebaseNotConfiguredError();
}

function เอกสารเป็นก้อนข้อมูล(snap) {
  return Object.assign({ id: snap.id }, snap.data());
}

// ── Leave Requests ──────────────────────────────────────────

// ดึงใบลา เรียงใหม่ไปเก่าตาม createdAt (จำกัดไม่เกิน MAX_LIMIT ใบ)
//
// ผู้ใช้: { uid, role } ของคนที่ล็อกอินอยู่ (ผลลัพธ์จาก currentUserProfile() ใน js/auth.js)
// ต้องส่งมาเสมอ เพราะ firestore.rules อ่านใบลาด้วยเงื่อนไข
// "resource.data.requesterId == request.auth.uid || isStaff()" — สำหรับ query แบบ list (ไม่ใช่
// get เอกสารเดียว) Firestore บังคับให้ query เองต้องพิสูจน์ได้ล่วงหน้าว่ากฎนี้เป็นจริงกับทุกแถว
// ที่จะคืนมา ถ้า role เป็น employee แล้ว query ทั้ง collection แบบไม่มี where เลย Firestore
// จะปฏิเสธทั้งคิวรีด้วย PERMISSION_DENIED ทันที (ไม่ใช่แค่กรองแถวออก) จึงต้องเติม
// where("requesterId","==",uid) เข้าไปเองฝั่ง employee — ส่วน manager/hr (isStaff() ผ่านอยู่แล้ว
// ไม่ต้องพึ่ง resource.data.requesterId) ยังคง query ทั้ง collection แบบเดิมได้ตามปกติ
export async function listLeaveRequests(ผู้ใช้) {
  ตรวจว่าตั้งค่าแล้ว();
  var เป็นสตาฟ = !!ผู้ใช้ && (ผู้ใช้.role === "manager" || ผู้ใช้.role === "hr");

  if (เป็นสตาฟ) {
    var q = query(collection(db, LEAVE_REQUESTS), orderBy("createdAt", "desc"), limit(MAX_LIMIT));
    var snap = await getDocs(q);
    return snap.docs.map(เอกสารเป็นก้อนข้อมูล);
  }

  var uid = ผู้ใช้ && ผู้ใช้.uid;
  if (!uid) return [];   // ยังไม่ล็อกอิน — ไม่มี uid ให้กรอง (route guard ใน js/nav.js จะเด้งไปหน้า login อยู่แล้ว)

  // employee: ห้ามใช้ orderBy("createdAt") ร่วมกับ where("requesterId") เพราะเป็นคนละ field กัน
  // — Firestore จะต้องมี composite index ซึ่งโปรเจกต์นี้ไม่ได้สร้างไว้ (จะพังตอนรันจริงพร้อมลิงก์
  // ให้ไปสร้าง index ใน Console) จึงดึงมาด้วย where อย่างเดียวก่อน แล้วเรียงใหม่ไปเก่าด้วย JS เอง
  // ทีหลัง เพื่อให้ผลลัพธ์ที่ผู้เรียกเห็นเรียงลำดับเหมือนกับฝั่ง manager/hr ทุกประการ
  var qEmployee = query(collection(db, LEAVE_REQUESTS), where("requesterId", "==", uid), limit(MAX_LIMIT));
  var snapEmployee = await getDocs(qEmployee);
  var รายการ = snapEmployee.docs.map(เอกสารเป็นก้อนข้อมูล);
  รายการ.sort(function (a, b) { return มิลลิวินาทีของ(b.createdAt) - มิลลิวินาทีของ(a.createdAt); });
  return รายการ;
}

// แปลง createdAt (Firestore Timestamp) เป็นมิลลิวินาที ไว้เรียงลำดับฝั่ง JS —
// ใช้เฉพาะกิ่ง employee ของ listLeaveRequests ด้านบน (กิ่ง manager/hr เรียงด้วย orderBy ของ
// Firestore เองอยู่แล้ว) ไม่ใช้ toMillis จาก js/util.js เพื่อไม่ให้ data-access layer นี้
// ผูกกับไฟล์ที่เป็นตัวช่วยฝั่ง UI
function มิลลิวินาทีของ(ค่า) {
  return (ค่า && typeof ค่า.toMillis === "function") ? ค่า.toMillis() : 0;
}

// ดึงใบลาใบเดียวตาม id คืนค่า null ถ้าไม่พบ
export async function getLeaveRequest(id) {
  ตรวจว่าตั้งค่าแล้ว();
  var snap = await getDoc(doc(db, LEAVE_REQUESTS, id));
  return snap.exists() ? เอกสารเป็นก้อนข้อมูล(snap) : null;
}

// สร้างใบลาใหม่ — บังคับ status เป็น "รอพิจารณา" เสมอ ผู้เรียกห้ามส่ง status มาเอง
// และใช้ serverTimestamp() ให้ createdAt เสมอ ตามข้อกำหนด
export async function createLeaveRequest(ข้อมูล) {
  ตรวจว่าตั้งค่าแล้ว();
  var payload = Object.assign({}, ข้อมูล, {
    status: "รอพิจารณา",
    createdAt: serverTimestamp()
  });
  var ref = await addDoc(collection(db, LEAVE_REQUESTS), payload);
  return ref.id;
}

// เปลี่ยนสถานะใบลา — แก้เฉพาะ field "status" เท่านั้น ห้ามเขียนทับทั้งเอกสาร
// (บังคับกฎ: รอพิจารณา → อนุมัติ / รอพิจารณา → ไม่อนุมัติ เท่านั้น ผู้เรียกต้องตรวจเงื่อนไข
//  ก่อนเรียกฟังก์ชันนี้ — ดูการเรียกใช้ใน js/leave-request-detail.js)
export async function updateLeaveRequestStatus(id, สถานะใหม่) {
  ตรวจว่าตั้งค่าแล้ว();
  await updateDoc(doc(db, LEAVE_REQUESTS, id), { status: สถานะใหม่ });
}

// ลบใบลา — ผู้เรียกต้องตรวจเองก่อนว่าสถานะยังเป็น "รอพิจารณา" อยู่ (ดูกฎในสเปก)
export async function deleteLeaveRequest(id) {
  ตรวจว่าตั้งค่าแล้ว();
  await deleteDoc(doc(db, LEAVE_REQUESTS, id));
}

// ── Leave Types ─────────────────────────────────────────────

export async function listLeaveTypes() {
  ตรวจว่าตั้งค่าแล้ว();
  var q = query(collection(db, LEAVE_TYPES), limit(MAX_LIMIT));
  var snap = await getDocs(q);
  return snap.docs.map(เอกสารเป็นก้อนข้อมูล);
}

export async function createLeaveType(ชื่อ) {
  ตรวจว่าตั้งค่าแล้ว();
  var ref = await addDoc(collection(db, LEAVE_TYPES), { name: ชื่อ });
  return ref.id;
}

export async function updateLeaveType(id, ชื่อใหม่) {
  ตรวจว่าตั้งค่าแล้ว();
  await updateDoc(doc(db, LEAVE_TYPES, id), { name: ชื่อใหม่ });
}

export async function deleteLeaveType(id) {
  ตรวจว่าตั้งค่าแล้ว();
  await deleteDoc(doc(db, LEAVE_TYPES, id));
}

// ── Approvals (subcollection ใต้ leaveRequests/{id}) ────────

// รายการความเห็นของใบลาใบหนึ่ง เรียงเก่าไปใหม่ตาม createdAt
export async function listApprovals(requestId) {
  ตรวจว่าตั้งค่าแล้ว();
  var q = query(
    collection(db, LEAVE_REQUESTS, requestId, APPROVALS),
    orderBy("createdAt", "asc"),
    limit(MAX_LIMIT)
  );
  var snap = await getDocs(q);
  return snap.docs.map(เอกสารเป็นก้อนข้อมูล);
}

// เพิ่มความเห็นใหม่ในใบลาใบหนึ่ง — ใช้ serverTimestamp() ให้ createdAt เสมอ
export async function addApproval(requestId, ข้อมูล) {
  ตรวจว่าตั้งค่าแล้ว();
  var payload = Object.assign({}, ข้อมูล, { createdAt: serverTimestamp() });
  var ref = await addDoc(collection(db, LEAVE_REQUESTS, requestId, APPROVALS), payload);
  return ref.id;
}

// ── Users ────────────────────────────────────────────────────

export async function getUser(uid) {
  ตรวจว่าตั้งค่าแล้ว();
  var snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? เอกสารเป็นก้อนข้อมูล(snap) : null;
}

// สร้างเอกสารผู้ใช้ใหม่ที่ users/{uid} — เรียกครั้งเดียวตอนสมัครสมาชิกสำเร็จเท่านั้น
// (ดู js/signup.js) ใช้ setDoc เพราะ id ของเอกสารต้องเป็น uid จาก Firebase Auth เป๊ะ ๆ
// ไม่ใช่ id ที่ Firestore สุ่มให้แบบ addDoc
export async function createUserDoc(uid, ข้อมูล) {
  ตรวจว่าตั้งค่าแล้ว();
  await setDoc(doc(db, USERS, uid), ข้อมูล);
}
