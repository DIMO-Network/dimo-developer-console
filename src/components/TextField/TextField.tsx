import { InputHTMLAttributes, FC } from "react";

import classNames from "classnames";

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className: string;
}

export const TextField: FC<IProps> = ({ className, ...props }) => (
  <input className={classNames(className)} {...props} />
);

TextField.defaultProps = {
  className: "",
};

export default TextField;
