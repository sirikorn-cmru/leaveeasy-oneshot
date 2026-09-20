// ─────────────────────────────────────────────────────────────
// js/login.js — หน้าเข้าสู่ระบบ (login.html)
// ─────────────────────────────────────────────────────────────

import { firebaseNotConfigured } from "./firebase.js";
import { signInWithEmail, translateAuthError } from "./auth.js";
import { FirebaseNotConfiguredError } from "./db.js";
import { showConfigWarning } from "./nav.js";
import { hide, show } from "./util.js";

(function () {
  var ฟอร์ม = document.getElementById("login-form");
  if (!ฟอร์ม) return;

  var ช่องอีเมล = document.getElementById("login-email");
  var ช่องรหัสผ่าน = document.getElementById("login-password");
  var กล่องเตือน = document.getElementById("login-error");
  var ปุ่มเข้าสู่ระบบ = document.getElementById("btn-login");

  init();

  function init() {
    if (firebaseNotConfigured) {
      showConfigWarning("หน้าเข้าสู่ระบบจึงยังใช้งานไม่ได้");
      ตั้งค่าปิดฟอร์ม(true);
      return;
    }
    ฟอร์ม.addEventListener("submit", เข้าสู่ระบบ);
  }

  async function เข้าสู่ระบบ(e) {
    e.preventDefault();

    var อีเมล = ช่องอีเมล.value.trim();
    var รหัสผ่าน = ช่องรหัสผ่าน.value;

    if (!อีเมล || !รหัสผ่าน) {
      เตือน("กรอกอีเมลและรหัสผ่านให้ครบก่อนกดเข้าสู่ระบบ");
      return;
    }
    hide(กล่องเตือน);

    if (ปุ่มเข้าสู่ระบบ) ปุ่มเข้าสู่ระบบ.disabled = true;
    try {
      await signInWithEmail(อีเมล, รหัสผ่าน);
      location.href = "index.html";
    } catch (err) {
      if (ปุ่มเข้าสู่ระบบ) ปุ่มเข้าสู่ระบบ.disabled = false;
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
