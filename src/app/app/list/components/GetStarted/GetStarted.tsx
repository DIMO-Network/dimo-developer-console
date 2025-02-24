import { type ReactElement, type FC, ReactNode } from 'react';
import { PlusCircleIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/Button';
import { isOwner, isCollaborator } from '@/utils/user';
import { Title } from '@/components/Title';
import { useOnboarding } from '@/hooks';

import './GetStarted.css';

interface IProps {
  hasBalance: boolean;
  hasApps: boolean;
}

export const GetStarted: FC<IProps> = ({ hasBalance, hasApps }) => {
  const { handleCreateApp, handleOpenBuyCreditsModal } = useOnboarding();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const renderButtonContent = ({
    actionLabel,
    completed,
  }: {
    actionLabel: string;
    completed: boolean;
  }): ReactNode => {
    if (!completed) {
      if (isOwner(role)) {
        return actionLabel;
      }
      if (isCollaborator(role)) {
        return 'Pending';
      }
    }
    return <CheckIcon className="h5 w-5 stroke-green-700" />;
  };

  const renderAction = ({
    Icon,
    title,
    description,
    actionLabel,
    actionCta,
    completed,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Icon: ReactElement<any, string>;
    title: string;
    description: string;
    actionLabel: string;
    actionCta: () => void;
    completed: boolean;
  }) => {
    return (
      <div className="action">
        <div className="action-icon">{Icon}</div>
        <div className="action-content">
          <p className="action-title">{title}</p>
          <p className="action-description">{description}</p>
        </div>
        <div className="action-cta">
          <Button
            className="dark rounded-sm w-full"
            onClick={isOwner(role) ? actionCta : undefined}
            type="button"
          >
            {renderButtonContent({ actionLabel, completed })}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="get-started-content">
      <Title component="h4" className="title">
        How to get started
      </Title>
      <div className="actions-content">
        {renderAction({
          Icon: <CubeIcon className="h-5 w-5" />,
          title: 'Purchase DCX',
          description:
            'Obtain DCX to get credits, unlocking the DIMO developer ecosystem',
          actionLabel: 'Purchase DCX',
          actionCta: handleOpenBuyCreditsModal,
          completed: hasBalance,
        })}
        {renderAction({
          Icon: <PlusCircleIcon className="h-5 w-5" />,
          title: 'Create an application',
          description: 'Create an application as part of your Developer License',
          actionLabel: 'Create an app',
          actionCta: handleCreateApp,
          completed: hasApps,
        })}
      </div>
    </div>
  );
};

export default GetStarted;
