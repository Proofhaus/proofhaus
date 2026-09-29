import type { Abi } from "viem";
import type { TargetKind } from "./target";

// build the set of "name(type,type)" signatures present in an abi
function signatures(abi: Abi): Set<string> {
  const s = new Set<string>();
  for (const item of abi) {
    if (item.type === "function") {
      s.add(`${item.name}(${item.inputs.map((i) => i.type).join(",")})`);
    }
  }
  return s;
}

// classify a contract by the interface it exposes; null if no known shape matches
export function detectKind(abi: Abi): TargetKind | null {
  const s = signatures(abi);
  if (s.has("swap(address,uint256,address)") && s.has("getReserves()")) return "amm";
  if (s.has("deposit(uint256,address)") && s.has("redeem(uint256,address,address)")) return "erc4626";
  if (s.has("deposit()") && s.has("withdraw()")) return "bank";
  return null;
}
