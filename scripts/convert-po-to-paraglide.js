import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = process.cwd();
const sourceRoot = path.resolve(repoRoot, "..", "sandbox", "easy-btu-timetable");
const enPo = path.join(sourceRoot, "src", "locales", "en", "messages.po");
const kaPo = path.join(sourceRoot, "src", "locales", "ka", "messages.po");
const outDir = path.join(repoRoot, "messages");

function readPoString(line) {
  const firstQuote = line.indexOf('"');
  if (firstQuote === -1) return "";
  const raw = line.slice(firstQuote);
  return JSON.parse(raw);
}

function parsePo(content) {
  const entries = new Map();
  let msgid = null;
  let msgstr = null;
  let state = null;

  function commit() {
    if (msgid && msgid.length > 0) {
      entries.set(msgid, msgstr ?? "");
    }
  }

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("msgid ")) {
      commit();
      msgid = readPoString(line);
      msgstr = "";
      state = "msgid";
      continue;
    }
    if (line.startsWith("msgstr ")) {
      msgstr = readPoString(line);
      state = "msgstr";
      continue;
    }
    if (line.startsWith('"')) {
      if (state === "msgid") msgid += readPoString(line);
      if (state === "msgstr") msgstr += readPoString(line);
    }
  }
  commit();
  return entries;
}

function hashId(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 6);
}

function makeKey(msgid, used) {
  const base = msgid
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const trimmed = base.length > 60 ? base.slice(0, 60) : base;
  let key = trimmed ? `msg_${trimmed}` : "msg";
  if (base.length > 60) {
    key = `${key}_${hashId(msgid)}`;
  }
  if (used.has(key)) {
    key = `${key}_${hashId(msgid)}`;
  }
  used.add(key);
  return key;
}

function buildJson(entries, idMap) {
  const out = {};
  for (const [msgid, msgstr] of entries.entries()) {
    const key = idMap.get(msgid);
    if (key) out[key] = msgstr;
  }
  return out;
}

const enEntries = parsePo(fs.readFileSync(enPo, "utf8"));
const kaEntries = parsePo(fs.readFileSync(kaPo, "utf8"));

const usedKeys = new Set();
const idMap = new Map();
for (const msgid of enEntries.keys()) {
  idMap.set(msgid, makeKey(msgid, usedKeys));
}

const enJson = buildJson(enEntries, idMap);
const kaJson = buildJson(kaEntries, idMap);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "en.json"), JSON.stringify(enJson, null, 2));
fs.writeFileSync(path.join(outDir, "ka.json"), JSON.stringify(kaJson, null, 2));

console.log(`Wrote ${Object.keys(enJson).length} messages to ${outDir}`);
