import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export class MathematicalSpace3d
{
    constructor(elementToDrawIn)
    {
        this._container = elementToDrawIn,
            this._renderer = null,
            this._scene = null,
            this._light = null,
            this._camera = null,
            this._group = null,
            this._meshlinematerial = null,
            this._controls = null
            this._axesLength = 5;

        this._createMaterials();
        this._createScene();
        // this._drawMesh();
        this._drawAxis();
        this._drawAxesLabelText();

        this._animate()
    }

    _render() {
        this._renderer.render(this._scene, this._camera);
    }

    _animate() {

        // https://stackoverflow.com/a/59060545/6660685
        requestAnimationFrame(this._animate.bind(this));

        this._controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

        this._render();
    }

    _createMaterials() {
        this._meshlinematerial = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 });
    }

    _createScene() {
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(this._container.offsetWidth, this._container.offsetHeight);
        this._container.appendChild(this._renderer.domElement);

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xFFFFFF);

        this._camera = new THREE.PerspectiveCamera(45, this._container.offsetWidth / this._container.offsetHeight, 0.1, 20);

        this._camera.position.set(this._axesLength, this._axesLength, this._axesLength);

        this._controls = new OrbitControls( this._camera, this._renderer.domElement );
        this._controls.enableDamping = true;
        this._controls.update();



        this._light = new THREE.DirectionalLight(0xFFFFFF, 2.0);
        this._light.position.set(-1, 1, 1);
        this._scene.add(this._light);

        this._group = new THREE.Object3D();
        this._scene.add(this._group);

        // this._group.rotation.x = 0.25;
        // this._group.rotation.y = 0.25;
        // this._group.rotation.z = -0.5;
    }

    _drawAxis() {
        const positiveAxesHelper = new THREE.AxesHelper( this._axesLength );
        const negativeAxesHelper = new THREE.AxesHelper( -this._axesLength );

        this._scene.add(positiveAxesHelper);
        this._scene.add(negativeAxesHelper);

        const tickMarkLength = this._axesLength;

        for (let tickPoint = -this._axesLength; tickPoint <= this._axesLength; tickPoint ++) {

            var lines = [
                [[tickPoint, tickMarkLength, 0], [tickPoint, -tickMarkLength, 0]],
                [[tickPoint,  0, tickMarkLength], [tickPoint, 0, -tickMarkLength]],
                [[0, tickPoint,  tickMarkLength], [0,tickPoint, -tickMarkLength]],
                [[tickMarkLength, tickPoint,  0], [-tickMarkLength,tickPoint, 0]],
                [[tickMarkLength, 0, tickPoint], [-tickMarkLength, 0, tickPoint]],
                [[0, tickMarkLength ,tickPoint,], [ 0, -tickMarkLength, tickPoint]],
            ]


            let length = lines.length;
            for (let i = 0; i < length; i++) {
                let linePoints = lines[i];
                let startPoint = linePoints[0];
                let endPoint = linePoints[1];

                let points = [];

                let sX, sY, sZ, eX, eY, eZ;
                [sX, sY, sZ] = startPoint;
                [eX, eY, eZ] = endPoint;

                points.push(new THREE.Vector3(sX, sY, sZ));
                points.push(new THREE.Vector3(eX, eY, eZ));

                let geometry = new THREE.BufferGeometry().setFromPoints( points );
                let line = new THREE.Line( geometry, this._meshlinematerial );
                this._scene.add(line);


            }

        }


    }

    _drawAxesLabelText() {

        const axisLength = this._axesLength * .5;

        const loader = new FontLoader();

        const self = this;

        loader.load( 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function ( font )
        {
            const fontSize = .25;
            const fontThickness = .05;

            const xGeometry = new TextGeometry( 'x', {
                font: font,
                size: fontSize,
                height: fontThickness,
            } );

            xGeometry.computeBoundingBox();

            const xTextHorizontalOffset = - 0.5 * ( xGeometry.boundingBox.max.x - xGeometry.boundingBox.min.x );
            const xTextVerticalOffset = - 0.5 * ( xGeometry.boundingBox.max.y - xGeometry.boundingBox.min.y );

            const yGeometry = new TextGeometry( 'y', {
                font: font,
                size: fontSize,
                height: fontThickness,
            } );

            yGeometry.computeBoundingBox();

            const yTextHorizontalOffset = - 0.5 * ( yGeometry.boundingBox.max.x - yGeometry.boundingBox.min.x );
            const yTextVerticalOffset = - 0.5 * ( yGeometry.boundingBox.max.y - yGeometry.boundingBox.min.y );


            const zGeometry = new TextGeometry( 'z', {
                font: font,
                size: fontSize,
                height: fontThickness,
            } );

            zGeometry.rotateY(Math.PI/2);


            zGeometry.computeBoundingBox();

            const zTextHorizontalOffset = - 0.5 * ( zGeometry.boundingBox.max.x - zGeometry.boundingBox.min.x );
            const zTextVerticalOffset = - 0.5 * ( zGeometry.boundingBox.max.y - zGeometry.boundingBox.min.y );

            const matLite = new THREE.MeshBasicMaterial(
                {
                    color: 0x2c3e50,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                } );

            const xText = new THREE.Mesh( xGeometry, matLite );
            xText.position.x = xTextHorizontalOffset + axisLength;
            xText.position.y = xTextVerticalOffset;


            const yText = new THREE.Mesh( yGeometry, matLite );

            yText.rotateY(Math.PI/4);

            yText.position.z = -yTextHorizontalOffset * Math.cos(Math.PI/4) // pull back along z axis after rotation
            yText.position.x = yTextHorizontalOffset * Math.cos(Math.PI/4) // pull back along z axis after rotation
            yText.position.y = yTextVerticalOffset + axisLength;

            const zText = new THREE.Mesh( zGeometry, matLite );

            zText.position.z = zTextHorizontalOffset + axisLength;
            zText.position.y = zTextVerticalOffset;

            // text.position.z = - 150;
            self._scene.add( xText );
            self._scene.add( yText );
            self._scene.add( zText );

        });

    }


    plot(xEquation, yEquation, zEquation, tRange, tStep, colour) {
        let xPrev = null, yPrev = null, zPrev = null;
        let x = null, y = null, z = null;
        let points = null, geometry = null, line = null;
        const plotlinematerial = new THREE.LineBasicMaterial({ color: colour });

        for(let t = tRange.start; t <= tRange.end; t += tStep)
        {
            x = xEquation(t);
            y = yEquation(t);
            z = zEquation(t);

            if(xPrev !== null)
            {
                points = [new THREE.Vector3(xPrev, yPrev, zPrev), new THREE.Vector3(x, y, z)];
                geometry = new THREE.BufferGeometry().setFromPoints( points );
                line = new THREE.Line( geometry, plotlinematerial );
                this._group.add(line);
            }

            xPrev = x;
            yPrev = y;
            zPrev = z;
        }
    }

    addPoint(x, y, z) {
        const dotGeometry = new THREE.BufferGeometry();
        dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x,y,z]), 3));
        const dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 });
        const dot = new THREE.Points(dotGeometry, dotMaterial);
        this._scene.add(dot);
    }
}
