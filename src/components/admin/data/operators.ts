// The two TOS operators. Every action is signed with the operator of the session,
// never with a name typed or picked in a form.
export type OperatorName = "Felipe" | "Juan Pablo";

export const OPERATORS: OperatorName[] = ["Felipe", "Juan Pablo"];

export const OPERATOR_NODES: Record<OperatorName, string> = {
  Felipe: "NODE-ALPHA-FT",
  "Juan Pablo": "NODE-BETA-JPH",
};

export const OPERATOR_INITIALS: Record<OperatorName, string> = {
  Felipe: "FT",
  "Juan Pablo": "JPH",
};

export interface SessionUser {
  username: string;
  displayName: string;
  role: string;
  node: string;
}

export function operatorFromUser(user?: { username?: string } | null): OperatorName {
  return user?.username === "pablo" ? "Juan Pablo" : "Felipe";
}

export function partnerOf(name: OperatorName): OperatorName {
  return name === "Felipe" ? "Juan Pablo" : "Felipe";
}

// Older records used "Pablo", "Felipe Tangarife", "Juan Pablo Hurtado"...
export function normalizeOperator(name?: string | null): OperatorName | null {
  const n = (name ?? "").toLowerCase();
  if (n.includes("pablo")) return "Juan Pablo";
  if (n.includes("felipe")) return "Felipe";
  return null;
}
