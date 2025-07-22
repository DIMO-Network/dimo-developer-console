'use client';

import { useQuery } from '@tanstack/react-query';
import { useGlobalAccount } from '@/hooks';
import { request, gql } from 'graphql-request';
import config from '@/config';

interface ConnectionsResponse {
  connections: {
    nodes: Array<{
      address: string;
    }>;
  };
}

interface ConnectionDetailsResponse {
  connection: {
    owner: string;
  };
}

const GET_CURRENT_CONNECTIONS = gql`
  query GetCurrentConnections {
    connections(first: 100) {
      nodes {
        address
      }
    }
  }
`;

const GET_CONNECTION_DETAILS = gql`
  query GetConnectionDetails($address: Address!) {
    connection(by: { address: $address }) {
      owner
    }
  }
`;

export const useUserConnections = () => {
  const { currentUser } = useGlobalAccount();
  console.log('Users org wallet: ', currentUser?.smartContractAddress);
  console.log('Users personal owner wallet: ', currentUser?.walletAddress);
  return useQuery({
    queryKey: ['user-connections', currentUser?.walletAddress],
    queryFn: async () => {
      if (!currentUser?.walletAddress) {
        return { hasConnections: false, connections: [] };
      }

      // Get all current network connections
      // TODO: Replace this with db (BARRETT)
      const connectionsData = await request<ConnectionsResponse>(
        config.identityApiUrl,
        GET_CURRENT_CONNECTIONS,
      );

      const allConnections = connectionsData.connections.nodes;

      if (allConnections.length === 0) {
        return { hasConnections: false, connections: [] };
      }

      const userConnections = [];

      for (const connection of allConnections) {
        try {
          const connectionDetails = await request<ConnectionDetailsResponse>(
            config.identityApiUrl,
            GET_CONNECTION_DETAILS,
            { address: connection.address },
          );

          if (
            connectionDetails.connection.owner.toLowerCase() ===
            currentUser.smartContractAddress.toLowerCase()
          ) {
            userConnections.push({
              address: connection.address,
              owner: connectionDetails.connection.owner,
            });
          }
        } catch (error) {
          console.error(
            `Error fetching details for connection ${connection.address}:`,
            error,
          );
        }
      }

      return {
        hasConnections: userConnections.length > 0,
        connections: userConnections,
      };
    },
    enabled: !!currentUser?.walletAddress,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
