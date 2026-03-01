import ConvergentPlugin from '../main';

export interface ViewConfig {
	id: string;
	name: string;
	viewType: 'kanban' | 'table' | 'timeline';
	filters: FilterConfig[];
	sort: SortConfig[];
	groupBy?: string;
	showCanceled?: boolean;
}

export interface FilterConfig {
	field: string;
	operator: string;
	value: string;
}

export interface SortConfig {
	field: string;
	direction: 'asc' | 'desc';
}

const STORAGE_KEY = 'convergent-saved-views';

/**
 * Manages saved view configurations (filter + sort + grouping presets).
 * Persists to plugin data.
 */
export class ViewManager {
	private views: ViewConfig[] = [];

	constructor(private plugin: ConvergentPlugin) {}

	async load(): Promise<void> {
		const data = await this.plugin.loadData();
		this.views = data?.[STORAGE_KEY] || [];
	}

	async save(): Promise<void> {
		const data = (await this.plugin.loadData()) || {};
		data[STORAGE_KEY] = this.views;
		await this.plugin.saveData(data);
	}

	getAll(): ViewConfig[] {
		return [...this.views];
	}

	getByType(viewType: 'kanban' | 'table' | 'timeline'): ViewConfig[] {
		return this.views.filter(v => v.viewType === viewType);
	}

	getById(id: string): ViewConfig | undefined {
		return this.views.find(v => v.id === id);
	}

	async saveView(config: Omit<ViewConfig, 'id'> & { id?: string }): Promise<ViewConfig> {
		const id = config.id || `view-${Date.now()}`;
		const view: ViewConfig = { ...config, id };

		const existing = this.views.findIndex(v => v.id === id);
		if (existing >= 0) {
			this.views[existing] = view;
		} else {
			this.views.push(view);
		}

		await this.save();
		return view;
	}

	async deleteView(id: string): Promise<void> {
		this.views = this.views.filter(v => v.id !== id);
		await this.save();
	}

	async renameView(id: string, name: string): Promise<void> {
		const view = this.views.find(v => v.id === id);
		if (view) {
			view.name = name;
			await this.save();
		}
	}

	/**
	 * Export all views as JSON string for backup/sharing.
	 */
	exportJSON(): string {
		return JSON.stringify(this.views, null, 2);
	}

	/**
	 * Import views from JSON string (merges with existing).
	 */
	async importJSON(json: string): Promise<void> {
		const imported: ViewConfig[] = JSON.parse(json);
		for (const view of imported) {
			const existing = this.views.findIndex(v => v.id === view.id);
			if (existing >= 0) {
				this.views[existing] = view;
			} else {
				this.views.push(view);
			}
		}
		await this.save();
	}
}
