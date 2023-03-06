import * as THREE from 'three';

import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
let tempMatrix; 

let camera, scene, renderer;

let controller1, controller2;
let controllerGrip1, controllerGrip2;

let skinnedMesh, skeleton, bones, skeletonHelper;

let aMovingObject;
let groupDraggables;
let intersectPoint;
let intersectObject;
let container;

let raycaster;
const pointer = new THREE.Vector2();
                        
init();
animate();

function init() {

    scene = new THREE.Scene();
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    //crear caja
    const aBoxGeometry = new THREE.BoxGeometry( 10, 2, 10 );
    const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
    aMovingObject = new THREE.Mesh( aBoxGeometry, material );
    aMovingObject.currentDrag = false;
    aMovingObject.HexNotSelected = material.emissive.getHex();
    aMovingObject.HexSelected =  0xff0000;
    aMovingObject.isIntersectable = true;
    aMovingObject.position.set(0, 30, 0);
 
    scene.add( aMovingObject );
    //inicializamos variable para usar después. 
    intersectObject = aMovingObject;
    
    raycaster = new THREE.Raycaster();

    let dirLight = new THREE.DirectionalLight ( 0xffffff, 0.5 );
    scene.add( dirLight );
        
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.3 );
    scene.add( hemiLight );
    
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.z = 60;
    
    /*renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );*/
  
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    container.appendChild( renderer.domElement );

    document.body.appendChild( VRButton.createButton( renderer ) );
    
    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller1 );

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );
    
    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener( 'pointerdown', onPointerDown );
    window.addEventListener( 'pointerup', onPointerUp );
    window.addEventListener( 'mousemove', onPointerMove );
    initSkinnedMesh();
    scene.add( groupDraggables );

}

function getIntersections( controller ) {
    raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
    return raycaster.intersectObjects( scene.children, false );
}

function onSelectStart( event ) {

    const controller = event.target;

    const intersections = getIntersections( controller );

    if ( intersections.length > 0 ) {

            const intersection = intersections[ 0 ];

            const object = intersection.object;
            object.material.emissive.b = 1;
            controller.attach( object );

            controller.userData.selected = object;

    }

}

function onSelectEnd( event ) {

    const controller = event.target;

    if ( controller.userData.selected !== undefined ) {

            const object = controller.userData.selected;
            object.material.emissive.b = 0;
            scene.attach( object );

            controller.userData.selected = undefined;

    }


}

function onPointerMove( event ) {
    
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const found = raycaster.intersectObjects(scene.children, true);
    if (found.length > 0 && found[0].object.isIntersectable == true) {
         intersectPoint = found[0].point;
         
         
    }
    if(intersectObject.currentDrag){
        
        intersectObject.position.x = intersectPoint.x;
        intersectObject.position.y = intersectPoint.y;
    }
    
}

function onPointerUp(event) {
   
     intersectObject.currentDrag = false;
     intersectObject.material.emissive.setHex( aMovingObject.HexNotSelected );
   
    
}

function onPointerDown( event ) {
    
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const found = raycaster.intersectObjects(scene.children, true);
    
    if (found.length > 0 && found[0].object.isIntersectable) {
        intersectObject = found[0].object;
        intersectObject.currentDrag = true;
        intersectObject.material.emissive.setHex(aMovingObject.HexSelected );
    }
   
}

function initSkinnedMesh() {

    const segmentHeight = 6;
    const segmentCount = 4;
    const height = segmentHeight * segmentCount;
    const halfHeight = height * 0.5;

    const sizing = {
            segmentHeight,
            segmentCount,
            height,
            halfHeight
    };

    const geometry = createGeometry( sizing );
    
    const material = new THREE.MeshStandardMaterial( {
            color: 0x156289,
           emissive: 0x072534,
            side: THREE.DoubleSide,
            flatShading: true,
            wireframe: true
    } );


    const bones = createBones( sizing );
    
    skeleton = new THREE.Skeleton( bones );
    
    skinnedMesh = new THREE.SkinnedMesh( geometry, material );

    const rootBone = skeleton.bones[ 0 ];
    
    skinnedMesh.add( rootBone );

    skinnedMesh.bind( skeleton );

    scene.add( skinnedMesh );
    

}

function createGeometry( sizing ) {

    const geometry = new THREE.CylinderGeometry(
            5, // radiusTop
            5, // radiusBottom
            sizing.height, // height
            8, // radiusSegments
            sizing.segmentCount * 1, // heightSegments
            true // openEnded
    );

    const position = geometry.attributes.position;

    const vertex = new THREE.Vector3();

    const skinIndices = [];
    const skinWeights = [];

    for ( let i = 0; i < position.count; i ++ ) {

            vertex.fromBufferAttribute( position, i );

            const y = ( vertex.y + sizing.halfHeight );

            const skinIndex = Math.floor( y / sizing.segmentHeight );
            const skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

            skinIndices.push( skinIndex, skinIndex + 1, 0, 0 );
            skinWeights.push( 1 - skinWeight, skinWeight, 0, 0 );

    }

    geometry.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
    geometry.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );

    return geometry;

    }

function createBones( sizing ) {

    bones = [];
    
    const aBoxGeometry = new THREE.BoxGeometry( 10, 2, 10 );
    const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
    let bone = new THREE.Mesh( aBoxGeometry, material );
    bone.currentDrag = false;
    bone.HexNotSelected = material.emissive.getHex();
    bone.HexSelected =  0xff0000;
    bone.isIntersectable = true;
    let prevBone = bone;
    bones.push( prevBone );
    
    prevBone.position.y = - sizing.halfHeight;
        

    for ( let i = 0; i < sizing.segmentCount; i ++ ) {
        
            const aBoxGeometry = new THREE.BoxGeometry( 10, 2, 10);
            const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
            const bone = new THREE.Mesh( aBoxGeometry, material );
            bone.currentDrag = false;
            bone.HexNotSelected = material.emissive.getHex();
            bone.HexSelected =  0xff0000;
            bone.isIntersectable = true;
            bone.position.y = sizing.segmentHeight;
            bones.push( bone );
            prevBone.add( bone );
            prevBone = bone;
 

    }

    return bones;
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}

/*function animate() {

    requestAnimationFrame( animate );
    renderer.render( scene, camera );

}*/

function animate() {

    renderer.setAnimationLoop( render );

}

function render() {

    cleanIntersected();

    intersectObjects( controller1 );
    intersectObjects( controller2 );

    renderer.render( scene, camera );

}
