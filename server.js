const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "rates.json");
const ENQUIRIES_FILE = path.join(__dirname, "enquiries.json");

const defaultRates = [
  { id: 1, name: "Pure Copper Wire", category: "Copper", rate: "" },
  { id: 2, name: "Mixed Copper Scrap", category: "Copper", rate: "" },
  { id: 3, name: "Copper Cable Scrap", category: "Copper", rate: "" },
  { id: 4, name: "Aluminium Wire Scrap", category: "Aluminium", rate: "" },
  { id: 5, name: "Mixed Aluminium Scrap", category: "Aluminium", rate: "" }
];

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname));

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (error) {
    console.error("Read error:", error.message);
  }
  return fallback;
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readRates() {
  const rates = readJson(DATA_FILE, defaultRates);
  return Array.isArray(rates) && rates.length ? rates : defaultRates;
}

function readEnquiries() {
  const data = readJson(ENQUIRIES_FILE, []);
  return Array.isArray(data) ? data : [];
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function makeToken(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expires: Date.now() + 8 * 60 * 60 * 1000
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update(payload)
    .digest("base64url");

  return payload + "." + signature;
}

function getToken(req) {
  const cookies = req.headers.cookie || "";
  const item = cookies.split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("admin_session="));

  return item ? item.slice("admin_session=".length) : "";
}

function requireAdmin(req, res, next) {
  const token = getToken(req);

  if (!token || !process.env.ADMIN_PASSWORD ||
      !process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: "Please log in again." });
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update(parts[0])
    .digest("base64url");

  if (!safeEqual(parts[1], expected)) {
    return res.status(401).json({ error: "Invalid session." });
  }

  try {
    const data = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8")
    );

    if (data.expires < Date.now() ||
        data.username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ error: "Session expired." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid session." });
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "MudassirEarn" });
});

app.get("/api/rates", (req, res) => {
  res.json(readRates());
});

app.post("/api/admin/login", (req, res) => {
  const username = req.body.username || process.env.ADMIN_USERNAME;
  const password = req.body.password || "";

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Admin settings missing" });
  }

  if (!safeEqual(username, process.env.ADMIN_USERNAME) ||
      !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({
      error: "Incorrect username or password."
    });
  }

  res.setHeader(
    "Set-Cookie",
    `admin_session=${makeToken(username)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
  );

  res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
  res.json({ success: true });
});

app.post("/api/enquiries", (req, res) => {
  try {
    const body = req.body || {};

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const material = String(body.material || body.scrapType || "").trim();
    const quantity = String(body.quantity || "").trim();
    const location = String(body.location || body.address || "").trim();
    const details = String(body.details || body.message || "").trim();

    if (!name || !phone || !material || !quantity || !location) {
      return res.status(400).json({
        error: "Please fill in all required fields."
      });
    }

    const enquiries = readEnquiries();

    const enquiry = {
      id: crypto.randomUUID(),
      name: name.slice(0, 100),
      phone: phone.slice(0, 20),
      material: material.slice(0, 100),
      quantity: quantity.slice(0, 100),
      location: location.slice(0, 300),
      details: details.slice(0, 1000),
      createdAt: new Date().toISOString(),
      status: "Pending"
    };

    enquiries.push(enquiry);
    saveJson(ENQUIRIES_FILE, enquiries);

    res.status(201).json({
      success: true,
      enquiryId: enquiry.id,
      message: "Enquiry submitted successfully."
    });
  } catch (error) {
    console.error("Enquiry save error:", error.message);
    res.status(500).json({
      error: "Enquiry could not be saved. Please try again."
    });
  }
});

app.get("/api/admin/data", requireAdmin, (req, res) => {
  res.json({
    rates: readRates(),
    enquiries: readEnquiries()
  });
});

app.put("/api/admin/rates", requireAdmin, (req, res) => {
  try {
    const rates = req.body.rates;

    if (!Array.isArray(rates) || rates.length > 100) {
      return res.status(400).json({ error: "Invalid rates." });
    }

    for (const rate of rates) {
      if (!Number.isFinite(Number(rate.id)) ||
          typeof rate.name !== "string" ||
          typeof rate.category !== "string" ||
          typeof rate.rate !== "string") {
        return res.status(400).json({ error: "Invalid rate entry." });
      }
    }

    saveJson(DATA_FILE, rates);
    res.json({ success: true, rates });
  } catch (error) {
    console.error("Rate save error:", error.message);
    res.status(500).json({ error: "Could not save rates." });
  }
});

app.put("/api/admin/enquiries/:id", requireAdmin, (req, res) => {
  try {
    const allowed = ["Pending", "Contacted", "Purchased", "Cancelled"];
    const status = req.body.status;

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const enquiries = readEnquiries();
    const index = enquiries.findIndex(item => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Enquiry not found." });
    }

    enquiries[index].status = status;
    saveJson(ENQUIRIES_FILE, enquiries);

    res.json({ success: true });
  } catch (error) {
    console.error("Status update error:", error.message);
    res.status(500).json({ error: "Could not update status." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MudassirEarn running on port ${PORT}`);
});
 