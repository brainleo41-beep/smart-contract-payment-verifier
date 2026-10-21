
import { describe, it } from "node:test";
import assert from "node:assert/strict";

type PaymentEvidence = {
  receiptStatus: "success" | "reverted";
  expectedAmount: bigint;
  eventAmount: bigint | undefined;
  observedBalanceIncrease: bigint;
  observedBalanceDecrease?: bigint;
  refundAmount?: bigint;
  refundConfirmed?: boolean;
  settledAmount?: bigint;
};
export function verifyPayment(evidence: PaymentEvidence): string[] {
  const problems: string[] = [];
  if (evidence.receiptStatus !== "success") {
    problems.push("TRANSACTION_FAILED");
  }

   const amountToVerify = evidence.expectedAmount;

  if (evidence.eventAmount === undefined) {
    problems.push("MISSING_TRANSFER_EVENT");
  } else if (evidence.eventAmount !== amountToVerify) {
    problems.push("EVENT_AMOUNT_MISMATCH");
  }

  if (evidence.observedBalanceIncrease !== amountToVerify) {
    problems.push("BALANCE_CHANGE_MISMATCH");
  }
   if (
    evidence.observedBalanceDecrease !== undefined &&
    evidence.observedBalanceDecrease !== amountToVerify
  ) {
    problems.push("SENDER_BALANCE_CHANGE_MISMATCH");
  }

  if (
    evidence.eventAmount !== undefined &&
    evidence.eventAmount !== evidence.observedBalanceIncrease
  ) {
    problems.push("EVENT_STATE_MISMATCH");
  }

  return problems;
}
export function classifyPayment(
  evidence: PaymentEvidence,
):
  | "settled"
  | "partially_settled"
  | "refunded"
  | "inconsistent" {
  const problems = verifyPayment(evidence);

  if (problems.length > 0) {
    return "inconsistent";
  }

  const settled = evidence.settledAmount;
  const refunded = evidence.refundAmount;
  const refundConfirmed = evidence.refundConfirmed === true;

  if (settled === undefined) {
    return "inconsistent";
  }

  if (settled < 0n || settled > evidence.expectedAmount) {
    return "inconsistent";
  }

  if (refundConfirmed && refunded === undefined) {
    return "inconsistent";
  }

  if (refunded !== undefined && refunded < 0n) {
    return "inconsistent";
  }

  if (
    refundConfirmed &&
    refunded === evidence.expectedAmount &&
    settled === 0n
  ) {
    return "refunded";
  }

  if (
    settled === evidence.expectedAmount &&
    (!refundConfirmed || refunded === 0n)
  ) {
    return "settled";
  }

  if (
    settled > 0n &&
    settled < evidence.expectedAmount &&
    (!refundConfirmed || refunded === 0n)
  ) {
    return "partially_settled";
  }

  return "inconsistent";
}
describe("PaymentVerifier", () => {
  it("accepts consistent payment evidence", () => {
    const result = verifyPayment({receiptStatus: "success",
      expectedAmount: 100n,
      eventAmount: 100n,
      observedBalanceIncrease: 100n,
    });

    assert.deepEqual(result, []);
  });

  it("detects an incorrect expected payment amount", () => {
    const result = verifyPayment({receiptStatus: "success",
      expectedAmount: 120n,
      eventAmount: 100n,
      observedBalanceIncrease: 100n,
    });

    assert.deepEqual(result, [
      "EVENT_AMOUNT_MISMATCH",
      "BALANCE_CHANGE_MISMATCH",
    ]);
  });

  it("detects a missing event", () => {
    const result = verifyPayment({receiptStatus: "success",
      expectedAmount: 100n,
      eventAmount: undefined,
      observedBalanceIncrease: 100n,
    });

    assert.deepEqual(result, ["MISSING_TRANSFER_EVENT"]);
  });
it("detects a failed transaction receipt", () => {
  const result = verifyPayment({
    receiptStatus: "reverted",
    expectedAmount: 100n,
    eventAmount: undefined,
    observedBalanceIncrease: 0n,
  });

  assert.deepEqual(result, [
    "TRANSACTION_FAILED",
    "MISSING_TRANSFER_EVENT",
    "BALANCE_CHANGE_MISMATCH",
  ]);
});
it("detects an event and balance inconsistency", () => {
  const result = verifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 70n,
  });

  assert.deepEqual(result, [
    "BALANCE_CHANGE_MISMATCH",
    "EVENT_STATE_MISMATCH",
  ]);
});
it("classifies consistent payment evidence as settled", () => {
  const result = classifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    settledAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
  });

  assert.equal(result, "settled");
});
it("classifies inconsistent payment evidence correctly", () => {
  const result = classifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    settledAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 70n,
  });

  assert.equal(result, "inconsistent");
});
it("detects an incorrect sender balance decrease", () => {
  const result = verifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    observedBalanceDecrease: 80n,
  });

  assert.deepEqual(result, [
    "SENDER_BALANCE_CHANGE_MISMATCH",
  ]);
});
it("classifies a fully refunded payment", () => {
  const result = classifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    settledAmount: 0n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    refundAmount: 100n,
    refundConfirmed: true,
  });

  assert.equal(result, "refunded");
});
it("classifies a partially settled payment", () => {
  const result = classifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    settledAmount: 60n,
    eventAmount: 100n,
    observedBalanceIncrease: 100n,
    observedBalanceDecrease: 100n,
    refundAmount: 0n,
    refundConfirmed: true,
  });

  assert.equal(result, "partially_settled");
});
it("rejects a full refund claim with a nonzero settled amount", () => {
  const result = classifyPayment({
    receiptStatus: "success",
    expectedAmount: 100n,
    settledAmount: 40n,
    eventAmount: 40n,
    observedBalanceIncrease: 40n,
    refundAmount: 100n,
    refundConfirmed: true,
  });

  assert.equal(result, "inconsistent");
});
});
