const fs = require("fs");

// Minimal RFC-4180 style CSV parser (quotes, escaped quotes, CRLF, BOM).
// Avoids adding a dependency for a two-column file.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  return rows;
};

// Reads the student CSV. Accepts header `rollno` or `roll_no` (any case).
// roll numbers are kept as STRINGS.
const readStudentCsv = (filePath) => {
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));

  if (rows.length === 0) {
    throw new Error("CSV file is empty");
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const rollIndex = header.findIndex((h) => h === "rollno" || h === "roll_no");
  const nameIndex = header.indexOf("name");

  if (rollIndex === -1 || nameIndex === -1) {
    throw new Error(
      `CSV header must contain a roll number column (rollno/roll_no) and "name". Found: ${header.join(", ")}`
    );
  }

  return rows.slice(1).map((row, index) => ({
    line: index + 2,
    roll_no: (row[rollIndex] || "").trim(),
    name: (row[nameIndex] || "").trim(),
  }));
};

// 210029010016 -> ********0016 (avoid printing full identifiers in logs)
const maskRoll = (rollNo) =>
  String(rollNo).length > 4
    ? "*".repeat(String(rollNo).length - 4) + String(rollNo).slice(-4)
    : "****";

module.exports = { parseCsv, readStudentCsv, maskRoll };