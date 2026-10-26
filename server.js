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
  fs