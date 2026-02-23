import { describe, expect, it } from "vitest";

import { buildSkillLevelCommands } from "./skill-level";
import type { SkillLevel } from "./types";

describe("buildSkillLevelCommands", () => {
  it("should set Skill Level for any level", () => {
    const commands = buildSkillLevelCommands(10 as SkillLevel);
    expect(commands[0]).toBe("setoption name Skill Level value 10");
  });

  it("should enable UCI_LimitStrength and set Elo for levels below 15", () => {
    const commands = buildSkillLevelCommands(5 as SkillLevel);
    expect(commands).toEqual([
      "setoption name Skill Level value 5",
      "setoption name UCI_LimitStrength value true",
      "setoption name UCI_Elo value 1200",
    ]);
  });

  it("should disable UCI_LimitStrength for level 15 and above", () => {
    const commands = buildSkillLevelCommands(15 as SkillLevel);
    expect(commands).toEqual([
      "setoption name Skill Level value 15",
      "setoption name UCI_LimitStrength value false",
    ]);
  });

  it("should disable UCI_LimitStrength for level 20", () => {
    const commands = buildSkillLevelCommands(20 as SkillLevel);
    expect(commands).toEqual([
      "setoption name Skill Level value 20",
      "setoption name UCI_LimitStrength value false",
    ]);
  });

  it("should set Elo 800 for level 1", () => {
    const commands = buildSkillLevelCommands(1 as SkillLevel);
    expect(commands).toContain("setoption name UCI_Elo value 800");
  });

  it("should set Elo 2100 for level 14 (boundary)", () => {
    const commands = buildSkillLevelCommands(14 as SkillLevel);
    expect(commands).toContain("setoption name UCI_Elo value 2100");
  });

  it("should return exactly 3 commands for limited strength levels", () => {
    for (let level = 1; level <= 14; level++) {
      const commands = buildSkillLevelCommands(level as SkillLevel);
      expect(commands).toHaveLength(3);
    }
  });

  it("should return exactly 2 commands for full strength levels", () => {
    for (let level = 15; level <= 20; level++) {
      const commands = buildSkillLevelCommands(level as SkillLevel);
      expect(commands).toHaveLength(2);
    }
  });

  it("should always start with Skill Level command", () => {
    for (let level = 1; level <= 20; level++) {
      const commands = buildSkillLevelCommands(level as SkillLevel);
      expect(commands[0]).toMatch(/^setoption name Skill Level value \d+$/);
    }
  });

  it("should produce monotonically increasing Elo for limited strength levels", () => {
    let previousElo = 0;
    for (let level = 1; level <= 14; level++) {
      const commands = buildSkillLevelCommands(level as SkillLevel);
      const eloCommand = commands.find((c) => c.includes("UCI_Elo"));
      const elo = parseInt(eloCommand!.split("value ")[1], 10);
      expect(elo).toBeGreaterThan(previousElo);
      previousElo = elo;
    }
  });

  it("should produce full command set for level 1 (minimum)", () => {
    const commands = buildSkillLevelCommands(1 as SkillLevel);
    expect(commands).toEqual([
      "setoption name Skill Level value 1",
      "setoption name UCI_LimitStrength value true",
      "setoption name UCI_Elo value 800",
    ]);
  });

  it("should produce full command set for level 20 (maximum)", () => {
    const commands = buildSkillLevelCommands(20 as SkillLevel);
    expect(commands).toEqual([
      "setoption name Skill Level value 20",
      "setoption name UCI_LimitStrength value false",
    ]);
  });
});
