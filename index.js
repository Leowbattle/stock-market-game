// Generate a random normal variable using Box-Muller transform
function random_normal() {
	const u1 = Math.random();
	const u2 = Math.random();
	return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Generate a stock price path using the geometric Brownian motion model
function stock_path(nt, dt, m, s) {
	const S = new Array(nt + 1).fill(0);
	S[0] = 100;

	for (let i = 0; i < nt; i++) {
		const z = random_normal();
		S[i + 1] = S[i] * Math.exp((m - 0.5 * s ** 2) * dt + s * Math.sqrt(dt) * z);
	}

	return S;
}

window.onload = function () {
	console.log('Document loaded');
	const nt = 252;
	const dt = 1 / 252;
	const m = Math.log(1.3);
	const s = 0.2;

	const path = stock_path(nt, dt, m, s);

	console.log(path);

	Plotly.newPlot('chart', [{
		x: Array.from({ length: path.length }, (_, i) => i),
		y: path,
		type: 'scatter',
		mode: 'lines',
		line: { color: 'blue' }
	}], {
		title: 'Simulated Stock Price Path',
		xaxis: { title: 'Time Step' },
		yaxis: { title: 'Stock Price' }
	});
}