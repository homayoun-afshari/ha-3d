Ha3dEntity = class {
	static code = 0;
	static axesTemplate = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
	];

	constructor() {
		this.code = `${this.constructor.name}${this.constructor.code++}`;
		this.domLinker = undefined;
		this.features = {};
		this.eventListeners = new Map();
		this.interactionProfile = new Map([
			['targetFeature', undefined],
			['hasAnimation', undefined],
			['actionPlane', undefined],
			['returnCoordinates', undefined]
		]);
	}

	addFeature(name, parameters={}) {
		const isLocked = parameters.isLocked !== undefined ? parameters.isLocked : false;
		const dimension = parameters.dimension !== undefined ? parameters.dimension : 1;
		const initializer = parameters.initializer !== undefined ? parameters.initializer : 0;
		const valuePeriod = parameters.valuePeriod;
		const externalLimiter = parameters.externalLimiter !== undefined ? parameters.externalLimiter : ()=> {};
		const internalLimiter = parameters.internalLimiter !== undefined ? parameters.internalLimiter : ()=> {};
		const valueMapperFromController = parameters.valueMapperFromController !== undefined ? parameters.valueMapperFromController : (value)=> value;
		const valueMapperToController = parameters.valueMapperToController !== undefined ? parameters.valueMapperToController : (value)=> value;
		const changeApplier = parameters.changeApplier !== undefined ? parameters.changeApplier : ()=> {};
		const changePropagator = parameters.changePropagator !== undefined ? parameters.changePropagator : ()=> {};
		const interactionInterpreter = parameters.interactionInterpreter !== undefined ? parameters.interactionInterpreter : ()=> [...this.features[name].values];
		const values = haFuncInitializeVector(dimension, initializer);
		this.features[name] = {
            name: name,
			isLocked: isLocked,
			dimension: dimension,
			values: values,
			timestamp: 0.001*performance.now(),
			animation: new HaAnimation(values=> this.setFeatureValues(name, values), values, valuePeriod, this.eventListeners),
			domControllers: haFuncInitializeVector(dimension, null),
			mapValueFromController: valueMapperFromController,
			mapValueToController: valueMapperToController,
			limitExternally: externalLimiter,
			limitInternally: internalLimiter,
			applyChange: changeApplier,
			propagateChange: changePropagator,
			interpretInteraction: interactionInterpreter
		};
	}

	setFeatureValues(name, values, isControlled=false) {
		const feature = this.features[name];
		if (feature === undefined || feature.isLocked === true)
			return this;
		const oldValues = [...feature.values];
		const oldTimestamp = feature.timestamp;
		if (values === undefined)
			values = feature.values;
		for (let i = 0; i < feature.dimension; i++) {
			if (values[i] !== null)
				feature.values[i] = values[i];
		}
		feature.timestamp = 0.001*performance.now();
		feature.limitExternally(feature.values);
		feature.limitInternally(feature.values);
		feature.applyChange();
		feature.propagateChange();
		if (!isControlled) {
			for (let i = 0; i < feature.dimension; i++)
				if (feature.domControllers[i] !== null)
					feature.domControllers[i].update();
		}
		if (this.eventListeners.has(`${name}Change`))
			this.eventListeners.get(`${name}Change`)({
				oldValues: oldValues,
				oldTimestamp: oldTimestamp,
				newValues: [...feature.values],
				newTimestamp: feature.timestamp
			});
		return this;
	}

	setFeatureLimiter(name, externalLimiter) {
		const feature = this.features[name];
		if (feature === undefined)
			return this;
		feature.limitExternally = externalLimiter;
		return this;
	}

	setFeatureControllers(name, domControllers) {
		const feature = this.features[name];
		if (feature === undefined)
			return this;
		for (let i = 0; i < feature.dimension; i++) {
			if (domControllers[i] === null)
				continue;
			domControllers[i].update = ()=> {
				domControllers[i].value = feature.mapValueToController(feature.values[i]);
			}
			domControllers[i].addEventListener('input', ()=> {
				const featureValues = [];
				for (let j = 0; j < feature.values.length; j++) {
					featureValues[j] = null;
					if (j === i)
						featureValues[j] = feature.mapValueFromController(parseFloat(domControllers[i].value));
				}
				feature.animation.stop();
				this.setFeatureValues(name, featureValues, true);
			});
			feature.domControllers[i] = domControllers[i];
			feature.domControllers[i].update();
		}
		return this;
	}

	setEventListener(title, callback) {
		this.eventListeners.set(title, callback);
		return this;
	}
	unsetEventListener(title) {
		delete(this.eventListeners.delete(title))
		return this;
	}

	setInteraction(targetFeatureName, parameters={}) {
		const targetFeature = this.features[targetFeatureName];
		const hasAnimation = parameters.hasAnimation;
		const actionPlane = parameters.actionPlane;
		const returnCoordinates = parameters.returnCoordinates;
		if (targetFeature === undefined)
			return this;
		this.interactionProfile.set('targetFeature', targetFeature);
		this.interactionProfile.set('hasAnimation', hasAnimation);
		this.interactionProfile.set('actionPlane', actionPlane);
		this.interactionProfile.set('returnCoordinates', returnCoordinates);
		return this;
	}
	unsetInteraction() {
		this.interactionProfile.set('targetFeature', undefined);
		return this;
	}

	setFaceInnerHtml(faceIndex, innerHtml) {
		for (let i = 0; i < this.faces.length; i++) {
			if (i !== faceIndex)
				continue;
			this.faces[i].domLinker.innerHTML = innerHtml;
		}
		return this;
	}
	unsetFaceInnerHtml(faceIndex) {
		for (let i = 0; i < this.faces.length; i++) {
			if (i !== faceIndex)
				continue;
			this.faces[i].domLinker.innerHTML = this.faces[i].defaultInnerHtml;
		}
		return this;
	}
};

