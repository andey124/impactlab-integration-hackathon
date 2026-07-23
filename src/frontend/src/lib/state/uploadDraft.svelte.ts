type UploadStatus = 'capturing' | 'submitting';

class UploadDraft {
	pages = $state<string[]>([]);
	status = $state<UploadStatus>('capturing');

	addPage(base64: string) {
		this.pages = [...this.pages, base64];
	}

	removePage(index: number) {
		this.pages = this.pages.filter((_, i) => i !== index);
	}

	reset() {
		this.pages = [];
		this.status = 'capturing';
	}
}

export const uploadDraft = new UploadDraft();
