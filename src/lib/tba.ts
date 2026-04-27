import type { PublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { HOODRATS_ADDRESS } from './contract';

/** Canonical ERC-6551 registry (same address on listed EVM chains). */
export const ERC6551_REGISTRY = '0x000000006551c19487814612e58FE06813775758' as const;

/**
 * Tokenbound “account proxy” — pass as `implementation` to registry `account` / `createAccount`.
 * @see `.cursor/rules/threejs/tba/contracts/deployments.mdx`
 */
export const TOKENBOUND_ACCOUNT_IMPLEMENTATION_MAINNET =
  '0x55266d75D1a14E4572138116aF39863Ed6596E7F' as const;

/** Default salt for standard Tokenbound-derived TBAs. */
export const TBA_DEFAULT_SALT =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export const erc6551RegistryAbi = [
  {
    type: 'function',
    name: 'account',
    stateMutability: 'view',
    inputs: [
      { name: 'implementation', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'chainId', type: 'uint256' },
      { name: 'tokenContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [{ name: 'account', type: 'address' }],
  },
] as const;

/**
 * Deterministic TBA address for an NFT on Ethereum mainnet (Tokenbound implementation, zero salt).
 */
export async function readTbaAddress(
  client: PublicClient,
  tokenId: bigint,
  tokenContract: `0x${string}` = HOODRATS_ADDRESS,
): Promise<`0x${string}`> {
  const chainId = BigInt(mainnet.id);
  return client.readContract({
    address: ERC6551_REGISTRY,
    abi: erc6551RegistryAbi,
    functionName: 'account',
    args: [
      TOKENBOUND_ACCOUNT_IMPLEMENTATION_MAINNET,
      TBA_DEFAULT_SALT,
      chainId,
      tokenContract,
      tokenId,
    ],
  });
}
