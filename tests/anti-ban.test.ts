import assert from "node:assert/strict";
import test from "node:test";

import {
  dailyCapRemaining,
  effectiveCap,
  isWithinWindow,
  nextDelayMs,
} from "../src/lib/anti-ban.ts";

test("respeita janela que cruza meia-noite", () => {
  const late = new Date("2026-07-11T01:00:00Z"); // 22:00 em Sao Paulo
  const noon = new Date("2026-07-10T15:00:00Z"); // 12:00 em Sao Paulo
  assert.equal(isWithinWindow(late, { start: "21:00", end: "08:00" }), true);
  assert.equal(isWithinWindow(noon, { start: "21:00", end: "08:00" }), false);
});

test("warm-up nunca ultrapassa o cap diario", () => {
  const now = new Date("2026-07-10T15:00:00Z");
  assert.equal(effectiveCap({ dailyCap: 100, warmupPerDay: 20, startedAt: now, now }), 20);
  assert.equal(
    dailyCapRemaining({
      dailyCap: 100,
      warmupPerDay: 20,
      startedAt: now,
      sentToday: 7,
      sentTodayDate: "2026-07-10",
      now,
    }),
    13,
  );
});

test("delay permanece dentro dos limites", () => {
  assert.equal(
    nextDelayMs(1000, 2000, () => 0),
    1000,
  );
  assert.equal(
    nextDelayMs(1000, 2000, () => 1),
    2000,
  );
});
