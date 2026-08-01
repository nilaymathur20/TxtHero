import ContactForm from "@/src/components/ContactForm";

export const metadata = { title: "Contact support", description: "Contact TxtHero support or report a bug." };

export default function Contact() {
  const support = process.env.SUPPORT_EMAIL;
  return <main className="legal-page"><h1>Contact support</h1><p>Use this form for questions and bug reports.{support ? <> You can also email <a href={`mailto:${support}`}>{support}</a>.</> : null}</p><ContactForm /></main>;
}
