import "@polkadot/api-augment/kusama";
import { ApiPromise, Keyring } from "@polkadot/api";
import {
  setup,
  setStorage,
  ChopsticksProvider,
} from "@acala-network/chopsticks";
import { waitReady } from "@polkadot/wasm-crypto";
import { stringToHex, stringToU8a } from "@polkadot/util";

import { blake2b } from "hash-wasm";
import assert from "node:assert";
import { signSendAndWait } from "./utils.js";
import { getPollCuratorsFromMetadata } from "./getPollCuratorsFromMetadata.js";

await waitReady();

const keyring = new Keyring({ ss58Format: 2, type: "sr25519" });
const ALICE = keyring.addFromUri("//Alice");

// Initialize mock Kusama instance and API
const kusama = await setup({
  endpoint: "wss://rpc.ibp.network/kusama",
  runtimeLogLevel: 5,
});

const api = await ApiPromise.create({
  provider: new ChopsticksProvider(kusama),
});

// Set 1000KSM to ALICE
setStorage(kusama, {
  System: {
    Account: [
      [
        [ALICE.address],
        {
          providers: 1,
          data: {
            free: 1e15,
          },
        },
      ],
    ],
  },
});

api.query.system.events((events) => {
  events.forEach(({ event }) => {
    if (event.section === "referenda" || event.section === "preimage") {
      console.log(event.toHuman());
      if (event.method === "MetadataSet") {
        getPollCuratorsFromMetadata(api, event);
      }
    }
  });
});

const refCount = await api.query.referenda.referendumCount();

const pollId = refCount.toNumber();
const pollMetadata = JSON.stringify({
  pollId,
  curators: ["pandres95", "olanod"],
});

const pollMetadataHash = `0x${await blake2b(stringToU8a(pollMetadata), 256)}`;

await signSendAndWait(
  api.tx.utility.batchAll([
    api.tx.preimage.notePreimage(stringToHex(pollMetadata)),
    // Sample referenda that pays 1KSM to ALICE, submitted on SmallTipper
    api.tx.referenda.submit(
      {
        Origins: "SmallTipper",
      },
      {
        Inline: api.tx.treasury.spendLocal(1e12, ALICE.address).method.toHex(),
      },
      {
        After: 0,
      }
    ),
  ]),
  ALICE
);

const preimage = await api.query.preimage.preimageFor([
  pollMetadataHash,
  stringToU8a(pollMetadata).length,
]);
assert.equal(preimage.toString(), stringToHex(pollMetadata));

// Sets metadata for the poll
await signSendAndWait(
  api.tx.referenda.setMetadata(pollId, pollMetadataHash),
  ALICE
);
