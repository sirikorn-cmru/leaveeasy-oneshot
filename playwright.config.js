// ─────────────────────────────────────────────────────────────
// playwright.config.js — ค่าตั้งค่าสำหรับรันเทสต์อัตโนมัติด้วย Playwright
//
// รันด้วย:  npm run test:e2e
// ─────────────────────────────────────────────────────────────
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  // เทสต์ 2 ไฟล์นี้ใช้ข้อมูลชุดเดียวกัน (ไฟล์ที่ยื่นในเคส 1 ถูกอนุมัติในเคส 2)
  // จึงต้องรันทีละไฟล์ตามลำดับ ห้ามขนาน
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/e2e/.report" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // เปิดเซิร์ฟเวอร์ให้เอง ถ้ามีตัวที่รันอยู่แล้วจะใช้ตัวนั้นต่อ
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
