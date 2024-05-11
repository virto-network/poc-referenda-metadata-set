import "@polkadot/api-augment/kusama";
import { type KeyringPair } from "@polkadot/keyring/types";
import { SubmittableExtrinsic } from "@polkadot/api-base/types";

export function signSendAndWait(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, (result) => {
      switch (true) {
        case result.isFinalized:
          return resolve();
        case result.isError:
          return reject(result.dispatchError);
      }
    });
  });
}