Ha3dWorld = class extends Ha3dEntity {
	constructor(domHa3d) {
		const changePropagator = ()=> {
			const ha3dObjectList = this.ha3dObjectList;
			if (ha3dObjectList === undefined)
				return;
			for (let i = 0; i < ha3dObjectList.length; i++) {
				for (let j = 0; j < ha3dObjectList[i].faces.length; j++)
					ha3dObjectList[i].faces[j].updateVisibility();
			}
		};
		super();
		
		this.types = ['world'];
		this.cameraPlaneAxes = ha3dRotateVectors(Ha3dEntity.axesTemplate, []);
		this.cameraCoordinates = [0, 0, 1000];
		this.interactionManager = {
			targetHa3dEntity: undefined,
			actionPlaneIsFree: undefined,
			actionPlaneAxis: undefined,
			actionOriginCoordinates: undefined,
			activate: (event, targetHa3dEntity, targetHa3dEntityCoordinates, clickPlaneAxis, clickPlaneAnchorCoordinates)=> {
				const rectDomHa3d = domHa3d.getBoundingClientRect();
				const clickPositionOnClickPlane = [
					event.clientX - rectDomHa3d.left - 0.5*rectDomHa3d.width,
					event.clientY - rectDomHa3d.top - 0.5*rectDomHa3d.height
				];
				const clickCoordinatesUsingCameraPlane = ha3dMapCoordinatesToAxes([...clickPositionOnClickPlane, 0], this.cameraPlaneAxes);
				const clickCoordinates = haFuncGetLinePlaneIntersection(clickCoordinatesUsingCameraPlane, this.cameraCoordinates, clickPlaneAxis, clickPlaneAnchorCoordinates)[1];
				const clickDistanceFromCameraPlane = haFuncGetInnerProduct(this.cameraPlaneAxes[2], clickCoordinates);
				let actionPlaneIsFree = false;
				let actionPlaneAxis;
				let actionOriginCoordinates;
				switch (targetHa3dEntity.interactionProfile.get('actionPlane')) {
					case 'xy':
					case 'yx':
						actionPlaneAxis = [0, 0, 1];
						break;
					case 'yz':
					case 'zy':
						actionPlaneAxis = [0, 1, 0];
						break;
					case 'xz':
					case 'zx':
						actionPlaneAxis = [1, 0, 0];
						break;
					case 'camera':
						actionPlaneAxis = [...this.cameraPlaneAxes[2]];
						break;
					default:
						actionPlaneIsFree = true;
						actionPlaneAxis = targetHa3dEntity.constructor === Ha3dWorld ? [...this.cameraPlaneAxes[2]] : clickPlaneAxis;
				}
				if (actionPlaneIsFree)
					actionOriginCoordinates = targetHa3dEntityCoordinates;
				else
					actionOriginCoordinates = haFuncGetLinePlaneIntersection(targetHa3dEntityCoordinates, haFuncLinearCombineVectors([targetHa3dEntityCoordinates, actionPlaneAxis], [1, 1]), actionPlaneAxis, clickCoordinates)[1];
				this.interactionManager.targetHa3dEntity = targetHa3dEntity;
				this.interactionManager.targetFeature = targetHa3dEntity.interactionProfile.get('targetFeature');
				this.interactionManager.targetFeatureStartingValues = [...targetHa3dEntity.interactionProfile.get('targetFeature').values];
				this.interactionManager.targetFeatureBeforeUpdateValues = [...targetHa3dEntity.interactionProfile.get('targetFeature').values];
				this.interactionManager.targetFeatureBeforeUpdateTimestamp = 0.001*performance.now();
				this.interactionManager.targetFeatureUpdateTimestamp = 0.001*performance.now();
				this.interactionManager.cameraPlaneAxesOnClick = this.cameraPlaneAxes.map(vector=> [...vector]);
				this.interactionManager.cameraCoordinatesOnClick = [...this.cameraCoordinates];
				this.interactionManager.clickEvent = event;
				this.interactionManager.clickCoordinates = clickCoordinates;
				this.interactionManager.clickDistanceFromCameraPlane = clickDistanceFromCameraPlane;
				this.interactionManager.clickScalingOnCameraPlane = 1 - clickDistanceFromCameraPlane/this.features.perspective.values[0];
				this.interactionManager.hasAnimation = targetHa3dEntity.interactionProfile.get('hasAnimation');
				this.interactionManager.actionPlaneIsFree = actionPlaneIsFree;
				this.interactionManager.actionPlaneAxis = actionPlaneAxis;
				this.interactionManager.actionOriginCoordinates = actionOriginCoordinates;
				this.interactionManager.returnCoordinates = targetHa3dEntity.interactionProfile.get('returnCoordinates');
				this.interactionManager.targetFeature.animation.stop();
			},
			interact: (event)=> {
				if (this.interactionManager.targetHa3dEntity === undefined || haFuncGetL1Norm(haFuncLinearCombineVectors([[this.interactionManager.clickEvent.clientX, this.interactionManager.clickEvent.clientY], [event.clientX, event.clientY]], [1, -1])) === 0)
					return;
				const rectDomHa3d = domHa3d.getBoundingClientRect();
				const pointerPositionOnCameraPlane = [
					event.clientX - rectDomHa3d.left - 0.5*rectDomHa3d.width,
					event.clientY - rectDomHa3d.top - 0.5*rectDomHa3d.height
				];
				const pointerPositionOnScaledCameraPlane = haFuncOperateOnVector(pointerPositionOnCameraPlane, x => this.interactionManager.clickScalingOnCameraPlane*x);
				const pointerCoordinatesUsingCameraPlane = ha3dMapCoordinatesToAxes([...pointerPositionOnScaledCameraPlane, this.interactionManager.clickDistanceFromCameraPlane], this.interactionManager.cameraPlaneAxesOnClick);
				const pointerCoordinates = haFuncGetLinePlaneIntersection(pointerCoordinatesUsingCameraPlane,this.interactionManager.cameraCoordinatesOnClick, this.interactionManager.actionPlaneAxis, this.interactionManager.clickCoordinates)[1];
				this.interactionManager.pointerCoordinates = pointerCoordinates;
				this.interactionManager.targetFeatureBeforeUpdateValues = [...this.interactionManager.targetFeature.values];
				this.interactionManager.targetFeatureBeforeUpdateTimestamp = this.interactionManager.targetFeatureUpdateTimestamp;
				this.interactionManager.targetFeatureUpdateTimestamp = 0.001*performance.now();
				this.interactionManager.targetHa3dEntity.setFeatureValues(this.interactionManager.targetFeature.name, this.interactionManager.targetFeature.interpretInteraction());
			},
			deactivate: ()=> {
				if (this.interactionManager.targetHa3dEntity === undefined)
					return;
				if (this.interactionManager.hasAnimation) {
					const targetFeatureAnimation = this.interactionManager.targetFeature.animation;
					const timestamp = 0.001*performance.now();
					if (timestamp + this.interactionManager.targetFeatureBeforeUpdateTimestamp < 2*this.interactionManager.targetFeatureUpdateTimestamp) {
						const duration = timestamp - this.interactionManager.targetFeatureBeforeUpdateTimestamp;
						const targetFeatureValocity = haFuncOperateOnVector(haFuncLinearCombineVectors([this.interactionManager.targetFeature.values, this.interactionManager.targetFeatureBeforeUpdateValues], [1, -1]), x => x/duration);
						targetFeatureAnimation.setVelocity(targetFeatureValocity);
					}
					if (this.interactionManager.returnCoordinates !== undefined)
						targetFeatureAnimation.setDestination(this.interactionManager.returnCoordinates);
					targetFeatureAnimation.play();
				} else if (this.interactionManager.returnCoordinates !== undefined)
					this.interactionManager.targetHa3dEntity.setFeatureValues(this.interactionManager.targetFeature.name, this.interactionManager.returnCoordinates);
				this.interactionManager.targetHa3dEntity = undefined;
			}
		};
		
		this.createDomLinker(domHa3d);
		this.createDomSpace();

		this.addFeature('perspective', {
			dimension: 1,
			initializer: 1000,
			changeApplier: ()=> {
				const perspective = this.features.perspective.values;
				this.cameraCoordinates = ha3dMapCoordinatesToAxes([0, 0, perspective], this.cameraPlaneAxes);
				this.updateDomHa3d();
			},
			changePropagator: changePropagator
		});
		this.addFeature('cameraAngles', {
			dimension: 3,
			valuePeriod: 2*Math.PI,
			valueMapperFromController: (value)=> {
				return value*Math.PI/180;
			},
			valueMapperToController: (value)=> {
				return haFuncMudolu(value, 2*Math.PI)*180/Math.PI;
			},
			changeApplier: ()=> {
				const cameraAngles = this.features.cameraAngles.values;
				const perspective = this.features.perspective.values;
				this.cameraPlaneAxes = ha3dRotateVectors(Ha3dEntity.axesTemplate, [
					['x', cameraAngles[0]],
					['y', cameraAngles[1]],
					['z', cameraAngles[2]]
				]);
				this.cameraCoordinates = ha3dMapCoordinatesToAxes([0, 0, perspective], this.cameraPlaneAxes);
				this.updateDomSpace();
			},
			changePropagator: changePropagator,
			interactionInterpreter: ()=> {
				const relativeClickCoordinates = haFuncLinearCombineVectors([this.interactionManager.clickCoordinates, this.interactionManager.actionOriginCoordinates], [1, -1]);
				const relativePointerCoordinates = haFuncLinearCombineVectors([this.interactionManager.pointerCoordinates, this.interactionManager.actionOriginCoordinates], [1, -1]);
				const axis = haFuncGetCrossProduct(relativeClickCoordinates, relativePointerCoordinates);
				const angle = Math.acos(haFuncGetCorrelation(relativeClickCoordinates, relativePointerCoordinates));
				const cameraAnglesNewValues = haFuncOperateOnVector(ha3dRotateZYXEulerAngles(haFuncOperateOnVector(this.interactionManager.targetFeatureStartingValues, x => -x), axis, angle, true), x => -x);
				return cameraAnglesNewValues;
			}
		});
	}

	addHa3dObject(ha3dObject) {
		for (let i = 0; i < ha3dObject.types.length; i++) {
			const key = `ha3d${haFuncUcfirst(ha3dObject.types[i])}List`;
			if (this[key] === undefined)
				this[key] = [];
			this[key].push(ha3dObject);
		}
	}

	createDomLinker(domHa3d) {
		this.domLinker = domHa3d;
		domHa3d.style.perspective = '1000px';
		domHa3d.ha3dLinker = this;
	}
	
	createDomSpace() {
		const domHa3d = this.domLinker;
		const domSpace = document.createElement('div');
		domSpace.classList.add('space');
		domHa3d.appendChild(domSpace);
	}

	updateDomHa3d() {
		const domHa3d = this.domLinker;
		const perspective = this.features.perspective.values;
		domHa3d.style.perspective = `${perspective}px`;
	}

	updateDomSpace() {
		const domSpace = this.domLinker.getElementsByClassName('space')[0];
		const cameraAngles = this.features.cameraAngles.values;
		domSpace.style.transform = `translate(-50%, -50%) rotateX(${-cameraAngles[0]}rad) rotateY(${-cameraAngles[1]}rad) rotateZ(${-cameraAngles[2]}rad)`;
	}
};

