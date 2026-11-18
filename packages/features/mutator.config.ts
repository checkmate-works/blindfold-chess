// Mutation testing configuration.
//
// The point is to measure how well the tests detect broken code, not to gate
// anything. Equivalent mutants (rewrites that change no observable behaviour)
// always remain, so 100% is not a goal. Read the result like cyclomatic
// complexity: a refactoring signal that shows where better tests would pay off.
//
// That is why `failOnSurvived` is false and `thresholds.break` is left unset
// (the default `null`), and why `mutation` is neither a turbo task nor part of
// the `test` script. The agent pipelines run `pnpm test` (`turbo run test`) as
// their quality gate; wiring mutation testing in there would re-run it on every
// nightly job and read every surviving mutant as a failure.
//
// The tool is @mizchi/mutator, pinned to exactly 0.3.0 in package.json (no
// caret). It was chosen for its diff-driven runs, its cache, and its
// type-checking pass that discards mutants which cannot compile — that is what
// keeps it fast. It is still 0.x: config keys and report formats may change
// between versions, and an unknown config key exits with code 1, so upgrades
// must be deliberate. StrykerJS was not chosen: it is the slower tool that
// mutator was written to replace.
//
// Only pure modules are mutated. Hooks (`use-*.ts`) and the `"use client"`
// barrels (`client.ts`) are excluded: hook tests run under jsdom with
// renderHook, so each test file is slow to start, and only about half of the
// hooks have tests at all, so the untested ones would show up as NoCoverage and
// muddy the score of the pure logic this is meant to measure.
//
// `*.test.*`, `*.spec.*`, `__tests__/` and `*.d.ts` are excluded by the tool's
// defaults (`exclude` below is added to those defaults, not a replacement), so
// tests need no entry here.
import { defineConfig } from "@mizchi/mutator";

export default defineConfig({
  include: ["src/**/*.ts"],
  exclude: ["src/**/use-*.ts", "src/**/client.ts"],
  reporters: ["text", "html", "json"],
  failOnSurvived: false,
});
