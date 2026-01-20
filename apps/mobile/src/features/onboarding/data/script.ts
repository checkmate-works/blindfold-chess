export type ScriptStep = {
  id: string;
  type: "statement" | "question";
  text: string;
  choices?: { label: string; nextId: string }[];
  nextId?: string;
};

export const ONBOARDING_SCRIPT: Record<string, ScriptStep> = {
  start: {
    id: "start",
    type: "statement",
    text: "こんにちは",
    nextId: "intro",
  },
  intro: {
    id: "intro",
    type: "statement",
    text: "私は目隠しチェスを極めし者です",
    nextId: "experience_check",
  },
  experience_check: {
    id: "experience_check",
    type: "question",
    text: "あなたは目隠しチェスをやったことがありますか？",
    choices: [
      { label: "はい", nextId: "experienced" },
      { label: "いいえ", nextId: "beginner" },
    ],
  },
  experienced: {
    id: "experienced",
    type: "statement",
    text: "ほう...それは頼もしい。\nでは、力試しといきましょうか。",
    nextId: "end",
  },
  beginner: {
    id: "beginner",
    type: "statement",
    text: "なるほど、初めてなのですね。\n心配入りません。私が手取り足取り教えましょう。",
    nextId: "end",
  },
  end: {
    id: "end",
    type: "statement",
    text: "準備ができたら、ボタンを押してください。",
    // In the actual app, this might lead to a final "Let's Go" action
  },
};
