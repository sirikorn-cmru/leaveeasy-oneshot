// ─────────────────────────────────────────────────────────────
// js/ai.js — ฟีเจอร์ AI (เรียก OpenRouter ตรงจากเบราว์เซอร์ ไม่มีเซิร์ฟเวอร์ของเราเอง)
//
// กฎความเป็นส่วนตัว (ตามสเปกของโปรเจกต์): ห้ามส่งข้อมูลส่วนตัวจริงของผู้ใช้ไปให้ AI ภายนอก
// เด็ดขาด — ห้ามส่งอีเมล, uid, หรือเอกสารจาก collection "users" ส่งได้เฉพาะฟิลด์ของ
// ใบลาเองเท่านั้น (title/reason/leaveTypeName/startDate/endDate/requesterName ซึ่งเป็น
// ข้อความที่ผู้ใช้กรอกเอง/ชื่อที่แสดงอยู่แล้วในหน้าเว็บ ไม่ใช่ข้อมูลระบุตัวตนจากบัญชีผู้ใช้)
//
// ไฟล์นี้ถูกโหลดทั้งใน new-leave-request.html และ leave-request-detail.html
// จึงต้องเช็ค element ก่อนทุกครั้งว่ามีอยู่จริงในหน้านั้นหรือไม่ (guard ด้วย if (!el) return;)
// ─────────────────────────────────────────────────────────────

import { listLeaveTypes } from "./db.js";
import { esc, hide, show } from "./util.js";

// js/ai-config.js ถูกกันไว้ใน .gitignore (กันคีย์หลุดขึ้น GitHub) แปลว่าคนที่เพิ่ง clone
// โปรเจกต์มาจะยังไม่มีไฟล์นี้ ถ้า import แบบธรรมดาไว้ข้างบน ทั้งโมดูลจะโหลดไม่ขึ้นเลย
// และปุ่ม AI จะเงียบสนิทโดยไม่มีข้อความบอกผู้ใช้ จึงต้องโหลดแบบ dynamic แล้วดักพลาดไว้
var OPENROUTER_API_KEY = "";
var MODEL = "";
try {
  var คอนฟิก = await import("./ai-config.js");
  OPENROUTER_API_KEY = คอนฟิก.OPENROUTER_API_KEY || "";
  MODEL = คอนฟิก.MODEL || "";
} catch (err) {
  // ไม่มีไฟล์ js/ai-config.js — ปล่อยค่าว่างไว้ แล้วให้ ยังไม่ตั้งค่าคีย์() ดักแจ้งผู้ใช้เอง
}

var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var TIMEOUT_MS = 15000;

var ข้อความยังไม่ตั้งค่าคีย์ =
  "ยังไม่ได้ตั้งค่า API key ของ AI — เปิดไฟล์ js/ai-config.js แล้วใส่คีย์จริงจาก openrouter.ai " +
  "(ดูวิธีตั้งค่าในไฟล์ js/ai-config.example.js) ก่อนใช้งานฟีเจอร์นี้";

function ยังไม่ตั้งค่าคีย์() {
  return !OPENROUTER_API_KEY || OPENROUTER_API_KEY.indexOf("ใส่") === 0;
}

// เรียกโมเดลผ่าน OpenRouter หนึ่งครั้ง — มี timeout บังคับ 15 วินาทีด้วย AbortController
// โยน Error ออกไปให้ผู้เรียกจัดการเองทุกกรณี (timeout / network error / status ไม่ใช่ 2xx)
async function เรียกโมเดล(ข้อความระบบ, ข้อความผู้ใช้) {
  var ตัวควบคุม = new AbortController();
  var ตัวจับเวลา = setTimeout(function () { ตัวควบคุม.abort(); }, TIMEOUT_MS);

  try {
    var res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENROUTER_API_KEY
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: ข้อความระบบ },
          { role: "user", content: ข้อความผู้ใช้ }
        ]
      }),
      signal: ตัวควบคุม.signal
    });

    if (!res.ok) {
      throw new Error("เรียก AI ไม่สำเร็จ (สถานะ " + res.status + ")");
    }

    var data = await res.json();
    var เนื้อหา = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (!เนื้อหา) {
      throw new Error("AI ไม่ได้ตอบข้อความกลับมา");
    }
    return String(เนื้อหา).trim();
  } finally {
    clearTimeout(ตัวจับเวลา);
  }
}