Ha3dObject = class extends Ha3dEntity {
	static faceColorResistance = 0.6;
	static minFaceBrightness = 0.4;
	static maxFaceBrightness = 1.0;

	constructor(ha3dWorld, exclusiveType, parameters={}) {
		const hasShade = parameters.hasShade !== undefined ? parameters.hasShade : true;
		const hasShadow = parameters.hasShadow !== undefined ? parameters.hasShadow : true;
		const featureRgbaIsLocked = parameters.featureRgbaIsLocked !== undefined ? parameters.featureRgbaIsLocked : false;
		const featureCoordinatesIsLocked = parameters.featureCoordinatesIsLocked !== undefined ? parameters.featureCoordinatesIsLocked : false;
		const featureSizesIsLocked = parameters.featureSizesIsLocked !== undefined ? parameters.featureSizesIsLocked : false;
		const featureEulerAnglesIsLocked = parameters.featureEulerAnglesIsLocked !== undefined ? parameters.featureEulerAnglesIsLocked : false;
		const featureRgbaInitializer = parameters.featureRgbaInitializer !== undefined ? parameters.featureRgbaInitializer : [127, 127, 127, 1.0];
		const featureCoordinatesInitializer = parameters.featureCoordinatesInitializer !== undefined ? parameters.featureCoordinatesInitializer : 0;
		const featureSizesInitializer = parameters.featureSizesInitializer !== undefined ? parameters.featureSizesInitializer : 50;
		const featureEulerAnglesInitializer = parameters.featureEulerAnglesInitializer !== undefined ? parameters.featureEulerAnglesInitializer : 0;
		const featureCoordinatesInternalLimiter = parameters.featureCoordinatesInternalLimiter !== undefined ? parameters.featureCoordinatesInternalLimiter : ()=> {};
		const featureRgbaInternalLimiter = parameters.featureRgbaInternalLimiter !== undefined ? parameters.featureRgbaInternalLimiter : ()=> {};
		const featureSizesInternalLimiter = parameters.featureSizesInternalLimiter !== undefined ? parameters.featureSizesInternalLimiter : ()=> {};
		const featureEulerAnglesInternalLimiter = parameters.featureEulerAnglesInternalLimiter !== undefined ? parameters.featureEulerAnglesInternalLimiter : ()=> {};
		const featureRgbaChangePropagator = parameters.featureRgbaChangePropagator !== undefined ? parameters.featureRgbaChangePropagator : ()=> {};
		const featureCoordinatesChangePropagator = parameters.featureCoordinatesChangePropagator !== undefined ? parameters.featureCoordinatesChangePropagator : ()=> {};
		const featureSizesChangePropagator = parameters.featureSizesChangePropagator !== undefined ? parameters.featureSizesChangePropagator : ()=> {};
		const featureEulerAnglesChangePropagator = parameters.featureEulerAnglesChangePropagator !== undefined ? parameters.featureEulerAnglesChangePropagator : ()=> {};
		super();

		this.types = ['object', exclusiveType, this.constructor.name.split('Ha3d')[1].toLocaleLowerCase()];
		this.ha3dWorld = ha3dWorld;
		this.hasShade = hasShade;
		this.hasShadow = hasShadow;
		this.axes = ha3dRotateVectors(Ha3dEntity.axesTemplate, []);
		this.vertices = [];
		this.faces = [];
		this.grounds = [];
		
		this.registerInHa3dWorld();
		this.createDomLinker();

		this.addFeature('rgba', {
			isLocked: featureRgbaIsLocked,
			dimension: 4,
			initializer: featureRgbaInitializer,
			internalLimiter: (values)=> {
				featureRgbaInternalLimiter(values);
				for (let i = 0; i < 3; i++)
					values[i] = haFuncMudolu(Math.round(values[i]), 256);
				values[3] = Math.max(values[3], 0.0);
				values[3] = Math.min(values[3], 1.0);
			},
			changeApplier: ()=> {
				this.updateDomObjectStyle();
			},
			changePropagator: featureRgbaChangePropagator
		});
		this.addFeature('coordinates', {
			isLocked: featureCoordinatesIsLocked,
			dimension: 3,
			initializer: featureCoordinatesInitializer,
			internalLimiter: featureCoordinatesInternalLimiter,
			changeApplier: ()=> {
				for (let i = 0; i < this.vertices.length; i++) {
					this.vertices[i].updateCoordinates();
				}
				for (let i = 0; i < this.faces.length; i++) {
					this.faces[i].updateCoordinates();
					this.faces[i].updateShade();
				}
				for (let i = 0; i < this.grounds.length; i++) {
					this.grounds[i].updateShadow();
				}
				this.updateDomObjectStyle();
			},
			changePropagator: featureCoordinatesChangePropagator,
			interactionInterpreter: ()=> {
				const pointerDisplacements = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.pointerCoordinates, this.ha3dWorld.interactionManager.clickCoordinates], [1, -1]);
				const coordinatesNewValues = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.targetFeatureStartingValues, pointerDisplacements], [1, 1]);
				return coordinatesNewValues;
			}
		});
		this.addFeature('sizes', {
			isLocked: featureSizesIsLocked,
			dimension: 3,
			initializer: featureSizesInitializer,
			internalLimiter: (values)=> {
				featureSizesInternalLimiter(values);
				for (let i = 0; i < values.length; i++)
					values[i] = Math.max(values[i], 1);
			},
			changeApplier: ()=> {
				for (let i = 0; i < this.vertices.length; i++) {
					this.vertices[i].updateLocalCoordinates();
					this.vertices[i].updateCoordinates();
				}
				for (let i = 0; i < this.faces.length; i++) {
					this.faces[i].updateLocalAxes();
					this.faces[i].updateLocalCoordinates();
					this.faces[i].updateCoordinates();
					this.faces[i].updateDomFaceStyle();
					this.faces[i].updateShade();
				}
				for (let i = 0; i < this.grounds.length; i++) {
					this.grounds[i].updateDomGroundStyle();
					this.grounds[i].updateShadow();
				}
			},
			changePropagator: featureSizesChangePropagator,
			interactionInterpreter: ()=> {
				const relativeClickCoordinates = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.clickCoordinates, this.ha3dWorld.interactionManager.actionOriginCoordinates], [1, -1]);
				const relativePointerCoordinates = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.pointerCoordinates, this.ha3dWorld.interactionManager.actionOriginCoordinates], [1, -1]);
				const localClickCoordinates = ha3dMapCoordinatesFromAxes(relativeClickCoordinates, this.axes);
				const localPointerCoordinates = ha3dMapCoordinatesFromAxes(relativePointerCoordinates, this.axes);
				const localPointerDisplacemet = haFuncLinearCombineVectors([localPointerCoordinates, localClickCoordinates], [1, -1]);
				const sizesNewValues = [];
				for (let i = 0; i < this.ha3dWorld.interactionManager.targetFeatureStartingValues.length; i++) {
					const sign = 2*(localClickCoordinates[i] > 0) - 1;
					const sizesNewValue = this.ha3dWorld.interactionManager.targetFeatureStartingValues[i] + 2*sign*localPointerDisplacemet[i];
					sizesNewValues.push(sizesNewValue);
				}
				return sizesNewValues;
			}
		});
		this.addFeature('eulerAngles', {
			isLocked: featureEulerAnglesIsLocked,
			dimension: 3,
			initializer: featureEulerAnglesInitializer,
			valuePeriod: 2*Math.PI,
			internalLimiter: featureEulerAnglesInternalLimiter,
			valueMapperFromController: (value)=> {
				return value*Math.PI/180;
			},
			valueMapperToController: (value)=> {
				return haFuncMudolu(value, 2*Math.PI)*180/Math.PI;
			},
			changeApplier: ()=> {
				const eulerAngles = this.features.eulerAngles.values;
				this.axes = ha3dRotateVectors(Ha3dEntity.axesTemplate, [
					['z', eulerAngles[2]],
					['y', eulerAngles[1]],
					['x', eulerAngles[0]]
				]);
				for (let i = 0; i < this.vertices.length; i++) {
					this.vertices[i].updateCoordinates();
				}
				for (let i = 0; i < this.faces.length; i++) {
					this.faces[i].updateAxes();
					this.faces[i].updateCoordinates();
					this.faces[i].updateDomFaceStyle();
					this.faces[i].updateShade();
					this.faces[i].updateVisibility();
				}
				for (let i = 0; i < this.grounds.length; i++) {
					this.grounds[i].updateDomGroundStyle();
					this.grounds[i].updateShadow();
				}
				this.updateDomObjectStyle();
			},
			changePropagator: featureEulerAnglesChangePropagator,
			interactionInterpreter: ()=> {
				const relativeClickCoordinates = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.clickCoordinates, this.ha3dWorld.interactionManager.actionOriginCoordinates], [1, -1]);
				const relativePointerCoordinates = haFuncLinearCombineVectors([this.ha3dWorld.interactionManager.pointerCoordinates, this.ha3dWorld.interactionManager.actionOriginCoordinates], [1, -1]);
				const axis = haFuncGetCrossProduct(relativeClickCoordinates, relativePointerCoordinates);
				const angle = Math.acos(haFuncGetCorrelation(relativeClickCoordinates, relativePointerCoordinates));
				const eulerAnglesNewValues = ha3dRotateZYXEulerAngles(this.ha3dWorld.interactionManager.targetFeatureStartingValues, axis, angle);
				return eulerAnglesNewValues;
			}
		});

		this.updateDomObjectStyle();
	}

	registerInHa3dWorld() {
		this.ha3dWorld.addHa3dObject(this);
	}

	createDomLinker() {
		const domHa3d = this.ha3dWorld.domLinker;
		const domSpace = domHa3d.getElementsByClassName('space')[0];
		const domObject = document.createElement('div');
		this.domLinker = domObject;
		domObject.classList.add('object');
		domObject.classList.add(this.constructor.name.split('Ha3d')[1].toLocaleLowerCase());
		domObject.style.transform = 'translateZ(0px)';
		domObject.ha3dLinker = this;
		domSpace.appendChild(domObject);
	}

	updateDomObjectStyle() {
		const domObject = this.domLinker;
		const rgba = this.features.rgba.values;
		const coordinates = this.features.coordinates.values;
		const eulerAngles = this.features.eulerAngles.values;
		domObject.style.setProperty('--rgba', `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`);
		domObject.style.left = `${coordinates[0]}px`;
		domObject.style.top = `${coordinates[1]}px`;
		domObject.style.transform = `translateZ(${coordinates[2]}px) rotateX(${eulerAngles[0]}rad) rotateY(${eulerAngles[1]}rad) rotateZ(${eulerAngles[2]}rad)`;
		domObject.style.background = `translateZ(${coordinates[2]}px) rotateX(${eulerAngles[0]}rad) rotateY(${eulerAngles[1]}rad) rotateZ(${eulerAngles[2]}rad)`;
	}

	addVertex(localCoordinatesGetter) {
		const vertex = {
			ha3dObject: this,
			localCoordinates: undefined,
			coordinates: undefined,
			updateLocalCoordinates: ()=> {
				vertex.localCoordinates = localCoordinatesGetter();
			},
			updateCoordinates: ()=> {
				vertex.coordinates = haFuncLinearCombineVectors([this.features.coordinates.values, ha3dMapCoordinatesToAxes(vertex.localCoordinates, this.axes)], [1, 1]);
			}
		}
		vertex.updateLocalCoordinates();
		vertex.updateCoordinates();
		this.vertices.push(vertex);
	}

	addFace(localCoordinatesGetter, localSizesGetter, localEulerAnglesGetter, parameters={}) {
		const isRounded = parameters.isRounded !== undefined ? parameters.isRounded : false;
		const defaultInnerHtml = parameters.defaultInnerHtml !== undefined ? parameters.defaultInnerHtml : `<span class="defaultContent">${this.faces.length}</span>`;
		const domObject = this.domLinker;
		const domFace = document.createElement('div');
		const face = {
			ha3dObject: this,
			domLinker: domFace,
			localAxes: undefined,
			localAnchorCoordinates: undefined,
			axes: undefined,
			anchorCoordinates: undefined,
			visibility: undefined,
			defaultInnerHtml: defaultInnerHtml,
			updateLocalAxes: ()=> {
				face.localAxes = ha3dRotateVectors(Ha3dEntity.axesTemplate, localEulerAnglesGetter());
			},
			updateLocalCoordinates: ()=> {
				face.localAnchorCoordinates = localCoordinatesGetter();
			},
			updateAxes: ()=> {
				face.axes = haFuncOperateOnVector(face.localAxes, x => ha3dMapCoordinatesToAxes(x, this.axes));
			},
			updateCoordinates: ()=> {
				face.anchorCoordinates = haFuncLinearCombineVectors([this.features.coordinates.values, ha3dMapCoordinatesToAxes(face.localAnchorCoordinates, this.axes)], [1, 1]);
			},
			updateDomFaceStyle: ()=> {
				const domElementSizes = localSizesGetter();
				const domElementEulerAngles = localEulerAnglesGetter().reverse().map(axisAngle=> `rotate${axisAngle[0].toUpperCase()}(${axisAngle[1]}rad)`).join(' ');
				domFace.style.left = `${face.localAnchorCoordinates[0]-0.5*domElementSizes[0]}px`;
				domFace.style.top = `${face.localAnchorCoordinates[1]-0.5*domElementSizes[1]}px`;
				domFace.style.width = `${domElementSizes[0]}px`;
				domFace.style.height = `${domElementSizes[1]}px`;
				domFace.style.transform = `translateZ(${face.localAnchorCoordinates[2]}px) ${domElementEulerAngles}`;
			},
			updateShade: ()=> {
				const ha3dLights = this.ha3dWorld.ha3dLightList;
				if (ha3dLights === undefined || !this.hasShade)
					return;
				const rgba = this.features.rgba.values;
				let meanRgbSquared = [Math.pow(255-rgba[0], 2), Math.pow(255-rgba[1], 2), Math.pow(255-rgba[2], 2)];
				let sumCoefficient = Ha3dObject.faceColorResistance;
				let meanBrightness = 0;
				for (let i = 0; i < ha3dLights.length; i++) {
					const lightRgba = ha3dLights[i].features.rgba.values;
					const lightRgbSquared = [Math.pow(255-lightRgba[0], 2), Math.pow(255-lightRgba[1], 2), Math.pow(255-lightRgba[2], 2)];
					const vector = haFuncLinearCombineVectors([ha3dLights[i].features.coordinates.values, face.anchorCoordinates], [1, -1]);
					const effectivensess = haFuncGetInnerProduct(face.axes[2], vector)/haFuncGetL2Norm(vector);
					const coefficient = (1-Ha3dObject.faceColorResistance)*Math.max(effectivensess, 0);
					const brightness = 0.5*(Ha3dObject.maxFaceBrightness - Ha3dObject.minFaceBrightness)*(effectivensess + 1) + Ha3dObject.minFaceBrightness;
					meanRgbSquared = haFuncOperateOnVector(haFuncLinearCombineVectors([meanRgbSquared, lightRgbSquared], [sumCoefficient, coefficient]), x => x/(sumCoefficient + coefficient));
					sumCoefficient += coefficient;
					meanBrightness = (i*meanBrightness + brightness)/(i + 1);
				}
				const meanRgba = haFuncOperateOnVector(meanRgbSquared, x => Math.round(255-Math.sqrt(x)))
				domFace.style.setProperty('--rgba', `rgba(${meanRgba[0]}, ${meanRgba[1]}, ${meanRgba[2]}, ${rgba[3]})`);
				domFace.style.filter = `brightness(${meanBrightness})`;
				if (this.eventListeners.has('faceShadeChange'))
					this.eventListeners.get('faceShadeChange')({
						face: face,
						hsv: hsv		
					});
			},
			updateVisibility: ()=> {
				const visibility = haFuncGetInnerProduct(this.ha3dWorld.cameraPlaneAxes[2], face.axes[2]);
				face.visibility = visibility;
				if (this.eventListeners.has('faceVisibilityChange'))
					this.eventListeners.get('faceVisibilityChange')({
						face: face,
						visibility: visibility		
					});
			}
		};
		domFace.classList.add('face');
		domFace.style.borderRadius = isRounded ? '100%': 'none';
		domFace.style.filter = `brightness(${Ha3dObject.maxBrightness})`;
		domFace.innerHTML = defaultInnerHtml;
		domFace.ha3dLinker = face;
		domFace.addEventListener('mousedown', (event)=> {
			const domHa3d = this.ha3dWorld.domLinker;
			const rectDomHa3d = domHa3d.getBoundingClientRect();
			if (event.clientX < rectDomHa3d.left || event.clientX > rectDomHa3d.left + rectDomHa3d.width || event.clientY < rectDomHa3d.top || event.clientY > rectDomHa3d.top + rectDomHa3d.height)
				return;
			if (this.interactionProfile.get('targetFeature') !== undefined)
				this.ha3dWorld.interactionManager.activate(event, this, [...this.features.coordinates.values], [...face.axes[2]], [...face.anchorCoordinates]);
			else if (this.ha3dWorld.interactionProfile.get('targetFeature') !== undefined)
				this.ha3dWorld.interactionManager.activate(event, this.ha3dWorld, [0, 0, 0], [...face.axes[2]], [...face.anchorCoordinates]);
		});
		domObject.appendChild(domFace);
		face.updateLocalAxes();
		face.updateLocalCoordinates();
		face.updateCoordinates();
		face.updateAxes();
		face.updateDomFaceStyle();
		face.updateShade();
		face.updateVisibility();
		this.faces.push(face);
	}

	addGround(parentFaceIndex) {
		const parentFace = this.faces[haFuncMudolu(parentFaceIndex, this.faces.length)];
		const domObject = this.domLinker;
		const domSourceFace = parentFace.domLinker;
		const domGround = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const ground = {
			domLinker: domGround,
			parentFace: parentFace,
			shadows: {},
			getShadow: (ha3dMass, ha3dLight)=> {
				const shadowCode = ha3dMass.code+ha3dLight.code;
				if (ground.shadows[shadowCode])
					return ground.shadows[shadowCode];
				const domShadow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
				const shadow = {
					domLinker: domShadow,
					parentGround: ground,
					ha3dMass: ha3dMass,
					ha3dLight: ha3dLight
				};
				domShadow.classList.add('shadow');
				domShadow.ha3dLinker = shadow;
				domGround.appendChild(domShadow);
				ground.shadows[shadowCode] = shadow;
				return shadow;
			},
			updateDomGroundStyle: ()=> {
				domGround.setAttribute('viewBox', `${-0.5*domSourceFace.offsetWidth} ${-0.5*domSourceFace.offsetHeight} ${domSourceFace.offsetWidth} ${domSourceFace.offsetHeight}`);
				domGround.style.left = domSourceFace.style.left;
				domGround.style.top = domSourceFace.style.top;
				domGround.style.width = domSourceFace.style.width;
				domGround.style.height = domSourceFace.style.height;
				domGround.style.transform = domSourceFace.style.transform;
				domGround.style.borderRadius = domSourceFace.style.borderRadius;
			},
			updateShadow: ({massCode, lightCode}={})=> {
				const ha3dMasses = this.ha3dWorld.ha3dMassList;
				const ha3dLights = this.ha3dWorld.ha3dLightList;
				if (ha3dMasses === undefined || ha3dLights === undefined)
					return;
				for (let i = 0; i < ha3dMasses.length; i++) {
					if (ha3dMasses[i].code === this.code || !ha3dMasses[i].hasShadow)
						continue;
					if (massCode !== undefined && ha3dMasses[i].code !== massCode)
						continue;
					for (let j = 0; j < ha3dLights.length; j++) {
						if (lightCode !== undefined && ha3dLights[j].code !== lightCode)
							continue;
						const shadow = ground.getShadow(ha3dMasses[i], ha3dLights[j]);
						const domShadow = shadow.domLinker;
						const vertices = ha3dMasses[i].vertices;
						const points = [];
						for (let l = 0; l < vertices.length; l++) {
							const [ratio, intersectionCoordinates] = haFuncGetLinePlaneIntersection(ha3dLights[j].features.coordinates.values, vertices[l].coordinates, parentFace.axes[2], parentFace.anchorCoordinates);
							if (ratio === -Infinity || ratio === Infinity || ratio < 1)
								continue;
							const relativeIntersectionCoordinates = haFuncLinearCombineVectors([intersectionCoordinates, parentFace.anchorCoordinates], [1, -1]);
							const point = ha3dMapCoordinatesFromAxes(relativeIntersectionCoordinates, parentFace.axes);
							points.push([point[0], point[1]]);
						}
						domShadow.setAttribute('points', ha3dGetConvexEnvlope(points).join(' '));
						if (this.eventListeners.has('receivedShadowChange'))
							this.eventListeners.get('receivedShadowChange')({
								shadow: shadow		
							});
						if (ha3dMasses[i].eventListeners.has('castShadowChange'))
							ha3dMasses[i].eventListeners.get('castShadowChange')({
								shadow: shadow		
							});
						if (ha3dLights[j].eventListeners.has('causedShadowChange'))
							ha3dLights[j].eventListeners.get('causedShadowChange')({
								shadow: shadow
							});
					}
				}
			}
		};
		domGround.classList.add('ground');
		domGround.ha3dLinker = ground;
		domObject.appendChild(domGround);
		ground.updateDomGroundStyle();
		ground.updateShadow();
		this.grounds.push(ground);
	}
}

