
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "rates.json");

const defaultRates = [
  { type: "Copper", quality: "Mixed Copper", price: 650 },
  { type: "Aluminium", quality: "Aluminium Scrap", price: 150 }
];

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname));

function readRates() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Rates read error:", error.message);
  }
  return defaultRates;
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

  return `${payload}.${signature}`;
}

function requireAdmin(req, res, next) {
  const token = req.headers.cookie
    ?.split("; ")
    .find(item => item.startsWith("admin_session="))
    ?.slice("admin_session=".length);

  if (!token || !process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Please log in" });
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update(parts[0])
    .digest("base64url");

  if (!safeEqual(parts[1], expected)) {
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    const data = JSON.parse(
      Buffer.from(parts[0], "base64url").toString()
    );

    if (
      data.expires < Date.now() ||
      data.username !== process.env.ADMIN_USERNAME
    ) {
      return res.status(401).json({ error: "Session expired" });
    }

    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Admin settings missing" });
  }

  if (
    !safeEqual(username || "", process.env.ADMIN_USERNAME) ||
    !safeEqual(password || "", process.env.ADMIN_PASSWORD)
  ) {
    return res.status(401).json({
      error: "Incorrect username or password"
    });
  }

  res.setHeader(
    "Set-Cookie",
    `admin_session=${makeToken(username)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  );

  res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );
  res.json({ success: true });
});

app.get("/api/rates", (req, res) => {
  res.json(readRates());
});

app.put("/api/admin/rates", requireAdmin, (req, res) => {
  const rates = req.body.rates;

  if (!Array.isArray(rates) || rates.length > 100) {
    return res.status(400).json({ error: "Invalid rates" });
  }

  for (const rate of rates) {
    if (
      typeof rate.type !== "string" ||
      typeof rate.quality !== "string" ||
      !Number.isFinite(rate.price) ||
      rate.price < 0 ||
      rate.price > 10000000
    ) {
      return res.status(400).json({ error: "Invalid rate entry" });
    }
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(rates, null, 2));
    res.json({ success: true, rates });
  } catch (error) {
    console.error("Rates save error:", error.message);
    res.status(500).json({ error: "Could not save rates" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MudassirEarn running on port ${PORT}`);
});