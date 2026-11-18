import { describe, expect, it } from "vitest";

import { CHALLENGE_MENU_TYPES } from "../practice-registry/registry";
import { CHALLENGE_MODULES, getChallengeModule } from "./modules";

describe("getChallengeModule", () => {
  it("returns the registered definition for every challenge module", () => {
    expect(CHALLENGE_MENU_TYPES.length).toBeGreaterThan(0);
    for (const menuType of CHALLENGE_MENU_TYPES) {
      expect(getChallengeModule(menuType)).toBe(CHALLENGE_MODULES[menuType]);
      expect(getChallengeModule(menuType)).not.toBeNull();
    }
  });

  it("returns null for a module without a challenge mode", () => {
    expect(getChallengeModule("position_memory")).toBeNull();
    expect(getChallengeModule("")).toBeNull();
  });

  // The menu type comes from the client. A name inherited from
  // Object.prototype must not resolve to something callable as a definition.
  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "returns null for the inherited property name %s",
    (name) => {
      expect(getChallengeModule(name)).toBeNull();
    },
  );
});
