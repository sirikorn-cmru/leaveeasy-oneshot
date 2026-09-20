// ─────────────────────────────────────────────────────────────
// js/signup.js — หน้าสมัครสมาชิก (signup.html)
//
// สมัครสมาชิกสำเร็จแล้วต้องสร้างเอกสาร users/{uid} ทันที (ผ่าน createUserDoc ใน js/db.js)
// โดย role บังคับเป็น "employee" เสมอ — ห้ามอ่านค่า role จากฟอร์ม (ฟอร์มนี้ไม่มีช่องนี้อยู่แล้ว)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import { signUpWithEmail, translateAuthError } from "./auth.js";
import { createUserDoc, FirebaseNotConfiguredError } from "./db.js";
import { showConfigWarning } from "./nav.js";
import { hide, show } from "./util.js";

(function () {
  var ฟอร์ม = document.getElementById("signup-form");
  if (!ฟอร์ม) return;

  var ช่องชื่อ = document.getElementById("signup-name");
  var ช่องอีเมล = document.getElementById("signup-email");
  var ช่องรหัสผ่าน = document.getElementById("signup-password");
  var กล่องเตือน = document.getElementById("signup-error");
  var ปุ่มสมัคร = document.getElementById("btn-signup");

  var รูปแบบอีเมล = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  init();

  function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้าสมัครสมาชิกจึงยังใช้งานไม่ได้");
      ตั้งค่าปิดฟอร์ม(true);
      return;
    }
    ฟอร์ม.addEventListener("submit", สมัครสมาชิก);
  }

  async function สมัครสมาชิก(e) {
    e.preventDefault();

    var ชื่อ = ช่องชื่อ.value.trim();
    var อีเมล = ช่องอีเมล.value.trim();
    var รหัสผ่าน = ช่องรหัสผ่าน.value;

    if (!ชื่อ) {
      เตือน("กรุณากรอกชื่อ");
      return;
    }
    if (!รูปแบบอีเมล.test(อีเมล)) {
      เตือน("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (รหัสผ่าน.length < 6) {
      เตือน("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    hide(กล่องเตือน);

    if (ปุ่มสมัคร) ปุ่มสมัคร.disabled = true;
    try {
      var ผู้ใช้ = await signUpWithEmail(อีเมล, รหัสผ่าน);
      // role บังคับเป็น "employee" เสมอ ไม่รับค่านี้จากฟอร์ม (ดูหมายเหตุด้านบนไฟล์)
      await createUserDoc(ผู้ใช้.uid, { name: ชื่อ, email: อีเมล, role: "employee" });
      location.href = "index.html";
    } catch (err) {
      if (ปุ่มสมัคร) ปุ่มสมัคร.disabled = false;
      if (err instanceof FirebaseNotConfiguredError) {
        showConfigWarning();
        return;
      }
      เตือน(translateAuthError(err));
    }
  }

  function ตั้งค่าปิดฟอร์ม(ปิด) {
    Array.prototype.forEach.call(ฟอร์ม.elements, function (el) { el.disabled = ปิด; });
  }

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    show(กล่องเตือน);
  }
})();
