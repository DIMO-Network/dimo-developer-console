import React from 'react';

const AttentionBox: React.FC = () => {
    return (
        <div className="attention-box">
            <p className="attention-text">
                <span className="attention-title">Attention required:</span> Your
                developer account needs DCX to function properly. Please purchase more DCX
                to avoid service interruptions.
            </p>
            <button className="get-credits-btn">Get Credits</button>
        </div>
    );
};

export default AttentionBox;
