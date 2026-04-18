import { useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useEstimateFeesPerGas,
  useEstimateGas,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { encodeFunctionData, formatEther } from 'viem';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChain, hoodratsChainId } from '../../lib/chain';

const readOpts = { chainId: hoodratsChainId } as const;

/** Gas + small totals need more than 4 decimals — 0.0002 was rounding to 0.0000. */
function formatEthApprox(wei: bigint): string {
  const str = formatEther(wei);
  const n = Number(str);
  if (!Number.isFinite(n)) return `${str} ETH`;
  if (n === 0) return '~0 ETH';
  const places = n < 0.01 ? 6 : n < 1 ? 5 : 4;
  let fixed = n.toFixed(places);
  if (fixed.includes('.')) fixed = fixed.replace(/\.?0+$/, '');
  return `~${fixed} ETH`;
}

export function useHoodratsMint() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [qty, setQty] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const { writeContractAsync, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: cost } = useReadContract({
    ...readOpts,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'cost',
  });
  const { data: totalSupply } = useReadContract({
    ...readOpts,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'totalSupply',
  });
  const { data: maxSupply } = useReadContract({
    ...readOpts,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'maxSupply',
  });
  const { data: maxPerTx } = useReadContract({
    ...readOpts,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'maxMintAmountPerTx',
  });
  const { data: paused } = useReadContract({
    ...readOpts,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'paused',
  });

  const maxQty = useMemo(() => {
    if (maxPerTx == null || maxSupply == null || totalSupply == null) return 1;
    const left = maxSupply - totalSupply;
    if (left <= 0n) return 0;
    const cap = maxPerTx;
    const allowed = left < cap ? left : cap;
    return Number(allowed);
  }, [maxPerTx, maxSupply, totalSupply]);

  const clampedQty =
    maxQty <= 0 ? 0 : Math.min(Math.max(1, qty), Math.max(1, maxQty));

  const totalWei = useMemo(() => {
    if (cost == null || clampedQty <= 0) return undefined;
    return cost * BigInt(clampedQty);
  }, [cost, clampedQty]);

  const canEstimateGas = Boolean(
    address &&
      isConnected &&
      chainId === hoodratsChainId &&
      totalWei != null &&
      totalWei > 0n &&
      !paused &&
      clampedQty > 0 &&
      maxQty > 0,
  );

  const mintCalldata = useMemo(
    () =>
      encodeFunctionData({
        abi: hoodratsAbi,
        functionName: 'mint',
        args: [BigInt(clampedQty)],
      }),
    [clampedQty],
  );

  const {
    data: gasLimit,
    isFetching: gasEstimating,
    isError: gasEstimateFailed,
    error: gasEstimateError,
  } = useEstimateGas({
    chainId: hoodratsChainId,
    account: address,
    to: HOODRATS_ADDRESS,
    data: mintCalldata,
    value: totalWei ?? 0n,
    query: { enabled: canEstimateGas },
  });

  const { data: feeData } = useEstimateFeesPerGas({
    chainId: hoodratsChainId,
    type: 'eip1559',
  });

  const estimatedGasWei = useMemo(() => {
    if (gasLimit == null || feeData?.maxFeePerGas == null) return undefined;
    return gasLimit * feeData.maxFeePerGas;
  }, [gasLimit, feeData?.maxFeePerGas]);

  const estimatedGasLabel = useMemo(() => {
    if (estimatedGasWei == null) return null as string | null;
    return formatEthApprox(estimatedGasWei);
  }, [estimatedGasWei]);

  const maxTotalOutWei = useMemo(() => {
    if (totalWei == null || estimatedGasWei == null) return undefined;
    return totalWei + estimatedGasWei;
  }, [totalWei, estimatedGasWei]);

  const maxTotalOutLabel = useMemo(() => {
    if (maxTotalOutWei == null) return null as string | null;
    return formatEthApprox(maxTotalOutWei);
  }, [maxTotalOutWei]);

  const gasEstimateMessage = gasEstimateFailed
    ? (gasEstimateError &&
      typeof gasEstimateError === 'object' &&
      'shortMessage' in gasEstimateError &&
      typeof (gasEstimateError as { shortMessage?: string }).shortMessage ===
        'string'
        ? (gasEstimateError as { shortMessage: string }).shortMessage
        : (gasEstimateError as Error | undefined)?.message) ?? 'Gas estimate failed'
    : null;

  const minting = isPending || confirming || switching;
  const wrongChain = isConnected && chainId !== hoodratsChainId;

  async function onMint() {
    setActionError(null);
    if (!isConnected || cost == null || paused || clampedQty <= 0) return;
    try {
      if (chainId !== hoodratsChainId) {
        await switchChainAsync({ chainId: hoodratsChainId });
      }
      reset();
      await writeContractAsync({
        chainId: hoodratsChainId,
        address: HOODRATS_ADDRESS,
        abi: hoodratsAbi,
        functionName: 'mint',
        args: [BigInt(clampedQty)],
        value: cost * BigInt(clampedQty),
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Mint failed';
      setActionError(msg);
    }
  }

  const costLabel = cost != null ? `${formatEther(cost)} ETH` : '…';
  const supplyLabel =
    totalSupply != null && maxSupply != null
      ? `${totalSupply.toString()} / ${maxSupply.toString()}`
      : '…';
  const totalLabel =
    totalWei != null ? `${formatEther(totalWei)} ETH` : '—';

  const state = {
    address,
    isConnected,
    chainId,
    wrongChain,
    switching,
    switchChainAsync,
    hoodratsChain,
    hoodratsChainId,
    qty,
    setQty,
    cost,
    totalSupply,
    maxSupply,
    maxPerTx,
    paused,
    maxQty,
    clampedQty,
    totalWei,
    minting,
    onMint,
    error,
    actionError,
    isSuccess,
    hash,
    costLabel,
    supplyLabel,
    totalLabel,
    estimatedGasWei,
    estimatedGasLabel,
    maxTotalOutWei,
    maxTotalOutLabel,
    gasEstimating,
    gasEstimateFailed,
    gasEstimateMessage,
  };
  return state;
}

export type HoodratsMint = ReturnType<typeof useHoodratsMint>;
