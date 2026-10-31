function wasiStub() {
	return 0;
}

export function saaWasmImports() {
	return {
		env: { emscripten_notify_memory_growth: () => {} },
		wasi_snapshot_preview1: new Proxy(
			{},
			{
				get() {
					return wasiStub;
				}
			}
		)
	};
}
