/**
 * Unified Contracts Service
 * Combines Nevada, California, and Federal procurement feeds
 * Applies scoring, saved flags, verified flags, and public-record flags
 */

import { nvService } from "../nevada-procurement/nvService.js";
import { caService } from "../california-procurement/caService.js";
import { federalService } from "../sam/federalService.js";
import { savedContractsService } from "../supabase/savedContractsService.js";
import { scoreContract } from "./scoreContract.js";

export async function getUnifiedContracts(userProfile) {
  const nv = await nvService.getNevadaContracts();
  const ca = await caService.getCaliforniaContracts();
  const fed = await federalService.getFederalContracts();

  const combined = [...nv, ...ca, ...fed];

  return Promise.all(
    combined.map(async contract => ({
      ...contract,

      // AI scoring engine
      score: scoreContract(contract, userProfile),

      // Nevada = public records
      isPublicRecord: contract.source === "Nevada",

      // Federal = not verified
      isVerified: contract.source !== "Federal",

      // Supabase saved flag
      saved: await savedContractsService.isSaved(
        contract.id,
        userProfile.id
      )
    }))
  );
}
