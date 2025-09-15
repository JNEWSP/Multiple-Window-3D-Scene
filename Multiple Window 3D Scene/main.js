import WindowManager from './WindowManager.js'

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

function getTime() {
    return (new Date().getTime() - today) / 1000.0;
}

if (new URLSearchParams(window.location.search).get("clear")) {
    localStorage.clear();
} else {    
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState != 'hidden' && !initialized) {
            init();
        }
    });

    window.onload = () => {
        if (document.visibilityState != 'hidden') {
            init();
        }
    };
    
    function init() {
        initialized = true;
        setTimeout(() => {
            setupScene();
            setupWindowManager();
            resize();
            updateWindowShape(false);
            render();
            window.addEventListener('resize', resize);
        }, 500)    
    }
    
    function setupScene() {
        camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
        camera.position.z = 2.5;
        near = camera.position.z - .5;
        far = camera.position.z + 0.5;

        scene = new t.Scene();
        scene.background = new t.Color(0.0);
        scene.add(camera);

        // Star field background
        var starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            starPositions[i * 3] = Math.random() * 5000 - 2000;
            starPositions[i * 3 + 1] = Math.random() * 5000 - 2000;
            starPositions[i * 3 + 2] = Math.random() * 5000 - 2000;
            
            if (Math.random() < 0.5) {
                starColors[i * 3] = 0.16;
                starColors[i * 3 + 1] = 0.5;
                starColors[i * 3 + 2] = Math.random() * 0.5 + 0.25;
            } else {
                starColors[i * 3] = 0.0;
                starColors[i * 3 + 1] = 0.0;
                starColors[i * 3 + 2] = Math.random() * 0.5 + 0.5;
            }
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        
        var starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        var starField = new THREE.Points(starGeometry, starMaterial);
        scene.add(starField);
    
        renderer = new t.WebGLRenderer({
            antialias: true,
            depthBuffer: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(pixR);
        
        world = new t.Object3D();
        scene.add(world);
    
        renderer.domElement.setAttribute("id", "scene");
        document.body.appendChild(renderer.domElement);

        // Lights
        var light = new THREE.AmbientLight(0x404040);
        scene.add(light);

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 128, 128);
        scene.add(directionalLight);
    }

    function setupWindowManager() {
        windowManager = new WindowManager();
        windowManager.setWinShapeChangeCallback(updateWindowShape);
        windowManager.setWinChangeCallback(windowsUpdated);

        let metaData = {foo: "bar"};
        windowManager.init(metaData);
        windowsUpdated();
    }

    function windowsUpdated() {
        updateNumberOfCubes();
    }

    function updateNumberOfCubes() {
        let wins = windowManager.getWindows();

        cubes.forEach((c) => {
            world.remove(c);
        })

        cubes = [];

        for (let i = 0; i < wins.length; i++) {
            let win = wins[i];
            let c;
            
            if (i == 0) {
                c = new t.Color('hsl(230, 80%, 75%)');
            } else if (i == 1) {
                c = new t.Color('hsl(350, 60%, 65%)');
            } else {
                let idBasedHueValue = (win.id % 10) / 10;
                let hue;
                if(idBasedHueValue < 0.5) {
                    hue = 240 - (idBasedHueValue * 2 * 60);
                } else {
                    hue = 360 - ((idBasedHueValue - 0.5) * 2 * 60);
                }
                c = new t.Color(`hsl(${hue}, 50%, 70%)`);
            }

            let s = 100 + i * 50;
            let radius = s / 2;

            let sphere = createOrganicSphere(radius, c);
            sphere.position.x = win.shape.x + (win.shape.w * .5);
            sphere.position.y = win.shape.y + (win.shape.h * .5);
    
            world.add(sphere);
            cubes.push(sphere);
        }
    }

    function createOrganicSphere(radius, color) {
        let innerSize = radius * 0.9;
        let outerSize = radius;
        let innerColor = color;
        let outerColor = color;
    
        let organicSphere = new THREE.Group();
    
        // Inner wireframe
        let sphereWireframeInner = new THREE.Mesh(
            new THREE.IcosahedronGeometry(innerSize, 2),
            new THREE.MeshLambertMaterial({
                color: innerColor,
                wireframe: true,
                transparent: true,
                opacity: 0.3,
                shininess: 0
            })
        );
        organicSphere.add(sphereWireframeInner);
    
        // Outer wireframe
        let sphereWireframeOuter = new THREE.Mesh(
            new THREE.IcosahedronGeometry(outerSize, 3),
            new THREE.MeshLambertMaterial({
                color: outerColor,
                wireframe: true,
                transparent: true,
                opacity: 0.3,
                shininess: 0
            })
        );
        organicSphere.add(sphereWireframeOuter);
    
        // Inner glass sphere
        let sphereGlassInner = new THREE.Mesh(
            new THREE.SphereGeometry(innerSize, 32, 32),
            new THREE.MeshPhongMaterial({
                color: innerColor,
                transparent: true,
                shininess: 25,
                opacity: 0.15,
                specular: 0x111111
            })
        );
        organicSphere.add(sphereGlassInner);
    
        // Outer glass sphere
        let sphereGlassOuter = new THREE.Mesh(
            new THREE.SphereGeometry(outerSize, 32, 32),
            new THREE.MeshPhongMaterial({
                color: outerColor,
                transparent: true,
                shininess: 25,
                opacity: 0.15,
                specular: 0x111111
            })
        );
        organicSphere.add(sphereGlassOuter);

        // Organic particles
        let particlesOuter = createOrganicParticles(outerSize, outerColor);
        organicSphere.add(particlesOuter);
    
        let particlesInner = createOrganicParticles(innerSize, innerColor);
        organicSphere.add(particlesInner);
    
        return organicSphere;
    }
    
    function createOrganicParticles(size, color) {
        let geometry = new THREE.BufferGeometry();
        const particleCount = 15000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const hsl = color.getHSL({});
        const baseHue = hsl.h;
        const baseSat = hsl.s;
        const baseLight = hsl.l;

        // Create organic distribution
        for (let i = 0; i < particleCount; i++) {
            // Organic distribution using noise patterns
            const radius = size * (0.7 + Math.random() * 0.3);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Add some noise to create organic clusters
            const noise = 0.2 * Math.sin(i * 0.1) * Math.cos(i * 0.05);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * (1 + noise);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * (1 + noise);
            positions[i * 3 + 2] = radius * Math.cos(phi) * (1 + noise);
            
            // Color variation for organic look
            const hueVariation = (Math.sin(i * 0.01) * 0.05);
            const satVariation = 0.2 + Math.random() * 0.3;
            const lightVariation = 0.1 + Math.random() * 0.2;
            
            const tempColor = new THREE.Color().setHSL(
                baseHue + hueVariation,
                baseSat * satVariation,
                baseLight * lightVariation
            );
            
            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;
            
            // Size variation
            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        let material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        return new THREE.Points(geometry, material);
    }
    
    function updateWindowShape(easing = true) {
        sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
        if (!easing) sceneOffset = sceneOffsetTarget;
    }

    function render() {
        let t = getTime();

        windowManager.update();

        let falloff = .05;
        sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
        sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

        world.position.x = sceneOffset.x;
        world.position.y = sceneOffset.y;

        let wins = windowManager.getWindows();

        for (let i = 0; i < cubes.length; i++) {
            let organicSphere = cubes[i]; 
            let win = wins[i];
            let _t = t; 

            let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)}
            
            organicSphere.position.x = organicSphere.position.x + (posTarget.x - organicSphere.position.x) * falloff;
            organicSphere.position.y = organicSphere.position.y + (posTarget.y - organicSphere.position.y) * falloff;
        
            organicSphere.rotation.x = _t * .5; 
            organicSphere.rotation.y = _t * .3; 
            updateOrganicSphere(organicSphere, t);
        };

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    /**
     * Updates the properties of an organic sphere object to create dynamic animations
     * such as rotations, opacity changes, and particle size variations.
     *
     * @param {THREE.Object3D} organicSphere - The parent 3D object containing the sphere's components.
     * @param {number} elapsedTime - The elapsed time in seconds used to calculate animations.
     */
    function updateOrganicSphere(organicSphere, elapsedTime) {
        let sphereWireframeInner = organicSphere.children[0];
        let sphereWireframeOuter = organicSphere.children[1];
        let sphereGlassInner = organicSphere.children[2];
        let sphereGlassOuter = organicSphere.children[3];
        let particlesOuter = organicSphere.children[4];
        let particlesInner = organicSphere.children[5];
    
        // Update rotations
        sphereWireframeInner.rotation.x += 0.002;
        sphereWireframeInner.rotation.z += 0.002;
        sphereWireframeOuter.rotation.x += 0.001;
        sphereWireframeOuter.rotation.z += 0.001;
        sphereGlassInner.rotation.y += 0.005;
        sphereGlassInner.rotation.z += 0.005;
        sphereGlassOuter.rotation.y += 0.01;
        sphereGlassOuter.rotation.z += 0.01;
        particlesOuter.rotation.y += 0.0005;
        particlesInner.rotation.y -= 0.002;
    
        // Organic pulsing effect
        /**
         * Calculates the inner shift value based on the elapsed time.
         * The value is derived using the absolute value of the cosine function,
         * adjusted by an offset and scaled over time.
         *
         * @type {number} The computed inner shift value.
         */
        var innerShift = Math.abs(Math.cos(((elapsedTime + 2.5) / 20)));
        var outerShift = Math.abs(Math.cos(((elapsedTime + 5) / 10)));
    
        // Update materials
        sphereWireframeOuter.material.opacity = 0.3 + innerShift * 0.2;
        sphereGlassOuter.material.opacity = 0.15 + outerShift * 0.1;
        sphereWireframeInner.material.opacity = 0.3 + outerShift * 0.2;
        sphereGlassInner.material.opacity = 0.15 + innerShift * 0.1;
    
        // Update particle sizes for organic effect
        if (particlesOuter.material.size !== undefined) {
            particlesOuter.material.size = 0.2 + Math.sin(elapsedTime * 0.5) * 0.1;
            particlesInner.material.size = 0.2 + Math.cos(elapsedTime * 0.5) * 0.1;
        }
    }
    
    function resize() {
        let width = window.innerWidth;
        let height = window.innerHeight
        
        camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}