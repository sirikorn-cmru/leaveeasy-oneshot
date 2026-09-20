// ─────────────────────────────────────────────────────────────
// tests/e2e/helpers.js — ตัวช่วยที่ใช้ร่วมกันของเทสต์ทั้ง 2 เคส
// ─────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");

const รากโปรเจกต์ = path.join(__dirname, "..", "..");

// ── อ่านรหัสผ่านบัญชีทดสอบจาก tests/e2e/.env.local ถ้ามีไฟล์นั้น ──
// ไฟล์นั้นถูก gitignore ไว้ จึงใส่รหัสผ่านจริงได้โดยไม่หลุดขึ้น Git
// ค่าที่ตั้งไว้ใน environment อยู่แล้วจะชนะเสมอ ไฟล์นี้เติมให้เฉพาะตัวที่ยังว่าง
function โหลดEnvLocal() {
  const ไฟล์ = path.join(__dirname, ".env.local");
  if (!fs.existsSync(ไฟล์)) return;
  const ขึ้นบรรทัดใหม่ = String.fromCharCode(10);
  for (const บรรทัด of fs.readFileSync(ไฟล์, "utf8").split(ขึ้นบรรทัดใหม่)) {
    const ตัด = บรรทัด.trim();
    if (!ตัด || ตัด.startsWith("#")) continue;
    const จุดเท่ากับ = ตัด.indexOf("=");
    if (จุดเท่ากับ === -1) continue;
    const คีย์ = ตัด.slice(0, จุดเท่ากับ).trim();
    let ค่า = ตัด.slice(จุดเท่ากับ + 1).trim();
    if ((ค่า.startsWith(String.fromCharCode(34)) && ค่า.endsWith(String.fromCharCode(34))) ||
        (ค่า.startsWith("'") && ค่า.endsWith("'"))) ค่า = ค่า.slice(1, -1);
    if (!process.env[คีย์]) process.env[คีย์] = ค่า;
  }
}
โหลดEnvLocal();

// ── ตรวจว่าตั้งค่า Firebase จริงแล้วหรือยัง ──────────────────
// ถ้ายังเป็น placeholder อยู่ ระบบจะล็อกอินไม่ได้เลย เทสต์ทุกข้อจึงรันไม่ได้
// กรณีนี้ต้อง "ข้ามพร้อมบอกเหตุผล" ไม่ใช่ปล่อยให้ fail มั่ว ๆ จนอ่านไม่ออกว่าติดอะไร
function ตั้งค่าFirebaseแล้วหรือยัง() {
  const ไฟล์ = path.join(รากโปรเจกต์, "js", "firebase-config.js");
  if (!fs.existsSync(ไฟล์)) return false;
  const เนื้อไฟล์ = fs.readFileSync(ไฟล์, "utf8");
  const เฉพาะค่าจริง = เนื้อไฟล์.slice(เนื้อไฟล์.indexOf("export const firebaseConfig"));
  return !เฉพาะค่าจริง.includes("ใส่ค่าจาก Firebase Console");
}

// ── บัญชีทดสอบ อ่านจาก environment variable ─────────────────
// ห้าม hardcode อีเมล/รหัสผ่านลงไฟล์นี้ เพราะไฟล์นี้ขึ้น Git
const บัญชี = {
  employee: {
    email: process.env.E2E_EMPLOYEE_EMAIL,
    password: process.env.E2E_EMPLOYEE_PASSWORD,
    ป้าย: "ผู้ขอลา (employee)",
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL,
    password: process.env.E2E_MANAGER_PASSWORD,
    ป้าย: "ผู้อนุมัติ (manager/hr)",
  },
};

// คืนข้อความเหตุผลถ้ายังรันไม่ได้ คืน null ถ้าพร้อมรัน
function เหตุผลที่ยังรันไม่ได้(บทบาทที่ต้องใช้) {
  if (!ตั้งค่าFirebaseแล้วหรือยัง()) {
    return "js/firebase-config.js ยังเป็นค่า placeholder — ต้องใส่ค่าจริงจาก Firebase Console ก่อน ไม่งั้นล็อกอินไม่ได้";
  }
  for (const บทบาท of บทบาทที่ต้องใช้) {
    const ข้อมูล = บัญชี[บทบาท];
    if (!ข้อมูล.email || !ข้อมูล.password) {
      return `ยังไม่ได้ตั้ง environment variable สำหรับบัญชี ${ข้อมูล.ป้าย} — ต้องตั้ง E2E_${บทบาท.toUpperCase()}_EMAIL และ E2E_${บทบาท.toUpperCase()}_PASSWORD`;
    }
  }
  return null;
}

