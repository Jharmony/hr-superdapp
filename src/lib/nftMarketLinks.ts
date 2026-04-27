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

/** Etherscan address page (e.g. Tokenbound account). */
export function etherscanAddressUrl(address: string): string {
  const a = address.trim().toLowerCase();
  return `https://etherscan.io/address/${a}`;
}

/** OpenSea profile / portfolio for a wallet or contract address. */
export function openSeaAddressUrl(address: string): string {
  return `https://opensea.io/${address.trim().toLowerCase()}`;
}
