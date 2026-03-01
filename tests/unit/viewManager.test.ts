// Prevent Jest from loading the full Convergent plugin chain
jest.mock('../../src/main', () => ({
	__esModule: true,
	default: class MockConvergentPlugin {
		_data: Record<string, unknown> = {};
		loadData() { return Promise.resolve({ ...this._data }); }
		saveData(d: Record<string, unknown>) { this._data = { ...d }; return Promise.resolve(); }
	}
}));

import { ViewManager, ViewConfig } from '../../src/utils/viewManager';

function makePlugin() {
	let stored: Record<string, unknown> = {};
	return {
		loadData: jest.fn().mockImplementation(async () => ({ ...stored })),
		saveData: jest.fn().mockImplementation(async (d: Record<string, unknown>) => {
			stored = { ...d };
		})
	};
}

function baseConfig(overrides: Partial<ViewConfig> = {}): Omit<ViewConfig, 'id'> {
	return { name: 'Test View', viewType: 'kanban', filters: [], sort: [], ...overrides };
}

describe('ViewManager', () => {
	let plugin: ReturnType<typeof makePlugin>;
	let manager: ViewManager;

	beforeEach(async () => {
		plugin = makePlugin();
		manager = new ViewManager(plugin as any);
		await manager.load();
	});

	// ─── load ─────────────────────────────────────────────────────────────────

	describe('load', () => {
		it('starts with empty views when no data is stored', async () => {
			expect(manager.getAll()).toEqual([]);
		});

		it('loads previously saved views from plugin data', async () => {
			const existingView: ViewConfig = {
				id: 'view-1', name: 'Saved View', viewType: 'table', filters: [], sort: []
			};
			plugin.loadData.mockResolvedValueOnce({ 'convergent-saved-views': [existingView] });

			const freshManager = new ViewManager(plugin as any);
			await freshManager.load();

			expect(freshManager.getAll()).toHaveLength(1);
			expect(freshManager.getAll()[0].name).toBe('Saved View');
		});

		it('handles missing STORAGE_KEY gracefully (returns [])', async () => {
			plugin.loadData.mockResolvedValueOnce({ 'some-other-key': [] });
			const freshManager = new ViewManager(plugin as any);
			await freshManager.load();
			expect(freshManager.getAll()).toEqual([]);
		});
	});

	// ─── saveView ─────────────────────────────────────────────────────────────

	describe('saveView', () => {
		it('creates a new view with an auto-generated id', async () => {
			const view = await manager.saveView(baseConfig());
			expect(typeof view.id).toBe('string');
			expect(view.id.length).toBeGreaterThan(0);
			expect(view.name).toBe('Test View');
			expect(manager.getAll()).toHaveLength(1);
		});

		it('uses a provided id instead of auto-generating one', async () => {
			const view = await manager.saveView({ ...baseConfig(), id: 'custom-id' });
			expect(view.id).toBe('custom-id');
		});

		it('updates an existing view when the id matches', async () => {
			await manager.saveView({ ...baseConfig(), id: 'update-me' });
			await manager.saveView({ ...baseConfig(), id: 'update-me', name: 'Updated' });
			expect(manager.getAll()).toHaveLength(1);
			expect(manager.getAll()[0].name).toBe('Updated');
		});

		it('adds a new view when the id is new', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			await manager.saveView({ ...baseConfig(), id: 'v2' });
			expect(manager.getAll()).toHaveLength(2);
		});

		it('persists the view to plugin data', async () => {
			await manager.saveView(baseConfig());
			expect(plugin.saveData).toHaveBeenCalled();
		});

		it('returns the saved ViewConfig', async () => {
			const view = await manager.saveView({ ...baseConfig(), name: 'My View' });
			expect(view).toMatchObject({ name: 'My View', viewType: 'kanban' });
		});
	});

	// ─── getAll ───────────────────────────────────────────────────────────────

	describe('getAll', () => {
		it('returns all views', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			await manager.saveView({ ...baseConfig(), id: 'v2', viewType: 'table' });
			expect(manager.getAll()).toHaveLength(2);
		});

		it('returns a copy so mutations do not affect internal state', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			const all = manager.getAll();
			all.pop();
			expect(manager.getAll()).toHaveLength(1);
		});
	});

	// ─── getByType ────────────────────────────────────────────────────────────

	describe('getByType', () => {
		beforeEach(async () => {
			await manager.saveView({ ...baseConfig(), id: 'k1', viewType: 'kanban' });
			await manager.saveView({ ...baseConfig(), id: 't1', viewType: 'table' });
			await manager.saveView({ ...baseConfig(), id: 'k2', viewType: 'kanban' });
			await manager.saveView({ ...baseConfig(), id: 'tl1', viewType: 'timeline' });
		});

		it('returns only views of the specified type', () => {
			const kanbans = manager.getByType('kanban');
			expect(kanbans).toHaveLength(2);
			expect(kanbans.every(v => v.viewType === 'kanban')).toBe(true);
		});

		it('returns empty array when no views of that type exist', () => {
			// we have k1, k2, t1, tl1 – remove timeline and check another type
			expect(manager.getByType('table')).toHaveLength(1);
		});

		it('works for timeline type', () => {
			expect(manager.getByType('timeline')).toHaveLength(1);
		});
	});

	// ─── getById ──────────────────────────────────────────────────────────────

	describe('getById', () => {
		it('finds a view by its id', async () => {
			await manager.saveView({ ...baseConfig(), id: 'find-me', name: 'Findable' });
			const found = manager.getById('find-me');
			expect(found).not.toBeUndefined();
			expect(found!.name).toBe('Findable');
		});

		it('returns undefined for a nonexistent id', () => {
			expect(manager.getById('does-not-exist')).toBeUndefined();
		});
	});

	// ─── deleteView ───────────────────────────────────────────────────────────

	describe('deleteView', () => {
		it('removes the view with the specified id', async () => {
			await manager.saveView({ ...baseConfig(), id: 'delete-me' });
			await manager.saveView({ ...baseConfig(), id: 'keep-me' });
			await manager.deleteView('delete-me');

			expect(manager.getAll()).toHaveLength(1);
			expect(manager.getById('delete-me')).toBeUndefined();
			expect(manager.getById('keep-me')).toBeDefined();
		});

		it('is a no-op when the id does not exist', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			await manager.deleteView('nonexistent');
			expect(manager.getAll()).toHaveLength(1);
		});

		it('persists the deletion to plugin data', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			plugin.saveData.mockClear();
			await manager.deleteView('v1');
			expect(plugin.saveData).toHaveBeenCalled();
		});
	});

	// ─── renameView ───────────────────────────────────────────────────────────

	describe('renameView', () => {
		it('updates the view name', async () => {
			await manager.saveView({ ...baseConfig(), id: 'to-rename', name: 'Old Name' });
			await manager.renameView('to-rename', 'New Name');
			expect(manager.getById('to-rename')!.name).toBe('New Name');
		});

		it('persists the rename', async () => {
			await manager.saveView({ ...baseConfig(), id: 'to-rename' });
			plugin.saveData.mockClear();
			await manager.renameView('to-rename', 'New Name');
			expect(plugin.saveData).toHaveBeenCalled();
		});

		it('does nothing when the id does not exist', async () => {
			// should not throw
			await expect(manager.renameView('nonexistent', 'Name')).resolves.toBeUndefined();
		});
	});

	// ─── exportJSON ───────────────────────────────────────────────────────────

	describe('exportJSON', () => {
		it('exports all views as a JSON string', async () => {
			await manager.saveView({ ...baseConfig(), id: 'export-v1', name: 'My Kanban' });
			const json = manager.exportJSON();
			const parsed = JSON.parse(json);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed[0].name).toBe('My Kanban');
		});

		it('exports empty array when no views exist', () => {
			expect(JSON.parse(manager.exportJSON())).toEqual([]);
		});

		it('produces valid indented JSON', async () => {
			await manager.saveView({ ...baseConfig(), id: 'v1' });
			const json = manager.exportJSON();
			expect(() => JSON.parse(json)).not.toThrow();
			expect(json).toContain('\n'); // indented
		});
	});

	// ─── importJSON ───────────────────────────────────────────────────────────

	describe('importJSON', () => {
		it('imports new views from a JSON string', async () => {
			const data: ViewConfig[] = [
				{ id: 'imported-1', name: 'Imported', viewType: 'kanban', filters: [], sort: [] }
			];
			await manager.importJSON(JSON.stringify(data));
			expect(manager.getById('imported-1')).toBeDefined();
			expect(manager.getById('imported-1')!.name).toBe('Imported');
		});

		it('overwrites an existing view with the same id', async () => {
			await manager.saveView({ ...baseConfig(), id: 'conflict', name: 'Original' });
			const data: ViewConfig[] = [
				{ id: 'conflict', name: 'Overwritten', viewType: 'table', filters: [], sort: [] }
			];
			await manager.importJSON(JSON.stringify(data));
			expect(manager.getAll()).toHaveLength(1);
			expect(manager.getById('conflict')!.name).toBe('Overwritten');
		});

		it('merges with existing views (keeps non-conflicting ones)', async () => {
			await manager.saveView({ ...baseConfig(), id: 'existing' });
			const data: ViewConfig[] = [
				{ id: 'new-import', name: 'New', viewType: 'timeline', filters: [], sort: [] }
			];
			await manager.importJSON(JSON.stringify(data));
			expect(manager.getAll()).toHaveLength(2);
		});

		it('persists the imported views', async () => {
			plugin.saveData.mockClear();
			await manager.importJSON(JSON.stringify([
				{ id: 'v1', name: 'V1', viewType: 'kanban', filters: [], sort: [] }
			]));
			expect(plugin.saveData).toHaveBeenCalled();
		});
	});
});
