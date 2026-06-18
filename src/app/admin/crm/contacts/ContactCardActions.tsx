"use client";

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? "44" + digits.slice(1) : digits}`;
}

export function ContactCardActions({
  email,
  phone,
}: {
  email: string | null;
  phone: string | null;
}) {
  if (!email && !phone) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-ajs-primary bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100"
        >
          ✉ Email
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-ajs-dark bg-slate-100 border border-ajs-light px-2.5 py-1 rounded-full hover:bg-slate-200"
        >
          📞 Call
        </a>
      )}
      {phone && (
        <a
          href={waHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full hover:bg-emerald-100"
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}
