// ─────────────────────────────────────────────────────────────
// seed/seed.js — เขียนข้อมูลตัวอย่างลง Cloud Firestore จริง (ใช้ครั้งเดียวหรือซ้ำก็ได้)
//
// ใช้ setDoc() กับ id ที่ตายตัว (u001, lt001, lr001, ap001, ...) แทน addDoc()
// เพื่อให้ "กดซ้ำได้อย่างปลอดภัย" — รันกี่ครั้งก็ได้ค่าเดิมเสมอ ไม่มีข้อมูลซ้ำซ้อน
//
// ไม่ได้ผ่าน js/db.js เพราะ db.js ออกแบบไว้สำหรับ flow ปกติของแอป (สร้างเอกสารใหม่ด้วย
// id สุ่มจาก addDoc + createdAt เป็น serverTimestamp) ในขณะที่การ seed ต้องกำหนด id เอง
// และ createdAt ต้องเป็นวันที่ย้อนหลังตามข้อมูลตัวอย่าง ไม่ใช่เวลาปัจจุบัน
// ─────────────────────────────────────────────────────────────

import { db, firebaseNotConfigured } from "../js/firebase.js";
import { showConfigWarning } from "../js/util.js";   // ห้าม import จาก nav.js — จะไปรัน route guard ใน /seed/ โดยไม่ตั้งใจ
import {
  doc, setDoc, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ ชื่อคนทุกชื่อเป็นชื่อสมมติ · อีเมลทุกตัวเป็นอีเมลตัวอย่าง

var users = [
  { id: "u001", name: "สมชาย ใจดี", email: "somchai@example.com", role: "employee" },
  { id: "u002", name: "สมหญิง รักงาน", email: "somying@example.com", role: "manager" },
  { id: "u003", name: "สมศรี ตั้งใจ", email: "somsri@example.com", role: "hr" }
];

var leaveTypes = [
  { id: "lt001", name: "ลาพักร้อน" },
  { id: "lt002", name: "ลาป่วย" },
  { id: "lt003", name: "ลากิจ" }
];

var leaveRequests = [
  {
    id: "lr001", title: "ลาพักร้อนไปเที่ยวกับครอบครัว",
    reason: "วางแผนเดินทางไปต่างจังหวัดกับครอบครัว จองที่พักไว้ล่วงหน้าแล้ว",
    status: "รอพิจารณา",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002", approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt001", leaveTypeName: "ลาพักร้อน",
    startDate: "2026-09-07", endDate: "2026-09-09",
    createdAt: "2026-09-01 09:15"
  },
  {
    id: "lr002", title: "ลาป่วยไข้หวัดใหญ่",
    reason: "มีไข้สูงและไอมาก แพทย์แนะนำให้พักอยู่บ้าน 2 วัน",
    status: "อนุมัติ",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002", approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt002", leaveTypeName: "ลาป่วย",
    startDate: "2026-08-24", endDate: "2026-08-25",
    createdAt: "2026-08-24 08:05"
  },
  {
    id: "lr003", title: "ลากิจไปทำบัตรประชาชน",
    reason: "บัตรประชาชนหมดอายุ ต้องไปทำที่สำนักงานเขตในวันทำการ",
    status: "รอพิจารณา",
    requesterId: "u003", requesterName: "สมศรี ตั้งใจ",
    approverId: "", approverName: "",
    leaveTypeId: "lt003", leaveTypeName: "ลากิจ",
    startDate: "2026-09-15", endDate: "2026-09-15",
    createdAt: "2026-09-10 16:30"
  },
  {
    id: "lr004", title: "ลาพักร้อนช่วงวันหยุดยาว",
    reason: "อยากต่อวันหยุดยาวไปพักผ่อนกับครอบครัวอีก 3 วัน",
    status: "ไม่อนุมัติ",
    requesterId: "u003", requesterName: "สมศรี ตั้งใจ",
    approverId: "u002", approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt001", leaveTypeName: "ลาพักร้อน",
    startDate: "2026-10-12", endDate: "2026-10-16",
    createdAt: "2026-09-20 11:00"
  },
  {
    id: "lr005", title: "ลาป่วยไปพบแพทย์ตามนัด",
    reason: "มีนัดตรวจติดตามอาการกับแพทย์ในช่วงเช้า",
    status: "รอพิจารณา",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002", approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt002", leaveTypeName: "ลาป่วย",
    startDate: "2026-09-22", endDate: "2026-09-22",
    createdAt: "2026-09-18 14:45"
  }
];

// ความเห็น — lr003 และ lr005 ตั้งใจไม่มีความเห็นเลย (ไม่ต้องใส่อะไรในนี้)
var approvals = [
  { requestId: "lr001", id: "ap001", authorId: "u002", authorName: "สมหญิง รักงาน",
    message: "รับเรื่องแล้ว ขอดูตารางงานของทีมช่วงนั้นก่อนนะครับ", createdAt: "2026-09-01 13:40" },
  { requestId: "lr001", id: "ap002", authorId: "u003", authorName: "สมศรี ตั้งใจ",
    message: "ตรวจแล้ว วันลาพักร้อนคงเหลือครอบคลุมช่วงที่ขอ ไม่ติดขัดฝั่งฝ่ายบุคคล", createdAt: "2026-09-02 10:05" },
  { requestId: "lr002", id: "ap003", authorId: "u002", authorName: "สมหญิง รักงาน",
    message: "อนุมัติแล้ว พักผ่อนให้เต็มที่ งานที่ค้างไว้เดี๋ยวทีมช่วยดูให้", createdAt: "2026-08-24 09:20" },
  { requestId: "lr004", id: "ap004", authorId: "u002", authorName: "สมหญิง รักงาน",
    message: "ช่วงนั้นทีมมีงานส่งมอบพอดี ขอเลื่อนเป็นสัปดาห์ถัดไปได้ไหมครับ", createdAt: "2026-09-20 15:10" }
];

// แปลงข้อความ "2026-09-01 09:15" ให้เป็น JS Date (Firestore SDK จะแปลงเป็น Timestamp ให้เองตอนเขียน)
function เป็นวันที่(ข้อความ) {
  return new Date(String(ข้อความ).replace(" ", "T"));
}

(function () {
  var btn = document.getElementById("btn-seed");
  var logBox = document.getElementById("seed-log");

  if (firebaseNotConfigured) {
    if (btn) btn.disabled = true;
    // showConfigWarning แทรกกล่องเตือนไว้บนสุดของ .container ให้เอง ไม่ต้องมี element เฉพาะรองรับ
    showConfigWarning("จึงยังใส่ข้อมูลตัวอย่างไม่ได้");
    return;
  }

  if (btn) btn.addEventListener("click", เริ่มใส่ข้อมูล);

  function เขียนบรรทัด(ข้อความ, ระดับ) {
    if (!logBox) return;
    if (logBox.dataset.started !== "1") {
      logBox.textContent = "";
      logBox.dataset.started = "1";
    }
    var บรรทัด = document.createElement("div");
    บรรทัด.className = ระดับ === "err" ? "line-err" : (ระดับ === "ok" ? "line-ok" : "");
    บรรทัด.textContent = ข้อความ;
    logBox.appendChild(บรรทัด);
    logBox.scrollTop = logBox.scrollHeight;
  }

  async function เริ่มใส่ข้อมูล() {
    btn.disabled = true;
    เขียนบรรทัด("เริ่มใส่ข้อมูลตัวอย่าง ...");

    try {
      เขียนบรรทัด("กำลังใส่ผู้ใช้ (users) ...");
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        await setDoc(doc(db, "users", u.id), { name: u.name, email: u.email, role: u.role });
        เขียนบรรทัด("  ✔ users/" + u.id + " — " + u.name, "ok");
      }

      เขียนบรรทัด("กำลังใส่ประเภทการลา (leaveTypes) ...");
      for (var j = 0; j < leaveTypes.length; j++) {
        var t = leaveTypes[j];
        await setDoc(doc(db, "leaveTypes", t.id), { name: t.name });
        เขียนบรรทัด("  ✔ leaveTypes/" + t.id + " — " + t.name, "ok");
      }

      เขียนบรรทัด("กำลังใส่ใบขอลา (leaveRequests) ...");
      for (var k = 0; k < leaveRequests.length; k++) {
        var r = leaveRequests[k];
        var ข้อมูลใบลา = Object.assign({}, r);
        delete ข้อมูลใบลา.id;
        ข้อมูลใบลา.createdAt = เป็นวันที่(r.createdAt);
        await setDoc(doc(db, "leaveRequests", r.id), ข้อมูลใบลา);
        เขียนบรรทัด("  ✔ leaveRequests/" + r.id + " — " + r.title, "ok");
      }

      เขียนบรรทัด("กำลังใส่ความเห็นการอนุมัติ (approvals) ...");
      for (var m = 0; m < approvals.length; m++) {
        var a = approvals[m];
        var ข้อมูลความเห็น = {
          authorId: a.authorId,
          authorName: a.authorName,
          message: a.message,
          createdAt: เป็นวันที่(a.createdAt)
        };
        await setDoc(doc(collection(db, "leaveRequests", a.requestId, "approvals"), a.id), ข้อมูลความเห็น);
        เขียนบรรทัด("  ✔ leaveRequests/" + a.requestId + "/approvals/" + a.id, "ok");
      }

      เขียนบรรทัด("เสร็จแล้ว — ใส่ข้อมูลตัวอย่างครบทั้งหมด ✅ (กดซ้ำได้ตลอด ไม่เกิดข้อมูลซ้ำ)", "ok");
    } catch (err) {
      เขียนบรรทัด("❌ เกิดข้อผิดพลาด: " + (err && err.message ? err.message : String(err)), "err");
      เขียนบรรทัด("ตรวจสอบว่าใส่ค่าใน js/firebase-config.js ถูกต้อง และเปิดใช้งาน Firestore แล้วหรือยัง", "err");
    } finally {
      btn.disabled = false;
    }
  }
})();
