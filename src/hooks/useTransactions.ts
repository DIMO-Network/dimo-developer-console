import {getFromSession, GlobalAccountSession} from "@/utils/sessionStorage";
import {IGlobalAccountSession} from "@/types/wallet";
import configuration from "@/config";
import {encodeFunctionData} from "viem";
import DimoLicenseABI from "@/contracts/DimoLicenseContract.json";
import {useContractGA} from "@/hooks/useContractGA";
import {useCallback} from "react";

export const useSetRedirectUri = (tokenId: number) => {
  const { processTransactions } = useContractGA();
  return useCallback(async (uri: string, enabled: boolean) => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!organizationInfo) throw new Error('Web3 connection failed');
    const transaction = [
      {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: 'setRedirectUri',
          args: [tokenId, enabled, uri],
        }),
      },
    ];
    await processTransactions(transaction);
  },  [processTransactions, tokenId]);
};
