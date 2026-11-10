"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from "lucide-react";

function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", name, params);
    }
  } catch {}
}

export default function ContactPageInteractive({
  companyName,
  supportEmail,
  supportPhone,
  whatsappNumber,
  address,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Indore");
  const [type, setType] = useState("customer");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6–9.");
      return;
    }
    if (!consent) {
      setError("Please agree to the contact consent checkbox to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          city,
          interest: type === "owner" ? "Salon Partner Onboarding" : "Customer Booking Assistance",
          message: message.trim(),
          source: "contact_form",
          page: "/contact",
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding my enquiry.",
          website: "", // honeypot
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
      trackEvent("contact_form_submitted", { type });
    } catch (err) {
      setError(err.message || "Failed to submit enquiry. Please try WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = async () => {
    trackEvent("contact_whatsapp_click");
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whatsapp_click", page: "/contact", source: "contact_page" }),
      });
    } catch {}

    const text = encodeURIComponent(`Hi ${companyName}, I'm reaching out from your Contact page.`);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleCall = async () => {
    trackEvent("contact_call_click");
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "call_click", page: "/contact", source: "contact_page" }),
      });
    } catch {}
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start">
      {/* Contact Channels (Left Column) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 space-y-6">
          <h2 className="text-2xl font-bold">Direct Channels</h2>

          <div className="space-y-4">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-[#25d366]/10 border border-[#25d366]/30 text-left hover:bg-[#25d366]/20 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25d366] text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Chat on WhatsApp</p>
                <p className="text-xs text-muted-foreground">Fastest response • Mon–Sat 10 AM – 7 PM</p>
              </div>
            </button>

            {/* Phone Call */}
            <a
              href={`tel:${supportPhone}`}
              onClick={handleCall}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Call Support</p>
                <p className="text-xs text-muted-foreground">{supportPhone}</p>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Email Us</p>
                <p className="text-xs text-muted-foreground break-all">{supportEmail}</p>
              </div>
            </a>

            {/* Address */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/80">
              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Headquarters</p>
                <p className="text-xs text-muted-foreground">{address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form (Right Column) */}
      <div className="lg:col-span-7">
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-md space-y-6">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Enquiry Received!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Thank you <strong>{name}</strong>. A {companyName} team member will contact you via WhatsApp or phone within business hours (Mon–Sat, 10 AM – 7 PM IST).
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold">Send an Enquiry</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill in your details below and our team will get back to you shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="website" value="" readOnly className="hidden" aria-hidden="true" />

                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5">I am a *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("customer")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        type === "customer"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      Customer (Booking Help)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("owner")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        type === "owner"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      Salon / Barber Owner
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold mb-1">Your Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aman Sharma"
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-semibold mb-1">Mobile Number (+91) *</label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 text-sm bg-muted border border-border border-r-0 rounded-l-xl text-muted-foreground font-semibold select-none">
                        +91
                      </span>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold mb-1">Email (Optional)</label>
                    <input
                      id="contact-email"
                      type="email"
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aman@example.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-city" className="block text-xs font-semibold mb-1">City *</label>
                    <select
                      id="contact-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Indore">Indore</option>
                      <option value="Bhopal">Bhopal</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi-NCR">Delhi-NCR</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Pune">Pune</option>
                      <option value="Other">Other City</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold mb-1">Message / Details</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we assist you?"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="contact-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <label htmlFor="contact-consent" className="text-xs text-muted-foreground cursor-pointer">
                    I agree to be contacted by {companyName} regarding this inquiry. See{" "}
                    <a href="/privacy" target="_blank" className="text-primary underline">
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>

                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? "Sending..." : "Submit Enquiry"} <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

