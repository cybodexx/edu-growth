/**
 * READ-ONLY check of the students collection against the CSV.
 * It never writes, updates or deletes anything.
 *
 * Usage (from edu-growth-backend/):
 *   node scripts/verifyStudents.js ./students.csv
 *
 * Output contains counts and masked roll numbers only (no names/passwords).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Student = require("../models/Student");
const { readStudentCsv, maskRoll } = require("./csvUtils");

const SAMPLE_SIZE = 5;

const run = async () => {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Usage: node scripts/verifyStudents.js <path-to-csv>");
    process.exit(1);
  }

  // ---- CSV side ----
  const csvRows = readStudentCsv(path.resolve(csvPath));
  const csvByRoll = new Map();
  let csvDuplicates = 0;
  let csvBlankRoll = 0;
  let csvBlankName = 0;
  let csvUnknownName = 0;

  for (const row of csvRows) {
    if (!row.roll_no) {
      csvBlankRoll += 1;
      continue;
    }
    if (!row.name) csvBlankName += 1;
    if (row.name.toLowerCase() === "unknown") csvUnknownName += 1;

    if (csvByRoll.has(row.roll_no)) {
      csvDuplicates += 1;
    } else {
      csvByRoll.set(row.roll_no, row.name);
    }
  }

  console.log("== CSV ==");
  console.log("data rows:", csvRows.length);
  console.log("unique roll numbers:", csvByRoll.size);
  console.log("duplicate roll rows:", csvDuplicates);
  console.log("blank roll rows:", csvBlankRoll);
  console.log("blank name rows:", csvBlankName);
  console.log('placeholder "Unknown" name rows:', csvUnknownName);

  // ---- Database side ----
  await mongoose.connect(process.env.MONGO_URI);
  const collection = Student.collection;

  const total = await collection.countDocuments({});
  const withStringRoll = await collection.countDocuments({
    roll_no: { $type: "string" },
  });
  const withNonStringRoll = await collection.countDocuments({
    roll_no: { $exists: true, $not: { $type: "string" } },
  });
  const withoutRoll = await collection.countDocuments({
    roll_no: { $exists: false },
  });

  const duplicateGroups = await collection
    .aggregate([
      { $match: { roll_no: { $type: "string" } } },
      { $group: { _id: "$roll_no", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1000 },
    ])
    .toArray();

  console.log("\n== DATABASE (collection: " + collection.collectionName + ") ==");
  console.log("total student documents:", total);
  console.log("with string roll_no:", withStringRoll);
  console.log("with NON-string roll_no (must be 0):", withNonStringRoll);
  console.log("without roll_no (e.g. self-registered):", withoutRoll);
  console.log("roll_no values duplicated in DB:", duplicateGroups.length);

  const dbDocs = await collection
    .find({ roll_no: { $type: "string" } })
    .project({ roll_no: 1, name: 1 })
    .toArray();

  const dbByRoll = new Map();
  for (const doc of dbDocs) {
    dbByRoll.set(doc.roll_no.trim(), (doc.name || "").trim());
  }

  const missingInDb = [];
  let nameMismatch = 0;

  for (const [roll, name] of csvByRoll) {
    if (!dbByRoll.has(roll)) {
      missingInDb.push(roll);
    } else if (dbByRoll.get(roll) !== name) {
      nameMismatch += 1;
    }
  }

  let extraInDb = 0;
  for (const roll of dbByRoll.keys()) {
    if (!csvByRoll.has(roll)) extraInDb += 1;
  }

  let dbEmptyName = 0;
  for (const name of dbByRoll.values()) {
    if (!name) dbEmptyName += 1;
  }

  console.log("\n== CSV vs DATABASE ==");
  console.log("CSV students missing from DB:", missingInDb.length);
  if (missingInDb.length) {
    console.log(
      "  sample (masked):",
      missingInDb.slice(0, SAMPLE_SIZE).map(maskRoll).join(", ")
    );
  }
  console.log("DB students (with roll_no) not in CSV:", extraInDb);
  console.log("same roll_no but different name:", nameMismatch);
  console.log("DB students with roll_no but EMPTY name (cannot log in):", dbEmptyName);

  // ---- Index state ----
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    console.log("\n(could not list indexes: " + error.message + ")");
  }

  const emailIndex = indexes.find((i) => i.name === "email_1");
  const rollIndex = indexes.find((i) => i.name === "roll_no_1");

  console.log("\n== INDEXES ==");
  console.log(
    "email_1:",
    !emailIndex
      ? "missing"
      : emailIndex.partialFilterExpression
      ? "OK (partial unique)"
      : "OLD plain unique index -> must be replaced before importing"
  );
  console.log(
    "roll_no_1:",
    !rollIndex
      ? "missing (created automatically on next server start)"
      : rollIndex.unique
      ? "OK (unique)"
      : "exists but NOT unique"
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("verifyStudents failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});