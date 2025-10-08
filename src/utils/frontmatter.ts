import { App, TFile } from 'obsidian';
import { Frontmatter } from '../types';

export class FrontmatterUtils {
	constructor(private app: App) {}

	/**
	 * Get frontmatter from a file
	 */
	async getFrontmatter(file: TFile): Promise<Frontmatter | null> {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter as Frontmatter || null;
	}

	/**
	 * Update frontmatter in a file
	 */
	async updateFrontmatter(file: TFile, updates: Partial<Frontmatter>): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			Object.assign(frontmatter, updates);
		});
	}

	/**
	 * Get a specific frontmatter field
	 */
	async getField<T>(file: TFile, field: string): Promise<T | undefined> {
		const frontmatter = await this.getFrontmatter(file);
		return frontmatter?.[field as keyof Frontmatter] as T;
	}

	/**
	 * Set a specific frontmatter field
	 */
	async setField(file: TFile, field: string, value: any): Promise<void> {
		await this.updateFrontmatter(file, { [field]: value } as Partial<Frontmatter>);
	}

	/**
	 * Check if file has a specific frontmatter type
	 */
	async isType(file: TFile, type: string): Promise<boolean> {
		const fileType = await this.getField<string>(file, 'type');
		return fileType === type;
	}

	/**
	 * Get all files of a specific type
	 */
	async getFilesByType(type: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const filtered: TFile[] = [];

		for (const file of files) {
			if (await this.isType(file, type)) {
				filtered.push(file);
			}
		}

		return filtered;
	}
}