Ha3dPlane = class extends Ha3dObject {
	constructor(ha3dWorld) {
		const changePropagator = ()=> {
			const ha3dObjectList = this.ha3dWorld.ha3dObjectList;
			if (ha3dObjectList === undefined)
				return;
			for (let i = 0; i < ha3dObjectList.length; i++) {
				const grounds = ha3dObjectList[i].grounds;
				for (let j = 0; j < grounds.length; j++)
					grounds[j].updateShadow({massCode: this.code});
			}
		};
		super(ha3dWorld, 'mass', {
			hasShade: false,
			hasShadow: true,
			featureSizesInitializer: 500,
			featureCoordinatesChangePropagator: changePropagator,
			featureSizesChangePropagator: changePropagator,
			featureEulerAnglesChangePropagator: changePropagator
		});
		
		const sizes = this.features.sizes.values;
		this.addVertex(()=> [0.5*sizes[0], 0.5*sizes[1], 0]);
		this.addVertex(()=> [-0.5*sizes[0], 0.5*sizes[1], 0]);
		this.addVertex(()=> [-0.5*sizes[0], -0.5*sizes[1], 0]);
		this.addVertex(()=> [0.5*sizes[0], -0.5*sizes[1], 0]);
		this.addFace(
			()=> [0, 0, 0],
			()=> [...sizes],
			()=> []
		);
		this.addGround(0);

		changePropagator();
	}
}

