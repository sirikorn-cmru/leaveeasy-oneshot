// ─────────────────────────────────────────────────────────────
// เคสที่ 2 — กดอนุมัติแล้วสถานะเปลี่ยนจริง (US-04)
// 8 ขั้นตอน ตามแผนฉบับแก้
//
// ขอบเขต: รอบนี้ครอบเฉพาะทาง "อนุมัติ" เท่านั้น ไม่ครอบทาง "ไม่อนุมัติ"
// ถ้าจะครอบทาง "ไม่อนุมัติ" ต้องใช้ใบลาอีกใบแยกต่างหาก แล้วรันชุดขั้นตอนเดียวกัน
// โดยกดปุ่ม #btn-reject แทน #btn-approve
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const H = require("./helpers");

const เหตุผลที่ข้าม = H.แจ้งเหตุผลถ้ายังรันไม่ได้(["manager", "employee"]);

// ปุ่มอนุมัติ "ใช้งานได้จริง" ไหม — ถ้าหน้าไม่โหลด/ถูกเด้งออก ให้ถือว่าใช้ไม่ได้
async function ปุ่มอนุมัติกดได้ไหม(page) {
  const ปุ่ม = page.locator("#btn-approve");
  if ((await ปุ่ม.count()) === 0) return false;
  if (!(await ปุ่ม.isVisible())) return false;
  return await ปุ่ม.isEnabled();
}

