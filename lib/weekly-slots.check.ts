import assert from "node:assert/strict";
import {
  generateSlots,
  validateWeeklySlots,
  toMinutes,
  fromMinutes,
  formatDuration,
  sortSlots,
} from "./weekly-slots";

assert.deepEqual(
  generateSlots(0, "08:30", "10:00", 30).map((s) => s.endTime),
  ["09:00", "09:30", "10:00"],
);
assert.deepEqual(
  generateSlots(1, "08:30", "12:30", 120).map((s) => s.startTime),
  ["08:30", "10:30"],
);
assert.deepEqual(
  generateSlots(0, "08:00", "10:00", 30, 15).map((s) => s.startTime),
  ["08:00", "08:45", "09:30"],
);
assert.equal(generateSlots(0, "08:00", "09:10", 30).length, 2);
assert.deepEqual(generateSlots(0, "08:00", "09:00", 0), []);
const slot = { dayOfWeek: 0, startTime: "08:00", endTime: "09:00" };
assert.match(
  validateWeeklySlots([0], [slot, { ...slot, startTime: "08:30" }])!,
  /Sunday.*overlap/,
);
assert.equal(
  validateWeeklySlots(
    [0],
    [slot, { ...slot, startTime: "09:00", endTime: "10:00" }],
  ),
  null,
);
for (const endTime of ["08:00", "07:00"])
  assert.match(
    validateWeeklySlots([0], [{ ...slot, endTime }])!,
    /Sunday.*after/,
  );
assert.match(validateWeeklySlots([0, 1], [slot])!, /Monday.*at least one/);
assert.match(validateWeeklySlots([1], [slot])!, /Sunday.*not an open day/);
assert.match(
  validateWeeklySlots([0], [{ ...slot, endTime: "24:00" }])!,
  /Sunday.*valid/,
);
assert.match(
  validateWeeklySlots([0], [{ ...slot, endTime: "08:04" }])!,
  /Sunday.*5 minutes/,
);
assert.ok(validateWeeklySlots([], []));
assert.ok(validateWeeklySlots([0, 0], [slot]));
assert.ok(validateWeeklySlots([7], [slot]));
assert.match(
  validateWeeklySlots(
    [0],
    Array.from({ length: 97 }, () => slot),
  )!,
  /Sunday.*96/,
);
assert.equal(fromMinutes(toMinutes("23:55")), "23:55");
assert.equal(formatDuration(90), "1h 30m");
assert.equal(formatDuration(30), "30m");
assert.equal(formatDuration(60), "1h");
assert.deepEqual(sortSlots([{ ...slot, dayOfWeek: 1 }, slot]), [
  slot,
  { ...slot, dayOfWeek: 1 },
]);
console.log("Weekly slot checks passed.");
