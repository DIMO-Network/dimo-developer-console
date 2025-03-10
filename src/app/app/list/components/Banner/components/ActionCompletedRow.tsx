import {CheckCircleIcon} from "@heroicons/react/16/solid";
import React from "react";

export const ActionCompletedRow = ({ text }: {text: string; }) => {
  return (
    <div className={"flex flex-row items-center gap-2"}>
      <CheckCircleIcon
        className="size-4 text-feedback-success"
      />
      <p className={"text-base text-white"}>{text}</p>
    </div>
  );
};
