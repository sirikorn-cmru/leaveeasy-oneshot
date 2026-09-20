// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้ารายละเอียดใบลา (อ่าน/แก้ Cloud Firestore จริง)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import {
  getLeaveRequest, listApprovals, addApproval,
  updateLeaveRequestStatus, deleteLeaveRequest, FirebaseNotConfiguredError
} from "./db.js";
import { currentUserProfile } from "./auth.js";
import { showConfigWarning } from "./nav.js";
import { esc, statusBadge, formatThaiDate, formatThaiDateTime, hide, show, showError, ข้อความError } from "./util.js";

(function () {
  var รหัสใบลา = new URLSearchParams(location.search).get("id") || "";

  var elTitle = document.getElementById("d-title");
  var elReason = document.getElementById("d-reason");
  var elType = document.getElementById("d-leaveTypeName");
  var elStart = document.getElementById("d-startDate");
  var elEnd = document.getElementById("d-endDate");
  var elRequester = document.getElementById("d-requesterName");
  var elApprover = document.getElementById("d-approverName");
  var elCreatedAt = document.getElementById("d-createdAt");
  var elStatus = document.getElementById("d-status");

  var btnApprove = document.getElementById("btn-approve");
  var btnReject = document.getElementById("btn-reject");
  var btnDelete = document.getElementById("btn-delete");

  var elApprovalList = document.getElementById("approval-list");
  var elApprovalInput = document.getElementById("approval-input");
  var elApprovalError = document.getElementById("approval-error");
  var btnSendApproval = document.getElementById("btn-send-approval");

  if (!elTitle) return;   // หน้านี้ไม่มี element ที่ต้องใช้

  var ใบ = null;
  var ความเห็นทั้งหมด = [];
  var ผู้ใช้ปัจจุบัน = null;   // { uid, name, email, role } — ใช้ตัดสินว่าจะเปิดปุ่มอนุมัติ/ไม่อนุมัติ/ลบให้ใครบ้าง

  init();

  async function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้ารายละเอียดใบลาจึงยังไม่ได้อ่านข้อมูลจริง");
      ปิดปุ่มทั้งหมด();
      return;
    }

    if (!รหัสใบลา) {
      แสดงไม่พบใบลา();
      return;
    }

    ผู้ใช้ปัจจุบัน = await currentUserProfile();

    if (btnApprove) btnApprove.addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
    if (btnReject) btnReject.addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
    if (btnDelete) btnDelete.addEventListener("click", ลบใบลา);
    if (btnSendApproval) btnSendApproval.addEventListener("click", ส่งความเห็น);

    await โหลดข้อมูลใหม่();
  }

  async function โหลดข้อมูลใหม่() {
    try {
      ใบ = await getLeaveRequest(รหัสใบลา);
    } catch (err) {
      จัดการข้อผิดพลาด(err, "โหลดใบลาไม่สำเร็จ");
      return;
    }

    if (!ใบ) {
      แสดงไม่พบใบลา();
      return;
    }

    try {
      ความเห็นทั้งหมด = await listApprovals(รหัสใบลา);
    } catch (err) {
      จัดการข้อผิดพลาด(err, "โหลดความเห็นไม่สำเร็จ");
      ความเห็นทั้งหมด = [];
    }

    วาดใบลา();
    วาดความเห็น();
  }

  function วาดใบลา() {
    elTitle.textContent = ใบ.title || "";
    elReason.textContent = ใบ.reason || "";
    elType.textContent = ใบ.leaveTypeName || "";
    elStart.textContent = formatThaiDate(ใบ.startDate);
    elEnd.textContent = formatThaiDate(ใบ.endDate);
    elRequester.textContent = ใบ.requesterName || "";
    elApprover.textContent = ใบ.approverName ? ใบ.approverName : "ยังไม่ได้กำหนดผู้อนุมัติ";
    elCreatedAt.textContent = formatThaiDateTime(ใบ.createdAt);
    elStatus.innerHTML = statusBadge(ใบ.status);

    // ปุ่มที่ทำต่อไม่ได้ตามกฎ ต้อง "ปิด" ไว้ ไม่ใช่ "ซ่อน"
    var ยังรอพิจารณา = ใบ.status === "รอพิจารณา";
    // อนุมัติ/ไม่อนุมัติ เป็นสิทธิ์ของ manager/hr เท่านั้น (ดู isStaff() ใน firestore.rules) —
    // ผู้ขอลาเปิดดูใบของตัวเองได้ แต่ต้องไม่เห็นปุ่มนี้ใช้งานได้ ไม่งั้นกดแล้วจะโดน Security Rules
    // ปฏิเสธเงียบ ๆ ด้วยข้อความ error ที่งงกว่าแค่เห็นปุ่มถูกปิดไว้ตั้งแต่แรก
    var เป็นสตาฟ = !!ผู้ใช้ปัจจุบัน && (ผู้ใช้ปัจจุบัน.role === "manager" || ผู้ใช้ปัจจุบัน.role === "hr");
    // ลบได้เฉพาะเจ้าของใบลาเอง (ดู allow delete ใน firestore.rules) — manager/hr ที่เปิดดูใบคนอื่น
    // ต้องไม่เห็นปุ่มลบใช้งานได้เช่นกัน
    var เป็นเจ้าของใบ = !!ผู้ใช้ปัจจุบัน && ใบ.requesterId === ผู้ใช้ปัจจุบัน.uid;
    if (btnApprove) btnApprove.disabled = !(ยังรอพิจารณา && เป็นสตาฟ);
    if (btnReject) btnReject.disabled = !(ยังรอพิจารณา && เป็นสตาฟ);
    if (btnDelete) btnDelete.disabled = !(ยังรอพิจารณา && เป็นเจ้าของใบ);   // ลบได้เฉพาะเจ้าของใบที่ยัง "รอพิจารณา" เท่านั้น
  }

  function วาดความเห็น() {
    if (!elApprovalList) return;
    if (ความเห็นทั้งหมด.length === 0) {
      elApprovalList.innerHTML = "<p>ยังไม่มีความเห็นในใบนี้</p>";
      return;
    }
    // listApprovals คืนค่ามาเรียงเก่าไปใหม่อยู่แล้ว (orderBy createdAt asc)
    elApprovalList.innerHTML = ความเห็นทั้งหมด.map(function (c) {
      return '<div class="comment"><div class="meta">' + esc(c.authorName) + " · " +
             formatThaiDateTime(c.createdAt) + "</div><div>" + esc(c.message) + "</div></div>";
    }).join("");
  }

  // ── เปลี่ยนสถานะ: แก้เฉพาะ field "status" ผ่าน updateLeaveRequestStatus (ดู js/db.js) ──
  async function เปลี่ยนสถานะ(สถานะใหม่) {
    if (!ใบ || ใบ.status !== "รอพิจารณา") return;   // กันกดซ้ำ/ปุ่มที่ควรถูกปิดอยู่แล้ว

    if (สถานะใหม่ === "ไม่อนุมัติ") {
      // กฎ: จะกดไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการในใบนี้ก่อน
      // เช็คจากข้อมูลล่าสุดจริง ๆ (ไม่พึ่งค่าที่ cache ไว้ในหน่วยความจำ กันกรณีข้อมูลเก่า)
      var ความเห็นล่าสุด;
      try {
        ความเห็นล่าสุด = await listApprovals(รหัสใบลา);
      } catch (err) {
        จัดการข้อผิดพลาด(err, "ตรวจสอบความเห็นไม่สำเร็จ");
        return;
      }
      if (ความเห็นล่าสุด.length === 0) {
        if (elApprovalError) {
          elApprovalError.textContent = "⚠️ ต้องเขียนความเห็นอย่างน้อย 1 รายการก่อน จึงจะกดไม่อนุมัติได้";
          show(elApprovalError);
        }
        return;
      }
    }

    if (btnApprove) btnApprove.disabled = true;
    if (btnReject) btnReject.disabled = true;
    try {
      await updateLeaveRequestStatus(รหัสใบลา, สถานะใหม่);
      await โหลดข้อมูลใหม่();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "เปลี่ยนสถานะไม่สำเร็จ");
      วาดใบลา();   // คืนสถานะปุ่มให้ตรงกับข้อมูลเดิม
    }
  }

  async function ลบใบลา() {
    if (!ใบ || ใบ.status !== "รอพิจารณา") return;
    if (!confirm('ยืนยันการลบใบลา "' + ใบ.title + '" หรือไม่ — เมื่อลบแล้วกู้คืนไม่ได้')) return;

    if (btnDelete) btnDelete.disabled = true;
    try {
      await deleteLeaveRequest(รหัสใบลา);
      location.href = "leave-requests.html";
    } catch (err) {
      จัดการข้อผิดพลาด(err, "ลบใบลาไม่สำเร็จ");
      if (btnDelete) btnDelete.disabled = false;
    }
  }

  async function ส่งความเห็น() {
    if (!ใบ) return;
    var ข้อความ = elApprovalInput ? elApprovalInput.value.trim() : "";

    if (!ข้อความ) {
      if (elApprovalError) {
        elApprovalError.textContent = "⚠️ พิมพ์ข้อความก่อน จึงจะส่งความเห็นได้";
        show(elApprovalError);
      }
      return;
    }
    if (elApprovalError) hide(elApprovalError);

    // ผู้เขียนความเห็น = ผู้ใช้ที่ล็อกอินอยู่จริงตอนนี้ (js/auth.js) — ไม่ใช้ค่าคงที่แบบต้นแบบเดิมอีกต่อไป
    var ผู้เขียนความเห็นปัจจุบัน = await currentUserProfile();
    if (!ผู้เขียนความเห็นปัจจุบัน) {
      if (elApprovalError) {
        elApprovalError.textContent = "⚠️ ไม่พบผู้ใช้ที่ล็อกอินอยู่ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
        show(elApprovalError);
      }
      return;
    }

    if (btnSendApproval) btnSendApproval.disabled = true;
    try {
      await addApproval(รหัสใบลา, {
        authorId: ผู้เขียนความเห็นปัจจุบัน.uid,
        authorName: ผู้เขียนความเห็นปัจจุบัน.name,
        message: ข้อความ
      });
      if (elApprovalInput) elApprovalInput.value = "";
      await โหลดข้อมูลใหม่();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "ส่งความเห็นไม่สำเร็จ");
    } finally {
      if (btnSendApproval) btnSendApproval.disabled = false;
    }
  }

  function แสดงไม่พบใบลา() {
    elTitle.textContent = "ไม่พบใบขอลาที่ต้องการ";
    elReason.textContent = "อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง";
    [elType, elStart, elEnd, elRequester, elApprover, elCreatedAt].forEach(function (el) {
      if (el) el.textContent = "";
    });
    if (elStatus) elStatus.innerHTML = "";
    ปิดปุ่มทั้งหมด();
  }

  function ปิดปุ่มทั้งหมด() {
    [btnApprove, btnReject, btnDelete, btnSendApproval].forEach(function (btn) {
      if (btn) btn.disabled = true;
    });
  }

  function จัดการข้อผิดพลาด(err, หัวข้อ) {
    if (err instanceof FirebaseNotConfiguredError) {
      showConfigWarning();
      return;
    }
    showError(หัวข้อ + ": " + ข้อความError(err));
  }
})();
