export type ScriptStep = {
  id: string;
  type: "statement" | "question";
  textKey: string;
  choices?: { labelKey: string; nextId: string }[];
  nextId?: string;
};

export const ONBOARDING_SCRIPT: Record<string, ScriptStep> = {
  start: {
    id: "start",
    type: "statement",
    textKey: "onboarding.script.greeting",
    nextId: "intro",
  },
  intro: {
    id: "intro",
    type: "statement",
    textKey: "onboarding.script.introduction",
    nextId: "experience_check",
  },
  experience_check: {
    id: "experience_check",
    type: "question",
    textKey: "onboarding.script.experienceCheck",
    choices: [
      { labelKey: "onboarding.script.choiceYes", nextId: "experienced" },
      { labelKey: "onboarding.script.choiceNo", nextId: "beginner" },
    ],
  },
  experienced: {
    id: "experienced",
    type: "statement",
    textKey: "onboarding.script.experienced",
    nextId: "end",
  },
  beginner: {
    id: "beginner",
    type: "statement",
    textKey: "onboarding.script.beginner",
    nextId: "end",
  },
  end: {
    id: "end",
    type: "statement",
    textKey: "onboarding.script.ready",
    // In the actual app, this might lead to a final "Let's Go" action
  },
};
