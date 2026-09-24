/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/svelte" />

interface ImportMetaEnv {
	readonly VITE_COMMIT_HASH: string;
	readonly VITE_BUILD_DATE: string;
}
