import { createContext, type RefObject } from "react";

export const DashboardScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);