Ha3dCylindroid = class extends Ha3dObject {
	constructor(ha3dWorld, totalSides=18) {
		const changePropagator = ()=> {
			const ha3dObjectList = this.ha3dWorld.ha3dObjectList;
			if (ha3dObjectList === undefined)
				return;
			for (let i = 0; i < ha3dObjectList.length; i++) {
				const grounds = ha3dObjectList[i].grounds;
				for (let j = 0; j < grounds.length; j++)
					grounds[j].updateShadow({massCode: this.code});
			}
		};
		super(ha3dWorld, 'mass', {
			hasShade: true,
			hasShadow: true,
			featureSizesInitializer: 20,
			featureCoordinatesChangePropagator: changePropagator,
			featureSizesChangePropagator: changePropagator,
			featureEulerAnglesChangePropagator: changePropagator
		});
		
		const sector = 2*Math.PI/totalSides;
		const sizes = this.features.sizes.values;
		for (let i = 0; i < totalSides; i++) {
			const theta = i*sector;
			this.addVertex(()=> [0.5*sizes[0]*Math.cos(theta+0.5*sector), 0.5*sizes[1]*Math.sin(theta+0.5*sector), -0.5*sizes[2]]);
			this.addVertex(()=> [0.5*sizes[0]*Math.cos(theta+0.5*sector), 0.5*sizes[1]*Math.sin(theta+0.5*sector), 0.5*sizes[2]]);
			this.addFace(
				()=> [0.5*sizes[0]*Math.cos(0.5*sector)*Math.cos(theta), 0.5*sizes[1]*Math.cos(0.5*sector)*Math.sin(theta), 0],
				()=> [Math.sin(0.5*sector)*Math.sqrt(Math.pow(sizes[0]*Math.sin(theta), 2)+Math.pow(sizes[1]*Math.cos(theta), 2)), sizes[2]],
				()=> [['x', -0.5*Math.PI], ['z', Math.atan2(-sizes[1]*Math.cos(theta), sizes[0]*Math.sin(theta))]]
			)
		}
		this.addFace(
			()=> [0, 0, -0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> [['x', Math.PI]], {
				isRounded: true
		});
		this.addFace(
			()=> [0, 0, 0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> [],{
				isRounded: true
		});
		this.addGround(-1);

		changePropagator();
	}
};

Ha3dBox = class extends Ha3dObject {
	constructor(ha3dWorld) {
		const changePropagator = ()=> {
			const ha3dObjectList = this.ha3dWorld.ha3dObjectList;
			if (ha3dObjectList === undefined)
				return;
			for (let i = 0; i < ha3dObjectList.length; i++) {
				const grounds = ha3dObjectList[i].grounds;
				for (let j = 0; j < grounds.length; j++)
					grounds[j].updateShadow({massCode: this.code});
			}
		};
		super(ha3dWorld, 'mass', {
			hasShade: true,
			hasShadow: true,
			featureSizesInitializer: 20,
			featureCoordinatesChangePropagator: changePropagator,
			featureSizesChangePropagator: changePropagator,
			featureEulerAnglesChangePropagator: changePropagator
		});

		const sizes = this.features.sizes.values;
		this.addVertex(()=> [0.5*sizes[0], 0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], 0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], -0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], -0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], 0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], 0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], -0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], -0.5*sizes[1], 0.5*sizes[2]]);
		this.addFace(
			()=> [0.5*sizes[0], 0, 0],
			()=> [sizes[1], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', -0.5*Math.PI]]
		);
		this.addFace(
			()=> [0, 0.5*sizes[1], 0],
			()=> [sizes[0], sizes[2]],
			()=> [['x', -0.5*Math.PI]]
		);
		this.addFace(
			()=> [-0.5*sizes[0], 0, 0],
			()=> [sizes[1], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', 0.5*Math.PI]]
		);
		this.addFace(
			()=> [0, -0.5*sizes[1], 0],
			()=> [sizes[0], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', Math.PI]]
		);
		this.addFace(
			()=> [0, 0, -0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> [['x', Math.PI]]
		);
		this.addFace(
			()=> [0, 0, 0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> []
		);

		changePropagator();
	}
};

Ha3dLight = class extends Ha3dObject {
	constructor(ha3dWorld) {
		const changePropagator = ()=> {
			const ha3dObjectList = this.ha3dWorld.ha3dObjectList;
			if (ha3dObjectList === undefined)
				return;
			for (let i = 0; i < ha3dObjectList.length; i++) {
				const faces = ha3dObjectList[i].faces;
				const grounds = ha3dObjectList[i].grounds;
				for (let j = 0; j < faces.length; j++)
					faces[j].updateShade();
				for (let j = 0; j < grounds.length; j++)
					grounds[j].updateShadow({lightCode: this.code});
			}
		};
		super(ha3dWorld, 'omni', {
			hasShade: false,
			hasShadow: false,
			featureSizesIsLocked: true,
			featureEulerAnglesIsLocked: true,
			featureRgbaInitializer: [255, 255, 255, 1.0],
			featureSizesInitializer: 10,
			featureRgbaChangePropagator: changePropagator,
			featureCoordinatesChangePropagator: changePropagator
		});

		const sizes = this.features.sizes.values;
		this.addVertex(()=> [0.5*sizes[0], 0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], 0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], -0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], -0.5*sizes[1], -0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], 0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], 0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [-0.5*sizes[0], -0.5*sizes[1], 0.5*sizes[2]]);
		this.addVertex(()=> [0.5*sizes[0], -0.5*sizes[1], 0.5*sizes[2]]);
		this.addFace(
			()=> [0.5*sizes[0], 0, 0],
			()=> [sizes[1], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', -0.5*Math.PI]], {
				defaultInnerHtml: ''
		});
		this.addFace(
			()=> [0, 0.5*sizes[1], 0],
			()=> [sizes[0], sizes[2]],
			()=> [['x', -0.5*Math.PI]], {
				defaultInnerHtml: ''
		});
		this.addFace(
			()=> [-0.5*sizes[0], 0, 0],
			()=> [sizes[1], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', 0.5*Math.PI]], {
				defaultInnerHtml: ''
		});
		this.addFace(
			()=> [0, -0.5*sizes[1], 0],
			()=> [sizes[0], sizes[2]],
			()=> [['x', -0.5*Math.PI], ['z', Math.PI]], {
				defaultInnerHtml: ''
		});
		this.addFace(
			()=> [0, 0, -0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> [['x', Math.PI]], {
				defaultInnerHtml: ''
		});
		this.addFace(
			()=> [0, 0, 0.5*sizes[2]],
			()=> [sizes[0], sizes[1]],
			()=> [], {
				defaultInnerHtml: ''
		});

		changePropagator();
	}
};

