import React, { ComponentType } from 'react';

import { NotificationContext } from '@/context/notificationContext';
import { NotificationPanel } from '@/components/NotificationPanel/NotificationPanel';
import { Toast } from '@/components/Toast';
import { useNotification } from '@/hooks';

export const withNotifications = <P extends object>(
  WrappedComponent: ComponentType<P>
) => {
  const HOC: React.FC<P> = (props) => {
    const { notifications, setNotification } = useNotification();

    // Render the wrapped component with any additional props
    return (
      <NotificationContext.Provider value={{ notifications, setNotification }}>
        <WrappedComponent {...props} />
        <NotificationPanel>
          {notifications?.map((item) => {
            return <Toast key={item.id} {...item} />;
          })}
        </NotificationPanel>
      </NotificationContext.Provider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withNotifications(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withNotifications;
