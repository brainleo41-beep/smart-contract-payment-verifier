
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
  groundTruth: "valid" | "inconsistent" | "unresolved";
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
    groundTruth: "valid",
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
    name: "Consistent transfer of 250",
    groundTruth: "valid",
    receiptStatus: "success",
    expectedAmount: 250n,
    eventAmount: 250n,
    observedBalanceIncrease: 250n,
    observedBalanceDecrease: 250n,
    settledAmount: 250n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: false,
    },
  },
  {
    name: "Consistent transfer of 500",
    groundTruth: "valid",
    receiptStatus: "success",
    expectedAmount: 500n,
    eventAmount: 500n,
    observedBalanceIncrease: 500n,
    observedBalanceDecrease: 500n,
    settledAmount: 500n,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: false,
    },
  },
  {
    name: "Confirmed full refund",
    groundTruth: "valid",
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    observedBalanceDecrease: 100n,
    settledAmount: 0n,
    refundAmount: 100n,
    refundConfirmed: true,
    expectedDetection: {
      receiptOnly: false,
      receiptAndEvent: false,
      reconciliation: false,
    },
  },
  {
    name: "Incorrect event amount",
    groundTruth:"inconsistent",
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
    groundTruth: "inconsistent",
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
  groundTruth: "inconsistent",
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
  groundTruth: "inconsistent",
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
    groundTruth: "inconsistent",
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
    groundTruth: "unresolved",
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
    groundTruth: "unresolved",
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
    groundTruth: "inconsistent",
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
describe("Ground-truth dataset", () => {
  it("contains the expected number of labeled scenarios", () => {
    assert.equal(
      scenarios.filter((s) => s.groundTruth === "valid").length,
      4,
    );

    assert.equal(
      scenarios.filter((s) => s.groundTruth === "inconsistent").length,
      6,
    );

    assert.equal(
      scenarios.filter((s) => s.groundTruth === "unresolved").length,
      2,
    );
  });
});
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
  it("reports detection performance against ground truth", () => {
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

    console.log("\n=== Ground-truth evaluation ===");
    console.log("Total scenarios:", scenarios.length);

    for (const approach of approaches) {
      const flagged = scenarios.filter(
        (s) => approach.detected(s),
      );

      const truePositives = flagged.filter(
        (s) => s.groundTruth === "inconsistent",
      ).length;

      const falsePositives = flagged.filter(
        (s) => s.groundTruth === "valid",
      ).length;

      const unresolvedFlagged = flagged.filter(
        (s) => s.groundTruth === "unresolved",
      ).length;

      const inconsistentTotal = scenarios.filter(
        (s) => s.groundTruth === "inconsistent",
      ).length;

      const validTotal = scenarios.filter(
        (s) => s.groundTruth === "valid",
      ).length;

      const detectionRate =
        inconsistentTotal === 0
          ? 0
          : (truePositives / inconsistentTotal) * 100;

      const falsePositiveRate =
        validTotal === 0
          ? 0
          : (falsePositives / validTotal) * 100;

      console.log(`\n${approach.name}`);
      console.log(
        `True positives: ${truePositives}/${inconsistentTotal}`,
      );
      console.log(
        `Detection rate: ${detectionRate.toFixed(1)}%`,
      );
      console.log(
        `False positives: ${falsePositives}/${validTotal}`,
      );
      console.log(
        `False-positive rate: ${falsePositiveRate.toFixed(1)}%`,
      );
      console.log(
        `Unresolved scenarios flagged: ${unresolvedFlagged}`,
      );
    }
  });
});

const expectedClassifications: Record<
  string,
  "settled" | "partially_settled" | "refunded" | "inconsistent" | "unresolved"
> = {
  "Consistent transfer": "settled",
  "Consistent transfer of 250": "settled",
  "Consistent transfer of 500": "settled",
  "Confirmed full refund": "refunded",
  "Incorrect event amount": "inconsistent",
  "Balance contradicts event": "inconsistent",
  "Sender balance decrease mismatch": "inconsistent",
  "Partial settlement": "inconsistent",
  "Unconfirmed refund": "inconsistent",
  "Missing transfer event": "unresolved",
  "Missing settlement evidence": "unresolved",
  "Failed transaction": "inconsistent",
};

describe("Classification accuracy", () => {
  it("compares predicted outcomes against expected classifications", () => {
    let correct = 0;

    console.log("\n=== Classification accuracy ===");

    for (const scenario of scenarios) {
      const predicted = classifyPayment(scenario);
      const expected = expectedClassifications[scenario.name];
      const matches = predicted === expected;

      if (matches) {
        correct++;
      }

      console.log(
        `${scenario.name} | Expected: ${expected} | Predicted: ${predicted} | Correct: ${matches}`,
      );
    }

    const accuracy = (correct / scenarios.length) * 100;

    console.log(
      `\nClassification accuracy: ${correct}/${scenarios.length} (${accuracy.toFixed(1)}%)`,
    );

    assert.equal(correct, scenarios.length);
  });
});
