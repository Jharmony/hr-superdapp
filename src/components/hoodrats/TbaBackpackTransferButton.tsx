import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { hoodratsChainId } from '../../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import {
  ERC6551_OPERATION_CALL,
  encodeErc721SafeTransferFromCalldata,
  erc6551ExecutableAbi,
} from '../../lib/tbaExecute';

type Props = {
  /** Hoodrat whose backpack this is (page token). */
  parentTokenId: number;
  tbaAddress: `0x${string}`;
  /** NFT contract held inside the TBA. */
  nftContract: `0x${string}`;
  nftTokenId: string;
  onTransferred?: () => void;
};

export function TbaBackpackTransferButton({
  parentTokenId,
  tbaAddress,
  nftContract,
  nftTokenId,
  onTransferred,
}: Props) {
  const { address, isConnected } = useAccount();
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: owner } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'ownerOf',
    args: [BigInt(parentTokenId)],
    query: { enabled: parentTokenId > 0 },
  });

  const isParentOwner =
    Boolean(address && owner) &&
    (owner as string).toLowerCase() === (address as string).toLowerCase();

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: hoodratsChainId,
  });

  useEffect(() => {
    if (!isSuccess) return;
    onTransferred?.();
    reset();
  }, [isSuccess, onTransferred, reset]);

  const transferToWallet = useCallback(() => {
    setLocalError(null);
    if (!address) {
      setLocalError('Connect a wallet first.');
      return;
    }
    let tid: bigint;
    try {
      tid = BigInt(nftTokenId);
    } catch {
      setLocalError('Invalid token id.');
      return;
    }
    const calldata = encodeErc721SafeTransferFromCalldata({
      from: tbaAddress,
      to: address as `0x${string}`,
      tokenId: tid,
    });
    writeContract({
      chainId: hoodratsChainId,
      address: tbaAddress,
      abi: erc6551ExecutableAbi,
      functionName: 'execute',
      args: [nftContract, 0n, calldata, ERC6551_OPERATION_CALL],
    });
  }, [address, nftContract, nftTokenId, tbaAddress, writeContract]);

  if (!isConnected || !isParentOwner) return null;

  const busy = isPending || isConfirming;
  const errMsg = localError ?? (error?.shortMessage || error?.message) ?? null;

  return (
    <div className="mt-2 space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void transferToWallet()}
        className="w-full rounded-lg border border-lime-600/50 bg-lime-950/40 px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-lime-100/95 transition hover:border-lime-400/60 hover:bg-lime-900/35 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Confirm in wallet…' : 'Transfer to my wallet'}
      </button>
      <p className="text-[0.6rem] leading-snug text-zinc-500">
        Sends from this rat’s Tokenbound account to your connected address. You pay gas; the rat
        NFT must stay in your wallet to authorize the move.
      </p>
      {errMsg ? <p className="text-[0.6rem] text-red-300/90">{errMsg}</p> : null}
    </div>
  );
}
