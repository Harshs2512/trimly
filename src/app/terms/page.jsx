export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Trimlly.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last Updated: August 21, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Trimlly, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Trimlly provides a platform for barbers to manage their appointments and for clients to book haircuts and other grooming services. 
              We act solely as an intermediary between the service provider (barber) and the client.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. User Conduct</h2>
            <p className="text-muted-foreground">
              Users agree to use the service for lawful purposes only. You agree not to take any action that might compromise the security of the site, 
              render the site inaccessible to others or otherwise cause damage to the site or its content.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Appointment Cancellations</h2>
            <p className="text-muted-foreground">
              Customers may cancel eligible appointments through the platform. Appointment acceptance, cancellation, rescheduling, completion, and no-show states are recorded by Trimlly according to the booking workflow available to the customer and barber.
            </p>
          </section>

          <section className="space-y-4">
             <h2 className="text-2xl font-semibold text-foreground">5. Modifications to Service</h2>
            <p className="text-muted-foreground">
              Trimlly reserves the right at any time to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
