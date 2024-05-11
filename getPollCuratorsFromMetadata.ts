import "@polkadot/api-augment/kusama";
import { ApiPromise } from "@polkadot/api";
import { hexToString } from "@polkadot/util";
import { Codec } from "@polkadot/types/types";
import { Event, H256 } from "@polkadot/types/interfaces";
import { u32 } from "@polkadot/types/primitive";

type PollMetadata = {
  pollId: number;
  curators: string[];
};

export async function getPollCuratorsFromMetadata(
  api: ApiPromise,
  { data }: Event
) {
  const { index, hash_: hash } = data as unknown as {
    index: u32;
    hash_: H256;
  };
  const length = await getPreimageLenght(api, hash);

  try {
    const pollMetadata = decodePollMetadata(
      await api.query.preimage.preimageFor([hash, length])
    );
    if (index.toNumber() === pollMetadata.pollId) {
      console.log(
        `

Curators for ${pollMetadata.pollId} are: %j


`,
        pollMetadata.curators
      );
    }
  } catch (error) {
    console.error("Error decoding poll metadata", error);
  }
}

export async function getPreimageLenght(api: ApiPromise, hash: H256) {
  const requestStatus = (
    await api.query.preimage.requestStatusFor(hash)
  ).unwrapOrDefault();

  switch (true) {
    case requestStatus.isRequested:
      return requestStatus.asRequested.maybeLen.unwrapOrDefault();
    case requestStatus.isUnrequested:
    default:
      return requestStatus.asUnrequested.len;
  }
}

export function decodePollMetadata(preimage: Codec): PollMetadata {
  const preimageAsHex = hexToString(preimage.toString());
  return JSON.parse(preimageAsHex) as PollMetadata;
}
