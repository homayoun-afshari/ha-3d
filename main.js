window.addEventListener('load', ()=> {
	makeHa3d();
	
	const domHa3d = document.getElementsByClassName('ha3d')[0];
	domHa3d.makeHa3dWorld()
		.setFeatureValues('perspective', [500])
		.setFeatureValues('cameraAngles', [-0.4*Math.PI, 0, -0.04*Math.PI])
		.setFeatureControllers( 'cameraAngles', [document.getElementById('inpCameraAngle0'), null, document.getElementById('inpCameraAngle2')])
		.setInteraction('cameraAngles', {
			hasAnimation: true,
			actionPlane: 'free',
			returnCoordinates: [-0.4*Math.PI, 0, -0.04*Math.PI],
		});
	domHa3d.makeHa3dObject('plane')
		.setFeatureValues('rgba', [80, 80, 80, 1.0])
		.setFeatureValues('coordinates', [0, 0, 0])
		.setFeatureValues('sizes', [1000, 1000]);
	domHa3d.makeHa3dObject('cylindroid')
		.setFeatureValues('rgba', [110, 110, 110, 1.0])
		.setFeatureValues('coordinates', [0, 0, 10])
		.setFeatureValues('sizes', [400, 300, 20]);;
	domHa3d.makeHa3dObject('cylindroid', 12)
		.setFeatureValues('rgba', [150, 150, 150, 1.0])
		.setFeatureValues('coordinates', [0, 0, 30])
		.setFeatureValues('sizes', [200, 200, 20]);
	domHa3d.makeHa3dObject('box')
		.setFeatureValues('rgba', [250, 250, 250, 1.0])
		.setFeatureValues('coordinates', [0, 0, 95])
		.setFeatureValues('sizes', [50, 60, 70])
		.setFeatureControllers( 'eulerAngles', [document.getElementById('inpBox0EulerAngle0'), document.getElementById('inpBox0EulerAngle1'), document.getElementById('inpBox0EulerAngle2')])
		.setEventListener('faceVisibilityChange', (event)=> {
			// console.log(event.visibility);
		})
		.setEventListener('animationStop', (event)=> {
			// console.log(event);
		})
		.setInteraction('eulerAngles', {
			hasAnimation: true,
			actionPlane: 'free'
		});
	domHa3d.makeHa3dObject('light')
		.setFeatureValues('coordinates', [90, -30, 170])
		.setFeatureValues('rgba', [246, 229, 141, 1.0])
		.setFeatureLimiter('coordinates', (values)=> {
			const radius = Math.sqrt(Math.pow(values[0], 2) + Math.pow(values[1], 2));
			if (radius > 200) {
				values[0] *= 200/radius;
				values[1] *= 200/radius;
			}
		})
		.setInteraction('coordinates', {
			hasAnimation: true,
			actionPlane: 'xy'
		});
	domHa3d.makeHa3dObject('light')
		.setFeatureValues('coordinates', [-90, -30, 190])
		.setFeatureValues('rgba', [199, 236, 238, 1.0])
		.setFeatureLimiter('coordinates', (values)=> {
			const radius = Math.sqrt(Math.pow(values[0], 2) + Math.pow(values[1], 2));
			if (radius > 200) {
				values[0] *= 200/radius;
				values[1] *= 200/radius;
			}
		})
		.setInteraction('coordinates', {
			actionPlane: 'xy'
		});
});

window.addEventListener('resize', ()=> {
	updateHa3d();
});