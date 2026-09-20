// ─────────────────────────────────────────────────────────────
// js/new-leave-request.js — หน้ายื่นใบลาใหม่ (บันทึกลง Cloud Firestore จริง)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import { listLeaveTypes, createLeaveRequest, FirebaseNotConfiguredError } from "./db.js";
import { currentUserProfile } from "./auth.js";
import { showConfigWarning } from "./nav.js";
import { hide, show, ข้อความError } from "./util.js";

(function () {
  var ฟอร์ม = document.getElementById("leave-form");
  if (!ฟอร์ม) return;

  var ช่องประเภท = document.getElementById("leaveTypeId");
  var กล่องเตือน = document.getElementById("form-error");
  var ปุ่มยกเลิก = document.getElementById("btn-cancel");
  var ปุ่มบันทึก = document.getElementById("btn-save");

  init();

  async function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้ายื่นใบลาใหม่จึงยังบันทึกลงฐานข้อมูลจริงไม่ได้");
      ตั้งค่าปิดฟอร์ม(true);
      return;
    }

    try {
      var ประเภททั้งหมด = await listLeaveTypes();
      ประเภททั้งหมด.forEach(function (ประเภท) {
        var ตัวเลือก = document.createElement("option");
        ตัวเลือก.value = ประเภท.id;
        ตัวเลือก.textContent = ประเภท.name;
        ช่องประเภท.appendChild(ตัวเลือก);
      });
    } catch (err) {
      แสดงข้อผิดพลาด(err, "โหลดประเภทการลาไม่สำเร็จ");
      return;
    }

    ฟอร์ม.addEventListener("submit", บันทึกใบลา);
    if (ปุ่มยกเลิก) {
      ปุ่มยกเลิก.addEventListener("click", function () {
        location.href = "leave-requests.html";
      });
    }
  }

  async function บันทึกใบลา(e) {
    e.preventDefault();

    var ค่า = {
      title: document.getElementById("title").value.trim(),
      reason: document.getElementById("reason").value.trim(),
      leaveTypeId: ช่องประเภท.value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value
    };

    if (!ค่า.title || !ค่า.reason || !ค่า.leaveTypeId || !ค่า.startDate || !ค่า.endDate) {
      เตือน("กรอกไม่ครบ — ต้องกรอกทุกช่องก่อนกดบันทึก");
      return;
    }
    if (ค่า.endDate < ค่า.startDate) {
      เตือน("วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มลา");
      return;
    }
    hide(กล่องเตือน);

    // ผู้ขอลา = ผู้ใช้ที่ล็อกอินอยู่จริงตอนนี้ (js/auth.js) — ไม่ใช้ค่าคงที่แบบต้นแบบเดิมอีกต่อไป
    var ผู้ขอลาปัจจุบัน = await currentUserProfile();
    if (!ผู้ขอลาปัจจุบัน) {
      เตือน("ไม่พบผู้ใช้ที่ล็อกอินอยู่ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }

    var ตัวเลือกประเภท = ช่องประเภท.options[ช่องประเภท.selectedIndex];

    if (ปุ่มบันทึก) ปุ่มบันทึก.disabled = true;
    try {
      await createLeaveRequest({
        title: ค่า.title,
        reason: ค่า.reason,
        requesterId: ผู้ขอลาปัจจุบัน.uid,
        requesterName: ผู้ขอลาปัจจุบัน.name,
        approverId: "",
        approverName: "",
        leaveTypeId: ค่า.leaveTypeId,
        leaveTypeName: ตัวเลือกประเภท ? ตัวเลือกประเภท.textContent : "",
        startDate: ค่า.startDate,
        endDate: ค่า.endDate
        // status และ createdAt ถูกกำหนดให้อัตโนมัติใน js/db.js (createLeaveRequest)
      });
      location.href = "leave-requests.html";
    } catch (err) {
      if (ปุ่มบันทึก) ปุ่มบันทึก.disabled = false;
      แสดงข้อผิดพลาด(err, "บันทึกใบลาไม่สำเร็จ");
    }
  }

  function แสดงข้อผิดพลาด(err, หัวข้อ) {
    if (err instanceof FirebaseNotConfiguredError) {
      showConfigWarning();
      return;
    }
    เตือน(หัวข้อ + ": " + ข้อความError(err));
  }

  function ตั้งค่าปิดฟอร์ม(ปิด) {
    Array.prototype.forEach.call(ฟอร์ม.elements, function (el) { el.disabled = ปิด; });
  }

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    show(กล่องเตือน);
  }
})();
