export type Program = {
  id: string; cat: string; t: string; prog: string; what: string;
  who: string[]; tags: string[]; rule: string; est: [number, number];
  docs: string[]; src: [string, string]; deadline?: string | null; yearly?: boolean;
  whoFor?: string[]; steps?: string[]; apply?: [string, string];
  level?: "federal" | "state" | "local" | "national"; country?: "US" | "FR" | "UK";
};

export type Comment = [who: string, text: string, likes: number, got: boolean];

export type Post = {
  id: string; who: string; kind: string; crit: string; quote: string; text: string;
  likes: number; comments: Comment[]; prog?: string; pip?: { text: string; prog: string };
};

/** A simulated phone screen: [kind, data]. Kinds: home, form, cal, msg, done, idle. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockScreen = [string, Record<string, any>];
/** [screen kind, screen data, plain-English line, is hard stop] */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DemoStep = [string, Record<string, any>, string, (number | undefined)?];

export type TaskDef = {
  id: "calfresh" | "cal" | "msg" | string; ag: string; app: string; title: string; sub: string;
  stop: string; need: string; steps: DemoStep[]; fin: DemoStep[];
};
