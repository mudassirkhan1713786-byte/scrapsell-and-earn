const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA, "utf8")); }
  catch { return { rates: [
    { id: 1, name: "Pure Copper Wire", category: "Copper", rate: "" },
    { id: 2, name: "Mixed Copper Scrap", category: "Copper", rate: "" },
    { id: 3, name: "Copper Cable Scrap", category: "Copper", rate: "" },
    { id: 4, name: "Aluminium Wire Scrap", category: "Aluminium", rate: "" },
    { id: 5, name: "Mixed Aluminium Scrap", category: "Aluminium", rate: "" }
  ], enquiries: [] }; }
}
function writeData(data) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2)); }
function admin(req, res, next) {
  const token = req.headers["x-admin-password"];
  if (!token || token !== ADMIN_PASSWORD) return res.status(401).json({ error: "Admin password incorrect." });
  next();
}
app.get("/api/rates", (req, res) => res.json(readData().rates));
app.post("/api/enquiries", (req, res) => {
  const { name, phone, location, material, quantity, details } = req.body || {};
  if (![name, phone, location, material, quantity].every(v => String(v || "").trim())) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }
  const data = readData();
  const enquiry = { id: Date.now(), name, phone, location, material, quantity, details: details || "", status: "Pending", createdAt: new Date().toISOString() };
  data.enquiries.unshift(enquiry);
  writeData(data);
  res.status(201).json({ ok: true, enquiryId: enquiry.id });
});
app.post("/api/admin/login", (req, res) => {
  if ((req.body || {}).password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Password incorrect." });
  res.json({ ok: true });
});
app.get("/api/admin/data", admin, (req, res) => res.json(readData()));
app.put("/api/admin/rates", admin, (req, res) => {
  const data = readData();
  if (!Array.isArray(req.body.rates)) return res.status(400).json({ error: "Invalid rates." });
  data.rates = req.body.rates.map((r, i) => ({ id: Number(r.id) || i + 1, name: String(r.name || "").slice(0, 80), category: String(r.category || "").slice(0, 40), rate: String(r.rate || "").slice(0, 30) }));
  writeData(data); res.json({ ok: true });
});
app.put("/api/admin/enquiries/:id", admin, (req, res) => {
  const data = readData();
  const item = data.enquiries.find(e => String(e.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: "Enquiry not found." });
  const allowed = ["Pending", "Contacted", "Purchased", "Cancelled"];
  if (allowed.includes(req.body.status)) item.status = req.body.status;
  writeData(data); res.json({ ok: true });
});
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ScrapSell & Earn running on port ${PORT}`));