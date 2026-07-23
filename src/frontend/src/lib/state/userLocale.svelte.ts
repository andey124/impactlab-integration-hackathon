class UserLocale {
	lang = $state('en');
	confirmed = $state(false);

	set(lang: string) {
		this.lang = lang;
		this.confirmed = true;
	}
}

export const userLocale = new UserLocale();