// ── ล็อกอิน ─────────────────────────────────────────────────
async function ล็อกอิน(page, บทบาท) {
  const ข้อมูล = บัญชี[บทบาท];
  await page.goto("/login.html");
  await page.fill("#login-email", ข้อมูล.email);
  await page.fill("#login-password", ข้อมูล.password);
  await page.click("#btn-login");
  // ล็อกอินสำเร็จ nav.js จะเขียนชื่อผู้ใช้ลง #nav-user (ดู js/nav.js)
  // ห้ามใช้ปุ่ม "ออกจากระบบ" เป็นสัญญาณ เพราะมันโผล่ตลอดแม้ยังไม่ล็อกอิน (บั๊ก CSS ที่รายงานไว้แล้ว)
  await page.waitForFunction(() => {
    const el = document.getElementById("nav-user");
    return el && el.textContent.trim().length > 0;
  }, null, { timeout: 20_000 });
}

async function ออกจากระบบ(page) {
  await page.click("#btn-logout");
  await page.waitForURL(/login/, { timeout: 20_000 });
}

// ── ตัวช่วยเล็ก ๆ ───────────────────────────────────────────
// หัวข้อไม่ซ้ำ กันชนกับใบลาที่มีอยู่แล้วในฐานข้อมูล
function หัวข้อไม่ซ้ำ() {
  const เวลา = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `ทดสอบ QA ยื่นใบลาใหม่ ${เวลา}`;
}

// อ่านค่า id จาก query string ของหน้ารายละเอียด
// (เซิร์ฟเวอร์ serve เปิด cleanUrls ไว้ /leave-request-detail.html จะถูก 301 เป็น
//  /leave-request-detail — จึงต้องอ่านจาก searchParams ไม่ใช่เทียบ path ตรง ๆ)
function idจากURL(url) {
  return new URL(url).searchParams.get("id");
}

// อ่านค่าทุกช่องในหน้ารายละเอียด เอาไว้เทียบก่อน–หลังว่าไม่ถูกเขียนทับ
async function อ่านค่าทุกช่อง(page) {
  const ช่อง = ["d-title", "d-reason", "d-leaveTypeName", "d-startDate", "d-endDate", "d-requesterName", "d-approverName", "d-createdAt"];
  const ผล = {};
  for (const ไอดี of ช่อง) {
    ผล[ไอดี] = (await page.locator(`#${ไอดี}`).textContent()).trim();
  }
  return ผล;
}

// พิมพ์เหตุผลออกจอครั้งเดียว เวลาเทสต์ถูกข้ามทั้งชุด จะได้รู้ทันทีว่าติดอะไร
// (reporter แบบ list ไม่โชว์เหตุผลของ skip ให้)
let แจ้งแล้ว = false;
function แจ้งเหตุผลถ้ายังรันไม่ได้(บทบาทที่ต้องใช้) {
  const เหตุผล = เหตุผลที่ยังรันไม่ได้(บทบาทที่ต้องใช้);
  if (เหตุผล && !แจ้งแล้ว) {
    แจ้งแล้ว = true;
    console.warn('');
    console.warn('⚠️  ข้ามเทสต์ทั้งหมด: ' + เหตุผล);
    console.warn('   อ่านวิธีตั้งค่าได้ที่ tests/e2e/README.md');
    console.warn('');
  }
  return เหตุผล;
}

module.exports = {
  บัญชี,
  ตั้งค่าFirebaseแล้วหรือยัง,
  เหตุผลที่ยังรันไม่ได้,
  แจ้งเหตุผลถ้ายังรันไม่ได้,
  ล็อกอิน,
  ออกจากระบบ,
  หัวข้อไม่ซ้ำ,
  idจากURL,
  อ่านค่าทุกช่อง,
};

// ─────────────────────────────────────────────────────────────
// ส่วนเพิ่มสำหรับเทสต์ความปลอดภัย (US-08)
// ─────────────────────────────────────────────────────────────

