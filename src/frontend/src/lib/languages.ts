export type Language = { code: string; label: string; nativeLabel: string };

export const LANGUAGES: Language[] = [
	{ code: 'de', label: 'German', nativeLabel: 'Deutsch' },
	{ code: 'en', label: 'English', nativeLabel: 'English' },
	{ code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
	{ code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
	{ code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
	{ code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
	{ code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
	{ code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
	{ code: 'fa', label: 'Farsi', nativeLabel: 'فارسی' }
];

const FALLBACK = LANGUAGES.find((lang) => lang.code === 'en')!;

export function matchBrowserLanguage(browserLocale: string): Language {
	const shortCode = browserLocale.slice(0, 2).toLowerCase();
	return LANGUAGES.find((lang) => lang.code === shortCode) ?? FALLBACK;
}
