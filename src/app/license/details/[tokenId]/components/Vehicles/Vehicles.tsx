import React, {FC} from "react";
import {Title} from "@/components/Title";
import {FragmentType, gql, useFragment} from "@/gql";
import {useQuery} from "@apollo/client";
import {Loader} from "@/components/Loader";

import './Vehicles.css';

export const DEVELOPER_LICENSE_VEHICLES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
    clientId
  }
`);

const GET_VEHICLE_COUNT_BY_CLIENT_ID = gql(`
  query GetVehicleCountByClientId($clientId:Address!) {
    vehicles(first:0, filterBy:{privileged:$clientId}) {
      totalCount
    }
  }
`);

interface IProps {
  license: FragmentType<typeof DEVELOPER_LICENSE_VEHICLES_FRAGMENT>;
}

export const Vehicles: FC<IProps> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_LICENSE_VEHICLES_FRAGMENT, license);
  const {data, loading, error} = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID,
    {variables:{clientId: fragment.clientId}}
  );

  return (
    <div className={"license-details-section"}>
      <div className={"license-details-section-header"}>
        <Title component="h2" className={"text-xl"}>Vehicles</Title>
      </div>
      <div className={'flex flex-col flex-1'}>
        {!!error && <p>We had trouble fetching the connected vehicles</p>}
        {loading && <Loader isLoading={true} />}
        {!!data && <VehiclesTotalCount totalCount={data.vehicles.totalCount} />}
      </div>
    </div>
  );
};

const VehiclesTotalCount = ({ totalCount }: {totalCount: number}) => {
  return (
    <div className={"vehicle-count-container"}>
      <Title className={"text-4xl"}>{totalCount}</Title>
      <p>Connected Vehicles</p>
    </div>
  );
};
