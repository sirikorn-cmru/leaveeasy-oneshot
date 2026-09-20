// ─────────────────────────────────────────────────────────────
// js/nav.js — ทำงานร่วมกับแถบเมนูด้านบน (โหลดในทุกหน้า)
//
// หมายเหตุ: เดิมไฟล์นี้เคยสร้าง <div id="nav"> ทั้งก้อนด้วย JavaScript
// แต่ตอนนี้ทุกหน้า .html ฝัง <header class="navbar">...</header> ของตัวเองไว้แล้ว
// (รวมทั้ง #nav-user / #btn-logout / #nav-login สำหรับระบบล็อกอิน)
// งานของไฟล์นี้คือ (1) ขีดเส้นใต้เมนูของหน้าปัจจุบัน (2) เตรียมฟังก์ชัน showConfigWarning
// ให้สคริปต์หน้าอื่น import ไปใช้ (3) แสดงชื่อผู้ใช้ที่ล็อกอิน/ปุ่มออกจากระบบใน
// #nav-user, #btn-logout, #nav-login (อ่านสถานะผ่าน js/auth.js) และ (4) เป็น route guard —
// ทุกหน้ายกเว้น login.html/signup.html ต้องมีคนล็อกอินอยู่ ไม่งั้นเด้งไป login.html
// ─────────────────────────────────────────────────────────────

import { currentUserProfile, signOutUser } from "./auth.js";
import { hide, show } from "./util.js";

var หน้าที่ไม่ต้องล็อกอิน = ["login.html", "signup.html"];

(function () {
  var หน้าปัจจุบัน = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header.navbar a[href]").forEach(function (ลิงก์) {
    if (ลิงก์.getAttribute("href") === หน้าปัจจุบัน) {
      ลิงก์.classList.add("active");
    }
  });

  ตั้งค่าUIผู้ใช้และคุมสิทธิ์เข้าหน้า(หน้าปัจจุบัน);
})();

// เช็คสถานะล็อกอิน (รอ Firebase Auth คืนสถานะแรกให้เสร็จก่อนเสมอ — currentUserProfile
// ใน js/auth.js เป็นคนรอให้ ไม่งั้นตอนรีเฟรชหน้า auth.currentUser จะยังเป็น null ชั่วคราว
// ทั้งที่จริง ๆ ผู้ใช้ล็อกอินค้างอยู่ ทำให้โดนเด้งไป login.html ทุกครั้งที่รีเฟรชหน้าโดยไม่ควร)
async function ตั้งค่าUIผู้ใช้และคุมสิทธิ์เข้าหน้า(หน้าปัจจุบัน) {
  var elUser = document.getElementById("nav-user");
  var btnLogout = document.getElementById("btn-logout");
  var linkLogin = document.getElementById("nav-login");

  var โปรไฟล์ = await currentUserProfile();

  if (โปรไฟล์) {
    if (elUser) elUser.textContent = โปรไฟล์.name;
    if (btnLogout) show(btnLogout);
    if (linkLogin) hide(linkLogin);
  } else {
    if (elUser) elUser.textContent = "";
    if (btnLogout) hide(btnLogout);
    if (linkLogin) show(linkLogin);

    // ยังไม่ได้ล็อกอิน และหน้านี้ไม่ใช่หน้า login/signup — เด้งไปหน้า login ทันที
    if (หน้าที่ไม่ต้องล็อกอิน.indexOf(หน้าปัจจุบัน) === -1) {
      location.href = "login.html";
      return;
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async function () {
      try {
        await signOutUser();
      } catch (err) {
        // ไม่ว่าจะ error หรือไม่ ก็พาไปหน้า login เหมือนกัน (ไม่มีอะไรให้ทำต่อในหน้านี้แล้ว)
      }
      location.href = "login.html";
    });
  }
}

// แถบเตือนสีเหลือง ใช้ตอนที่ยังไม่ได้ตั้งค่า Firebase (js/firebase-config.js ยังเป็น placeholder)
// สคริปต์ของหน้าอื่นเรียกใช้ผ่าน: import { showConfigWarning } from "./nav.js";
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
