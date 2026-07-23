export type FormLink = { label: string; url: string };

export type NextStep = {
	text: string;
	dueDate?: string;
	formLinks?: FormLink[];
};

export type PathNodeStatus = 'locked' | 'active' | 'done';

export type PathNode = {
	id: string;
	title: string;
	status: PathNodeStatus;
	translation: string;
	nextSteps: NextStep[];
	createdAt: string;
};
