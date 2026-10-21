
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {verifyPayment,
classifyPayment,
} from "./PaymentVerifier.js";
type Evidence = {
  receiptStatus: "success" | "reverted";
  expectedAmount: bigint;
  eventAmount: bigint | undefined;
  observedBalanceIncrease: bigint;
  observedBalanceDecrease?: bigint;
  settledAmount?: bigint;
  refundAmount?: bigint;
  refundConfirmed?: boolean;
};
type Scenario = Evidence & {
  name: string;
  expectedDetection: {
    receiptOnly: boolean;
    receiptAndEvent: boolean;
    reconciliation: boolean;
  };
};

function receiptOnly(e: Evidence): string[] {
  return e.receiptStatus === "success"
    ? []
    : ["TRANSACTION_FAILED"];
}

function receiptAndEvent(e: Evidence): string[] {
  const problems = receiptOnly(e);

  if (e.eventAmount === undefined) {
    problems.push("MISSING_TRANSFER_EVENT");
  } else if (e.eventAmount !== e.expectedAmount) {
    problems.push("EVENT_AMOUNT_MISMATCH");
  }

  return problems;
}

const scenarios: Scenario[] = [
  {
    name: "Consistent transfer",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    settledAmount: 100n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: false,
    },
  },
  {
    name: "Incorrect event amount",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 80n,
    observedBalanceIncrease: 100n,
    settledAmount: 100n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: true,
      reconciliation: true,
    },
  },
  {
    name: "Balance contradicts event",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 70n,
    settledAmount: 100n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: true,
    },
  },
{
  name: "Sender balance decrease mismatch",
  receiptStatus: "success",
  expectedAmount: 100n,
  eventAmount: 100n,
  observedBalanceIncrease: 100n,
  observedBalanceDecrease: 70n,
  settledAmount: 100n,
  expectedDetection: {
    receiptOnly: false,
    receiptAndEvent: false,
    reconciliation: true,
  },
},
{
  name: "Partial settlement",
  receiptStatus: "success",
  expectedAmount: 100n,
  eventAmount: 100n,
  observedBalanceIncrease: 60n,
  observedBalanceDecrease: 100n,
  settledAmount: 60n,
  expectedDetection: {
    receiptOnly: false,
    receiptAndEvent: false,
    reconciliation: true,
  },
},

  {
    name: "Unconfirmed refund",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    settledAmount: 0n,
    refundAmount: 100n,
    refundConfirmed: false,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: true,
    },
  },

  {
    name: "Missing transfer event",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: undefined,
    observedBalanceIncrease: 100n,
    settledAmount: 100n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: true,
      reconciliation: true,
    },
  },
  {
    name: "Missing settlement evidence",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    settledAmount: undefined,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: true,
    },
  },
  {
    name: "Failed transaction",
    receiptStatus: "reverted",
    expectedAmount: 100n,
    eventAmount: undefined,
    observedBalanceIncrease: 0n,
    settledAmount: 0n,
    expectedDetection: {
      receiptOnly: true,
      receiptAndEvent: true,
      reconciliation: true,
    },
  },
];

describe("Verification approach comparison", () => {
  for (const scenario of scenarios) {
    it(`compares approaches: ${scenario.name}`, () => {
      const receiptDetected =
        receiptOnly(scenario).length > 0;

      const eventDetected =
        receiptAndEvent(scenario).length > 0;

      const classification = classifyPayment(scenario);

const reconciliationDetected =
  verifyPayment(scenario).length > 0 ||
  classification === "inconsistent";

      console.log(
        scenario.name,
        "| Receipt:", receiptDetected,
        "| Receipt + event:", eventDetected,
        "| Reconciliation:", reconciliationDetected,
      );

      assert.equal(
        receiptDetected,
        scenario.expectedDetection.receiptOnly,
      );

      assert.equal(
        eventDetected,
        scenario.expectedDetection.receiptAndEvent,
      );

      assert.equal(
        reconciliationDetected,
        scenario.expectedDetection.reconciliation,
      );
    });
  }
});

describe("Verification metrics summary", () => {
  it("reports detection counts for the current test scenarios", () => {
    const approaches = [
      {
        name: "Receipt only",
        detected: (s: Scenario) =>
          receiptOnly(s).length > 0,
      },
      {
        name: "Receipt + event",
        detected: (s: Scenario) =>
          receiptAndEvent(s).length > 0,
      },
      {
        name: "Reconciliation",
        detected: (s: Scenario) =>
          verifyPayment(s).length > 0 ||
          classifyPayment(s) === "inconsistent",
      },
    ];

    console.log("\n=== Verification experiment summary ===");
    console.log("Total scenarios:", scenarios.length);

    for (const approach of approaches) {
      const detectedCount = scenarios.filter(
        (s) => approach.detected(s),
      ).length;

      console.log(
        `${approach.name}: ${detectedCount}/${scenarios.length} scenarios flagged`,
      );
    }
  });
});

