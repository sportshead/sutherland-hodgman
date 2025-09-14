/** @type {{subject: number[][], clip: number[][]}} */
const polygons = {
	subject: [],
	clip: [],
};

const subjectArea = document.getElementById("subject-area");
const clipArea = document.getElementById("clip-area");

const subjectPoints = document.getElementById("subject-points");
const clipPoints = document.getElementById("clip-points");

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let currentPolygon = "subject";

canvas.addEventListener("click", (e) => {
	const x = e.offsetX;
	const y = e.offsetY;

	const point = [x, y];
	polygons[currentPolygon].push(point);

	render();
});

function render() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	ctx.imageSmoothingEnabled = false;
	ctx.lineWidth = 1;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (polygons.subject.length > 0) {
		drawPolygon(polygons.subject, "green", true);
	}

	if (polygons.clip.length > 0) {
		drawPolygon(polygons.clip, "purple");
	}

	subjectArea.textContent = shoelace(polygons.subject).toFixed(2);
	clipArea.textContent = shoelace(polygons.clip).toFixed(2);

	const formatPoints = (points) =>
		points.map(([x, y]) => `(${x.toFixed(2)}, ${y.toFixed(2)})`).join(",");

	subjectPoints.textContent = formatPoints(polygons.subject);
	clipPoints.textContent = formatPoints(polygons.clip);
}

/**
 * @param {number[][]} polygon
 * @param {string} color
 * @param {boolean} fill
 */
function drawPolygon(polygon, color, fill = false) {
	ctx.strokeStyle = color;
	ctx.fillStyle = color;

	ctx.beginPath();
	ctx.moveTo(polygon[0][0], polygon[0][1]);

	for (let i = 1; i < polygon.length; i++) {
		ctx.lineTo(polygon[i][0], polygon[i][1]);
	}

	ctx.closePath();
	fill ? ctx.fill() : ctx.stroke();

	for (let i = 0; i < polygon.length; i++) {
		ctx.fillStyle = i === 0 ? "blue" : i === polygon.length - 1 ? "red" : color;

		const [x, y] = polygon[i];
		ctx.beginPath();
		ctx.ellipse(x, y, 5, 5, 0, 0, 2 * Math.PI);
		ctx.fill();
	}
}

render();

document.getElementById("switch-button").addEventListener("click", () => {
	currentPolygon = currentPolygon === "subject" ? "clip" : "subject";

	document.getElementById("current-polygon").textContent = currentPolygon;
});

document.getElementById("normalise-button").addEventListener("click", () => {
	if (shoelace(polygons.subject) < 0) {
		polygons.subject.reverse();
	}
	if (shoelace(polygons.clip) < 0) {
		polygons.clip.reverse();
	}
	render();
});

let stepI = 0;
document.getElementById("step-button").addEventListener("click", () => {
	if (polygons.subject.length < 3 || polygons.clip.length < 3) {
		return;
	}

	if (shoelace(polygons.subject) < 0) {
		polygons.subject.reverse();
	}
	if (shoelace(polygons.clip) < 0) {
		polygons.clip.reverse();
	}

	render();

	ctx.strokeStyle = "aqua";
	ctx.lineWidth = 2;

	const [a, b] = getEdge(polygons.clip, stepI);

	const m = scale(sum(a, b), 0.5);
	const theta = Math.atan2(a[1] - m[1], a[0] - m[0]);
	drawSegment(m, theta + Math.PI / 8, 15);
	drawSegment(m, theta - Math.PI / 8, 15);

	const d = diff(b, a);
	// [x, y, t]
	const intersections = [];
	// left edge, x = 0
	if (d[0] !== 0) {
		const t = -a[0] / d[0];
		const y = a[1] + t * d[1];
		if (y >= 0 && y <= canvas.height) {
			intersections.push([0, y, t]);
		}
	}
	// right edge, x = canvas.width
	if (d[0] !== 0) {
		const t = (canvas.width - a[0]) / d[0];
		const y = a[1] + t * d[1];
		if (y >= 0 && y <= canvas.height) {
			intersections.push([canvas.width, y, t]);
		}
	}
	// top edge, y = 0
	if (d[1] !== 0) {
		const t = -a[1] / d[1];
		const x = a[0] + t * d[0];
		if (x >= 0 && x <= canvas.width) {
			intersections.push([x, 0, t]);
		}
	}
	// bottom edge, y = canvas.height
	if (d[1] !== 0) {
		const t = (canvas.height - a[1]) / d[1];
		const x = a[0] + t * d[0];
		if (x >= 0 && x <= canvas.width) {
			intersections.push([x, canvas.height, t]);
		}
	}

	intersections.sort((a, b) => a[2] - b[2]);

	if (intersections.length >= 2) {
		const [c, d] = intersections;

		ctx.beginPath();
		ctx.moveTo(c[0], c[1]);
		ctx.lineTo(d[0], d[1]);
		ctx.stroke();
	}

	for (let j = 0; j < polygons.subject.length; j++) {
		const subject = polygons.subject[j];
		const area = det(diff(b, a), diff(subject, a));

		if (area < 0) {
			ctx.fillStyle = "aqua";
			ctx.beginPath();
			ctx.ellipse(subject[0], subject[1], 8, 8, 0, 0, 2 * Math.PI);
			ctx.fill();

			const newPoints = [];

			for (const k of [
				(j - 1 + polygons.subject.length) % polygons.subject.length,
				j,
			]) {
				const [c, d] = getEdge(polygons.subject, k);

				const e = intersect(a, b, c, d);
				if (
					e &&
					e[0] >= 0 &&
					e[0] <= canvas.width &&
					e[1] >= 0 &&
					e[1] <= canvas.height &&
					manhattan(e, c) > 10 &&
					manhattan(e, d) > 10
				) {
					newPoints.push(e);
				}
			}

			for (const p of newPoints) {
				ctx.fillStyle = "orange";
				ctx.beginPath();
				ctx.ellipse(p[0], p[1], 8, 8, 0, 0, 2 * Math.PI);
				ctx.fill();
			}

			polygons.subject.splice(j, 1, ...newPoints);

			console.log(
				j,
				JSON.stringify(newPoints),
				JSON.stringify(polygons.subject),
			);
			j += Math.max(0, newPoints.length - 1);
		}
	}

	stepI = (stepI + 1) % polygons.clip.length;
});

function shoelace(points) {
	if (points.length < 3) {
		return 0;
	}

	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		sum += det(...getEdge(points, i));
	}

	return sum / 2;
}

function drawSegment(start, theta, length) {
	ctx.beginPath();
	ctx.moveTo(start[0], start[1]);
	ctx.lineTo(
		start[0] + length * Math.cos(theta),
		start[1] + length * Math.sin(theta),
	);
	ctx.stroke();
}

/**
 * Compute intersection of lines AB and CD
 * @param {number[]} a
 * @param {number[]} b
 * @param {number[]} c
 * @param {number[]} d
 * @returns {number[]}
 */
function intersect(a, b, c, d) {
	const ab = diff(b, a);
	const cd = diff(d, c);
	const ac = diff(c, a);

	const denom = det(ab, cd);

	if (Math.abs(denom) < 1e-4) {
		return null;
	}

	const t = det(ac, cd) / denom;

	return sum(a, scale(ab, t));
}

const getEdge = (points, index) => [
	points[index],
	points[(index + 1) % points.length],
];

const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const det = (a, b) => a[0] * b[1] - a[1] * b[0];
const sum = (a, b) => [a[0] + b[0], a[1] + b[1]];
const diff = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (a, b) => [a[0] * b, a[1] * b];
const flip = ([x, y]) => [y, x];
