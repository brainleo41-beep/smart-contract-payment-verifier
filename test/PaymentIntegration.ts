
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { verifyPayment } from "./PaymentVerifier.js";

describe("PaymentIntegration", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("verifies a real transfer using receipt, event, and balance evidence", async () => {
    const [sender, recipient] = await viem.getWalletClients();
    const token = await viem.deployContract("ResearchToken");

    const senderBefore = await token.read.balanceOf([
      sender.account.address,
    ]);
    const recipientBefore = await token.read.balanceOf([
      recipient.account.address,
    ]);

    const expectedAmount = 100n;

    const hash = await token.write.transfer(
      [recipient.account.address, expectedAmount],
      { account: sender.account },
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await token.getEvents.Transfer({
      from: sender.account.address,
      to: recipient.account.address,
    });

    const senderAfter = await token.read.balanceOf([
      sender.account.address,
    ]);
    const recipientAfter = await token.read.balanceOf([
      recipient.account.address,
    ]);

    const eventAmount =
      events.length === 1 ? events[0].args.amount : undefined;

    const observedBalanceIncrease = recipientAfter - recipientBefore;
    const observedBalanceDecrease = senderBefore - senderAfter;

    const problems = verifyPayment({
      receiptStatus: receipt.status,
      expectedAmount,
      eventAmount,
      observedBalanceIncrease,
      observedBalanceDecrease,
    });

    console.log("Integration transaction:", hash);
    console.log("Receipt status:", receipt.status);
    console.log("Event amount:", eventAmount);
    console.log("Recipient balance increase:", observedBalanceIncrease);
    console.log("Sender balance decrease:", observedBalanceDecrease);
    console.log("Verifier findings:", problems);

    assert.deepEqual(problems, []);
    assert.equal(senderBefore - senderAfter, expectedAmount);
    assert.equal(recipientAfter - recipientBefore, expectedAmount);
  });
});
