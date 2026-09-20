// ─────────────────────────────────────────────────────────────
// js/leave-requests.js — หน้ารายการใบลา (อ่านจาก Cloud Firestore จริง)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import { listLeaveRequests, listLeaveTypes, FirebaseNotConfiguredError } from "./db.js";
import { currentUserProfile } from "./auth.js";
import { showConfigWarning } from "./nav.js";
import { esc, statusBadge, toMillis, getQueryParam, hide, show, showError, ข้อความError } from "./util.js";

(function () {
  var elBody = document.getElementById("leave-list-body");
  if (!elBody) return;   // หน้านี้ไม่มี element ที่ต้องใช้ ไม่ต้องทำอะไรต่อ

  var elSearch = document.getElementById("leave-search");
  var elFilterStatus = document.getElementById("filter-status");
  var elFilterType = document.getElementById("filter-type");
  var elSortToggle = document.getElementById("btn-sort-toggle");
  var elEmpty = document.getElementById("leave-list-empty");
  var elSearchEmpty = document.getElementById("leave-search-empty");

  var ใบลาทั้งหมด = [];
  var เรียงใหม่ก่อน = true;   // ค่าเริ่มต้น: ใหม่ไปเก่า

  init();

  async function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้ารายการใบลาจึงยังไม่ได้อ่านข้อมูลจริง");
      return;
    }

    var สถานะจากURL = getQueryParam("status");
    if (สถานะจากURL && elFilterStatus) elFilterStatus.value = สถานะจากURL;

    try {
      // employee เห็นเฉพาะใบของตัวเอง / manager, hr เห็นทุกใบ (ดูเหตุผลใน js/db.js's listLeaveRequests)
      var ผู้ใช้ปัจจุบัน = await currentUserProfile();
      var results = await Promise.all([listLeaveRequests(ผู้ใช้ปัจจุบัน), listLeaveTypes()]);
      ใบลาทั้งหมด = results[0];
      เติมตัวเลือกประเภท(results[1]);
      render();
    } catch (err) {
      if (err instanceof FirebaseNotConfiguredError) {
        showConfigWarning();
      } else {
        showError("โหลดรายการใบลาไม่สำเร็จ: " + ข้อความError(err));
      }
      return;
    }

    if (elSearch) elSearch.addEventListener("input", render);
    if (elFilterStatus) elFilterStatus.addEventListener("change", render);
    if (elFilterType) elFilterType.addEventListener("change", render);
    if (elSortToggle) elSortToggle.addEventListener("click", สลับการเรียง);
  }

  function เติมตัวเลือกประเภท(ประเภททั้งหมด) {
    if (!elFilterType) return;
    ประเภททั้งหมด.forEach(function (ประเภท) {
      var ตัวเลือก = document.createElement("option");
      ตัวเลือก.value = ประเภท.id;
      ตัวเลือก.textContent = ประเภท.name;
      elFilterType.appendChild(ตัวเลือก);
    });
  }

  function สลับการเรียง() {
    เรียงใหม่ก่อน = !เรียงใหม่ก่อน;
    elSortToggle.textContent = เรียงใหม่ก่อน ? "ใหม่ไปเก่า" : "เก่าไปใหม่";
    render();
  }

  function render() {
    var คำค้น = elSearch ? elSearch.value.trim().toLowerCase() : "";
    var สถานะที่เลือก = elFilterStatus ? elFilterStatus.value : "";
    var ประเภทที่เลือก = elFilterType ? elFilterType.value : "";

    var ที่กรองแล้ว = ใบลาทั้งหมด.filter(function (ใบ) {
      if (สถานะที่เลือก && ใบ.status !== สถานะที่เลือก) return false;
      if (ประเภทที่เลือก && ใบ.leaveTypeId !== ประเภทที่เลือก) return false;
      if (คำค้น && String(ใบ.title || "").toLowerCase().indexOf(คำค้น) === -1) return false;
      return true;
    });

    ที่กรองแล้ว.sort(function (a, b) {
      var ta = toMillis(a.createdAt), tb = toMillis(b.createdAt);
      return เรียงใหม่ก่อน ? tb - ta : ta - tb;
    });

    // ยังไม่มีใบขอลาในระบบเลย (collection ว่างจริง ๆ) ต่างจาก "ค้นหาแล้วไม่เจอ"
    if (ใบลาทั้งหมด.length === 0) {
      elBody.innerHTML = "";
      show(elEmpty);
      hide(elSearchEmpty);
      return;
    }
    hide(elEmpty);

    if (ที่กรองแล้ว.length === 0) {
      elBody.innerHTML = "";
      show(elSearchEmpty);
      return;
    }
    hide(elSearchEmpty);

    elBody.innerHTML = ที่กรองแล้ว.map(แถวHtml).join("");
    elBody.querySelectorAll("tr[data-id]").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        location.href = "leave-request-detail.html?id=" + encodeURIComponent(แถว.dataset.id);
      });
    });
  }

  function แถวHtml(ใบ) {
    return '<tr data-id="' + esc(ใบ.id) + '" style="cursor:pointer">' +
      "<td>" + esc(ใบ.title) + "</td>" +
      "<td>" + esc(ใบ.leaveTypeName) + "</td>" +
      "<td>" + statusBadge(ใบ.status) + "</td>" +
      "<td>" + esc(ใบ.requesterName) + "</td>" +
      "<td>" + esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate) + "</td>" +
      "</tr>";
  }
})();
