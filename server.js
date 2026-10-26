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
  return readJson(ENQUIRIES_FILE, []);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));

  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function makeToken(username) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      expires: Date.now() + 8 * 60 * 60 * 1000
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update(payload)
    .digest("base64url");

  return payload + "." + signature;
}

function getToken(req) {
  const cookies = req.headers.cookie || "";

  const item = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("admin_session="));

  return item ? item.slice("admin_session=".length) : "";
}

function requireAdmin(req, res, next) {
  const token = getToken(req);

  if (!token || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_USERNAME) {
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

    if (
      data.expires < Date.now() ||
      data.username !== process.env.ADMIN_USERNAME
    ) {
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

  if (
    !safeEqual(username, process.env.ADMIN_USERNAME) ||
    !safeEqual(password, process.env.ADMIN_PASSWORD)
  ) {
    return res.status(401).json({
      error: "Incorrect username or password."
    });
  }

  res.setHeader(
    "Set-Cookie",
    `admin_session=${makeToken(username)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
  );

  res.json({ success: