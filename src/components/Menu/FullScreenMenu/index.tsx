import {FC, useState} from "react";
import { Bars3Icon } from '@heroicons/react/24/solid';
import clsx from 'classnames';
import {Menu} from "@/components/Menu";

const FullScreenMenu: FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <>
      <button className={'bg-surface-default rounded-2xl size-12 md:hidden flex items-center justify-center'} onClick={() => setIsSidebarOpen(true)}>
        <Bars3Icon className={"size-6"}/>
      </button>
      <nav
        className={clsx(
          "fixed inset-y-0 left-0 w-screen bg-gray-900 text-white p-6 z-50 flex flex-col gap-6 transition-transform",
          "md:hidden",
          isSidebarOpen ? "" : "hidden"
        )}
      >
        <Menu onClose={() => setIsSidebarOpen(false)} />
      </nav>
    </>

  );
};

export default FullScreenMenu;
