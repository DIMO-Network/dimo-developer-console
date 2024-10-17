import React from 'react';

const OnboardingSection: React.FC = () => {
    return (
        <div className="onboarding-section">
            <h3>What are DIMO Credits (DCX)?</h3>
            <p>
                DCX is a stablecoin that’s pegged to one-tenth of a cent (0.001 USD), and is essential for all developers building on DIMO.
                For DIMO protocol fees, spending DCX or $DIMO is required. The only way to get DCX is by trading in $DIMO, which converts at the market price.
                This provides developers a way to lock in DCX at rates without being influenced by price fluctuation.
                DCX cannot be converted back into $DIMO and when it is spent, it is burned forever.
                For more details on DCX, check out our explanation on DCX & $DIMO.
            </p>
        </div>
    );
};

export default OnboardingSection;
