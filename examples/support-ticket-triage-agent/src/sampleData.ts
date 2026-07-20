export type ProductArea = "api" | "authentication" | "billing" | "unknown";

export interface RelatedTicket {
  id: string;
  status: "open" | "closed";
  sameIssue: boolean;
}

export interface SupportTicket {
  id: string;
  subject: string;
  conversation: string[];
  productArea: ProductArea;
  affectedUsers?: number;
  blockedWorkflow?: boolean;
  dataLoss?: boolean;
  securityConcern?: boolean;
  workaroundAvailable?: boolean;
  errorMessages: string[];
  relatedTickets: RelatedTicket[];
}

export const sampleTicket: SupportTicket = {
  id: "SUP-1042",
  subject: "Production API requests return 401 after key rotation",
  conversation: [
    "Customer: We rotated our production API key this morning and every request now returns 401.",
    "Support: Does the old key still work?",
    "Customer: No. Twelve deployment jobs are blocked and we do not have a workaround.",
  ],
  productArea: "api",
  affectedUsers: 12,
  blockedWorkflow: true,
  dataLoss: false,
  securityConcern: false,
  workaroundAvailable: false,
  errorMessages: ["401 Unauthorized: API key is not recognized"],
  relatedTickets: [
    {
      id: "SUP-998",
      status: "closed",
      sameIssue: false,
    },
  ],
};

export const securityTicket: SupportTicket = {
  id: "SUP-1043",
  subject: "API token may have appeared in public build logs",
  conversation: [
    "Customer: A production token may have been printed in a public CI log for about ten minutes.",
    "Customer: We removed the log but do not know whether anyone accessed it.",
  ],
  productArea: "authentication",
  affectedUsers: 1,
  blockedWorkflow: false,
  dataLoss: false,
  securityConcern: true,
  workaroundAvailable: true,
  errorMessages: [],
  relatedTickets: [],
};

export const ambiguousTicket: SupportTicket = {
  id: "SUP-1044",
  subject: "The dashboard is not working",
  conversation: ["Customer: The dashboard is not working for me. Can you help?"],
  productArea: "unknown",
  errorMessages: [],
  relatedTickets: [],
};
