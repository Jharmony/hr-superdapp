import type { PublicClient } from 'viem';
import { formatEther, formatUnits } from 'viem';

/** Mainnet — Hoodrats collection is Ethereum mainnet. */
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const;

const erc20BalanceAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export type TbaErc20Balance = {
  symbol: string;
  contract: string;
  decimals: number;
  /** Human amount, trimmed trailing zeros where sensible */
  amount: string;
  wei: string;
};

async function readErc20(
  client: PublicClient,
  token: `0x${string}`,
  decimals: number,
  holder: `0x${string}`,
): Promise<bigint> {
  try {
    return (await client.readContract({
      address: token,
      abi: erc20BalanceAbi,
      functionName: 'balanceOf',
      args: [holder],
    })) as bigint;
  } catch {
    return 0n;
  }
}

/**
 * Native ETH + a few canonical mainnet ERC-20s for a TBA (read-only RPC).
 */
export async function readTbaWalletBalances(
  client: PublicClient,
  tbaAddress: `0x${string}`,
): Promise<{ nativeWei: string; nativeEth: string; erc20: TbaErc20Balance[] }> {
  let nativeWei = 0n;
  try {
    nativeWei = await client.getBalance({ address: tbaAddress });
  } catch {
    nativeWei = 0n;
  }

  const usdcRaw = await readErc20(client, USDC, 6, tbaAddress);
  const wethRaw = await readErc20(client, WETH, 18, tbaAddress);

  const erc20: TbaErc20Balance[] = [];

  if (usdcRaw > 0n) {
    erc20.push({
      symbol: 'USDC',
      contract: USDC,
      decimals: 6,
      amount: formatUnits(usdcRaw, 6),
      wei: usdcRaw.toString(),
    });
  }
  if (wethRaw > 0n) {
    erc20.push({
      symbol: 'WETH',
      contract: WETH,
      decimals: 18,
      amount: formatEther(wethRaw),
      wei: wethRaw.toString(),
    });
  }

  return {
    nativeWei: nativeWei.toString(),
    nativeEth: formatEther(nativeWei),
    erc20,
  };
}
