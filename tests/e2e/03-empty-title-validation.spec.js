// ─────────────────────────────────────────────────────────────
// เคสที่ 3 — เว้นช่องหัวข้อไว้แล้วกดบันทึก ระบบต้องไม่บันทึกและต้องเตือน
// 6 ขั้นตอน
//
// หมายเหตุ: เกณฑ์การยอมรับ US-02 ใน leaveeasy-spec.md ไม่ได้เขียนข้อนี้ไว้ตรง ๆ
// แต่โค้ดจริงตรวจให้อยู่แล้ว (js/new-leave-request.js:61) เทสต์นี้จึงเป็นการ
// "ล็อกพฤติกรรมที่มีอยู่" ไม่ให้หายไปตอนแก้โค้ดรอบหลัง
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const H = require("./helpers");

const เหตุผลที่ข้าม = H.แจ้งเหตุผลถ้ายังรันไม่ได้(["employee"]);

test.describe("เคสที่ 3 — เว้นช่องหัวข้อแล้วกดบันทึก", () => {
  test.skip(() => !!เหตุผลที่ข้าม, เหตุผลที่ข้าม || "พร้อมรัน");

  test("ต้องไม่บันทึก ต้องขึ้นข้อความเตือน และต้องอยู่หน้าเดิม", async ({ page }) => {
    const เหตุผลการลา = "ทดสอบระบบโดยผู้ทดสอบ ไม่ใช่เหตุผลการลาจริง";
    let จำนวนแถวเดิม = 0;
    let หัวข้อแถวบนสุดเดิม = "";

    await test.step("ขั้น 1 — ล็อกอินด้วยบัญชี employee", async () => {
      await H.ล็อกอิน(page, "employee");
    });

    await test.step("ขั้น 2 — จดจำนวนแถวและหัวข้อแถวบนสุดไว้เป็น baseline", async () => {
      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");
      const แถว = page.locator("#leave-list-body tr[data-id]");
      จำนวนแถวเดิม = await แถว.count();
      หัวข้อแถวบนสุดเดิม =
        จำนวนแถวเดิม > 0 ? (await แถว.first().locator("td").nth(0).textContent()).trim() : "";
    });

    await test.step("ขั้น 3 — เปิดหน้ายื่นใบลา รอให้ dropdown ประเภทโหลดเสร็จ", async () => {
      await page.goto("/new-leave-request.html");
      await page.waitForFunction(() => {
        const s = document.getElementById("leaveTypeId");
        return s && Array.from(s.options).some((o) => o.value);
      }, null, { timeout: 15_000 });
    });

    await test.step("ขั้น 4 — กรอกทุกช่องยกเว้นหัวข้อ แล้วกดบันทึก", async () => {
      await page.fill("#title", "");                      // เว้นว่างไว้ตามโจทย์
      await page.fill("#reason", เหตุผลการลา);
      await page.fill("#startDate", "2026-10-05");
      await page.fill("#endDate", "2026-10-06");
      await page.evaluate(() => {
        const s = document.getElementById("leaveTypeId");
        s.value = Array.from(s.options).find((o) => o.value).value;
        s.dispatchEvent(new Event("change", { bubbles: true }));
      });

      await expect(page.locator("#title")).toHaveValue("");  // ยืนยันว่าว่างจริงก่อนกด
      await page.click("#btn-save");
    });

    await test.step("ขั้น 5 — ต้องขึ้นข้อความเตือน และต้องยังอยู่หน้าเดิม ไม่เด้งไปไหน", async () => {
      const กล่องเตือน = page.locator("#form-error");
      await expect(กล่องเตือน).toBeVisible({ timeout: 10_000 });
      await expect(กล่องเตือน).not.toBeEmpty();
      // ข้อความต้องเป็นภาษาไทยที่คนอ่านรู้เรื่อง ไม่ใช่ error ดิบของระบบ
      await expect(กล่องเตือน).toContainText("กรอกไม่ครบ");
      // ถ้าเด้งไปหน้ารายการแปลว่าบันทึกไปแล้ว = ไม่ผ่าน
      expect(page.url()).toMatch(/new-leave-request/);
    });

    await test.step("ขั้น 6 — กลับไปหน้ารายการ ต้องไม่มีใบใหม่เกิดขึ้น", async () => {
      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");
      const แถว = page.locator("#leave-list-body tr[data-id]");
      await expect(แถว).toHaveCount(จำนวนแถวเดิม);
      if (จำนวนแถวเดิม > 0) {
        await expect(แถว.first().locator("td").nth(0)).toHaveText(หัวข้อแถวบนสุดเดิม);
      }
    });
  });
});
