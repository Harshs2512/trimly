export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Trimlly.",
};

export default function PrivacyPolicy() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last Updated: August 21, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create or modify your account, 
              request on-demand services, contact customer support, or otherwise communicate with us. This information 
              may include your name, email address, account role, booking information, and salon profile details you choose to provide.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We may use the information we collect about you to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our Services.</li>
              <li>Perform internal operations, including troubleshooting software bugs and operational problems.</li>
              <li>Send account, booking, security, and service-related communications necessary to operate the platform.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Sharing of Information</h2>
            <p className="text-muted-foreground">
              We may share information with service providers that help us operate the platform when they need it to perform services on our behalf.
              We may also share booking information with the relevant barber or shop so they can process your appointment request.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground">
              We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Contact Us</h2>
            <p className="text-muted-foreground">
              {supportEmail ? <>If you have any questions about this Privacy Policy, contact us at <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "If you have any questions about this Privacy Policy, use the support contact published by Trimlly."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
