export interface SourceRevenueRow {
  sourceId: string;
  customer: string;
  period: "2026-01" | "2026-02" | "2026-03";
  revenueCents: number;
  currency: "USD";
  sourceArtifact: string;
}

export interface ReportedFinancialFigure {
  label: string;
  amountCents: number;
  currency: "USD";
  sourceArtifact: string;
}

export interface FinancialScenario {
  task: string;
  sourceRows: SourceRevenueRow[];
  reportedFigure: ReportedFinancialFigure;
}

export const sampleScenario: FinancialScenario = {
  task: "Verify the board-deck claim that Q1 2026 subscription revenue was $142,500.",
  sourceRows: [
    {
      sourceId: "ledger:jan-subscription-revenue",
      customer: "All customers",
      period: "2026-01",
      revenueCents: 4_300_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 18",
    },
    {
      sourceId: "ledger:feb-subscription-revenue",
      customer: "All customers",
      period: "2026-02",
      revenueCents: 4_700_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 42",
    },
    {
      sourceId: "ledger:mar-subscription-revenue",
      customer: "All customers",
      period: "2026-03",
      revenueCents: 5_150_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 67",
    },
  ],
  reportedFigure: {
    label: "Board deck Q1 2026 subscription revenue",
    amountCents: 14_250_000,
    currency: "USD",
    sourceArtifact: "board-deck-q1-2026.pdf slide 7",
  },
};