// แปลง error ที่เกิดขึ้นระหว่างเรียก AI ให้เป็นข้อความไทยที่อ่านเข้าใจได้ ไม่โชว์ raw error object
function ข้อความจากError(err) {
  if (err && err.name === "AbortError") {
    return "AI ตอบกลับช้าเกินไป (เกิน 15 วินาที) กรุณาลองใหม่อีกครั้ง";
  }
  return "เรียกใช้ AI ไม่สำเร็จ: " + (err && err.message ? err.message : String(err));
}

// ── Feature 1: ให้ AI ช่วยจัดประเภทการลา (หน้า new-leave-request.html) ──────

(function ตั้งค่าปุ่มจัดประเภทด้วยAI() {
  var ปุ่ม = document.getElementById("btn-ai-classify");
  if (!ปุ่ม) return;   // หน้านี้ไม่มีปุ่มนี้ (เช่นหน้ารายละเอียดใบลา) ไม่ต้องทำอะไร

  var ช่องเหตุผล = document.getElementById("reason");
  var ช่องประเภท = document.getElementById("leaveTypeId");
  var กล่องคำแนะนำ = document.getElementById("ai-hint");
  var ข้อความปุ่มปกติ = ปุ่ม.textContent;

  ปุ่ม.addEventListener("click", async function () {
    if (!ช่องเหตุผล || !ช่องประเภท) return;

    var เหตุผล = ช่องเหตุผล.value.trim();
    if (!เหตุผล) {
      alert("กรุณากรอกเหตุผลการลาก่อน แล้วค่อยให้ AI ช่วยจัดประเภทให้");
      return;
    }

    if (กล่องคำแนะนำ) hide(กล่องคำแนะนำ);

    if (ยังไม่ตั้งค่าคีย์()) {
      alert(ข้อความยังไม่ตั้งค่าคีย์);
      return;
    }

    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังให้ AI วิเคราะห์...";

    try {
      var ประเภททั้งหมด = await listLeaveTypes();
      if (!ประเภททั้งหมด || ประเภททั้งหมด.length === 0) {
        alert("ยังไม่มีประเภทการลาในระบบให้ AI เลือกเลย");
        return;
      }

      var ระบบ =
        "คุณเป็นผู้ช่วยจัดประเภทการลาให้พนักงาน หน้าที่ของคุณคือเลือกชื่อประเภทการลาที่ตรงกับ" +
        "เหตุผลที่สุด จากรายการที่กำหนดให้เท่านั้น ห้ามคิดชื่อประเภทใหม่เอง " +
        "ตอบกลับด้วยชื่อประเภทเดียว สะกดตรงตามที่ให้มาในรายการเป๊ะ ๆ ห้ามมีคำอธิบายอื่น " +
        "ห้ามมีเครื่องหมายคำพูดหรือข้อความอื่นใดนอกจากชื่อประเภทนั้น";
      var ผู้ใช้ =
        "เหตุผลการลา: " + เหตุผล + "\n\nรายการประเภทการลาที่เลือกได้ (เลือกได้เฉพาะชื่อในรายการนี้เท่านั้น):\n" +
        ประเภททั้งหมด.map(function (t) { return "- " + t.name; }).join("\n");

      var คำตอบดิบ = await เรียกโมเดล(ระบบ, ผู้ใช้);
      var คำตอบตัด = คำตอบดิบ.replace(/^["'\s]+|["'\s.]+$/g, "");

      // ต้องตรงกับประเภทที่มีอยู่จริงเท่านั้น (เทียบตรงตัวก่อน แล้วค่อยลองแบบไม่สนตัวพิมพ์เล็กใหญ่/ช่องว่างส่วนเกิน)
      var ที่ตรงกัน = ประเภททั้งหมด.find(function (t) { return t.name === คำตอบตัด; });
      if (!ที่ตรงกัน) {
        ที่ตรงกัน = ประเภททั้งหมด.find(function (t) {
          return t.name.trim().toLowerCase() === คำตอบตัด.trim().toLowerCase();
        });
      }

      if (!ที่ตรงกัน) {
        alert("AI ไม่สามารถจัดประเภทการลาที่ตรงกับรายการที่มีอยู่ได้ กรุณาเลือกประเภทด้วยตัวเอง");
        return;
      }

      ช่องประเภท.value = ที่ตรงกัน.id;   // ผู้ใช้ยังเปลี่ยนเองภายหลังได้ตามปกติ ไม่ล็อก select
      if (กล่องคำแนะนำ) show(กล่องคำแนะนำ);
    } catch (err) {
      alert(ข้อความจากError(err));
    } finally {
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความปุ่มปกติ;
    }
  });
})();

// ── Feature 2: ให้ AI สรุปใบลาให้ผู้อนุมัติ (หน้า leave-request-detail.html) ─
// ฟีเจอร์นี้อ่านอย่างเดียว ไม่เขียนอะไรลงฐานข้อมูล และไม่ยุ่งกับปุ่มอนุมัติ/ไม่อนุมัติเลย

(function ตั้งค่าปุ่มสรุปด้วยAI() {
  var ปุ่ม = document.getElementById("btn-ai-summary");
  if (!ปุ่ม) return;   // หน้านี้ไม่มีปุ่มนี้ (เช่นหน้ายื่นใบลาใหม่) ไม่ต้องทำอะไร

  var กล่องสรุป = document.getElementById("ai-summary-box");
  var ข้อความปุ่มปกติ = ปุ่ม.textContent;

  ปุ่ม.addEventListener("click", async function () {
    if (กล่องสรุป) hide(กล่องสรุป);

    if (ยังไม่ตั้งค่าคีย์()) {
      alert(ข้อความยังไม่ตั้งค่าคีย์);
      return;
    }

    var elTitle = document.getElementById("d-title");
    var elReason = document.getElementById("d-reason");
    var elType = document.getElementById("d-leaveTypeName");
    var elStart = document.getElementById("d-startDate");
    var elEnd = document.getElementById("d-endDate");
    var elRequester = document.getElementById("d-requesterName");

    var ข้อมูลใบลา = {
      title: elTitle ? elTitle.textContent.trim() : "",
      reason: elReason ? elReason.textContent.trim() : "",
      leaveTypeName: elType ? elType.textContent.trim() : "",
      startDate: elStart ? elStart.textContent.trim() : "",
      endDate: elEnd ? elEnd.textContent.trim() : "",
      requesterName: elRequester ? elRequester.textContent.trim() : ""
    };

    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังให้ AI สรุป...";

    try {
      var ระบบ =
        "คุณเป็นผู้ช่วยสรุปใบลาให้หัวหน้างานใช้ประกอบการพิจารณา ตอบเป็นภาษาไทย " +
        "ความยาว 2-3 ประโยค กระชับ ตรงประเด็น ห้ามสรุปว่าควรอนุมัติหรือไม่อนุมัติ " +
        "เป็นเพียงข้อมูลประกอบการตัดสินใจของหัวหน้างานเท่านั้น";
      var ผู้ใช้ =
        "หัวข้อ: " + ข้อมูลใบลา.title +
        "\nประเภทการลา: " + ข้อมูลใบลา.leaveTypeName +
        "\nวันที่ลา: " + ข้อมูลใบลา.startDate + " ถึง " + ข้อมูลใบลา.endDate +
        "\nผู้ขอลา: " + ข้อมูลใบลา.requesterName +
        "\nเหตุผล: " + ข้อมูลใบลา.reason;

      var สรุป = await เรียกโมเดล(ระบบ, ผู้ใช้);

      if (กล่องสรุป) {
        กล่องสรุป.innerHTML =
          '<strong>สรุปโดย AI — โปรดตรวจสอบให้ดีก่อนตัดสินใจอนุมัติ:</strong><br>' + esc(สรุป);
        show(กล่องสรุป);
      }
    } catch (err) {
      alert(ข้อความจากError(err));
    } finally {
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความปุ่มปกติ;
    }
  });
})();
