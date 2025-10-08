export interface ConvergentSettings {
	// Folder locations
	issuesFolder: string;
	projectsFolder: string;
	sessionsFolder: string;
	decisionsFolder: string;
	blockersFolder: string;

	// Issue defaults
	defaultStatus: string;
	defaultPriority: string;

	// MSP settings
	enableMSP: boolean;
	autoStartSession: boolean;

	// MCP integration
	enableMCP: boolean;
	mcpServerUrl: string;

	// UI preferences
	showStatusBar: boolean;
	keyboardShortcutsEnabled: boolean;
}

export const DEFAULT_SETTINGS: ConvergentSettings = {
	// Folder locations
	issuesFolder: 'Issues',
	projectsFolder: 'Projects',
	sessionsFolder: 'Sessions',
	decisionsFolder: 'Decisions',
	blockersFolder: 'Blockers',

	// Issue defaults
	defaultStatus: 'Todo',
	defaultPriority: 'Medium',

	// MSP settings
	enableMSP: true,
	autoStartSession: false,

	// MCP integration
	enableMCP: false,
	mcpServerUrl: 'http://localhost:3000',

	// UI preferences
	showStatusBar: true,
	keyboardShortcutsEnabled: true,
};
