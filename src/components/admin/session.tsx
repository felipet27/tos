"use client";

import { createContext, useContext } from "react";
import { OperatorName, SessionUser } from "./data/operators";

interface Session {
  user: SessionUser;
  /** Operator of this session: author of every action and the reviewer in Observatorio */
  me: OperatorName;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the admin panel");
  return session;
}
