
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("ResearchToken — payment evidence", async function () {
  const { viem } = await network.connect();

  const publicClient = await viem.getPublicClient();

  it("matches the receipt, Transfer event, and actual balances", async function () {
    const [sender, recipient] = await viem.getWalletClients();

    const token = await viem.deployContract("ResearchToken");

    const initialSenderBalance = await token.read.balanceOf([
      sender.account.address,
    ]);
    const initialRecipientBalance = await token.read.balanceOf([
      recipient.account.address,
    ]);

    assert.equal(initialSenderBalance, 1000n);
    assert.equal(initialRecipientBalance, 0n);

    const hash = await token.write.transfer(
      [recipient.account.address, 100n],
      { account: sender.account },
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(receipt.status, "success");

    const transferEvents = await token.getEvents.Transfer({
      from: sender.account.address,
      to: recipient.account.address,
    });

    assert.equal(transferEvents.length, 1);
    assert.equal(transferEvents[0].args.amount, 100n);

    const finalSenderBalance = await token.read.balanceOf([
      sender.account.address,
    ]);
    const finalRecipientBalance = await token.read.balanceOf([
      recipient.account.address,
    ]);

    assert.equal(finalSenderBalance, 900n);
    assert.equal(finalRecipientBalance, 100n);

    console.log("Transaction hash:", hash);
    console.log("Receipt status:", receipt.status);
    console.log("Transfer amount in event:", transferEvents[0].args.amount);
    console.log("Final sender balance:", finalSenderBalance);
    console.log("Final recipient balance:", finalRecipientBalance);
  
  });

  it("rejects an unaffordable payment without changing balances", async function () {
    const [sender, recipient] = await viem.getWalletClients();
    const token = await viem.deployContract("ResearchToken");

    const senderBefore = await token.read.balanceOf([
      sender.account.address,
    ]);
    const recipientBefore = await token.read.balanceOf([
      recipient.account.address,
    ]);

    await assert.rejects(
      token.write.transfer(
        [recipient.account.address, 1500n],
        { account: sender.account },
      ),
    );

    const senderAfter = await token.read.balanceOf([
      sender.account.address,
    ]);
    const recipientAfter = await token.read.balanceOf([
      recipient.account.address,
    ]);

    assert.equal(senderAfter, senderBefore);
    assert.equal(recipientAfter, recipientBefore);

    console.log("Failed payment: sender and recipient balances unchanged");
  });
});

