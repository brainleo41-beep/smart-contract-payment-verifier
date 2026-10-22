\# Experiment Results



\## Research Project



\*\*Title:\*\* Beyond Successful Receipts: Detecting Inconsistencies Between Smart Contract Events, Transaction Logs, and Actual Blockchain State



\## 1. Experimental Environment



\- Platform: Local Hardhat development environment

\- Smart contract compiler: Solidity 0.8.34

\- Test framework: Hardhat with Node.js test runner

\- Evaluation scenarios: 12 manually defined payment scenarios

\- Latest recorded test run: 41 passing tests



\## 2. Verification Approaches



Three approaches were compared:



1\. \*\*Receipt-only verification:\*\* Checks whether the transaction succeeded or reverted.

2\. \*\*Receipt-plus-event verification:\*\* Checks transaction status and whether the transfer event is present and reports the expected amount.

3\. \*\*Reconciliation verification:\*\* Checks transaction status, event evidence, observed balance changes, settlement evidence, and payment classification rules.



\## 3. Recorded Results



| Metric | Receipt only | Receipt + event | Reconciliation |

|---|---:|---:|---:|

| Inconsistent scenarios flagged | 1/6 | 2/6 | 6/6 |

| Detection rate | 16.7% | 33.3% | 100% |

| Valid scenarios incorrectly flagged | 0/4 | 0/4 | 0/4 |

| False-positive rate | 0% | 0% | 0% |

| Unresolved scenarios flagged | 0 | 1 | 2 |



The manually labeled 12-scenario dataset also produced 12/12 correct payment classifications (100%) in the latest recorded test run.



\## 4. Interpretation



Within this manually constructed test dataset, reconciliation detected more labeled inconsistent scenarios than either baseline. It also flagged some scenarios with missing evidence, which should be distinguished from proven inconsistencies when interpreting detection metrics.



The results are preliminary and demonstrate prototype behavior under controlled local conditions. They do not establish real-world detection accuracy or cross-chain effectiveness.



\## 5. Limitations



\- The benchmark contains only 12 manually defined scenarios.

\- Ground-truth labels were assigned within the project rather than independently validated.

\- The prototype has not yet been evaluated on real cross-chain payment data.

\- Receipt status and receipt logs are related evidence; transaction receipts contain event logs, so these are not fully independent sources.

\- The refund scenarios need clearly documented definitions for when balance changes are measured and whether settlement amounts represent gross or net outcomes.

\- The current results require further evaluation with larger datasets and additional failure cases.



\## 6. Reproducibility



From the project root, run:



```powershell

npx hardhat test

```



The latest recorded run completed with 41 passing tests. Rerun the command before publication and update these results if the output changes.

