import {createContext} from "react";
import {LoadingProps} from "@/components/LoadingModal";

interface IProps {
  setLoadingStatus: (loadingStatus: LoadingProps) => void;
  clearLoadingStatus: () => void;
}

export const LoadingStatusContext = createContext<IProps>({setLoadingStatus: () => {}, clearLoadingStatus: () => {}});
