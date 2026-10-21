
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifyPayment } from "./PaymentVerifier.js";

type Evidence = {
  receiptStatus: "success" | "reverted";
  expectedAmount: bigint;
  eventAmount: bigint | undefined;
  observedBalanceIncrease: bigint;
  settledAmount?: bigint;
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

      const reconciliationDetected =
        verifyPayment(scenario).length > 0;

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
