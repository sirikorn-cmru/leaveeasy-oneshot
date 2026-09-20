// ─────────────────────────────────────────────────────────────
// js/dashboard.js — หน้าแดชบอร์ด สรุปจำนวนใบลาแยกตามสถานะ + ใบล่าสุด 5 ใบ
// (นับจาก Cloud Firestore จริง)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import { listLeaveRequests, FirebaseNotConfiguredError } from "./db.js";
import { currentUserProfile } from "./auth.js";
import { showConfigWarning } from "./nav.js";
import { esc, statusBadge, showError, ข้อความError } from "./util.js";

(function () {
  var elPending = document.getElementById("count-pending");
  var elApproved = document.getElementById("count-approved");
  var elRejected = document.getElementById("count-rejected");
  var elRecent = document.getElementById("recent-list");

  if (!elPending && !elRecent) return;

  init();

  async function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้าแดชบอร์ดจึงยังไม่ได้อ่านข้อมูลจริง");
      return;
    }

    try {
      // employee เห็นเฉพาะใบของตัวเอง / manager, hr เห็นทุกใบ — listLeaveRequests ใน js/db.js
      // เป็นคนตัดสินใจนี้ตาม role (ต้องส่ง profile ปัจจุบันไปให้ ไม่งั้น employee จะโดน
      // Firestore Security Rules ปฏิเสธทั้งคิวรี) คืนค่ามาเรียงใหม่ไปเก่าเสมอไม่ว่า role ไหน
      var ผู้ใช้ปัจจุบัน = await currentUserProfile();
      var ใบลาทั้งหมด = await listLeaveRequests(ผู้ใช้ปัจจุบัน);
      วาดตัวนับ(ใบลาทั้งหมด);
      วาดรายการล่าสุด(ใบลาทั้งหมด.slice(0, 5));
    } catch (err) {
      if (err instanceof FirebaseNotConfiguredError) {
        showConfigWarning();
      } else {
        showError("โหลดข้อมูลแดชบอร์ดไม่สำเร็จ: " + ข้อความError(err));
      }
    }
  }

  function วาดตัวนับ(รายการ) {
    var นับ = { "รอพิจารณา": 0, "อนุมัติ": 0, "ไม่อนุมัติ": 0 };
    รายการ.forEach(function (ใบ) {
      if (Object.prototype.hasOwnProperty.call(นับ, ใบ.status)) นับ[ใบ.status]++;
    });
    if (elPending) elPending.textContent = นับ["รอพิจารณา"];
    if (elApproved) elApproved.textContent = นับ["อนุมัติ"];
    if (elRejected) elRejected.textContent = นับ["ไม่อนุมัติ"];
  }

  function วาดรายการล่าสุด(รายการ) {
    if (!elRecent) return;
    if (รายการ.length === 0) {
      elRecent.innerHTML = "<p>ยังไม่มีใบขอลาในระบบ</p>";
      return;
    }
    elRecent.innerHTML = รายการ.map(function (ใบ) {
      return '<div class="field-row"><span>' +
        '<a href="leave-request-detail.html?id=' + encodeURIComponent(ใบ.id) + '">' + esc(ใบ.title) + "</a>" +
        " · " + esc(ใบ.requesterName) +
        "</span><span>" + statusBadge(ใบ.status) + "</span></div>";
    }).join("");
  }
})();
