/**
 * Safe, idempotent importer for the student roll-number CSV.
 *
 *  - DRY RUN by default. Nothing is written unless you pass --apply.
 *  - Insert-only: uses upsert with $setOnInsert keyed on roll_no, so existing
 *    students are NEVER modified, overwritten or deleted. Re-running is safe.
 *  - Roll numbers are stored as strings.
 *  - Never deletes anything and never drops indexes.
 *
 * Usage (from edu-growth-backend/):
 *   node scripts/importStudents.js ./students.csv                 # dry run
 *   node scripts/importStudents.js ./students.csv --apply         # write
 *   node scripts/importStudents.js ./students.csv --apply --unknown-as-roll
 *   node scripts/importStudents.js ./students.csv --apply --include-unknown
 *
 * By default rows whose name is blank or the placeholder "Unknown" are SKIPPED:
 * importing them would create accounts with the guessable password
 * "Unknown@123" (or "@123"). Two opt-in flags change that:
 *   --unknown-as-roll  import them with the ROLL NUMBER as the name, so the
 *                      derived password becomes "<roll_no>@123" (unique per
 *                      student). Recommended for roster rows with no real name.
 *   --include-unknown  import them with the literal name "Unknown" (they then
 *                      all share the password "Unknown@123").
 * Blank names are never imported unless --unknown-as-roll is set.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Student = require("../models/Student");
const { readStudentCsv, maskRoll } = require("./csvUtils");

const ROLL_PATTERN = /^[0-9]{4,20}$/;

// Pure function: decides what to import. Exported for testing.
const planImport = (rows, { includeUnknown = false, unknownAsRoll = false } = {}) => {
  const toImport = [];
  const seen = new Map();
  const skipped = {
    invalidRoll: [],
    blankName: [],
    unknownName: [],
    usedRollAsName: [],
    duplicateSameName: [],
    duplicateConflict: [],
  };

  for (const row of rows) {
    if (!ROLL_PATTERN.test(row.roll_no)) {
      skipped.invalidRoll.push(row.line);
      continue;
    }

    if (seen.has(row.roll_no)) {
      if (seen.get(row.roll_no) === row.name) {
        skipped.duplicateSameName.push(row.roll_no);
      } else {
        skipped.duplicateConflict.push(row.roll_no);
      }
      continue;
    }
    seen.set(row.roll_no, row.name);

    const name = (row.name || "").trim();
    const isUnknown = name.toLowerCase() === "unknown";

    if (!name || isUnknown) {
      if (unknownAsRoll) {
        // No usable name -> keep the roll number as the name so the derived
        // password is unique: "<roll_no>@123".
        toImport.push({ roll_no: row.roll_no, name: row.roll_no });
        skipped.usedRollAsName.push(row.roll_no);
        continue;
      }

      if (!name) {
        skipped.blankName.push(row.roll_no);
        continue;
      }

      if (!includeUnknown) {
        skipped.unknownName.push(row.roll_no);
        continue;
      }
    }

    toImport.push({ roll_no: row.roll_no, name });
  }

  // A roll number that appears twice with DIFFERENT names is ambiguous: import none of them.
  const conflicts = new Set(skipped.duplicateConflict);
  const safeToImport = toImport.filter((s) => !conflicts.has(s.roll_no));

  return { toImport: safeToImport, skipped };
};

const run = async () => {
  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const includeUnknown = args.includes("--include-unknown");
  const unknownAsRoll = args.includes("--unknown-as-roll");

  if (!csvPath) {
    console.error(
      "Usage: node scripts/importStudents.js <path-to-csv> [--apply] [--include-unknown]"
    );
    process.exit(1);
  }

  const rows = readStudentCsv(path.resolve(csvPath));
  const { toImport, skipped } = planImport(rows, { includeUnknown, unknownAsRoll });

  console.log(apply ? "MODE: APPLY (writing to database)" : "MODE: DRY RUN (no writes)");
  console.log("CSV data rows:", rows.length);
  console.log("candidates to import:", toImport.length);
  console.log("skipped - invalid roll number (lines):", skipped.invalidRoll.length);
  console.log("skipped - blank name:", skipped.blankName.length);
  console.log('skipped - "Unknown" name:', skipped.unknownName.length);
  console.log("imported with roll number as name:", skipped.usedRollAsName.length);
  console.log("skipped - duplicate rows (same name):", skipped.duplicateSameName.length);
  console.log("skipped - duplicate rows (CONFLICTING names):", skipped.duplicateConflict.length);

  await mongoose.connect(process.env.MONGO_URI);
  const collection = Student.collection;

  // ---- Safety checks ----
  const nonStringRoll = await collection.countDocuments({
    roll_no: { $exists: true, $not: { $type: "string" } },
  });

  if (nonStringRoll > 0) {
    console.error(
      `ABORT: ${nonStringRoll} existing document(s) store roll_no as a non-string type. ` +
        "Importing now could create duplicates. Fix the stored type first."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const indexes = await collection.indexes().catch(() => []);
  const emailIndex = indexes.find((i) => i.name === "email_1");

  if (emailIndex && emailIndex.unique && !emailIndex.partialFilterExpression) {
    console.error(
      "ABORT: the existing plain unique index `email_1` would allow only ONE student " +
        "without an email. Replace it with the partial index first " +
        "(see migration step in the instructions), then re-run."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // ---- What already exists? ----
  const existing = await collection
    .find({ roll_no: { $in: toImport.map((s) => s.roll_no) } })
    .project({ roll_no: 1 })
    .toArray();
  const existingRolls = new Set(existing.map((d) => d.roll_no));
  const newOnes = toImport.filter((s) => !existingRolls.has(s.roll_no));

  console.log("already in database (will NOT be touched):", existingRolls.size);
  console.log("new students that would be inserted:", newOnes.length);

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to insert the new students.");
    await mongoose.disconnect();
    return;
  }

  if (newOnes.length === 0) {
    console.log("Nothing to insert.");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const operations = newOnes.map((student) => ({
    updateOne: {
      filter: { roll_no: student.roll_no },
      update: {
        $setOnInsert: {
          roll_no: student.roll_no,
          name: student.name,
          createdAt: now,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(operations, { ordered: false });

  console.log("inserted:", result.upsertedCount);
  console.log("matched existing (unchanged):", result.matchedCount);
  console.log("modified existing (must be 0):", result.modifiedCount);

  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch(async (error) => {
    console.error("importStudents failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  });
}

module.exports = { planImport };