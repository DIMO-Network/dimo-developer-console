import {FC} from "react";
import { Bars3Icon } from '@heroicons/react/24/solid';

const MenuButton: FC = () => {
  return (
    <button className={'bg-surface-default rounded-2xl size-12 md:hidden flex items-center justify-center'}>
      <Bars3Icon className={"size-6"}/>
    </button>
  );
};

export default MenuButton;
