"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AccentPunctuation } from "./accent-punctuation";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

type ContactWidgetProps = {
  endpoint: string;
};

type FormspreeResponse = {
  errors?: Array<{ message?: string }>;
};

export function ContactWidget({ endpoint }: ContactWidgetProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      if (status !== "success") emailRef.current?.focus();
    });

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, status]);

  const closePanel = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedEmail = String(formData.get("email") ?? "");

    formData.set("_subject", "New portfolio message");
    formData.set("source", window.location.href);
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setReplyEmail(submittedEmail);
        setStatus("success");
        form.reset();
        return;
      }

      let result: FormspreeResponse | null = null;
      try {
        result = (await response.json()) as FormspreeResponse;
      } catch {}

      const providerMessage = result?.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join(" ");

      setErrorMessage(
        response.status === 429
          ? "Too many messages were sent recently. Please wait a moment and try again."
          : providerMessage ||
              "Your message could not be sent. Please try again.",
      );
      setStatus("error");
    } catch {
      setErrorMessage(
        "Your message could not be sent. Check your connection and try again.",
      );
      setStatus("error");
    }
  };

  const sendAnother = () => {
    setReplyEmail("");
    setErrorMessage("");
    setStatus("idle");
    window.requestAnimationFrame(() => emailRef.current?.focus());
  };

  return (
    <div className="contact-widget">
      {open && (
        <section
          id={panelId}
          className="contact-widget-panel"
          role="dialog"
          aria-labelledby={titleId}
        >
          <div className="contact-widget-header">
            <div>
              <h2 id={titleId}>
                <AccentPunctuation>Let’s chat.</AccentPunctuation>
              </h2>
              <p>
                <AccentPunctuation>
                  Have a role, project, or idea in mind? Send me a note.
                </AccentPunctuation>
              </p>
            </div>
            <button
              type="button"
              className="contact-widget-close"
              aria-label="Close contact form"
              onClick={closePanel}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>

          {status === "success" ? (
            <div className="contact-widget-success" role="status">
              <span className="contact-widget-success-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </span>
              <h3>Message sent</h3>
              <p>
                <AccentPunctuation>Thanks — I’ll reply to </AccentPunctuation>
                <strong>{replyEmail}</strong>
                <AccentPunctuation> by email.</AccentPunctuation>
              </p>
              <div className="contact-widget-success-actions">
                <button
                  type="button"
                  className="contact-widget-secondary"
                  onClick={sendAnother}
                >
                  Send another
                </button>
                <button
                  type="button"
                  className="contact-widget-primary"
                  onClick={closePanel}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form
              className="contact-widget-form"
              action={endpoint}
              method="POST"
              onSubmit={handleSubmit}
            >
              <label className="contact-widget-field">
                <span>
                  Your email <small>for replies</small>
                </span>
                <input
                  ref={emailRef}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                />
              </label>

              <label className="contact-widget-field">
                <span>Message</span>
                <textarea
                  name="message"
                  rows={5}
                  minLength={10}
                  maxLength={1600}
                  required
                />
              </label>

              <input
                className="contact-widget-honeypot"
                type="text"
                name="_gotcha"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {status === "error" && (
                <p className="contact-widget-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="contact-widget-primary contact-widget-submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending…" : "Send message"}
                {status !== "submitting" && (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m4 10 12-6-4 12-2.5-4.5L4 10Z" />
                  </svg>
                )}
              </button>
            </form>
          )}
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="contact-widget-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A7 7 0 0 1 4 14V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6Z" />
        </svg>
        <span>{open ? "Close" : "Let’s chat"}</span>
      </button>
    </div>
  );
}
