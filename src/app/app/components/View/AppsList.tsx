import React from 'react';

interface AppsListProps {
    apps: Array<{ id: string; name: string; status: string }>;
    onAppClick: (id: string) => void;
}

const AppsList: React.FC<AppsListProps> = ({ apps, onAppClick }) => {
    return (
        <div className="apps-section">
            <h4>Your applications</h4>
            <div className="apps-list">
                {apps.map((app) => (
                    <div key={app.id} className="app-item">
                        <button
                            className="app-name-btn"
                            onClick={() => onAppClick(app.id)}
                        >
                            {app.name}
                        </button>
                        <span className="app-status">{app.status}</span>
                    </div>
                ))}
            </div>
            <button className="create-new-app-btn">+ Create new</button>
        </div>
    );
};

export default AppsList;
