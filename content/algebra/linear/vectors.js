import { MathematicalSpace3d } from '/js/plotting/mathematical_space_3d.js'

window.onload = function () {
	const plotter = new MathematicalSpace3d(document.getElementById("threejs-vector-line"));

	const xFunction = function (t) {
		return 3 * t + 1
	};

	const yFunction =  function (t)
	{
		return 2 * t + 2
	};

	const zFunction = function (t)
	{
		return 1 * t + 3
	};

	const tRange =  {start: -10 * Math.PI, end: 10 * Math.PI};
	const tStep= Math.PI / 128;
	const colour = "#0000FF";

	plotter.plot(xFunction, yFunction, zFunction, tRange, tStep, colour);
	plotter.addPoint(1, 2, 3);
}