test.describe("เคสที่ 2 — กดอนุมัติแล้วสถานะเปลี่ยนจริง", () => {
  test.skip(() => !!เหตุผลที่ข้าม, เหตุผลที่ข้าม || "พร้อมรัน");

  test("manager กดอนุมัติ แล้วสถานะต้องลงฐานข้อมูลจริง ช่องอื่นไม่ถูกเขียนทับ และปุ่มต้องล็อกหลังรีเฟรช", async ({ page, context }) => {
    let idใบ = "";
    let ค่าก่อนกด = {};

    await test.step("ขั้น 1 — ล็อกอินเป็น manager แล้วเปิดใบลาที่สถานะ 'รอพิจารณา'", async () => {
      await H.ล็อกอิน(page, "manager");
      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");

      const แถวรอพิจารณา = page.locator("#leave-list-body tr[data-id]", { hasText: "รอพิจารณา" }).first();
      const มีใบให้ทดสอบ = (await แถวรอพิจารณา.count()) > 0;
      test.skip(!มีใบให้ทดสอบ, "ไม่มีใบลาสถานะ 'รอพิจารณา' เหลืออยู่ในระบบ — รันเคสที่ 1 ก่อนเพื่อสร้างใบใหม่");

      idใบ = await แถวรอพิจารณา.getAttribute("data-id");
      await แถวรอพิจารณา.click();
      await page.waitForURL(/leave-request-detail/, { timeout: 20_000 });
      expect(H.idจากURL(page.url())).toBe(idใบ);
    });

    await test.step("ขั้น 2 — จด snapshot ทุกช่อง และเช็กว่าปุ่มอนุมัติ/ไม่อนุมัติยังกดได้อยู่ก่อนกด", async () => {
      await expect(page.locator("#d-status")).toContainText("รอพิจารณา", { timeout: 20_000 });
      ค่าก่อนกด = await H.อ่านค่าทุกช่อง(page);
      await expect(page.locator("#btn-approve")).toBeEnabled();
      await expect(page.locator("#btn-reject")).toBeEnabled();
    });

    await test.step("ขั้น 3 — กดอนุมัติ → ป้ายเปลี่ยนทันที และปุ่มทั้งสองกดไม่ได้ทันที", async () => {
      await page.click("#btn-approve");
      await expect(page.locator("#d-status")).toContainText("อนุมัติ", { timeout: 20_000 });
      await expect(page.locator("#d-status")).not.toContainText("รอพิจารณา");
      await expect(page.locator("#btn-approve")).toBeDisabled();
      await expect(page.locator("#btn-reject")).toBeDisabled();
    });

    await test.step("ขั้น 4 — F5 แล้วสถานะต้องยังเป็น 'อนุมัติ' (พิสูจน์ว่าลง Firestore จริง)", async () => {
      await page.reload();
      await expect(page.locator("#d-status")).toContainText("อนุมัติ", { timeout: 20_000 });
      await expect(page.locator("#d-status")).not.toContainText("รอพิจารณา");
    });

    await test.step("ขั้น 5 — หลัง F5 ปุ่มอนุมัติ/ไม่อนุมัติต้องยังกดไม่ได้", async () => {
      // แยกจากขั้น 4 โดยเจตนา — การปิดปุ่มอาจเป็นแค่ผลของ event handler ตอนคลิก
      // ถ้า logic ตอน render ไม่ได้เช็กสถานะด้วย จะกลับมากดซ้ำได้หลังโหลดหน้าใหม่
      // ซึ่งทำให้เกณฑ์ US-04 "ใบที่อนุมัติแล้วเปลี่ยนสถานะต่อไม่ได้" พังแบบมองไม่เห็น
      await expect(page.locator("#btn-approve")).toBeDisabled();
      await expect(page.locator("#btn-reject")).toBeDisabled();
    });

    await test.step("ขั้น 6 — เปิดใบเดิมจาก entry point ที่สอง (แท็บใหม่) ต้องเห็นค่าตรงกัน", async () => {
      const แท็บใหม่ = await context.newPage();
      await แท็บใหม่.goto(`/leave-request-detail.html?id=${encodeURIComponent(idใบ)}`);
      await expect(แท็บใหม่.locator("#d-status")).toContainText("อนุมัติ", { timeout: 20_000 });
      await expect(แท็บใหม่.locator("#btn-approve")).toBeDisabled();
      await แท็บใหม่.close();
    });

    await test.step("ขั้น 7 — เทียบค่าทุกช่องก่อน–หลัง ต้องเปลี่ยนแค่สถานะ", async () => {
      const ค่าหลังกด = await H.อ่านค่าทุกช่อง(page);
      for (const ช่อง of Object.keys(ค่าก่อนกด)) {
        expect(ค่าหลังกด[ช่อง], `ช่อง ${ช่อง} ถูกเขียนทับ`).toBe(ค่าก่อนกด[ช่อง]);
      }
    });

    await test.step("ขั้น 8 — ล็อกอินเป็น employee แล้วต้องกดอนุมัติใบของตัวเองไม่ได้", async () => {
      await H.ออกจากระบบ(page);
      await H.ล็อกอิน(page, "employee");

      // เปิด "ใบของตัวเอง" ไม่ใช่ใบที่ manager เลือกไว้ในขั้น 1 เพราะ manager เห็นทุกใบ
      // ใบนั้นอาจเป็นของคนอื่น พอ employee เปิดจะโดน Rules ปฏิเสธแล้วเด้งออก
      // ซึ่งเป็นคนละเรื่องกับที่ข้อนี้ต้องการพิสูจน์ (เจ้าของใบเองก็เปลี่ยนสถานะไม่ได้)
      await page.goto("/leave-requests.html");
      await page.waitForSelector("#leave-list-body tr[data-id], #leave-list-empty:not([hidden])");
      const ใบของตัวเอง = page.locator("#leave-list-body tr[data-id]").first();
      test.skip((await ใบของตัวเอง.count()) === 0, "บัญชี employee ไม่มีใบลาของตัวเองให้เปิด");

      await ใบของตัวเอง.click();
      await page.waitForURL(/leave-request-detail/, { timeout: 20_000 });
      await expect(page.locator("#d-title")).not.toBeEmpty({ timeout: 20_000 });

      await expect(page.locator("#btn-approve")).toBeDisabled();
      await expect(page.locator("#btn-reject")).toBeDisabled();
    });
  });
});
