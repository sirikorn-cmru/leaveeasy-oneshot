// ─────────────────────────────────────────────────────────────
// เคสที่ 5 — ผู้ขอลาคนหนึ่ง เปิดใบลาของผู้ขอลาอีกคนไม่ได้ (US-08)
// 6 ขั้นตอน · ผ่าน = เปิดไม่ได้
//
// ต้องใช้บัญชี employee 2 คน ห้ามใช้ manager/hr แทนคนที่สอง
// เพราะ manager/hr เปิดใบลาของทุกคนได้ตามการออกแบบ
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const H = require("./helpers");

const เหตุผลที่ข้าม = H.แจ้งเหตุผลถ้ายังรันไม่ได้(["employee", "employee2"]);

test.describe("เคสที่ 5 — เปิดใบลาของผู้ขอลาอีกคนไม่ได้", () => {
  test.skip(() => !!เหตุผลที่ข้าม, เหตุผลที่ข้าม || "พร้อมรัน");

  test("employee คนที่สอง ต้องเปิดใบลาของคนแรกไม่ได้ ทั้งบนหน้าจอและที่ Rules", async ({ page }) => {
    let idใบของคนแรก = "";
    let หัวข้อใบของคนแรก = "";
    let ชื่อคนแรก = "";

    await test.step("ขั้น 1 — ล็อกอินเป็น employee คนแรก แล้วหาใบลาของตัวเอง", async () => {
      await H.ล็อกอิน(page, "employee");
      ชื่อคนแรก = (await page.locator("#nav-user").textContent()).trim();

      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");

      // เลือกเฉพาะแถวที่คอลัมน์ "ผู้ขอลา" เป็นชื่อของคนแรกจริง ๆ
      const แถวของตัวเอง = page.locator("#leave-list-body tr[data-id]", { hasText: ชื่อคนแรก }).first();
      test.skip((await แถวของตัวเอง.count()) === 0, `ไม่พบใบลาของ ${ชื่อคนแรก} ในระบบ — รัน seed หรือเคสที่ 1 ก่อน`);

      idใบของคนแรก = await แถวของตัวเอง.getAttribute("data-id");
      หัวข้อใบของคนแรก = (await แถวของตัวเอง.locator("td").nth(0).textContent()).trim();
      expect(idใบของคนแรก).toBeTruthy();
    });

    await test.step("ขั้น 2 — ออกจากระบบ", async () => {
      await H.ออกจากระบบ(page);
    });

    await test.step("ขั้น 3 — ล็อกอินเป็น employee คนที่สอง ต้องเป็นคนละคนจริง", async () => {
      await H.ล็อกอิน(page, "employee2");
      const ชื่อคนที่สอง = (await page.locator("#nav-user").textContent()).trim();
      expect(ชื่อคนที่สอง, "สองบัญชีนี้เป็นคนเดียวกัน ทดสอบข้อนี้ไม่ได้").not.toBe(ชื่อคนแรก);
    });

    await test.step("ขั้น 4 — เปิด URL ใบลาของคนแรกตรง ๆ ต้องไม่เห็นเนื้อหาใบนั้น", async () => {
      await page.goto(`/leave-request-detail.html?id=${encodeURIComponent(idใบของคนแรก)}`);
      await page.waitForLoadState("networkidle");
      const เนื้อหน้า = await page.locator("body").textContent();
      expect(เนื้อหน้า, "เห็นหัวข้อใบลาของคนอื่นบนหน้าจอ").not.toContain(หัวข้อใบของคนแรก);
    });

    // ── ขั้น 5-6 คือด่านจริง ── ขั้น 4 เป็นแค่สิ่งที่หน้าจอเลือกจะไม่แสดง
    await test.step("ขั้น 5 — อ่านเอกสารใบลานั้นด้วยสิทธิ์ของคนที่สอง ต้องโดนปฏิเสธ", async () => {
      const ผล = await H.อ่านด้วยสิทธิ์ผู้ใช้ปัจจุบัน(page, `leaveRequests/${idใบของคนแรก}`);
      expect(ผล.status, `อ่านใบลาของคนอื่นได้ (ได้ ${ผล.http})`).toBe("PERMISSION_DENIED");
    });

    await test.step("ขั้น 6 — ความเห็นใน subcollection approvals ก็ต้องอ่านไม่ได้", async () => {
      const ผล = await H.อ่านด้วยสิทธิ์ผู้ใช้ปัจจุบัน(page, `leaveRequests/${idใบของคนแรก}/approvals`);
      expect(ผล.status, `อ่านความเห็นในใบลาของคนอื่นได้ (ได้ ${ผล.http})`).toBe("PERMISSION_DENIED");
    });
  });
});
