/**
 * Build final DB schema by replaying migrations (createTable / addColumn / removeColumn / renameColumn).
 * Outputs Mermaid erDiagram to docs/erd.md
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const migDir = path.join(root, "migrations");
const files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".js"))
  .sort();

/** @type {Map<string, Map<string, object>>} */
const tables = new Map();

function typeToStr(raw) {
  if (!raw) return "UNKNOWN";
  let s = raw.replace(/\s+/g, " ").trim();
  // ENUM with values
  const enumM = s.match(/(?:Sequelize|DataTypes)\.ENUM\s*\(([\s\S]*)\)\s*$/);
  if (enumM) {
    const vals = [...enumM[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
    return vals.length ? `ENUM(${vals.join("|")})` : "ENUM";
  }
  const m = s.match(/(?:Sequelize|DataTypes)\.(\w+)(?:\(([^)]*)\))?/);
  if (!m) return "UNKNOWN";
  const name = m[1];
  const args = (m[2] || "").trim();
  if (args) return `${name}(${args})`;
  return name;
}

function parseColumnBlock(block) {
  // type may be multiline ENUM
  let type = "UNKNOWN";
  const typeIdx = block.search(/type:\s*/);
  if (typeIdx >= 0) {
    const after = block.slice(typeIdx + "type:".length).replace(/^\s*/, "");
    if (/^(?:Sequelize|DataTypes)\.ENUM\s*\(/.test(after)) {
      // find matching paren
      const p0 = after.indexOf("(");
      let depth = 0;
      let end = p0;
      for (; end < after.length; end++) {
        if (after[end] === "(") depth++;
        else if (after[end] === ")") {
          depth--;
          if (depth === 0) {
            end++;
            break;
          }
        }
      }
      type = typeToStr(after.slice(0, end));
    } else {
      const tm = after.match(/^((?:Sequelize|DataTypes)\.[\w.]+(?:\([^)]*\))?)/);
      if (tm) type = typeToStr(tm[1]);
    }
  }
  const pk = /primaryKey:\s*true/.test(block);
  const unique = /unique:\s*true/.test(block);
  const allowNull = !/allowNull:\s*false/.test(block);
  let ref = null;
  const refMatch = block.match(
    /references:\s*\{[\s\S]*?model:\s*['"]([^'"]+)['"][\s\S]*?key:\s*['"]([^'"]+)['"]/
  );
  if (refMatch) ref = `${refMatch[1]}.${refMatch[2]}`;
  return { type, pk, unique, allowNull, ref };
}

function ensureTable(name) {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name);
}

function extractBalanced(src, startIdx, openCh, closeCh) {
  if (src[startIdx] !== openCh) return null;
  let depth = 0;
  let inStr = null;
  let escape = false;
  for (let i = startIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      inStr = c;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return null;
}

function extractObjectLiteral(src, startIdx) {
  return extractBalanced(src, startIdx, "{", "}");
}

function parseColumnsFromTableLiteral(lit) {
  const cols = new Map();
  const inner = lit.slice(1, -1);
  let i = 0;
  while (i < inner.length) {
    // skip whitespace and comments
    while (i < inner.length) {
      if (/\s/.test(inner[i])) {
        i++;
        continue;
      }
      if (inner.startsWith("//", i)) {
        const nl = inner.indexOf("\n", i);
        i = nl < 0 ? inner.length : nl + 1;
        continue;
      }
      if (inner.startsWith("/*", i)) {
        const end = inner.indexOf("*/", i + 2);
        i = end < 0 ? inner.length : end + 2;
        continue;
      }
      break;
    }
    if (i >= inner.length) break;

    const km = inner.slice(i).match(/^([A-Za-z_][\w]*)\s*:\s*/);
    if (!km) {
      i++;
      continue;
    }
    const name = km[1];
    i += km[0].length;
    if (inner[i] !== "{") {
      // skip non-object values
      const comma = inner.indexOf(",", i);
      i = comma < 0 ? inner.length : comma + 1;
      continue;
    }
    const block = extractObjectLiteral(inner, i);
    if (!block) break;
    cols.set(name, parseColumnBlock(block));
    i += block.length;
    while (i < inner.length && /[\s,]/.test(inner[i])) i++;
  }
  return cols;
}

/** Extract only the `up` function body (supports async up / up: async (...) =>). */
function getUpBody(src) {
  // Patterns:
  //   async up(queryInterface, Sequelize) {
  //   up: async (queryInterface, Sequelize) => {
  //   async up (queryInterface, Sequelize) {
  const patterns = [
    /(?:async\s+)?up\s*\([^)]*\)\s*\{/,
    /up\s*:\s*async\s*\([^)]*\)\s*=>\s*\{/,
    /up\s*:\s*async\s+\w+\s*=>\s*\{/,
    /up\s*:\s*async\s*function\s*\([^)]*\)\s*\{/,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (!m) continue;
    const braceIdx = src.indexOf("{", m.index);
    const body = extractObjectLiteral(src, braceIdx);
    if (body) return body;
  }
  return null;
}

function processCreateTable(src) {
  const re = /queryInterface\.createTable\(\s*['"]([^'"]+)['"]\s*,/g;
  let m;
  while ((m = re.exec(src))) {
    const table = m[1];
    let idx = m.index + m[0].length;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    if (src[idx] !== "{") continue;
    const lit = extractObjectLiteral(src, idx);
    if (!lit) continue;
    const cols = parseColumnsFromTableLiteral(lit);
    const t = ensureTable(table);
    for (const [k, v] of cols) t.set(k, v);
  }
}

function processAddColumn(src) {
  const re =
    /queryInterface\.addColumn\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,/g;
  let m;
  while ((m = re.exec(src))) {
    const table = m[1];
    const col = m[2];
    let idx = m.index + m[0].length;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    if (src[idx] !== "{") continue;
    const lit = extractObjectLiteral(src, idx);
    if (!lit) continue;
    ensureTable(table).set(col, parseColumnBlock(lit));
  }
}

function processRenameColumn(up) {
  const re =
    /queryInterface\.renameColumn\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(up))) {
    const [, table, from, to] = m;
    const t = tables.get(table);
    if (!t || !t.has(from)) continue;
    const def = t.get(from);
    t.delete(from);
    t.set(to, def);
  }
}

function processChangeColumn(up) {
  const re =
    /queryInterface\.changeColumn\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,/g;
  let m;
  while ((m = re.exec(up))) {
    const table = m[1];
    const col = m[2];
    let idx = m.index + m[0].length;
    while (idx < up.length && /\s/.test(up[idx])) idx++;
    if (up[idx] !== "{") continue;
    const lit = extractObjectLiteral(up, idx);
    if (!lit) continue;
    const t = ensureTable(table);
    const prev = t.get(col) || {
      type: "UNKNOWN",
      pk: false,
      unique: false,
      allowNull: true,
      ref: null,
    };
    const next = parseColumnBlock(lit);
    t.set(col, {
      type: next.type !== "UNKNOWN" ? next.type : prev.type,
      pk: next.pk || prev.pk,
      unique: /unique:/.test(lit) ? next.unique : prev.unique,
      allowNull: /allowNull:/.test(lit) ? next.allowNull : prev.allowNull,
      ref: next.ref || prev.ref,
    });
  }
}

function processRemoveColumnUp(up) {
  const re =
    /queryInterface\.removeColumn\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(up))) {
    const t = tables.get(m[1]);
    if (t) t.delete(m[2]);
  }
}