makeHa3d = ()=> {
	const domHa3ds = document.getElementsByClassName('ha3d');
    for (let i = 0; i < domHa3ds.length; i++) {
	    const domHa3d = domHa3ds[i];
		window.addEventListener('mousemove', (event)=> {
			if (domHa3d.ha3dLinker !== undefined)
				domHa3d.ha3dLinker.interactionManager.interact(event);
		})
		window.addEventListener('mouseup', ()=> {
			if (domHa3d.ha3dLinker !== undefined)
				domHa3d.ha3dLinker.interactionManager.deactivate();
		})
        domHa3d.makeHa3dWorld = ()=> {
            if (domHa3d.ha3dLinker !== undefined)
                return domHa3d.ha3dLinker;
            return new Ha3dWorld(domHa3d);
        };
        domHa3d.makeHa3dObject = (type, args)=> {
			const className = `Ha3d${haFuncUcfirst(type)}`;
            if (domHa3d.ha3dLinker === undefined || className === 'Ha3dWorld' || className === 'Ha3dObject' || window[className] === undefined || window[className].constructor !== Function)
                return;
            return new window[className](domHa3d.ha3dLinker, args);
        };
    }
};

updateHa3d = ()=> {
	const domHa3ds = document.getElementsByClassName('ha3d');
    for (let i = 0; i < domHa3ds.length; i++) {
		if (domHa3ds[i].ha3dLinker !== undefined)
	    	domHa3ds[i].ha3dLinker.features.cameraAngles.propagateChange();
	}
};

