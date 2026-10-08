"use client";

import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState } from "react";
import { prepareEmailHtml } from "@/lib/email/html";
import { collapseQuotedEmailHtml } from "@/app/(dashboard)/inbox/[messageId]/quote-collapse-utils";
import { THEME_CHANGED_EVENT } from "@/components/theme-utils";
import { Moon, Sun } from "lucide-react";

const BASE_STYLE = `
:host { display:block; min-width:0; isolation:isolate; contain:paint; }
.email-quote-toggle { margin-top:1.4em; }
.email-quote-toggle > summary { cursor:pointer; list-style:none; width:26px; border-radius:20px; background:var(--quote-bg, #ececec); color:var(--quote-color, #4d4d4d); text-align:center; }
.email-quote-toggle > summary::-webkit-details-marker { display:none; }
.email-quote-toggle > summary::before { content:'•••'; }
.email-quote-content { display:flow-root; }
`;

export function EmailHtmlRenderer({ html, className, preserveLeadingQuote = false }: {
	html: string; className?: string; preserveLeadingQuote?: boolean;
}) {
	const { t } = useLanguage();
	const host = useRef<HTMLDivElement>(null);
	const [allowedSource, setAllowedSource] = useState<string | null>(null);
	const [hasRemote, setHasRemote] = useState(false);
	const [isDark, setIsDark] = useState(false);
	const [forceLight, setForceLight] = useState(false);
	const allowRemote = allowedSource === html;

	useEffect(() => {
		const checkTheme = () => {
			setIsDark(document.documentElement.classList.contains("dark"));
		};
		checkTheme();
		window.addEventListener(THEME_CHANGED_EVENT, checkTheme);
		const observer = new MutationObserver(checkTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => {
			window.removeEventListener(THEME_CHANGED_EVENT, checkTheme);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		if (!host.current) return;
		host.current.dir = document.documentElement.dir || "ltr";
		const root = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
		const prepared = prepareEmailHtml(html, { reader: true, allowRemote });
		setHasRemote(prepared.hasRemote);
		const base = document.createElement("style");

		const useDarkMode = isDark && !forceLight;
		const rootThemeStyles = useDarkMode
			? `:host { --quote-bg: #35363a; --quote-color: #9aa0a6; }\n${prepared.rootTag} { display:block; font:14px/1.5 Arial,sans-serif; color:#e8eaed; background:transparent; color-scheme:dark; }\n${prepared.bodyTag} { display:block; background:transparent; }\na { color:#8ab4f8; }`
			: `:host { --quote-bg: #ececec; --quote-color: #4d4d4d; }\n${prepared.rootTag} { display:block; font:14px/1.5 Arial,sans-serif; color:#202124; background:#fff; color-scheme:light; border-radius:6px; padding:8px; }\n${prepared.bodyTag} { display:block; }\na { color:#1a73e8; }`;

		base.textContent = `${BASE_STYLE}\n${rootThemeStyles}`;
		const content = document.createElement("template");
		content.innerHTML = collapseQuotedEmailHtml(prepared.html, preserveLeadingQuote) ?? "";
		root.replaceChildren(base, content.content);
		const mailBody = root.querySelector(prepared.bodyTag);
		// An LTR scroller cannot reach left-side overflow from an RTL email.
		if (mailBody) host.current.dir = window.getComputedStyle(mailBody).direction;
		// Document fragment navigation does not automatically find IDs inside a shadow tree.
		const navigate = (event: Event) => {
			const target = event.target as Element | null;
			const anchor = target?.closest("a[href]");
			const href = anchor?.getAttribute("href");
			if (!href?.startsWith("#")) return;
			event.preventDefault();
			try {
				const id = decodeURIComponent(href.slice(1));
				const destination = root.getElementById(id) ?? Array.from(root.querySelectorAll("a[name]")).find(node => node.getAttribute("name") === id);
				destination?.scrollIntoView({ block: "start" });
			} catch { /* Ignore malformed fragments. */ }
		};
		root.addEventListener("click", navigate);
		return () => root.removeEventListener("click", navigate);
	}, [html, allowRemote, preserveLeadingQuote, isDark, forceLight]);

	return <div className={`min-w-0 max-w-full ${className ?? ""}`}>
		{(hasRemote || isDark) && (
			<div className="mb-2 flex items-center justify-end gap-2">
				{isDark && (
					<button
						type="button"
						onClick={() => setForceLight((prev) => !prev)}
						className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
						title={forceLight ? "Switch to dark email background" : "Switch to light email background"}
					>
						{forceLight ? (
							<>
								<Moon className="h-3 w-3" />
								<span>Dark view</span>
							</>
						) : (
							<>
								<Sun className="h-3 w-3" />
								<span>Light view</span>
							</>
						)}
					</button>
				)}
				{hasRemote && (
					<button
						type="button"
						aria-pressed={allowRemote}
						className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-neutral-800"
						onClick={() => setAllowedSource(allowRemote ? null : html)}
					>
						{allowRemote ? t("message.blockRemote") : t("message.allowRemote")}
					</button>
				)}
			</div>
		)}
		<div className="max-w-full overflow-x-auto" ref={host} />
	</div>;
}
