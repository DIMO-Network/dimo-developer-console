import React, {FC, ReactNode} from 'react';
import './Banner.css';
import CreateAppButton from "@/app/app/list/components/CreateAppButton";
import useOnboarding from "@/hooks/useOnboarding";
import AddCreditsButton from "@/app/app/list/components/AddCreditsButton";
import {CheckCircleIcon, PlusCircleIcon} from "@heroicons/react/16/solid";

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
        <IconRowWithText text={'Create account'} />
        <IconRowWithText text={'Confirm your details'} />
        {apps.length ? (<IconRowWithText text={'Create your first app'} />) : (
          <CTARow
            text={'Create your first app'}
            subtitle={"Now that your account is set up, it’s time to create your first application."}
            CTA={<CreateAppButton className={"white-with-icon"} />}
          />
        )}
        {balance ? <IconRowWithText text={'Add credits'} /> : <CTARow text={'Add credits'} subtitle={'Your developer account needs DCX to function properly, purchase credits now'} CTA={<AddCreditsButton />}/>}
      </div>
    </div>
  );
};

const IconRowWithText = ({ text }: {text: string; }) => {
  return (
    <div className={"flex flex-row items-center gap-2"}>
      <CheckCircleIcon className="size-4 text-green-600"/>
      <p className={"text-base text-white"}>{text}</p>
    </div>
  );
};

interface CTARowProps {
  text: string;
  subtitle: string;
  CTA: ReactNode;
}

const CTARow: FC<CTARowProps> = ({text, subtitle, CTA}) => {
  return (
    <div className={"flex flex-col md:flex-row justify-between w-full"}>
      <div className={"flex flex-row gap-2 items-center"}>
        <PlusCircleIcon className="size-4 text-white"/>
        <div>
          <p className={"text-base text-white"}>{text}</p>
          <p className={"text-sm text-text-secondary"}>{subtitle}</p>
        </div>
      </div>
      <div className={"mt-4 md:mt-0"}>
        {CTA}
      </div>
    </div>
  );
};

export default Banner;