ha3dGetConvexEnvlope = (points)=> {
	const lowerPoints = [];
	const upperPoints = [];
	points.sort((pointA, pointB)=> {
		return pointA[0] === pointB[0] ? pointA[1] - pointB[1] : pointA[0] - pointB[0];
	});
	for (let i = 0; i < points.length; i++) {
		while (lowerPoints.length >= 2 && haFuncGetIfPointIsOnLeftOfLine(lowerPoints[lowerPoints.length - 2], lowerPoints[lowerPoints.length - 1], points[i]))
			lowerPoints.pop();
		lowerPoints.push(points[i]);
	}
	lowerPoints.pop();
	for (let i = points.length - 1; i >= 0; i--) {
		while (upperPoints.length >= 2 && haFuncGetIfPointIsOnLeftOfLine(upperPoints[upperPoints.length - 2], upperPoints[upperPoints.length - 1], points[i]))
			upperPoints.pop();
		upperPoints.push(points[i]);
	}
	upperPoints.pop();
	return [...lowerPoints, ...upperPoints];
};

ha3dMapCoordinatesToAxes = (coordinates, axes)=> {
	const result = haFuncLinearCombineVectors(axes, coordinates);
	return result;
};

ha3dMapCoordinatesFromAxes = (coordinates, axes)=> {
	const transposedAxes = [];
	for (let i = 0; i < axes.length; i++) {
		transposedAxes.push([]);
		for (let j = 0; j < axes.length; j++)
			transposedAxes[i].push(axes[j][i]);
	}
	const result = ha3dMapCoordinatesToAxes(coordinates, transposedAxes);
	return result;
};