// ผู้ขอลา "คนที่สอง" — ต้องเป็น role employee เหมือนกัน ห้ามใช้ manager/hr แทน
// เพราะ manager/hr เปิดใบลาของทุกคนได้ตามการออกแบบ ใช้ทดสอบข้อนี้ไม่ได้
บัญชี.employee2 = {
  email: process.env.E2E_EMPLOYEE2_EMAIL,
  password: process.env.E2E_EMPLOYEE2_PASSWORD,
  ป้าย: "ผู้ขอลาคนที่สอง (employee อีกคน)",
};

// ── ยิงอ่าน Firestore ตรง ๆ โดยไม่ล็อกอิน ────────────────────
// การที่หน้าเว็บเด้งไป login.html เป็นแค่ยามหน้าประตูฝั่งเบราว์เซอร์ ใครก็ข้ามได้
// ด่านจริงคือ Firestore Security Rules — ต้องตอบ PERMISSION_DENIED เท่านั้น
async function อ่านแบบไม่ล็อกอิน(page, เส้นทาง) {
  return await page.evaluate(async (เส้นทาง) => {
    const { firebaseConfig } = await import("/js/firebase-config.js");
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${เส้นทาง}?key=${firebaseConfig.apiKey}&pageSize=1`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    return { http: r.status, status: j.error ? j.error.status : "OK", จำนวนเอกสาร: (j.documents || []).length };
  }, เส้นทาง);
}

// ── ยิงอ่าน Firestore ด้วยสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ตอนนี้ ──
async function อ่านด้วยสิทธิ์ผู้ใช้ปัจจุบัน(page, เส้นทาง) {
  return await page.evaluate(async (เส้นทาง) => {
    const { auth } = await import("/js/firebase.js");
    const { firebaseConfig } = await import("/js/firebase-config.js");
    if (!auth) return { http: 0, status: "ยังไม่ได้ตั้งค่า Firebase" };
    // Firebase Auth กู้สถานะล็อกอินแบบ async — ตอนหน้าเพิ่งโหลด auth.currentUser
    // ยังเป็น null อยู่ชั่วครู่ ทั้งที่ผู้ใช้ล็อกอินค้างอยู่จริง ต้องรอสถานะแรกก่อนเสมอ
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const ผู้ใช้ = auth.currentUser || await new Promise((resolve) => {
      const เลิกฟัง = onAuthStateChanged(auth, (u) => { เลิกฟัง(); resolve(u); });
    });
    if (!ผู้ใช้) return { http: 0, status: "ยังไม่ได้ล็อกอิน" };
    const token = await ผู้ใช้.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${เส้นทาง}`;
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const j = await r.json().catch(() => ({}));
    return { http: r.status, status: j.error ? j.error.status : "OK", uid: ผู้ใช้.uid };
  }, เส้นทาง);
}

module.exports.อ่านแบบไม่ล็อกอิน = อ่านแบบไม่ล็อกอิน;
module.exports.อ่านด้วยสิทธิ์ผู้ใช้ปัจจุบัน = อ่านด้วยสิทธิ์ผู้ใช้ปัจจุบัน;

// ── รอจนหน้ารายละเอียด "ตัดสินใจเสร็จ" ───────────────────────
// ห้ามใช้ waitForLoadState("networkidle") กับหน้าที่ต่อ Firebase
// เพราะ Firebase เปิดการเชื่อมต่อค้างไว้ฟังข้อมูลตลอดเวลา networkidle จึงไม่เกิดเลย
// ต้องรอผลลัพธ์อย่างใดอย่างหนึ่งแทน: โหลดข้อมูลได้ / ขึ้น error / ถูกเด้งออกจากหน้า
async function รอหน้ารายละเอียดนิ่ง(page, เวลารอ) {
  try {
    await page.waitForFunction(() => {
      if (!location.pathname.includes("leave-request-detail")) return true;
      const t = document.getElementById("d-title");
      if (t && t.textContent.trim()) return true;
      if (document.querySelector(".alert-error")) return true;
      return false;
    }, null, { timeout: เวลารอ || 15000 });
  } catch (e) {
    // ครบเวลาแล้วหน้ายังไม่แสดงอะไรเลย = เปิดใบนั้นไม่ได้
    // ปล่อยให้ assertion ข้างนอกเป็นคนตัดสิน ไม่ throw ทิ้งตรงนี้
  }
}

module.exports.รอหน้ารายละเอียดนิ่ง = รอหน้ารายละเอียดนิ่ง;