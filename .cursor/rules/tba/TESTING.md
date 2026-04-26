# Hoodrats · active rat · TBA — manual testing guide

Use this checklist to verify the implementation end-to-end. Run the app with `npm run dev` unless noted.

## Prerequisites

| Need | Why |
|------|-----|
| **Wallet with ≥1 Hoodrat** on **Ethereum mainnet** | `tokensOfOwner`, `tokenURI`, and TBA resolution are mainnet-only in this app. |
| **`PUBLIC_ETH_RPC_URL`** (optional but recommended) | Metadata, TBA address, and balance reads use `createMetadataPublicClient()`; falls back to a public node if unset. |
| **`OPENSEA_API_KEY`** (optional) | **NFT inventory** in Tokenbound backpack, world **Backpack** panel, and nav rely on OpenSea’s account-NFTs API. Without it you still get **TBA address + ETH/USDC/WETH balances** from RPC where implemented. |

---

## 1. My Hoodrats (`/my-hoodrats/`)

1. **Not connected** — Intro copy describes the page (gallery, 3D+GLB, **+** for active rat). Empty state asks to connect in the header.
2. **Connected, owns rats** — Cards show image + metadata; **Open page** / **3D + GLB** work as before.
3. **+ on thumbnail** — Tap **+** (top-left on art). That token becomes **active** (tiny **ACTIVE** badge on that card; others show **+** again).
4. **Banner** — When an active rat exists: banner shows **#id**, **Enter cyber district**, **Clear active**.
5. **Clear active** — Removes storage; banner disappears; hero/worlds/nav fall back to “no active” behavior.

**Storage:** `localStorage` key `superdapp:activeHoodrat:v1`, keyed by **lowercase** `0x…` wallet. If stored id is not in `tokensOfOwner`, it is cleared automatically.

---

## 2. Header (`SiteNav`)

1. **Merged wallet pill** — Chain icon + address; click → **Wallet & activity** / **Switch network** (RainbowKit modals).
2. **Active chip** (only if valid active rat) — Thumbnail + **Active** + ▾.
3. **Dropdown** — Click chip → list of **owned** token IDs; pick one → updates active + closes menu. **Open token** / **My Hoodrats** links at bottom.
4. **RainbowKit account modal** — Open **Wallet & activity**; large avatar should show **active Hoodrat art** when metadata loaded (else ENS / initials fallback).

---

## 3. Home hero (`/`)

1. **No active rat** — Hero GLB is the **default** untinted rig; idle / walk / run / jump pills and keyboard shortcuts unchanged.
2. **With active rat** (same wallet, metadata loaded) — Hero uses **tribe tint** (`applyTraitAttributesToScene`). Caption above pills: *“Your active Hoodrat · tribe tint from metadata”*.
3. Switch active from header dropdown → hero should **update** after metadata refetch (may take a second).

---

## 4. Token page (`/rats/<id>/`)

1. **Tokenbound backpack** — Section loads `/api/tba/backpack.json?tokenId=<id>`: **TBA address**, copy, Etherscan / OpenSea profile links.
2. **With `OPENSEA_API_KEY`** — NFT grid for that TBA. Without key — message that inventory needs the key; address still shown.

---

## 5. API smoke test (optional)

```bash
curl -sS "http://localhost:4321/api/tba/backpack.json?tokenId=1" | jq .
```

Expect JSON: `tbaAddress`, `nativeWei`, `nativeEth`, `erc20` (array, may be empty), `nfts` (may be empty without OpenSea key), optional `inventoryUnavailableReason`, `truncated`.

---

## 6. Cyber world (`/world/`)

1. **Requires** reduced-motion **off** (same as before).
2. **Player** — Uses **active rat** traits on the GLB when set + valid (same hook as worlds).
3. **`WorldTbaHud`** — Bottom-left **Backpack** toggle. Open: TBA address, **ETH**, **USDC/WETH** if balance > 0 on mainnet, NFT thumbs (OpenSea). If **no active rat**, hint text instead.

---

## 7. UR rift (`/world/next/`)

Same **Backpack** HUD and **tinted** player behavior as cyber, minus portal.

---

## 8. Cross-page consistency

1. Set active on **My Hoodrats** → refresh **Home** → hero tint matches.
2. Switch active in **header** → **My Hoodrats** banner + card badges update (same tab; other tabs after `storage` event).
3. **World** while connected → backpack uses **current** `activeTokenId` from storage + ownership validation in `useActiveHoodratTraitAttributes`.

---

## Files reference (high level)

| Area | Main files |
|------|------------|
| Active storage | `src/lib/activeHoodratStorage.ts` |
| Active + metadata hook | `src/hooks/useActiveHoodratTraitAttributes.ts` |
| TBA address + backpack API | `src/lib/tba.ts`, `src/pages/api/tba/backpack.json.ts`, `src/lib/tbaOpenSeaServer.ts`, `src/lib/tbaBackpackBalances.ts` |
| Token page backpack UI | `src/components/hoodrats/TbaBackpackPanel.tsx` |
| My Hoodrats | `src/components/hoodrats/MyHoodratsApp.tsx`, `OwnedRatCard.tsx` |
| Nav + wallet | `src/components/nav/SiteNav.tsx`, `WalletConnectButton.tsx`, `MergedWalletMenu.tsx`, `NavActiveRatChip.tsx` |
| Rainbow avatar | `src/components/web3/HoodratRainbowAvatar.tsx`, `Web3Providers.tsx` |
| Home hero | `src/components/hero/HoodratHeroCanvas.tsx` |
| Worlds + HUD | `CyberWorldApp.tsx`, `UrRiftWorldApp.tsx`, `HoodratPlayer.tsx`, `WorldTbaHud.tsx` |
| Roadmap | `.cursor/rules/tba/EXPANSION_ROADMAP.md` |

---

## Known limits

- **ERC-20 balances** in API/HUD: **USDC** and **WETH** on **mainnet** only (not “all tokens”).
- **NFT inventory** requires OpenSea key server-side.
- **Active rat** must still be in **`tokensOfOwner`** or it is cleared.
