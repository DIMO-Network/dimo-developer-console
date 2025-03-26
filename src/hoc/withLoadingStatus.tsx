import React, {ComponentType, useState} from "react";
import {LoadingModal, LoadingProps} from "@/components/LoadingModal";
import {LoadingStatusContext} from "@/context/LoadingStatusContext";

export const withLoadingStatus = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
    const clearLoadingStatus = () => setLoadingStatus(undefined);

    return (
      <LoadingStatusContext.Provider value={{setLoadingStatus, clearLoadingStatus}}>
        <WrappedComponent {...props} />
        <LoadingModal isOpen={!!loadingStatus} setIsOpen={clearLoadingStatus} {...loadingStatus} />
      </LoadingStatusContext.Provider>
    );
  };
  HOC.displayName = `withLoadingStatus(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
