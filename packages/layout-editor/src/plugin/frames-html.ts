/** Dev host page. Presets are the Stake viewports (+ step C mobile landscape), not the starter's four layout types. */
export const FRAMES_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Layout editor – frames</title>
<style>
	html,body{margin:0;height:100%;background:#1b1b1f;color:#ddd;font:13px system-ui,sans-serif}
	header{display:flex;gap:8px;align-items:center;padding:8px;flex-wrap:wrap}
	button{background:#333;color:#eee;border:1px solid #555;border-radius:4px;padding:4px 8px;cursor:pointer}
	button.active{background:#0a84ff;border-color:#0a84ff}
	main{position:absolute;inset:48px 0 0 0;display:flex;align-items:center;justify-content:center;overflow:hidden}
	iframe{border:1px solid #444;background:#000;transform-origin:center center}
</style></head>
<body>
<header id="bar"><strong>Stake viewports</strong></header>
<main><iframe id="game" title="game"></iframe></main>
<script>
	const presets = [
		['Desktop 1200×675', 1200, 675, 'desktop'],
		['Laptop 1024×576', 1024, 576, 'laptop'],
		['Popout L 800×450', 800, 450, 'popoutL'],
		['Popout S 400×225', 400, 225, 'popoutS'],
		['Mobile L 425×812', 425, 812, 'mobileL'],
		['Mobile M 375×667', 375, 667, 'mobileM'],
		['Mobile S 320×568', 320, 568, 'mobileS'],
		['Mobile L land 812×425', 812, 425, 'mobileL_land'],
		['Mobile M land 667×375', 667, 375, 'mobileM_land'],
		['Mobile S land 568×320', 568, 320, 'mobileS_land'],
		['Wide 1920×1080', 1920, 1080, 'desktop'],
		['Tablet portrait 1024×1366', 1024, 1366, 'mobileL']
	];
	const params = new URLSearchParams(location.search);
	const iframe = document.getElementById('game');
	const bar = document.getElementById('bar');
	const src = new URL(params.get('src') || '/', location.origin);
	src.searchParams.set('__layoutFrame', '1');
	iframe.src = src.pathname + src.search + src.hash;
	let size = { w: Number(params.get('w')) || 1200, h: Number(params.get('h')) || 675 };
	const fit = () => {
		iframe.style.width = size.w + 'px';
		iframe.style.height = size.h + 'px';
		const main = document.querySelector('main').getBoundingClientRect();
		const scale = Math.min(1, (main.width - 16) / size.w, (main.height - 16) / size.h);
		iframe.style.transform = 'scale(' + scale + ')';
		[...bar.querySelectorAll('button')].forEach((b) => b.classList.toggle('active', b.dataset.w == size.w && b.dataset.h == size.h));
		const url = new URL(location.href);
		url.searchParams.set('w', String(size.w));
		url.searchParams.set('h', String(size.h));
		history.replaceState(null, '', url);
	};
	for (const [name, w, h, expect] of presets) {
		const b = document.createElement('button');
		b.textContent = name + ' → ' + expect;
		b.dataset.w = String(w);
		b.dataset.h = String(h);
		b.onclick = () => { size = { w, h }; fit(); };
		bar.appendChild(b);
	}
	window.addEventListener('message', (e) => {
		if (e.origin !== location.origin || !e.data || e.data.type !== 'layout-editor:frame') return;
		size = { w: e.data.width, h: e.data.height };
		fit();
	});
	window.addEventListener('resize', fit);
	fit();
</script>
</body></html>`;
