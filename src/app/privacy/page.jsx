export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Trimlly.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create or modify your account, 
              request on-demand services, contact customer support, or otherwise communicate with us. This information 
              may include: name, email, phone number, profile picture, and payment method.
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
              <li>Send you communications we think will be of interest to you, including information about products, services, and promotions.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Sharing of Information</h2>
            <p className="text-muted-foreground">
              We may share the information we collect about you with vendors, consultants, marketing partners, 
              and other service providers who need access to such information to carry out work on our behalf. 
              We may also share information with barbers to facilitate your bookings.
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
              If you have any questions about this Privacy Policy, please contact us at support@trimly.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