function processDropTable(up) {
  const re = /queryInterface\.dropTable\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(up))) tables.delete(m[1]);
}

/** Handle addColumn inside loops over a columns object. */
function processLoopAddColumns(up) {
  // Pattern A: Object.entries({ col: {...}, ... })
  const inlineRe =
    /for\s*\(\s*const\s*\[\s*\w+\s*,\s*\w+\s*\]\s*of\s*Object\.entries\s*\(\s*\{/g;
  let m;
  while ((m = inlineRe.exec(up))) {
    const after = up.slice(m.index, m.index + 2500);
    const tableM = after.match(
      /queryInterface\.addColumn\(\s*['"]([^'"]+)['"]/
    );
    if (!tableM) continue;
    const table = tableM[1];
    const braceStart = up.indexOf("{", m.index + m[0].length - 1);
    const lit = extractObjectLiteral(up, braceStart);
    if (!lit) continue;
    const cols = parseColumnsFromTableLiteral(lit);
    const t = ensureTable(table);
    for (const [k, v] of cols) t.set(k, v);
  }

  // Pattern B: const columns = { ... }; for (...) addColumn(table, name, definition)
  const varRe =
    /(?:const|let|var)\s+(\w+)\s*=\s*\{/g;
  while ((m = varRe.exec(up))) {
    const varName = m[1];
    if (!/columns?|defs?|fields?/i.test(varName)) continue;
    const braceStart = m.index + m[0].length - 1;
    const lit = extractObjectLiteral(up, braceStart);
    if (!lit) continue;
    const afterObj = up.slice(braceStart + lit.length, braceStart + lit.length + 800);
    if (!new RegExp(`Object\\.entries\\(\\s*${varName}\\s*\\)`).test(afterObj) &&
        !new RegExp(`of\\s+Object\\.entries\\(\\s*${varName}`).test(up.slice(m.index, m.index + 2000))) {
      // still require addColumn nearby using that loop
      if (!up.slice(m.index, m.index + 2500).includes("addColumn")) continue;
    }
    const near = up.slice(m.index, m.index + 2500);
    const tableM = near.match(
      /queryInterface\.addColumn\(\s*['"]([^'"]+)['"]/
    );
    if (!tableM) continue;
    const cols = parseColumnsFromTableLiteral(lit);
    const t = ensureTable(tableM[1]);
    for (const [k, v] of cols) t.set(k, v);
  }
}

/** Manual patches for raw SQL migrations the parser cannot infer. */
function applyManualPatches() {
  const tx = tables.get("transactions");
  if (tx && tx.has("status")) {
    const st = tx.get("status");
    st.type = "ENUM(draft|submitted|in_progress|completed|rejected)";
  }
}

const skipped = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(migDir, f), "utf8");
  const up = getUpBody(src);
  if (!up) {
    skipped.push(f);
    continue;
  }
  processCreateTable(up);
  processAddColumn(up);
  processLoopAddColumns(up);
  processChangeColumn(up);
  processRenameColumn(up);
  processRemoveColumnUp(up);
  processDropTable(up);
}

applyManualPatches();

function mermaidSafe(name) {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function mermaidType(def) {
  const t = def.type || "UNKNOWN";
  if (t.startsWith("ENUM")) return "ENUM";
  // STRING(100) -> STRING_100, keep readable
  return t.replace(/[()]/g, "_").replace(/_+$/, "") || "UNKNOWN";
}

function attrLine(name, def) {
  const keys = [];
  if (def.pk) keys.push("PK");
  if (def.ref) keys.push("FK");
  if (def.unique && !def.pk) keys.push("UK");
  const keyStr = keys.length ? ` ${keys.join(",")}` : "";
  const nullStr = def.allowNull ? "" : ' "NN"';
  return `    ${mermaidType(def)} ${name}${keyStr}${nullStr}`;
}

const DOMAINS = {
  "المستخدمون والصلاحيات": [
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "user_role_assignments",
    "organization_department_roles",
    "organizations",
    "departments",
    "locations",
    "typeLocation",
    "otp_codes",
    "refresh_tokens",
    "auth_challenges",
    "auth_pin_sessions",
    "user_key",
    "user_device_tokens",
    "audit_logs",
    "notifications",
  ],
  "العمليات والمراحل": [
    "type_trans",
    "process_definitions",
    "stages",
    "stage_configs",
    "stage_assignments",
    "process_instances",
    "process_instance_stage",
  ],
  "المعاملات والتوقيع": [
    "transactions",
    "document_instance",
    "document_signature",
    "document_templates",
    "document_final_transactions",
    "digital_signature",
    "signature_verification",
    "transaction_signing_challenges",
    "transaction_signature_links",
    "pending_file_uploads",
    "outbox_events",
  ],
  "حقول النماذج (Widgets)": [
    "type_docs",
    "text_fields",
    "text_dropdowns",
    "radio_groups",
    "check_lists",
    "date_pickers",
    "file_pickers",
  ],
  "المواعيد والتطبيقات": [
    "appointment_slots",
    "appointment_bookings",
    "applications",
    "app_versions",
  ],
};

function emitErDiagram(tableNames) {
  const out = ["```mermaid", "erDiagram"];
  const rels = new Set();
  const set = new Set(tableNames);
  for (const table of tableNames) {
    if (!tables.has(table)) continue;
    const alias = mermaidSafe(table);
    out.push(`  ${alias} {`);
    for (const [col, def] of tables.get(table)) {
      out.push(attrLine(col, def));
      if (def.ref) {
        const [rt] = def.ref.split(".");
        if (set.has(rt) || set.has(mermaidSafe(rt))) {
          rels.add(`  ${mermaidSafe(rt)} ||--o{ ${alias} : "${col}"`);
        }
      }
    }
    out.push("  }");
    out.push("");
  }
  for (const r of [...rels].sort()) out.push(r);
  out.push("```");
  return out;
}

const sorted = [...tables.keys()].sort();
const lines = [];
lines.push("# ERD — مخطط قاعدة البيانات");
lines.push("");
lines.push(
  "> مُولَّد تلقائياً من ملفات `migrations/` (الحالة النهائية بعد تطبيق كل الـ migrations)."
);
lines.push(`> عدد الجداول: **${sorted.length}**`);
lines.push("");
lines.push(
  "كل جدول يعرض **كل الـ attributes** كما ظهرت في الـ migrations (النوع، Nullability، PK/FK/UK)."
);
lines.push("");
lines.push("## مخططات ERD حسب المجال");
lines.push("");

const covered = new Set();
for (const [title, names] of Object.entries(DOMAINS)) {
  const existing = names.filter((n) => tables.has(n));
  existing.forEach((n) => covered.add(n));
  lines.push(`### ${title}`);
  lines.push("");
  lines.push(...emitErDiagram(existing));
  lines.push("");
}

const leftover = sorted.filter((t) => !covered.has(t));
if (leftover.length) {
  lines.push("### جداول أخرى");
  lines.push("");
  lines.push(...emitErDiagram(leftover));
  lines.push("");
}

lines.push("## مخطط شامل (كل الجداول)");
lines.push("");
lines.push(...emitErDiagram(sorted));
lines.push("");
lines.push("## الجداول والسمات (تفصيلي)");
lines.push("");

for (const table of sorted) {
  lines.push(`### \`${table}\``);
  lines.push("");
  lines.push("| Attribute | Type | Null | Key | References |");
  lines.push("|---|---|---|---|---|");
  for (const [col, def] of tables.get(table)) {
    const key = [
      def.pk ? "PK" : "",
      def.ref ? "FK" : "",
      def.unique && !def.pk ? "UK" : "",
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `| \`${col}\` | ${def.type} | ${def.allowNull ? "YES" : "NO"} | ${key || "—"} | ${def.ref ? `\`${def.ref}\`` : "—"} |`
    );
  }
  lines.push("");
}

const outPath = path.join(root, "docs", "erd.md");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log("Wrote", outPath);
console.log("Tables:", sorted.length);
console.log("Skipped:", skipped.length ? skipped.join(", ") : "none");
for (const t of sorted) console.log(`  ${t} (${tables.get(t).size})`);
