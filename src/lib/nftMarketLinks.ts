import { HOODRATS_ADDRESS } from './contract';

/** Hoodrats collection on OpenSea (list / browse off-protocol). */
export const HOODRATS_OPENSEA_COLLECTION_URL =
  'https://opensea.io/collection/hood-rats' as const;

/** OpenSea item URL (Ethereum mainnet). */
export function hoodratOpenSeaUrl(tokenId: number): string {
  return `https://opensea.io/item/ethereum/${HOODRATS_ADDRESS.toLowerCase()}/${tokenId}`;
}

/** Etherscan NFT token page. */
export function hoodratEtherscanNftUrl(tokenId: number): string {
  return `https://etherscan.io/nft/${HOODRATS_ADDRESS}/${tokenId}`;
}
