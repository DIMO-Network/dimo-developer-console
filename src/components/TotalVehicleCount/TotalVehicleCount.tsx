import {Title} from "@/components/Title";
import React from "react";

export const TotalVehicleCount = ({ totalCount }: {totalCount: number}) => (
  <div className={'flex flex-row items-center gap-2.5 pb-4 md:pb-0'}>
    <Title className={'text-4xl'}>{totalCount}</Title>
    <p>Connected Vehicles</p>
  </div>
);
