import { App } from 'obsidian';
import { QuickSwitcherModal } from '../modals/quick-switcher-modal';
import ConvergentPlugin from '../main';

export class SwitcherCommands {
	constructor(
		private app: App,
		private plugin: ConvergentPlugin
	) {}

	/**
	 * Register all switcher-related commands
	 */
	registerCommands() {
		// Quick switcher - Cmd/Ctrl+K
		this.plugin.addCommand({
			id: 'quick-switcher',
			name: 'Quick switcher',
			hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
			callback: () => this.openQuickSwitcher()
		});
	}

	/**
	 * Open the quick switcher modal
	 */
	openQuickSwitcher() {
		new QuickSwitcherModal(this.app, this.plugin).open();
	}
}
