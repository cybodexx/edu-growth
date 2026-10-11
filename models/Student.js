const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // University roll number. Stored as a STRING so leading zeros and
    // 12-digit values are never altered. Used as the login identifier.
    roll_no: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // email/password are only mandatory for students created through the
    // existing /register flow. Students imported from the roll-number list
    // do not have them (their login password is derived from `name`).
    email: {
      type: String,
      required: function () {
        return !this.roll_no;
      },
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.roll_no;
      },
    },
  },
  {
    timestamps: true,
  }
);

// roll_no must be unique, but only among documents that actually have one.
studentSchema.index(
  { roll_no: 1 },
  { unique: true, partialFilterExpression: { roll_no: { $type: "string" } } }
);

// email stays unique, but only among documents that actually have one.
// (A plain unique index would allow just ONE student without an email.)
studentSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

const Student = mongoose.model("Student", studentSchema);

// Mongoose swallows automatic index-build errors; surface them in the logs.
Student.on("index", (error) => {
  if (error) {
    console.error(
      "Student index build failed (see migration notes):",
      error.message
    );
  }
});

module.exports = Student;