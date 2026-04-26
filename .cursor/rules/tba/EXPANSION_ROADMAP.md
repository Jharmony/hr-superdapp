# Hoodrats × ERC-6551 (Tokenbound) expansion roadmap

This document captures how Tokenbound-style TBAs fit the app and what to build in each phase. Deeper EIP-6551 and contract references live under [`.cursor/rules/threejs/tba/`](../threejs/tba/).

## Concepts

- **Tokenbound account (TBA)**: A smart contract wallet **deterministically** tied to one NFT (`chainId`, `tokenContract`, `tokenId`) via the [ERC-6551 registry](https://eips.ethereum.org/EIPS/eip-6551). The Hoodrat NFT **is** the “key”; the TBA address is the **backpack** that can hold ETH, ERC-20s, and other NFTs.
- **Hoodrats**: Mainnet collection `HOODRATS_ADDRESS` in `src/lib/contract.ts`; chain id **1** (see `src/lib/chain.ts`).
- **Registry (Ethereum)**: `0x000000006551c19487814612e58FE06813775758` — same on all networks in Tokenbound’s table.
- **Tokenbound account implementation (proxy)** for `createAccount` / `account()` on Ethereum: `0x55266d75D1a14E4572138116aF39863Ed6596E7F` (see `threejs/tba/contracts/deployments.mdx`).
- **Salt**: The registry `account(implementation, salt, chainId, tokenContract, tokenId)` uses a `bytes32` salt. Tokenbound’s default flow uses **`bytes32(0)`**. If any Hoodrat TBAs were ever created with a non-zero salt, their address would differ — we would need per-token salt metadata or indexing; assume **zero salt** until proven otherwise.

## Phase 1 — Token page “backpack” (read-only) ✅ target of branch `feature/tba-phase1-backpack`

**Goal:** On each `/rats/:id/` page, show the Hoodrat’s **TBA address** and a **read-only inventory** of NFTs OpenSea attributes to that address.

**Implementation steps (do not skip):**

1. **Resolve TBA address on the server** using `viem` `readContract` on the ERC-6551 registry `account(...)` with:
   - `implementation` = Tokenbound proxy above  
   - `salt` = `0x0000…0000` (32 bytes)  
   - `chainId` = `1`  
   - `tokenContract` = `HOODRATS_ADDRESS`  
   - `tokenId` = the page’s id  
   Reuse the same RPC pattern as metadata (`PUBLIC_ETH_RPC_URL` or public node) via `createMetadataPublicClient()` from `src/lib/metadata.ts`.

2. **Inventory:** Call OpenSea API v2  
   `GET https://api.opensea.io/api/v2/chain/ethereum/account/{tbaAddress}/nfts?limit=50`  
   with `x-api-key: OPENSEA_API_KEY` (same key as marketplace). Paginate lightly if needed (e.g. cap at 100 items for v1 UI). If the key is missing, still return the **TBA address** and an explicit `inventoryUnavailableReason`.

3. **API route:** e.g. `GET /api/tba/backpack.json?tokenId=…` returns JSON: `tbaAddress`, `nfts[]` (slim rows: contract, tokenId, name, image, openseaUrl), `truncated`, optional error fields. Keeps secrets server-side.

4. **UI:** A `TbaBackpackPanel` client component on `RatPrerenderedDetailPage`: loading / error states, Etherscan + OpenSea links for the TBA address, grid of thumbnails with links to OpenSea items.

**Non-goals for phase 1:** No wallet writes, no “equip to world”, no creation of the TBA on-chain (first receive still deploys lazily on first interaction).

## Phase 2 — “My Hoodrats” active rat ✅

- **Storage:** `src/lib/activeHoodratStorage.ts` — per-wallet (`0x…` lower) active token id in `localStorage` key `superdapp:activeHoodrat:v1`; cleared if that id is no longer in `tokensOfOwner`.
- **UI:** My Hoodrats — `Set as active rat` on each `OwnedRatCard`, banner + link to `/world/`, **Clear active**.
- **Worlds:** `useActiveHoodratTraitAttributes` loads `tokenURI` → JSON metadata → passes `traitAttributes` into `HoodratPlayer`, which runs `applyTraitAttributesToScene` (same path as `TraitHoodratPreview` / GLB export). Cyber + UR rift wrap with `Web3Providers` so wagmi reads work.

## Phase 3 — In-world HUD ✅

- **`WorldTbaHud`** on `/world/` and `/world/next/`: collapsible **Backpack** panel (bottom-left) — TBA address, **native ETH** + **USDC / WETH** (mainnet `balanceOf` when > 0), OpenSea NFT grid (same `/api/tba/backpack.json` + `OPENSEA_API_KEY` caveats as token page). Hint when no active rat.
- **API:** `GET /api/tba/backpack.json` includes `nativeWei`, `nativeEth`, `erc20[]` from `readTbaWalletBalances` (`src/lib/tbaBackpackBalances.ts`).
- **Home hero:** `HoodratHeroCanvas` uses `useActiveHoodratTraitAttributes()` — when an active owned rat exists, hero GLB uses **`applyTraitAttributesToScene`** (tribe tint); otherwise default rig.

## Phase 4 — Writes (optional, later)

- Transfer NFTs into/out of the TBA, listings, etc., via wagmi + user-signed txs; guardrails and copy around “you are moving assets from the rat’s backpack.”

## References

- Tokenbound docs: [https://docs.tokenbound.org/intro](https://docs.tokenbound.org/intro)  
- Internal mirror: `threejs/tba/eip-6551.md`, `guides/read-a-tba.mdx`, `guides/interact-with-tba.mdx`
- **Manual testing:** [TESTING.md](./TESTING.md)
