import React, { FC, PropsWithChildren } from 'react';
import { Loader } from '@/components/Loader';

interface QueryPageWrapperProps {
  loading: boolean;
  error?: Error | string;
  customErrorMessage?: string;
}

export const QueryPageWrapper: FC<PropsWithChildren<QueryPageWrapperProps>> = ({
  loading,
  error,
  children,
  customErrorMessage,
}) => {
  if (loading) {
    return <Loader isLoading />;
  }
  if (error) {
    const errorMessage =
      customErrorMessage ?? (typeof error === 'string' ? error : error.message);
    return <p>{errorMessage}</p>;
  }
  return <>{children}</>;
};
