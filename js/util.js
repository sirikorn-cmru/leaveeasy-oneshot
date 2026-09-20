// ─────────────────────────────────────────────────────────────
// js/util.js — ตัวช่วยเล็ก ๆ ที่ทุกหน้าเรียกใช้ (ES module — ต้อง import ไปใช้)
// ─────────────────────────────────────────────────────────────

// แปลงข้อความของผู้ใช้ให้ปลอดภัยก่อนเอาไปวางในหน้าเว็บด้วย innerHTML
// ถ้าไม่ทำ ข้อความที่มีเครื่องหมาย < > จะทำให้หน้าเว็บเพี้ยน หรือเปิดช่องให้แทรกโค้ดได้
export function esc(ข้อความ) {
  return String(ข้อความ == null ? "" : ข้อความ)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ป้ายสถานะสี — ใช้คลาส CSS ที่มีอยู่แล้วใน css/style.css
// badge-pending (เหลือง) / badge-approved (เขียว) / badge-rejected (แดง)
var STATUS_TO_CLASS = {
  "รอพิจารณา": "badge-pending",
  "อนุมัติ": "badge-approved",
  "ไม่อนุมัติ": "badge-rejected"
};

export function statusBadge(สถานะ) {
  var คลาส = STATUS_TO_CLASS[สถานะ] || "badge-pending";
  return '<span class="badge ' + คลาส + '">' + esc(สถานะ) + "</span>";
}

// เดิมชื่อฟังก์ชันภาษาไทย เก็บไว้ให้ใช้ได้เหมือนเดิม (alias ของ statusBadge)
export function ป้ายสถานะ(สถานะ) {
  return statusBadge(สถานะ);
}

// เดือนภาษาไทยแบบย่อ ใช้กับการแปลงวันที่ทั้งหมดในไฟล์นี้
var เดือนไทย = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// แปลงวันที่แบบ "YYYY-MM-DD" (เช่น startDate/endDate) ให้เป็นวันที่ไทย เช่น "7 ก.ย. 2569"
export function formatThaiDate(วันที่) {
  if (!วันที่) return "";
  var ส่วน = String(วันที่).split("-");
  if (ส่วน.length !== 3) return String(วันที่);
  var ปี = parseInt(ส่วน[0], 10), เดือน = parseInt(ส่วน[1], 10), วัน = parseInt(ส่วน[2], 10);
  if (!ปี || !เดือน || !วัน) return String(วันที่);
  return วัน + " " + เดือนไทย[เดือน - 1] + " " + (ปี + 543);
}

// แปลงค่าเวลาที่มาได้หลายแบบ (Firestore Timestamp / Date / ข้อความ "YYYY-MM-DD HH:MM")
// ให้เป็นวันที่-เวลาไทย เช่น "1 ก.ย. 2569 09:15"
export function formatThaiDateTime(ค่า) {
  if (!ค่า) return "";
  var d;
  if (typeof ค่า.toDate === "function") {
    d = ค่า.toDate();                         // Firestore Timestamp
  } else if (ค่า instanceof Date) {
    d = ค่า;
  } else {
    d = new Date(String(ค่า).replace(" ", "T"));
  }
  if (isNaN(d.getTime())) return String(ค่า);
  var สองหลัก = function (n) { return String(n).padStart(2, "0"); };
  return d.getDate() + " " + เดือนไทย[d.getMonth()] + " " + (d.getFullYear() + 543) +
         " " + สองหลัก(d.getHours()) + ":" + สองหลัก(d.getMinutes());
}

// แปลงค่าเวลา (Firestore Timestamp / Date / ข้อความ) ให้เป็นตัวเลขมิลลิวินาที ไว้เรียงลำดับ
export function toMillis(ค่า) {
  if (!ค่า) return 0;
  if (typeof ค่า.toMillis === "function") return ค่า.toMillis();   // Firestore Timestamp
  if (typeof ค่า.toDate === "function") return ค่า.toDate().getTime();
  if (ค่า instanceof Date) return ค่า.getTime();
  var t = new Date(String(ค่า).replace(" ", "T")).getTime();
  return isNaN(t) ? 0 : t;
}

// เวลาปัจจุบันในรูปแบบเดียวกับข้อมูลตัวอย่าง เช่น "2026-09-01 09:15"
export function เวลาตอนนี้() {
  var d = new Date();
  var สองหลัก = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + สองหลัก(d.getMonth() + 1) + "-" + สองหลัก(d.getDate()) +
         " " + สองหลัก(d.getHours()) + ":" + สองหลัก(d.getMinutes());
}

// อ่านค่าที่ต่อท้าย URL เช่น leave-request-detail.html?id=lr001
export function ค่าจากURL(ชื่อ) {
  return new URLSearchParams(location.search).get(ชื่อ) || "";
}

// ชื่อภาษาอังกฤษของฟังก์ชันด้านบน ไว้ให้โค้ดใหม่เรียกใช้อ่านง่ายขึ้น
export function getQueryParam(ชื่อ) {
  return ค่าจากURL(ชื่อ);
}

// ซ่อน / แสดง element ด้วย attribute "hidden" (ตัวเดียวกับที่ใช้อยู่ในไฟล์ .html ทุกไฟล์)
export function hide(el) { if (el) el.hidden = true; }
export function show(el) { if (el) el.hidden = false; }

// กล่องข้อความแจ้งเตือนสีแดงทั่วไป (ใช้ตอน query/บันทึกข้อมูลจริงล้มเหลว
// เช่น หลุดสิทธิ์ตาม Firestore Security Rules หรือไม่มีอินเทอร์เน็ต)
// ต่างจาก showConfigWarning ใน js/nav.js ที่ใช้เฉพาะกรณียังไม่ได้ตั้งค่า Firebase
export function showError(ข้อความ) {
  var กล่อง = document.createElement("div");
  กล่อง.className = "alert alert-error";
  กล่อง.textContent = "⚠️ " + ข้อความ;
  var ที่วาง = document.querySelector(".container") || document.body;
  ที่วาง.insertBefore(กล่อง, ที่วาง.firstChild);
}

// ดึงข้อความ error ออกมาแบบอ่านง่าย (ไม่โชว์ stack trace ยาว ๆ ให้ผู้ใช้)
export function ข้อความError(err) {
  return err && err.message ? err.message : String(err);
}

// ─────────────────────────────────────────────────────────────
// showConfigWarning — แถบเตือนสีเหลืองตอนที่ยังไม่ได้ตั้งค่า Firebase
//
// ย้ายมาจาก js/nav.js เพราะ nav.js มี route guard ที่รันทันทีแบบ top-level IIFE
// ตอนถูก import — seed/seed.js ที่ import มาใช้แค่ฟังก์ชันนี้ฟังก์ชันเดียว จึงพลอย
// รัน guard ไปด้วยใน path /seed/ แล้วโดนเด้งไป /seed/login.html ซึ่งไม่มีอยู่จริง
// (404) แล้ววนลูป — util.js ไม่มีโค้ดที่รันเองตอน import จึงปลอดภัยกว่า
// ─────────────────────────────────────────────────────────────
export function showConfigWarning(ข้อความ) {
  var กล่อง = document.createElement("div");
  กล่อง.className = "alert alert-warn";
  กล่อง.innerHTML =
    "⚠️ <strong>ยังไม่ได้ตั้งค่า Firebase</strong> — " +
    (ข้อความ || "หน้านี้จึงยังไม่ได้อ่านข้อมูลจากฐานข้อมูลจริง") +
    "<br>วิธีตั้งค่า: เปิดไฟล์ js/firebase-config.js แล้วใส่ค่าที่คัดลอกมาจาก Firebase Console แทนข้อความ placeholder";
  var ที่วาง = document.querySelector(".container") || document.body;
  if (ที่วาง) ที่วาง.insertBefore(กล่อง, ที่วาง.firstChild);
}
