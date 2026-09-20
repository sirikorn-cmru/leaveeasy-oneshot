// ─────────────────────────────────────────────────────────────
// js/leave-types.js — หน้าจัดการประเภทการลา (อ่าน/แก้ Cloud Firestore จริง)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import {
  listLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, FirebaseNotConfiguredError
} from "./db.js";
import { showConfigWarning } from "./util.js";
import { currentUserProfile } from "./auth.js";
import { esc, hide, show, ข้อความError } from "./util.js";

(function () {
  var elBody = document.getElementById("type-list-body");
  if (!elBody) return;

  var elNameInput = document.getElementById("type-name-input");
  var btnAdd = document.getElementById("btn-add-type");
  var elEmpty = document.getElementById("type-empty");

  var รายการ = [];

  // เฉพาะฝ่ายบุคคล (hr) เท่านั้นที่แก้ประเภทการลาได้ — firestore.rules บังคับข้อนี้ฝั่งเซิร์ฟเวอร์อยู่แล้ว
  // แต่ถ้า UI ไม่กั้นด้วย employee/manager จะกดปุ่มได้แล้วไปเจอ PERMISSION_DENIED เป็น alert
  // ซึ่งดูเหมือนระบบพัง ทั้งที่จริงคือไม่มีสิทธิ์ จึงปิดปุ่มไว้ตั้งแต่แรกพร้อมบอกเหตุผล
  var เป็นฝ่ายบุคคล = false;

  init();

  async function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้าจัดการประเภทการลาจึงยังไม่ได้อ่านข้อมูลจริง");
      if (btnAdd) btnAdd.disabled = true;
      return;
    }

    var โปรไฟล์ = await currentUserProfile();
    เป็นฝ่ายบุคคล = !!โปรไฟล์ && โปรไฟล์.role === "hr";

    if (!เป็นฝ่ายบุคคล) {
      if (btnAdd) btnAdd.disabled = true;
      if (elNameInput) elNameInput.disabled = true;
      แสดงข้อความไม่มีสิทธิ์();
    }

    await โหลดใหม่();
    if (เป็นฝ่ายบุคคล && btnAdd) btnAdd.addEventListener("click", เพิ่มประเภท);
  }

  function แสดงข้อความไม่มีสิทธิ์() {
    var กล่อง = document.createElement("div");
    กล่อง.className = "alert alert-warn";
    กล่อง.textContent = "หน้านี้ดูได้อย่างเดียว — เฉพาะฝ่ายบุคคลเท่านั้นที่เพิ่ม แก้ไข หรือลบประเภทการลาได้";
    var ที่วาง = document.querySelector(".container") || document.body;
    if (ที่วาง) ที่วาง.insertBefore(กล่อง, ที่วาง.firstChild);
  }

  async function โหลดใหม่() {
    try {
      รายการ = await listLeaveTypes();
      วาดตาราง();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "โหลดประเภทการลาไม่สำเร็จ");
    }
  }

  function วาดตาราง() {
    if (รายการ.length === 0) {
      elBody.innerHTML = "";
      show(elEmpty);
      return;
    }
    hide(elEmpty);

    var ปิดปุ่ม = เป็นฝ่ายบุคคล ? "" : " disabled";
    elBody.innerHTML = รายการ.map(function (ประเภท) {
      return "<tr><td>" + esc(ประเภท.name) + "</td><td>" +
        '<button type="button" class="btn-ghost" data-edit="' + esc(ประเภท.id) + '"' + ปิดปุ่ม + ">แก้ไข</button> " +
        '<button type="button" class="btn-danger" data-del="' + esc(ประเภท.id) + '"' + ปิดปุ่ม + ">ลบ</button>" +
        "</td></tr>";
    }).join("");

    if (!เป็นฝ่ายบุคคล) return;   // ไม่ผูก event ให้ปุ่มที่ปิดไว้

    elBody.querySelectorAll("[data-edit]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { แก้ประเภท(ปุ่ม.dataset.edit); });
    });
    elBody.querySelectorAll("[data-del]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { ลบประเภท(ปุ่ม.dataset.del); });
    });
  }

  async function เพิ่มประเภท() {
    var ชื่อ = elNameInput.value.trim();
    if (!ชื่อ) {
      alert("พิมพ์ชื่อประเภทการลาก่อน จึงจะเพิ่มได้");
      return;
    }
    btnAdd.disabled = true;
    try {
      await createLeaveType(ชื่อ);
      elNameInput.value = "";
      await โหลดใหม่();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "เพิ่มประเภทการลาไม่สำเร็จ");
    } finally {
      btnAdd.disabled = false;
    }
  }

  async function แก้ประเภท(id) {
    var ประเภท = รายการ.find(function (t) { return t.id === id; });
    if (!ประเภท) return;
    var ชื่อใหม่ = prompt("แก้ชื่อประเภทการลา", ประเภท.name);
    if (ชื่อใหม่ === null) return;              // กดยกเลิก
    if (!ชื่อใหม่.trim()) { alert("ชื่อประเภทการลาว่างเปล่าไม่ได้"); return; }

    try {
      await updateLeaveType(id, ชื่อใหม่.trim());
      await โหลดใหม่();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "แก้ไขประเภทการลาไม่สำเร็จ");
    }
  }

  async function ลบประเภท(id) {
    var ประเภท = รายการ.find(function (t) { return t.id === id; });
    if (!ประเภท) return;
    if (!confirm('ยืนยันการลบประเภท "' + ประเภท.name + '" หรือไม่')) return;

    try {
      await deleteLeaveType(id);
      await โหลดใหม่();
    } catch (err) {
      จัดการข้อผิดพลาด(err, "ลบประเภทการลาไม่สำเร็จ");
    }
  }

  function จัดการข้อผิดพลาด(err, หัวข้อ) {
    if (err instanceof FirebaseNotConfiguredError) {
      showConfigWarning();
      return;
    }
    alert(หัวข้อ + ": " + ข้อความError(err));
  }
})();
