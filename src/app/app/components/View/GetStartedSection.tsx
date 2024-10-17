import React from 'react';

const GetStartedSection: React.FC = () => {
    return (
        <div className="get-started-section">
            <h4>How to get started</h4>
            <div className="get-started-options">
                <div className="option">
                    <p>Purchase DCX</p>
                    <button className="purchase-dcx-btn">Purchase DCX</button>
                </div>
                <div className="option">
                    <p>Create an application</p>
                    <button className="create-app-btn">Create an App</button>
                </div>
            </div>
        </div>
    );
};

export default GetStartedSection;