ha3dRotateVectors = (vectors, axisAngles)=> {
	const result = [];
	for (let i = 0; i < vectors.length; i++) {
		result[i] = [];
		for (let j = 0; j < vectors[i].length; j++) {
			result[i][j] = vectors[i][j];
		}
	}
	for (let j = 0; j < axisAngles.length; j++) {
		let [axis, angle] = axisAngles[j];
		switch (axis) {
			case 'x':
				axis = [1, 0, 0];
				break;
			case 'y':
				axis = [0, 1, 0];
				break;
			case 'z':
				axis = [0, 0, 1];
				break;
			default:
				axis = haFuncOperateOnVector(axis, x => x/haFuncGetL2Norm(axis));
		}
		const cosine = Math.cos(angle);
		const sine = Math.sin(angle);
		for (let i = 0; i < result.length; i++) {
			result[i] = [
				haFuncGetInnerProduct(result[i], [cosine+Math.pow(axis[0], 2)*(1-cosine), axis[0]*axis[1]*(1-cosine)-axis[2]*sine, axis[0]*axis[2]*(1-cosine)+axis[1]*sine]),
				haFuncGetInnerProduct(result[i], [axis[0]*axis[1]*(1-cosine)+axis[2]*sine, cosine+Math.pow(axis[1], 2)*(1-cosine), axis[1]*axis[2]*(1-cosine)-axis[0]*sine]),
				haFuncGetInnerProduct(result[i], [axis[0]*axis[2]*(1-cosine)-axis[1]*sine, axis[1]*axis[2]*(1-cosine)+axis[0]*sine, cosine+Math.pow(axis[2], 2)*(1-cosine)])
			];
		}
	}
	return result;
};

ha3dRotateZYXEulerAngles = (eulerAnglesStart, axis, angle, axisAngleFirst=false)=> {
	switch (axis) {
		case 'x':
			axis = [1, 0, 0];
			break;
		case 'y':
			axis = [0, 1, 0];
			break;
		case 'z':
			axis = [0, 0, 1];
			break;
		default:
			axis = haFuncOperateOnVector(axis, x => x/haFuncGetL2Norm(axis));
	}
	const cosine0 = Math.cos(eulerAnglesStart[0]);
	const sine0 = Math.sin(eulerAnglesStart[0]);
	const cosine1 = Math.cos(eulerAnglesStart[1]);
	const sine1 = Math.sin(eulerAnglesStart[1]);
	const cosine2 = Math.cos(eulerAnglesStart[2]);
	const sine2 = Math.sin(eulerAnglesStart[2]);
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	let rotationMatrix21;
	let rotationMatrix22;
	let rotationMatrix20;
	let rotationMatrix10;
	let rotationMatrix00;
	if (axisAngleFirst) {
		rotationMatrix21 = (cosine0*sine2 + cosine2*sine0*sine1)*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) - (cosine0*cosine2 - sine0*sine1*sine2)*(sine*axis[0] + axis[1]*axis[2]*(cosine - 1)) - cosine1*sine0*(cosine - Math.pow(axis[2], 2)*(cosine - 1));
		rotationMatrix22 = (sine0*sine2 - cosine0*cosine2*sine1)*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) - (cosine2*sine0 + cosine0*sine1*sine2)*(sine*axis[0] + axis[1]*axis[2]*(cosine - 1)) + cosine0*cosine1*(cosine - Math.pow(axis[2], 2)*(cosine - 1));
		rotationMatrix20 = sine1*(cosine - Math.pow(axis[2], 2)*(cosine - 1)) + cosine1*cosine2*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) + cosine1*sine2*(sine*axis[0] + axis[1]*axis[2]*(cosine - 1));
		rotationMatrix10 = sine1*(sine*axis[0] - axis[1]*axis[2]*(cosine - 1)) - cosine1*cosine2*(sine*axis[2] + axis[0]*axis[1]*(cosine - 1)) - cosine1*sine2*(cosine - Math.pow(axis[1], 2)*(cosine - 1));
		rotationMatrix00 = cosine1*cosine2*(cosine - Math.pow(axis[0], 2)*(cosine - 1)) - sine1*(sine*axis[1] + axis[0]*axis[2]*(cosine - 1)) - cosine1*sine2*(sine*axis[2] - axis[0]*axis[1]*(cosine - 1));
	} else {
		rotationMatrix21 = sine1*(sine*axis[2] - axis[0]*axis[1]*(cosine - 1)) - cosine0*cosine1*(sine*axis[0] + axis[1]*axis[2]*(cosine - 1)) - cosine1*sine0*(cosine - Math.pow(axis[1], 2)*(cosine - 1));
		rotationMatrix22 = cosine0*cosine1*(cosine - Math.pow(axis[2], 2)*(cosine - 1)) - sine1*(sine*axis[1] + axis[0]*axis[2]*(cosine - 1)) - cosine1*sine0*(sine*axis[0] - axis[1]*axis[2]*(cosine - 1));
		rotationMatrix20 = sine1*(cosine - Math.pow(axis[0], 2)*(cosine - 1)) + cosine0*cosine1*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) + cosine1*sine0*(sine*axis[2] + axis[0]*axis[1]*(cosine - 1));
		rotationMatrix10 = (cosine2*sine0 + cosine0*sine1*sine2)*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) - (cosine0*cosine2 - sine0*sine1*sine2)*(sine*axis[2] + axis[0]*axis[1]*(cosine - 1)) - cosine1*sine2*(cosine - Math.pow(axis[0], 2)*(cosine - 1));
		rotationMatrix00 = (sine0*sine2 - cosine0*cosine2*sine1)*(sine*axis[1] - axis[0]*axis[2]*(cosine - 1)) - (cosine0*sine2 + cosine2*sine0*sine1)*(sine*axis[2] + axis[0]*axis[1]*(cosine - 1)) + cosine1*cosine2*(cosine - Math.pow(axis[0], 2)*(cosine - 1));
	}
	const eulerAnglesNew = [
		Math.atan2(-rotationMatrix21, rotationMatrix22),
		Math.asin(rotationMatrix20),
		Math.atan2(-rotationMatrix10, rotationMatrix00)
	];
	for (let i = 0; i < eulerAnglesNew.length; i++)
		eulerAnglesNew[i] = eulerAnglesStart[i] + haFuncGetMinPeriodicDisplacement(eulerAnglesStart[i], eulerAnglesNew[i], 2*Math.PI);
	return eulerAnglesNew;
};