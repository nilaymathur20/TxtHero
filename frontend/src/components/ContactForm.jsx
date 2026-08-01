"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Button from "./ui/Button";

export default function ContactForm() {
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("General");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("subject") === "Bug Report") setSubject("Bug Report");
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setStatus("Sending…");
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    setStatus(response.ok ? "Message sent." : "Unable to send message.");
    response.ok ? toast.success("Message sent") : toast.error("Support is unavailable");
  };
  return <form onSubmit={submit}><label>Name<input name="name" required maxLength={100} /></label><label>Email<input name="email" type="email" required maxLength={254} /></label><label>Subject<select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)}><option>General</option><option>Bug Report</option></select></label><label>Message<textarea name="message" required maxLength={5000} /></label><Button type="submit">Send message</Button><p role="status">{status}</p><Toaster position="bottom-right" /></form>;
}
