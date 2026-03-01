/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	testMatch: ['**/*.test.ts'],
	moduleNameMapper: {
		// Mock the Obsidian module since it's not available in Node.js
		'^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts'
	},
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			tsconfig: {
				strict: true,
				noImplicitAny: true,
				esModuleInterop: true,
				target: 'es2017'
			}
		}]
	},
	collectCoverageFrom: [
		'src/utils/**/*.ts',
		'src/automation/**/*.ts'
	],
	coverageReporters: ['text', 'lcov']
};
