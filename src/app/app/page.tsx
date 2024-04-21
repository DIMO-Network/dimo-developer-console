import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

import './page.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome John</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      <div className="onboarding-steps">
        <Card className="card-border w-72">
          <div className="step-title">
            <p>Connect wallet</p>
            <p>Description</p>
          </div>
          <div className="step-action">
            <Button className="primary px-4 w-full">Connect</Button>
          </div>
        </Card>
        <Card className="card-border w-72">
          <div className="step-title">
            <p>Connect wallet</p>
            <p>Description</p>
          </div>
          <div className="step-action">
            <Button className="primary px-4 w-full">Connect</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
