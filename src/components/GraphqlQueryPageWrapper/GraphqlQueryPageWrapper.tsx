import React, { FC, PropsWithChildren } from 'react';
import { ApolloError } from '@apollo/client';
import { Loader } from '@/components/Loader';

interface GraphqlQueryPageWrapperProps {
  loading: boolean;
  error?: ApolloError;
  customErrorMessage?: string;
}

export const GraphqlQueryPageWrapper: FC<
  PropsWithChildren<GraphqlQueryPageWrapperProps>
> = ({ loading, error, children, customErrorMessage }) => {
  if (loading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>{customErrorMessage ?? error.message}</p>;
  }
  return <>{children}</>;
};
