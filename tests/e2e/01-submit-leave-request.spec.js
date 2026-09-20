// ─────────────────────────────────────────────────────────────
// เคสที่ 1 — ยื่นใบลาใหม่แล้วใบนั้นไปโผล่ในหน้ารายการ (US-02 + US-01)
// 9 ขั้นตอน ตามแผนที่ตกลงไว้
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const H = require("./helpers");

const เหตุผลที่ข้าม = H.แจ้งเหตุผลถ้ายังรันไม่ได้(["employee"]);

test.describe("เคสที่ 1 — ยื่นใบลาใหม่แล้วไปโผล่ในหน้ารายการ", () => {
  test.skip(() => !!เหตุผลที่ข้าม, เหตุผลที่ข้าม || "พร้อมรัน");

  test("ยื่นใบลาใหม่ แล้วใบนั้นต้องโผล่บนสุดของหน้ารายการ และอยู่รอดหลังรีเฟรช", async ({ page }) => {
    const หัวข้อ = H.หัวข้อไม่ซ้ำ();
    const เหตุผลการลา = "ทดสอบระบบโดยผู้ทดสอบ ไม่ใช่เหตุผลการลาจริง";
    const วันเริ่ม = "2026-10-01";
    const วันสิ้นสุด = "2026-10-02";
    let ชื่อประเภทที่เลือก = "";
    let หัวข้อเดิมทั้งหมด = [];
    let idใบใหม่ = "";

    await test.step("ขั้น 1 — ล็อกอินด้วยบัญชี employee", async () => {
      await H.ล็อกอิน(page, "employee");
      await expect(page.locator("#nav-user")).not.toBeEmpty();
    });

    await test.step("ขั้น 2 — เปิดหน้ารายการ จดหัวข้อที่มีอยู่เป็น baseline", async () => {
      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");
      หัวข้อเดิมทั้งหมด = await page.locator("#leave-list-body tr[data-id] td:nth-child(1)").allTextContents();
      expect(หัวข้อเดิมทั้งหมด).not.toContain(หัวข้อ); // กันหัวข้อชนของเดิม
    });

    await test.step("ขั้น 3 — เปิดหน้ายื่นใบลา เช็กช่องครบ 5 ช่อง และ dropdown มีตัวเลือกจริง", async () => {
      await page.goto("/new-leave-request.html");
      await expect(page.locator("#title")).toBeVisible();
      await expect(page.locator("#reason")).toBeVisible();
      await expect(page.locator("#leaveTypeId")).toBeVisible();
      await expect(page.locator("#startDate")).toBeVisible();
      await expect(page.locator("#endDate")).toBeVisible();

      // dropdown ต้องอ่านมาจากฐานข้อมูลจริง = ต้องมีตัวเลือกที่มี value ไม่ว่าง
      await page.waitForFunction(() => {
        const s = document.getElementById("leaveTypeId");
        return s && Array.from(s.options).some((o) => o.value);
      }, null, { timeout: 15_000 });

      ชื่อประเภทที่เลือก = await page.evaluate(() => {
        const s = document.getElementById("leaveTypeId");
        const ตัวเลือก = Array.from(s.options).find((o) => o.value);
        s.value = ตัวเลือก.value;
        s.dispatchEvent(new Event("change", { bubbles: true }));
        return ตัวเลือก.textContent.trim();
      });
      expect(ชื่อประเภทที่เลือก.length).toBeGreaterThan(0);
    });

    await test.step("ขั้น 4 — กรอกข้อมูลตัวอย่างแล้วกดบันทึก", async () => {
      await page.fill("#title", หัวข้อ);
      await page.fill("#reason", เหตุผลการลา);
      await page.fill("#startDate", วันเริ่ม);
      await page.fill("#endDate", วันสิ้นสุด);
      await page.click("#btn-save");
    });

    await test.step("ขั้น 5 — ต้องเด้งกลับหน้ารายการเอง", async () => {
      await page.waitForURL(/leave-requests/, { timeout: 20_000 });
    });

    await test.step("ขั้น 6 — แถวใหม่ต้องอยู่บนสุด · ป้าย 'รอพิจารณา' · ผู้ขอลาเป็นชื่อไทย", async () => {
      const แถวบนสุด = page.locator("#leave-list-body tr[data-id]").first();
      await expect(แถวบนสุด).toBeVisible({ timeout: 20_000 });

      // (ก) อยู่บนสุด — พิสูจน์ว่าค่าเริ่มต้นเรียงใหม่→เก่า (US-10)
      await expect(แถวบนสุด.locator("td").nth(0)).toHaveText(หัวข้อ);

      // (ข) ป้ายสถานะเป็น "รอพิจารณา" โดยผู้ใช้ไม่ได้เลือกเอง
      await expect(แถวบนสุด.locator("td").nth(2)).toContainText("รอพิจารณา");

      // (ค) คอลัมน์ผู้ขอลาเป็นชื่อไทย ไม่ใช่รหัสดิบอย่าง u001 หรือ uid ยาว ๆ
      const ชื่อผู้ขอลา = (await แถวบนสุด.locator("td").nth(3).textContent()).trim();
      expect(ชื่อผู้ขอลา).toMatch(/[ก-๙]/);
      expect(ชื่อผู้ขอลา).not.toMatch(/^[A-Za-z0-9]{15,}$/);

      idใบใหม่ = await แถวบนสุด.getAttribute("data-id");
      expect(idใบใหม่).toBeTruthy();
    });

    await test.step("ขั้น 7 — คลิกแถว → id ใน URL ตรง และค่าทุกช่องตรงกับที่กรอก", async () => {
      await page.locator("#leave-list-body tr[data-id]").first().click();
      await page.waitForURL(/leave-request-detail/, { timeout: 20_000 });
      expect(H.idจากURL(page.url())).toBe(idใบใหม่);

      await expect(page.locator("#d-title")).toHaveText(หัวข้อ);
      await expect(page.locator("#d-reason")).toHaveText(เหตุผลการลา);
      await expect(page.locator("#d-leaveTypeName")).toHaveText(ชื่อประเภทที่เลือก);
      await expect(page.locator("#d-status")).toContainText("รอพิจารณา");
      // วันเวลาที่ยื่นต้องเกิดขึ้นเองโดยผู้ใช้ไม่ได้กรอก
      await expect(page.locator("#d-createdAt")).not.toBeEmpty();
    });

    await test.step("ขั้น 8 — F5 หน้ารายละเอียด ข้อมูลต้องยังอยู่ครบ", async () => {
      await page.reload();
      await expect(page.locator("#d-title")).toHaveText(หัวข้อ, { timeout: 20_000 });
      await expect(page.locator("#d-reason")).toHaveText(เหตุผลการลา);
      await expect(page.locator("#d-status")).toContainText("รอพิจารณา");
    });

    await test.step("ขั้น 9 — กลับหน้ารายการแล้ว F5 แถวใหม่ต้องยังอยู่บนสุด", async () => {
      await page.goto("/leave-requests.html");
      await page.reload();
      const แถวบนสุด = page.locator("#leave-list-body tr[data-id]").first();
      await expect(แถวบนสุด.locator("td").nth(0)).toHaveText(หัวข้อ, { timeout: 20_000 });
    });
  });
});
