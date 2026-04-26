import { encodeFunctionData } from 'viem';

/** IERC6551Executable — operation `0` = CALL (EIP-6551). */
export const erc6551ExecutableAbi = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
    ],
    outputs: [{ name: 'result', type: 'bytes' }],
  },
] as const;

/** Standard ERC-721 `safeTransferFrom(from,to,tokenId)` (no data arg). */
export const erc721SafeTransferFromAbi = [
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const ERC6551_OPERATION_CALL = 0 as const;

export function encodeErc721SafeTransferFromCalldata(params: {
  from: `0x${string}`;
  to: `0x${string}`;
  tokenId: bigint;
}): `0x${string}` {
  return encodeFunctionData({
    abi: erc721SafeTransferFromAbi,
    functionName: 'safeTransferFrom',
    args: [params.from, params.to, params.tokenId],
  });
}
