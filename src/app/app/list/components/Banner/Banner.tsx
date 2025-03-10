import React, {FC} from 'react';
import './Banner.css';
import CreateAppButton from "@/app/app/list/components/CreateAppButton";
import useOnboarding from "@/hooks/useOnboarding";
import AddCreditsButton from "@/app/app/list/components/AddCreditsButton";
import {ActionCompletedRow} from "@/app/app/list/components/Banner/components/ActionCompletedRow";
import {CTARow} from "@/app/app/list/components/Banner/components/CTARow";

export interface CTA {
  label: string;
  onClick: () => void;
}

export const Banner: FC = () => {
  const {balance, apps} = useOnboarding();
  return (
    <div className="banner-content">
      <div>
        <p className="font-black text-xl">Getting Started</p>
        <p className="text-text-secondary text-sm mt-1">You’re on the way to building with DIMO!</p>
      </div>
      <div className={"flex flex-col flex-1 gap-4 w-full"}>
        <ActionCompletedRow text={'Create account'} />
        <ActionCompletedRow text={'Confirm your details'} />
        {apps.length ? (<ActionCompletedRow text={'Create your first app'} />) : (
          <CTARow
            text={'Create your first app'}
            subtitle={"Now that your account is set up, it’s time to create your first application."}
            CTA={<CreateAppButton className={"white-with-icon"} />}
          />
        )}
        {apps.length ? (balance ? <ActionCompletedRow text={'Add credits'} /> : <CTARow text={'Add credits'} subtitle={'Your developer account needs DCX to function properly, purchase credits now'} CTA={<AddCreditsButton className={'white-with-icon'} />}/>) : null}
      </div>
    </div>
  );
};

export default Banner;
