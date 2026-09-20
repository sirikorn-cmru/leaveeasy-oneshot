// ─────────────────────────────────────────────────────────────
// เคสที่ 4 — ไม่ล็อกอินแล้วเปิดหน้ารายการ ต้องอ่านข้อมูลไม่ได้ (US-08)
// 5 ขั้นตอน · ผ่าน = เข้าไม่ได้
//
// เทสต์นี้ไม่ต้องใช้บัญชีทดสอบ ขอแค่ตั้งค่า Firebase จริงแล้วก็รันได้
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const H = require("./helpers");

const เหตุผลที่ข้าม = H.แจ้งเหตุผลถ้ายังรันไม่ได้([]);

test.describe("เคสที่ 4 — คนที่ไม่ได้ล็อกอิน ต้องอ่านข้อมูลไม่ได้เลย", () => {
  test.skip(() => !!เหตุผลที่ข้าม, เหตุผลที่ข้าม || "พร้อมรัน");

  test("เปิดหน้ารายการโดยไม่ล็อกอิน ต้องไม่เห็นข้อมูล และ Rules ต้องปฏิเสธ", async ({ page }) => {
    await test.step("ขั้น 1 — ยืนยันว่ายังไม่ได้ล็อกอิน", async () => {
      await page.goto("/login.html");
      await expect(page.locator("#nav-user")).toBeEmpty();
    });

    await test.step("ขั้น 2 — เปิดหน้ารายการตรง ๆ ต้องถูกเด้งออกและไม่มีข้อมูลโผล่", async () => {
      await page.goto("/leave-requests.html");
      await page.waitForURL(/login/, { timeout: 20_000 });
      await expect(page.locator("#leave-list-body tr[data-id]")).toHaveCount(0);
    });

    await test.step("ขั้น 3 — เปิดหน้ารายละเอียดตรง ๆ ก็ต้องถูกเด้งออกเหมือนกัน", async () => {
      await page.goto("/leave-request-detail.html?id=lr001");
      await page.waitForURL(/login/, { timeout: 20_000 });
      const เนื้อหน้า = await page.locator("body").textContent();
      expect(เนื้อหน้า).not.toContain("ลาพักร้อน");
    });

    // ── ขั้น 4-5 คือด่านจริง ──
    // ขั้น 2-3 ข้างบนเป็นแค่ยามฝั่งเบราว์เซอร์ (js/nav.js) ซึ่งใครก็ข้ามได้
    // ถ้า Rules ยังไม่ถูก Publish ขั้น 4-5 จะไม่ผ่าน ถึงขั้น 2-3 จะผ่านก็ตาม
    await test.step("ขั้น 4 — ยิงอ่าน leaveRequests ตรงไปที่ Firestore ต้องโดนปฏิเสธ", async () => {
      const ผล = await H.อ่านแบบไม่ล็อกอิน(page, "leaveRequests");
      expect(ผล.status, `อ่านได้โดยไม่ล็อกอิน (ได้ ${ผล.http}) — Rules ยังไม่ถูกบังคับใช้`).toBe("PERMISSION_DENIED");
    });

    await test.step("ขั้น 5 — users และ leaveTypes ก็ต้องโดนปฏิเสธเหมือนกัน", async () => {
      for (const คอลเลกชัน of ["users", "leaveTypes"]) {
        const ผล = await H.อ่านแบบไม่ล็อกอิน(page, คอลเลกชัน);
        expect(ผล.status, `${คอลเลกชัน} อ่านได้โดยไม่ล็อกอิน (ได้ ${ผล.http})`).toBe("PERMISSION_DENIED");
      }
    });
  });
});
