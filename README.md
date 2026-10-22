# Beyond Successful Receipts: Detecting Inconsistencies Between Smart Contract Events, Transaction Logs, and Actual Blockchain State

## Overview

This project prototypes an evidence-based approach to verifying smart contract payment outcomes. Rather than relying only on transaction success or emitted events, it compares transaction status, event amounts, observed balance changes, and settlement evidence.

The goal is to distinguish between payments that are settled, partially settled, refunded, inconsistent, or unresolved because required evidence is missing.

## Research Question

Can reconciliation of transaction status, contract events, observed balance changes, and settlement evidence identify inconsistent payment outcomes more effectively than receipt-only or receipt-plus-event verification?

## Verification Approaches

1. **Receipt only:** Checks whether the transaction succeeded or reverted.
2. **Receipt + event:** Checks transaction status and whether the expected transfer event is present with the expected amount.
3. **Reconciliation:** Applies payment-classification rules using transaction status, event data, observed balance changes, and settlement evidence.

## Preliminary Results

The prototype evaluates 12 manually defined scenarios: four valid, six inconsistent, and two unresolved.

| Metric | Receipt only | Receipt + event | Reconciliation |
|---|---:|---:|---:|
| Inconsistent scenarios detected | 1/6 | 2/6 | 6/6 |
| Detection rate | 16.7% | 33.3% | 100% |
| Valid scenarios incorrectly flagged | 0/4 | 0/4 | 0/4 |
| False-positive rate | 0% | 0% | 0% |
| Unresolved scenarios flagged by the detection rule | 0 | 1 | 0 |
| Unresolved outcomes correctly classified by reconciliation | N/A | N/A | 2/2 |

The latest recorded test run passed 41 tests: three Solidity tests and 38 Node.js tests. The manually labeled scenario set also produced 12/12 correct classifications.

These are preliminary results from a small, locally constructed test set. They demonstrate the prototype's behavior under controlled conditions; they do not establish independently validated real-world accuracy.

## Important Scope and Limitations

- The evaluation uses 12 manually defined scenarios, with ground truth assigned within the project.
- The prototype has been tested locally using Hardhat; cross-chain and broader real-world evaluation remain future work.
- A transaction receipt contains its event logs, so receipt status and event data should not be treated as fully independent evidence.
- Balance observations must be interpreted with the payment lifecycle in mind, including settlement timing, refunds, and gross versus net amounts.
- The current results do not establish performance on arbitrary contracts or production payment systems.

## Run the Tests

Requirements: Node.js and npm.

From the project root, run:

```bash
npm install
npx hardhat compile
npx hardhat test
```

The test suite includes payment-verification logic, classification cases, and a comparison of the three verification approaches.

## Research Status

This is a research prototype. Future work includes expanding the scenario set, using independently reviewed ground truth, testing more complex payment and refund lifecycles, and evaluating additional contracts and environments.

## Reproducibility

The reported metrics correspond to the locally executed test suite. Rerun `npx hardhat test` before citing these results in a publication.
