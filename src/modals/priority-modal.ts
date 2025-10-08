import { App, SuggestModal, TFile } from 'obsidian';
import { IssuePriority } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';

interface PriorityOption {
	priority: IssuePriority;
	label: string;
	icon: string;
}

export class PriorityModal extends SuggestModal<PriorityOption> {
	private file: TFile;
	private frontmatterUtils: FrontmatterUtils;
	private onSubmit: (priority: IssuePriority) => void;
	private currentPriority?: IssuePriority;

	private priorities: PriorityOption[] = [
		{ priority: 'Low', label: 'Low', icon: '⬇' },
		{ priority: 'Medium', label: 'Medium', icon: '→' },
		{ priority: 'High', label: 'High', icon: '⬆' },
		{ priority: 'Urgent', label: 'Urgent', icon: '🔥' }
	];

	constructor(
		app: App,
		file: TFile,
		frontmatterUtils: FrontmatterUtils,
		currentPriority: IssuePriority | undefined,
		onSubmit: (priority: IssuePriority) => void
	) {
		super(app);
		this.file = file;
		this.frontmatterUtils = frontmatterUtils;
		this.currentPriority = currentPriority;
		this.onSubmit = onSubmit;

		this.setPlaceholder('Select new priority...');
	}

	getSuggestions(query: string): PriorityOption[] {
		const lowerQuery = query.toLowerCase();
		return this.priorities.filter(option =>
			option.priority !== this.currentPriority &&
			option.label.toLowerCase().includes(lowerQuery)
		);
	}

	renderSuggestion(option: PriorityOption, el: HTMLElement) {
		el.createDiv({ cls: 'priority-suggestion' }, (div) => {
			div.createSpan({ text: option.icon, cls: 'priority-icon' });
			div.createSpan({ text: option.label, cls: 'priority-label' });
		});
	}

	onChooseSuggestion(option: PriorityOption) {
		this.onSubmit(option.priority);
	}
}
