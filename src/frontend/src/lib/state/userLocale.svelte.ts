class UserLocale {
	lang = $state('en');
	confirmed = $state(false);

	set(lang: string) {
		this.lang = lang;
		this.confirmed = true;
	}

	reset() {
		this.lang = 'en';
		this.confirmed = false;
	}
}

export const userLocale = new UserLocale();
