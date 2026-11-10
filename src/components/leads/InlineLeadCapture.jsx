"use client";

import { useState } from "react";
import { MessageSquare, Phone, CheckCircle2, ArrowRight, Store, Scissors, AlertCircle } from "lucide-react";
import { LEAD_CAPTURE_CONFIG } from "@/config/leadCapture";

function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", name, params);
    }
  } catch {}
}

/**
 * 1. Home Inline Lead Section ("Tell us what you need")
 */
export function HomeInlineLead() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Indore");
  const [service, setService] = useState("Haircut & Styling");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!consent) {
      setError("Please accept the consent checkbox to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "customer",
          name: name.trim(),
          phone: phone.trim(),
          city,
          interest: service,
          source: "contact_form",
          page: "/",
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding my enquiry.",
          website: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
      trackEvent("home_inline_lead_submitted");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-muted/40 border-y border-border/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="rounded-3xl bg-card border border-border/80 p-8 sm:p-12 shadow-sm">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold">Request Received!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thanks <strong>{name}</strong>! We will match you with top salons in <strong>{city}</strong> for {service} and message you on WhatsApp shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center sm:text-left space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
                  <Scissors className="w-3.5 h-3.5" /> Can&apos;t Decide on a Salon?
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Tell Us What You Need — We&apos;ll Find the Right Match
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Share your preferred city and service. Our grooming concierge will send you handpicked verified salons with real-time slot availability.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="website" value="" readOnly className="hidden" aria-hidden="true" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="home-lead-name" className="block text-xs font-semibold mb-1 text-foreground">
                      Your Name *
                    </label>
                    <input
                      id="home-lead-name"
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aditya Sharma"
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="home-lead-phone" className="block text-xs font-semibold mb-1 text-foreground">
                      Mobile Number (+91) *
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 text-sm bg-muted border border-border border-r-0 rounded-l-xl text-muted-foreground font-semibold select-none">
                        +91
                      </span>
                      <input
                        id="home-lead-phone"
                        type="tel"
                        required
                        maxLength={10}
                        inputMode="numeric"
                        value={phone.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                          setError("");
                        }}
                        placeholder="98765 43210"
                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="home-lead-city" className="block text-xs font-semibold mb-1 text-foreground">
                      Your City *
                    </label>
                    <select
                      id="home-lead-city"
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

                  <div>
                    <label htmlFor="home-lead-service" className="block text-xs font-semibold mb-1 text-foreground">
                      Service Interested In
                    </label>
                    <select
                      id="home-lead-service"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Haircut & Styling">Haircut & Styling</option>
                      <option value="Beard Trim & Grooming">Beard Trim & Grooming</option>
                      <option value="Facial & Skin Care">Facial & Skin Care</option>
                      <option value="Hair Spa & Treatment">Hair Spa & Treatment</option>
                      <option value="Bridal / Groom Package">Bridal / Groom Package</option>
                      <option value="Kids Haircut">Kids Haircut</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="home-lead-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <label htmlFor="home-lead-consent" className="text-xs text-muted-foreground cursor-pointer">
                    I agree to be contacted by Trimlly regarding my appointment enquiry.
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
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? "Matching..." : "Get Recommended Salons"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * 2. City Page Inline Lead Section ("Can't find the right barber in {city}?")
 */
export function CityInlineLead({ cityName }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!consent) {
      setError("Please accept the consent checkbox to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "customer",
          name: name.trim(),
          phone: phone.trim(),
          city: cityName,
          interest: need || `Custom barber request for ${cityName}`,
          source: "contact_form",
          page: `/barbers/city/${cityName.toLowerCase()}`,
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding my enquiry.",
          website: "",
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
      trackEvent("city_inline_lead_submitted", { city: cityName });
    } catch (err) {
      setError(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="my-10 p-6 sm:p-8 rounded-3xl bg-secondary/30 border border-border/80">
      {submitted ? (
        <div className="text-center py-4 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-lg">Thank You!</h4>
          <p className="text-xs text-muted-foreground">
            We will review nearby verified options in <strong>{cityName}</strong> and WhatsApp you shortly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">Can&apos;t find the right barber in {cityName}?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tell us your area or required style. We will connect you directly with vetted local stylists.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" name="website" value="" readOnly className="hidden" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                maxLength={100}
                placeholder="Your Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 text-xs bg-background border border-border rounded-xl"
              />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-Digit Mobile *"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="px-3 py-2 text-xs bg-background border border-border rounded-xl"
              />
              <input
                type="text"
                placeholder="Specific service or area (optional)"
                maxLength={200}
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                className="px-3 py-2 text-xs bg-background border border-border rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer"
                />
                Contact me via WhatsApp/call
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition"
              >
                {submitting ? "Submitting..." : "Request Barber Match"}
              </button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * 3. Salon Owner Inline Lead Section ("List Your Salon")
 */
export function SalonOwnerInlineLead() {
  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Indore");
  const [chairs, setChairs] = useState("2-4 Chairs");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!consent) {
      setError("Please accept the consent checkbox to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "owner",
          name: ownerName.trim(),
          phone: phone.trim(),
          city,
          interest: `Salon Owner: ${salonName.trim()} (${chairs})`,
          source: "contact_form",
          page: "/for-barbers",
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding salon partner listing.",
          website: "",
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
      trackEvent("owner_inline_lead_submitted");
    } catch (err) {
      setError(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 sm:p-10 rounded-3xl bg-card border border-border/80 shadow-md space-y-6">
      {submitted ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold">Registration Enquiry Received!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Thank you <strong>{ownerName}</strong>. Our partner onboarding specialist will call or message your number to set up <strong>{salonName}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider mb-2">
              <Store className="w-3.5 h-3.5" /> 5-Minute Setup
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Request Your Free Salon Partner Listing
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Zero monthly subscription fees. Start receiving nearby customer appointments on your phone.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="website" value="" readOnly className="hidden" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="owner-salon-name" className="block text-xs font-semibold mb-1">Salon / Shop Name *</label>
                <input
                  id="owner-salon-name"
                  type="text"
                  required
                  maxLength={120}
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="e.g. Royal Crown Barbers"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="owner-name" className="block text-xs font-semibold mb-1">Owner / Manager Name *</label>
                <input
                  id="owner-name"
                  type="text"
                  required
                  maxLength={100}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Sunil Rathore"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="owner-phone" className="block text-xs font-semibold mb-1">Mobile Number (+91) *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 text-sm bg-muted border border-border border-r-0 rounded-l-xl text-muted-foreground font-semibold select-none">
                    +91
                  </span>
                  <input
                    id="owner-phone"
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="owner-city" className="block text-xs font-semibold mb-1">City *</label>
                  <select
                    id="owner-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl"
                  >
                    <option value="Indore">Indore</option>
                    <option value="Bhopal">Bhopal</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi-NCR">Delhi-NCR</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Pune">Pune</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="owner-chairs" className="block text-xs font-semibold mb-1">Styling Chairs</label>
                  <select
                    id="owner-chairs"
                    value={chairs}
                    onChange={(e) => setChairs(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl"
                  >
                    <option value="1 Chair">1 Chair</option>
                    <option value="2-4 Chairs">2-4 Chairs</option>
                    <option value="5-8 Chairs">5-8 Chairs</option>
                    <option value="9+ Chairs">9+ Chairs</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                id="owner-consent"
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
              />
              <label htmlFor="owner-consent" className="text-xs text-muted-foreground cursor-pointer">
                I agree to be contacted by Trimlly regarding salon partner listing and verification.
              </label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? "Sending Request..." : "Request Salon Listing"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * 4. Blog Mid-Article Mini-CTA
 */
export function BlogInlineLead() {
  const whatsappNum = LEAD_CAPTURE_CONFIG.contact.whatsappNumber;

  const handleWhatsApp = async () => {
    trackEvent("blog_mini_cta_whatsapp_click");
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whatsapp_click", page: "/blog", source: "blog_inline" }),
      });
    } catch {}

    const text = encodeURIComponent("Hi Trimlly, I read your grooming article and want help finding a top stylist near me.");
    window.open(`https://wa.me/${whatsappNum}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/20 to-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 not-prose">
      <div className="space-y-1 text-center sm:text-left">
        <h4 className="font-bold text-base text-foreground flex items-center justify-center sm:justify-start gap-1.5">
          <Scissors className="w-4 h-4 text-primary" /> Looking for this style in your city?
        </h4>
        <p className="text-xs text-muted-foreground">
          Connect directly with our grooming concierge on WhatsApp to find verified stylists with open slots.
        </p>
      </div>

      <button
        onClick={handleWhatsApp}
        className="px-5 py-2.5 rounded-xl bg-[#25d366] text-white text-xs font-bold hover:bg-[#1ebe5d] transition flex items-center gap-1.5 shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Ask on WhatsApp
      </button>
    </div>
  );
}

