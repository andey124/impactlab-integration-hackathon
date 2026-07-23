import { browser } from '$app/environment';

const STORAGE_KEY = 'docuaid.userLocale';

type StoredLocale = { lang: string; confirmed: boolean };

function loadInitial(): StoredLocale {
	if (!browser) return { lang: 'en', confirmed: false };
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return { lang: 'en', confirmed: false };
	return JSON.parse(raw) as StoredLocale;
}

class UserLocale {
	#initial = loadInitial();
	lang = $state(this.#initial.lang);
	confirmed = $state(this.#initial.confirmed);

	set(lang: string) {
		this.lang = lang;
		this.confirmed = true;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang: this.lang, confirmed: true }));
		}
	}

	reset() {
		this.lang = 'en';
		this.confirmed = false;
		if (browser) localStorage.removeItem(STORAGE_KEY);
	}
}

export const userLocale = new UserLocale();
